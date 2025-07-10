import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { MongoDBAtlasVectorSearch } from '@langchain/mongodb';
import { Document } from './mdProcessor';
import { getCurrentLlm, invokeWithRetry } from '../config/llm';
import { traceable } from 'langsmith/traceable';
import { RunTree } from 'langsmith';

// State interface no longer contains tracing info
export interface RAGState {
  question: string;
  context: RetrievedDocument[];
  answer: string;
  sources?: string[];
  queries?: string[];
  retrieved_documents?: RetrievedDocument[];
  reranked_documents?: RetrievedDocument[];
  error?: string;
  step?: string;
}

export interface RetrievedDocument {
  document: Document;
  similarityScore: number;
}

// Each node is wrapped with 'traceable' for automatic tracing.
const generateQueries = traceable(async (state: RAGState): Promise<Partial<RAGState>> => {
  console.log('🔍 Generating queries for:', state.question);
  const systemPrompt = `Anda adalah ahli pembuatan kueri penelusuran untuk mengekstrak informasi relevan dari basis data vektor. Berdasarkan pertanyaan pengguna, buat EMPAT kueri berbeda dengan langkah berikut:
1. Ekstrak kata kunci utama dari pertanyaan.
2. Buat:
  - Query 1: Format "[kata kunci]?" 
      (Contoh: Dari "Apa definisi dari eko wisata dalam survei ini?" ambil "eko wisata" sehingga menjadi "Eko wisata?")
  - Query 2: Format "Apa itu [kata kunci]?" 
      (Contoh: "Apa itu eko wisata?")
  - Query 3: Format "Jelaskan tentang [kata kunci]?" 
      (Contoh: "Jelaskan tentang eko wisata?")
  - Query 4: Pertanyaan asli tanpa perubahan apapun
      (Contoh: Jika pertanyaan asli "Apa definisi dari eko wisata dalam survei ini?" maka Query 4 = "Apa definisi dari eko wisata dalam survei ini?")
3. Pastikan Anda membuat tepat EMPAT kueri.`;
  const userPrompt = `Buatkan empat query untuk pertanyaan berikut: "${state.question}".`;
  const messages = [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }];
  const llm = await getCurrentLlm();
  const text = await invokeWithRetry(llm, messages);
  
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  const queries: string[] = [];
  
  for (const line of lines) {
      const queryMatch = line.match(/Query\s*\d+:\s*(.+)/i) || line.match(/^\d+\.\s*(.+)/) || line.match(/^\*\s*(.+)/);
      if (queryMatch && queryMatch[1]) {
          const query = queryMatch[1].trim().replace(/^["']|["']$/g, '');
          if (query) queries.push(query);
      }
  }
  
  if (queries.length === 0 && text.trim().length > 0) {
      queries.push(text.trim());
  }

  if (queries.length < 4) {
    const mainKeyword = state.question.split(' ').slice(0, 3).join(' ');
    const fallbackQueries = [`${mainKeyword}?`, `Apa itu ${mainKeyword}?`, `Jelaskan tentang ${mainKeyword}?`, state.question];
    for (let i = queries.length; i < 4; i++) {
      queries.push(fallbackQueries[i]);
    }
  }
  
  console.log('✅ Generated queries:', queries);
  return { queries, step: 'queries_generated' };
}, { name: 'generate_queries' });

const retrieveDocuments = traceable(async (state: RAGState, vectorStore: MongoDBAtlasVectorSearch): Promise<Partial<RAGState>> => {
  console.log('📚 Retrieving documents with MMR per query...');
  if (!state.queries || state.queries.length === 0) {
    throw new Error('No queries available for retrieval');
  }

  const k = 3;
  const fetch_k = 20;
  const lambda = 0.5;
  const allResults: RetrievedDocument[] = [];

  for (const query of state.queries) {
    // Gunakan MMR search pada vector store
    const results = await vectorStore.maxMarginalRelevanceSearch(query, {
      k,
      fetchK: fetch_k,
      lambda,
    });
    const processedDocs = results.map((doc: any) => ({
      document: {
        pageContent: doc.pageContent || (doc.metadata?.pageContent) || "",
        metadata: { source: doc.metadata?.source || doc.metadata?.metadata?.source || "", chunkId: doc.metadata?.chunkId || doc.metadata?.metadata?.chunkId || "" }
      } as Document,
      similarityScore: (doc.score ?? 0.0)
    }));
    allResults.push(...processedDocs);
  }

  // Deduplicate by pageContent
  const uniqueResults: RetrievedDocument[] = Array.from(new Map(allResults.map(doc => [doc.document.pageContent, doc])).values());

  console.log(`📊 Total unique results after MMR per query: ${uniqueResults.length}`);
  return { retrieved_documents: uniqueResults, step: 'documents_retrieved' };
}, { name: 'retrieve_documents' });

const rerankDocuments = traceable(async (state: RAGState): Promise<Partial<RAGState>> => {
  console.log('🔄 Reranking documents...');
  const docsToRerank = state.retrieved_documents || [];
  if (docsToRerank.length === 0) return { reranked_documents: [], step: 'reranking_skipped' };
  const similarityThreshold = 0.8;
  const BATCH_SIZE = 3;

  // Prompt template tetap sama
  const systemPrompt = `Anda adalah ahli dalam mengevaluasi relevansi dokumen terhadap pertanyaan. Tugas Anda adalah memberikan skor similarity (0.0 - 1.0) untuk setiap dokumen berdasarkan seberapa relevan dokumen tersebut terhadap pertanyaan yang diberikan.

PENTING: JANGAN MENGUBAH ISI DOKUMEN. Berikan skor berdasarkan dokumen yang ada tanpa menambah atau mengurangi teks. PASTIKAN array \`rerankedDocuments\` berisi objek untuk SETIAP dokumen yang diberikan dalam urutan yang sama.

Pertimbangkan aspek berikut dalam penilaian:
1. Relevansi topik dan konsep
2. Kesesuaian informasi dengan pertanyaan
3. Kelengkapan informasi yang dibutuhkan
4. Keakuratan dan keandalan informasi

Berikan skor dalam format JSON dengan struktur:
{
  "rerankedDocuments": [
    {
      "document": "isi dokumen yang PERSIS sama dengan input",
      "similarityScore": 0.85
    }
  ]
}`;

  // Fungsi untuk membagi dokumen menjadi batch
  function chunkArray<T>(arr: T[], size: number): T[][] {
    const result: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
      result.push(arr.slice(i, i + size));
    }
    return result;
  }

  // Rerank dokumen per batch (maksimal 3 dokumen per request)
  const batches = chunkArray(docsToRerank, BATCH_SIZE);
  const rerankBatchPromises = batches.map(async (batch, batchIdx) => {
    const docsStr = batch.map((doc, i) => `Dokumen ${i + 1}: ${doc.document.pageContent}`).join('\n\n');
    const userPrompt = `- Pertanyaan:\n${state.question}\n- Dokumen untuk direrank (JANGAN UBAH ISI DOKUMEN, HANYA BERIKAN SKOR):\n${docsStr}`;
    const llm = await getCurrentLlm();
    const text = await invokeWithRetry(llm, [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ]);
    // Ambil hasil JSON dari output LLM
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    let rerankResult;
    try {
      rerankResult = jsonMatch ? JSON.parse(jsonMatch[0]) : { rerankedDocuments: [] };
    } catch {
      rerankResult = { rerankedDocuments: [] };
    }
    // Ambil similarityScore dari hasil LLM
    const rerankedBatch = (rerankResult.rerankedDocuments || []).map((item: any, i: number) => ({
      document: batch[i].document,
      similarityScore: item.similarityScore || 0.0
    }));
    return rerankedBatch;
  });

  // Gabungkan hasil dari semua batch
  const rerankedDocs: RetrievedDocument[] = (await Promise.all(rerankBatchPromises))
    .flat()
    .filter(doc => doc.similarityScore >= similarityThreshold);

  console.log(`📊 Reranking complete: ${rerankedDocs.length} documents retained`);
  return { reranked_documents: rerankedDocs, step: 'documents_reranked' };
}, { name: 'rerank_documents' });

