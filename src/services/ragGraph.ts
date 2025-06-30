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
  console.log('📚 Retrieving documents...');
  if (!state.queries || state.queries.length === 0) {
    throw new Error('No queries available for retrieval');
  }
  
  const allResults: RetrievedDocument[] = [];
  for (const query of state.queries) {
      console.log(`🔎 Searching for: "${query}"`);
      const results = await vectorStore.similaritySearch(query, 3);
      const processedDocs = results.map((doc: any) => ({
        document: {
          pageContent: doc.pageContent || (doc.metadata?.pageContent) || "",
          metadata: { source: doc.metadata?.source || doc.metadata?.metadata?.source || "", chunkId: doc.metadata?.chunkId || doc.metadata?.metadata?.chunkId || "" }
        } as Document,
        similarityScore: (doc.score ?? 0.0)
      }));
      allResults.push(...processedDocs);
  }
  
  const uniqueResults = Array.from(new Map(allResults.map(doc => [doc.document.pageContent, doc])).values());
  console.log(`📊 Total unique results: ${uniqueResults.length}`);
  return { retrieved_documents: uniqueResults, step: 'documents_retrieved' };
}, { name: 'retrieve_documents' });

const rerankDocuments = traceable(async (state: RAGState): Promise<Partial<RAGState>> => {
  console.log('🔄 Reranking documents...');
  const docsToRerank = state.retrieved_documents || [];
  if (docsToRerank.length === 0) return { reranked_documents: [], step: 'reranking_skipped' };
  const similarityThreshold = 0.8;

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

  // Rerank per dokumen secara paralel
  const rerankPromises = docsToRerank.map(async (doc, i) => {
    const docsStr = `Dokumen 1: ${doc.document.pageContent}`;
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
    const score = (rerankResult.rerankedDocuments && rerankResult.rerankedDocuments[0]?.similarityScore) || 0.0;
    return {
      document: doc.document,
      similarityScore: score
    };
  });

  // Jalankan semua rerank secara paralel
  const rerankedDocs: RetrievedDocument[] = (await Promise.all(rerankPromises))
    .filter(doc => doc.similarityScore >= similarityThreshold);

  console.log(`📊 Reranking complete: ${rerankedDocs.length} documents retained`);
  return { reranked_documents: rerankedDocs, step: 'documents_reranked' };
}, { name: 'rerank_documents' });

const generateAnswer = traceable(async (state: RAGState): Promise<Partial<RAGState>> => {
  console.log('💡 Generating answer...');
  
  // Robustly select documents: Use reranked if available and non-empty, otherwise fallback to retrieved.
  const documents = (state.reranked_documents && state.reranked_documents.length > 0)
    ? state.reranked_documents
    : state.retrieved_documents || [];
  
  if (documents.length === 0) return { answer: 'Maaf, saya tidak dapat menemukan informasi yang relevan untuk pertanyaan Anda.', step: 'no_documents' };
  
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

  const prompt = ANSWER_TEMPLATE
    .replace('{context}', contextText)
    .replace('{question}', state.question);
  
  const llm = await getCurrentLlm();
  const text = await invokeWithRetry(llm, [{ role: 'system', content: 'Anda adalah asisten cerdas yang membantu menjawab pertanyaan berdasarkan konteks.' }, { role: 'user', content: prompt }]);
  
  const answer = text.replace(/\(Sumber: Dokumen\s*\d+\)/g, '(Sumber: Badan Pusat Statistik)')
                     .replace(/\(Sumber: Dokumen\s*\[.*?\]\)/g, '(Sumber: Badan Pusat Statistik)');
                     
  const sources = documents.map(doc => doc.document.metadata?.source || 'Unknown source');
  console.log('✅ Answer generated successfully');
  return { answer, sources, context: documents, step: 'answer_generated' };
}, { name: 'generate_answer' });

// The main pipeline is also traceable, creating the root span.
const executeRAGPipelineTraceable = traceable(async (initialState: RAGState, vectorStore: MongoDBAtlasVectorSearch): Promise<RAGState> => {
  let state = { ...initialState };
  try {
    state = { ...state, ...(await generateQueries(state)) };
    state = { ...state, ...(await retrieveDocuments(state, vectorStore)) };
    state = { ...state, ...(await rerankDocuments(state)) };
    state = { ...state, ...(await generateAnswer(state)) };
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