const generateAnswer = traceable(async (state: RAGState): Promise<Partial<RAGState>> => {
  console.log('💡 Generating answer...');
  
  // Robustly select documents: Use reranked if available and non-empty, otherwise fallback to retrieved.
  const hasReranked = Array.isArray(state.reranked_documents) && state.reranked_documents.length > 0;
  const documents: RetrievedDocument[] = hasReranked
    ? state.reranked_documents || []
    : state.retrieved_documents || [];

  // Jika tidak ada dokumen sama sekali (retrieved juga kosong)
  if (documents.length === 0) return { answer: 'Maaf, saya tidak dapat menemukan informasi yang relevan untuk pertanyaan Anda.', step: 'no_documents' };

  let prompt = '';
  let systemPrompt = '';

  if (hasReranked) {
    // === CASE 1: Ada dokumen yang memenuhi threshold, gunakan prompt lama ===
    const contextText = documents.map(doc => doc.document.pageContent).join('\n\n');
    const ANSWER_TEMPLATE = `Anda adalah asisten yang hanya boleh menjawab pertanyaan berdasarkan potongan konteks yang disediakan di bawah ini. Ikuti instruksi berikut dengan cermat:

1. Bacalah seluruh potongan konteks.
2. Pastikan Anda memberikan jawaban yang semirip mungkin dengan pengetahuan pada konteks yang diberikan.
3. Cobalah menjawab pertanyaan pengguna sebisa Anda serta jelaskan argumen Anda dengan tetap menggunakan konteks yang diberikan sehingga anda tetap memberikan jawaban dan tidak menjawab bahwa anda tidak tahu atau tidak bisa menjawab pertanyaan tersebut.
4. Hindari frasa seperti "konteks atau teks yang diberikan tidak ada".
5. Jangan menyampaikan permintaan maaf jika pertanyaan sudah terjawab dengan konteks.
6. Jika jawaban terdiri dari lebih dari satu kalimat, pastikan kalimat-kalimat tersebut saling berkaitan.
7. Hindari memberikan informasi terkait kode atau referensi yang tidak dapat diketahui oleh pengguna.
8. Jika konteks yang diberikan tidak menjelaskan pertanyaan secara spesifik, saya izinkan Anda memberikan jawaban menggunakan pengetahuan umum yang Anda miliki dan beri teks "(Sumber: Pengetahuan umum)." tetapi pastikan Anda tidak menjelaskan bahwa konteks yang dimiliki tidak menjawab pertanyaan secara spesifik.
9. PASTIKAN !!! Jika Anda dapat memberikan jawaban sesuai konteks yang tersedia, berikan teks "(Sumber: Badan Pusat Statistik)." pada akhir jawaban.
10. Akhiri setiap jawaban dengan "Terima kasih sudah bertanya!" tanpa membuat baris baru.
11. Jika ada teks "(Sumber: Badan Pusat Statistik)" dan "Terima kasih sudah bertanya!" pisahkan keduanya dengan ". " (titik spasi).
12. SANGAT PENTING !!! Hanya diperbolehkan menyertakan dua teks sumber saja, yaitu "(Sumber: Badan Pusat Statistik)" atau "(Sumber: Pengetahuan umum) dan harus ada salah satu teks sumber tersebut".   
13. DAN INGAT !!! DILARANG menuliskan "(Sumber: Dokumen [nomor])". 

Pengetahuan yang Anda miliki: {context}

Pertanyaan: {question}

Jawaban yang Bermanfaat:`;
    prompt = ANSWER_TEMPLATE
      .replace('{context}', contextText)
      .replace('{question}', state.question);
    systemPrompt = 'Anda adalah asisten cerdas yang membantu menjawab pertanyaan berdasarkan konteks.';
  } else {
    // === CASE 2: Tidak ada dokumen yang memenuhi threshold, gunakan prompt pengetahuan umum + lampiran dokumen ===
    // Ambil dokumen retrieval (meskipun similarity rendah)
    const retrievedDocs = state.retrieved_documents || [];
    const contextText = retrievedDocs.length > 0
      ? retrievedDocs.map((doc, i) => `Dokumen ${i + 1}: ${doc.document.pageContent}`).join('\n\n')
      : '-';
    const GENERAL_KNOWLEDGE_TEMPLATE = `Anda adalah asisten yang menjawab pertanyaan berdasarkan pengetahuan umum yang Anda miliki. Namun, Anda juga harus melampirkan dokumen-dokumen hasil pencarian berikut sebagai referensi tambahan, meskipun dokumen-dokumen ini tidak sepenuhnya relevan dengan pertanyaan. Ikuti instruksi berikut:

1. Jawablah pertanyaan pengguna sebaik mungkin berdasarkan pengetahuan umum Anda.
2. Setelah jawaban utama, lampirkan dokumen-dokumen hasil pencarian yang tersedia di bawah ini sebagai referensi, tanpa mengklaim bahwa dokumen tersebut relevan.
3. Akhiri jawaban Anda dengan teks "(Sumber: Pengetahuan umum). Terima kasih sudah bertanya!" (tanpa baris baru).
4. Jangan menuliskan "(Sumber: Dokumen [nomor])" atau sumber lain selain "(Sumber: Pengetahuan umum)".

Dokumen hasil pencarian:
{context}

Pertanyaan: {question}

Jawaban yang Bermanfaat:`;
    prompt = GENERAL_KNOWLEDGE_TEMPLATE
      .replace('{context}', contextText)
      .replace('{question}', state.question);
    systemPrompt = 'Anda adalah asisten cerdas yang membantu menjawab pertanyaan berdasarkan pengetahuan umum dan melampirkan dokumen hasil pencarian.';
  }

  const llm = await getCurrentLlm();
  const text = await invokeWithRetry(llm, [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: prompt }
  ]);

  // Normalisasi sumber
  let answer = text.replace(/\(Sumber: Dokumen\s*\d+\)/g, '(Sumber: Badan Pusat Statistik)')
                   .replace(/\(Sumber: Dokumen\s*\[.*?\]\)/g, '(Sumber: Badan Pusat Statistik)');
  if (!hasReranked) {
    // Paksa sumber pengetahuan umum jika tidak ada dokumen relevan
    answer = answer.replace(/\(Sumber: Badan Pusat Statistik\)/g, '(Sumber: Pengetahuan umum)');
    if (!answer.includes('(Sumber: Pengetahuan umum)')) {
      // Pastikan selalu ada sumber pengetahuan umum
      answer = answer.trim();
      if (!answer.endsWith('.')) answer += '.';
      answer += ' (Sumber: Pengetahuan umum). Terima kasih sudah bertanya!';
    }
  }

  const sources = documents.map(doc => doc.document.metadata?.source || 'Unknown source');
  console.log('✅ Answer generated successfully');
  return { answer, sources, context: documents, step: 'answer_generated' };
}, { name: 'generate_answer' });

const evaluateAndImproveAnswer = traceable(async (state: RAGState): Promise<Partial<RAGState>> => {
  console.log('📝 Evaluating and improving answer...');
  const { question, answer, context } = state;
  // Gabungkan dokumen konteks
  const contextText = (context && context.length > 0)
    ? context.map(doc => doc.document.pageContent).join('\n\n')
    : '-';

  const EVAL_SYSTEM_PROMPT = `Anda adalah evaluator jawaban LLM. Tugas Anda adalah menilai kualitas jawaban LLM atas pertanyaan user berdasarkan dokumen konteks yang digunakan. Jika jawaban sudah memuaskan dan sesuai konteks, kembalikan jawaban apa adanya. Jika jawaban kurang memuaskan, Anda diperbolehkan melengkapi jawaban dengan pengetahuan umum yang Anda miliki agar jawaban lebih baik dan benar-benar menjawab pertanyaan user. Jika Anda menambahkan pengetahuan umum, gunakan struktur sumber '(Sumber: Pengetahuan umum)' di akhir jawaban seperti pada instruksi sebelumnya.\nPENTING: Hanya kembalikan jawaban akhir saja tanpa penjelasan, alasan, atau evaluasi apapun.`;

  const EVAL_USER_PROMPT = `Pertanyaan user:\n${question}\n\nJawaban LLM:\n${answer}\n\nDokumen konteks:\n${contextText}\n\nTugas Anda:\n1. Nilai apakah jawaban LLM sudah memuaskan dan sesuai konteks.\n2. Jika sudah memuaskan, kembalikan jawaban apa adanya.\n3. Jika kurang memuaskan, perbaiki/lengkapi jawaban dengan pengetahuan umum Anda agar lebih baik dan benar-benar menjawab pertanyaan user.\n4. Jika Anda menambahkan pengetahuan umum, gunakan struktur sumber '(Sumber: Pengetahuan umum)' di akhir jawaban seperti pada instruksi sebelumnya.\n5. Hanya kembalikan jawaban akhir saja tanpa penjelasan, alasan, atau evaluasi apapun.`;

  const llm = await getCurrentLlm();
  const improvedAnswer = await invokeWithRetry(llm, [
    { role: 'system', content: EVAL_SYSTEM_PROMPT },
    { role: 'user', content: EVAL_USER_PROMPT }
  ]);

  // Normalisasi sumber jika perlu
  let finalAnswer = improvedAnswer.replace(/\(Sumber: Dokumen\s*\d+\)/g, '(Sumber: Badan Pusat Statistik)')
                                  .replace(/\(Sumber: Dokumen\s*\[.*?\]\)/g, '(Sumber: Badan Pusat Statistik)');
  // Jika evaluator menambahkan pengetahuan umum, pastikan format sumber benar
  if (!finalAnswer.includes('(Sumber: Badan Pusat Statistik)') && !finalAnswer.includes('(Sumber: Pengetahuan umum)')) {
    finalAnswer = finalAnswer.trim();
    if (!finalAnswer.endsWith('.')) finalAnswer += '.';
    finalAnswer += ' (Sumber: Pengetahuan umum). Terima kasih sudah bertanya!';
  }

  // --- POST-PROCESSING: Hapus duplikasi sumber ---
  // Ambil semua sumber yang valid
  const sumberRegex = /\(Sumber: ([^)]+)\)/g;
  let sumberMatches = [];
  let match;
  while ((match = sumberRegex.exec(finalAnswer)) !== null) {
    sumberMatches.push(match[0]);
  }
  // Pilih sumber terpanjang (paling lengkap)
  let sumberFinal = sumberMatches.length > 0 ? sumberMatches.reduce((a, b) => (a.length >= b.length ? a : b)) : '';
  // Hapus semua sumber, sisakan satu di akhir sebelum 'Terima kasih sudah bertanya!'
  if (sumberFinal) {
    // Hapus semua sumber
    finalAnswer = finalAnswer.replace(sumberRegex, '');
    // Hapus spasi/". " berlebih
    finalAnswer = finalAnswer.replace(/\s*\.+\s*$/, '');
    // Sisipkan sumberFinal sebelum "Terima kasih sudah bertanya!"
    finalAnswer = finalAnswer.replace(/(\.?\s*)?Terima kasih sudah bertanya!$/, match => {
      return `${sumberFinal}. Terima kasih sudah bertanya!`;
    });
    // Jika tidak ada "Terima kasih sudah bertanya!", tambahkan di akhir
    if (!/Terima kasih sudah bertanya!$/.test(finalAnswer)) {
      finalAnswer = finalAnswer.trim();
      if (!finalAnswer.endsWith('.')) finalAnswer += '.';
      finalAnswer += ` ${sumberFinal}. Terima kasih sudah bertanya!`;
    }
    // Rapikan titik ganda
    finalAnswer = finalAnswer.replace(/\.(\s*)\./g, '.');
  }

  return { answer: finalAnswer, step: 'answer_evaluated' };
}, { name: 'evaluate_and_improve_answer' });

// The main pipeline is also traceable, creating the root span.
const executeRAGPipelineTraceable = traceable(async (initialState: RAGState, vectorStore: MongoDBAtlasVectorSearch): Promise<RAGState> => {
  let state = { ...initialState };
  try {
    state = { ...state, ...(await generateQueries(state)) };
    state = { ...state, ...(await retrieveDocuments(state, vectorStore)) };
    state = { ...state, ...(await rerankDocuments(state)) };
    state = { ...state, ...(await generateAnswer(state)) };
    state = { ...state, ...(await evaluateAndImproveAnswer(state)) };
    return state;
  } catch (error: any) {
    console.error('❌ Pipeline execution error:', error);
    return { ...state, error: error.message, step: 'error' };
  }
}, { name: 'WisnusRAGPipeline' });

export function createRAGGraph(vectorStore: MongoDBAtlasVectorSearch) {
  return {
    async invoke(initialState: RAGState): Promise<RAGState> {
      return executeRAGPipelineTraceable(initialState, vectorStore);
    }
  };
} 