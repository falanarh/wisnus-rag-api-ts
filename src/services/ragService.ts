import { GoogleGenerativeAI } from '@google/generative-ai';
import { Document } from './mdProcessor';
import { MongoDBAtlasVectorSearch } from '@langchain/mongodb';
import { geminiKeys, getCurrentLlm, getNextLlm, invokeWithRetry } from '../config/llm';

// Kelas pembungkus untuk menyimpan instance LLM agar bisa diperbarui saat rotasi
export class LLMHolder {
  constructor(public llm: GoogleGenerativeAI) {}
}

// Template prompt untuk menghasilkan jawaban
const ANSWER_TEMPLATE = `
Anda adalah asisten yang hanya boleh menjawab pertanyaan berdasarkan potongan konteks yang disediakan di bawah ini. Ikuti instruksi berikut dengan cermat:

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

Jawaban yang Bermanfaat:
`;

export interface RetrievedDocument {
  document: Document;
  similarityScore: number;
}

export interface State {
  question: string;
  context: RetrievedDocument[];
  answer: string;
}

export interface Search {
  queries: string[];
}

export interface RerankDocument {
  document: string;
  similarityScore: number;
}

export interface RerankResult {
  rerankedDocuments: RerankDocument[];
}

// Helper function untuk memanggil LLM secara aman dengan rotasi API key bila terjadi error 429
export async function safeLlmInvoke(llmHolder: LLMHolder, messages: any): Promise<any> {
  try {
    return await invokeWithRetry(llmHolder.llm, messages);
  } catch (error: any) {
    console.error('All retry attempts failed in safeLlmInvoke:', error);
    throw error;
  }
}

// Helper function untuk membersihkan teks sumber yang tidak diharapkan
export function cleanSourceText(text: string): string {
  // Replace "(Sumber: Dokumen [nomor])" with "(Sumber: Badan Pusat Statistik)"
  const cleanedText = text.replace(/\(Sumber: Dokumen\s*\d+\)/g, '(Sumber: Badan Pusat Statistik)');
  
  // Also replace any other variations of document source
  const finalText = cleanedText.replace(/\(Sumber: Dokumen\s*\[.*?\]\)/g, '(Sumber: Badan Pusat Statistik)');
  
  return finalText;
}

export async function multiQueryRetrievalChain(
  state: State,
  vectorStore: MongoDBAtlasVectorSearch,
  llmHolder: LLMHolder,
  topK: number = 3,
  similarityThreshold: number = 0.8,
  fetchK: number = 20,
  lambdaMult: number = 0.5
): Promise<RetrievedDocument[]> {
  const systemPrompt = `
    Anda adalah ahli pembuatan kueri penelusuran untuk mengekstrak informasi relevan dari basis data vektor. Berdasarkan pertanyaan pengguna, buat EMPAT kueri berbeda dengan langkah berikut:
    1. Ekstrak kata kunci utama dari pertanyaan.
    2. Buat:
    - Query 1: Format "[kata kunci]?" 
        (Contoh: Dari "Apa definisi dari eko wisata dalam survei ini?" ambil "eko wisata" sehingga menjadi "Eko wisata?")
    - Query 2: Format "Apa itu [kata kunci]?" 
        (Contoh: "Apa itu eko wisata?")
    - Query 3: Format "Jelaskan tentang [kata kunci]?" 
        (Contoh: "Jelaskan tentang eko wisata?")
    - Query 4: Format "Definisi dari [kata kunci]" (TANPA TANDA TANYA)
        (Contoh: "Definisi dari eko wisata")
    3. Pastikan Anda membuat tepat EMPAT kueri.
  `;

  const userPrompt = `
    Buatkan empat query untuk pertanyaan berikut: "${state.question}".
  `;

  // Generate queries using LLM with structured output
  const model = llmHolder.llm.getGenerativeModel({ model: 'gemini-2.0-flash-lite' });
  
  // Pemanggilan LLM dengan rotasi API key secara terus-menerus bila terjadi error 429
  let response: any;
  while (true) {
    try {
      const result = await model.generateContent([systemPrompt, userPrompt]);
      response = await result.response;
      break;
    } catch (error: any) {
      const errorMessage = error.toString();
      if (errorMessage.includes('429')) {
        // Rotasi LLM secara asinkron untuk mengganti API key
        llmHolder.llm = await getNextLlm();
      } else {
        throw error;
      }
    }
  }
  
  const text = response.text();
  
  // Parse the response to extract queries (improved parsing)
  const lines = text.split('\n').map((line: string) => line.trim()).filter((line: string) => line.length > 0);
  const queries: string[] = [];
  
  for (const line of lines) {
    // Look for lines that contain "Query" followed by a number
    const queryMatch = line.match(/Query\s*\d+:\s*(.+)/i);
    if (queryMatch && queryMatch[1]) {
      const query = queryMatch[1].trim();
      // Clean up the query - remove quotes and extra formatting
      const cleanQuery = query.replace(/^["']|["']$/g, '').replace(/^\*\s*/, '').trim();
      if (cleanQuery && cleanQuery.length > 0) {
        queries.push(cleanQuery);
      }
    }
  }
  
  // If we don't have enough queries, use fallback queries
  if (queries.length < 4) {
    console.log(`⚠️ Only got ${queries.length} queries from LLM, using fallback queries`);
    
    // Extract keywords from the original question
    const keywords = state.question
      .replace(/[^\w\s]/g, '')
      .split(' ')
      .filter(word => word.length > 3)
      .slice(0, 3);
    
    const mainKeyword = keywords[0] || state.question.split(' ')[0];
    
    const fallbackQueries = [
      `${mainKeyword}?`,
      `Apa itu ${mainKeyword}?`,
      `Jelaskan tentang ${mainKeyword}?`,
      `Definisi dari ${mainKeyword}`
    ];
    
    // Add fallback queries to fill up to 4
    for (let i = queries.length; i < 4; i++) {
      queries.push(fallbackQueries[i - queries.length] || fallbackQueries[0]);
    }
  }
  
  console.log(`🔍 Generated queries: ${queries.join(', ')}`);

  // Fetch results for each query
  const allResults: RetrievedDocument[] = [];
  
  for (const query of queries) {
    try {
      console.log(`🔎 Searching for: "${query}"`);
      const results = await vectorStore.similaritySearch(query, topK);
      const processedDocs = results.map((doc: any) => ({
        document: {
          pageContent: doc.pageContent,
          metadata: doc.metadata
        } as Document,
        similarityScore: 0.0
      }));
      allResults.push(...processedDocs);
      console.log(`✅ Found ${results.length} results for query: "${query}"`);
    } catch (error) {
      console.error(`❌ Error fetching results for query: "${query}"`, error);
    }
  }

  // Deduplication based on content
  const uniqueResults: RetrievedDocument[] = [];
  const seenContents = new Set<string>();
  
  for (const docEntry of allResults) {
    const content = docEntry.document.pageContent;
    if (!seenContents.has(content)) {
      seenContents.add(content);
      uniqueResults.push(docEntry);
    }
  }

  console.log(`📊 Total unique results: ${uniqueResults.length}`);
  return uniqueResults;
}

export async function retrieve(state: State, vectorStore: MongoDBAtlasVectorSearch, llmHolder: LLMHolder): Promise<State> {
  const context = await multiQueryRetrievalChain(state, vectorStore, llmHolder);
  return { ...state, context };
}

export async function rerankNode(state: State, llmHolder: LLMHolder, similarityThreshold: number = 0.8): Promise<State> {
  if (state.context.length === 0) {
    return state;
  }

  const systemPrompt = `
    Anda adalah ahli dalam mengevaluasi relevansi dokumen terhadap pertanyaan. Tugas Anda adalah memberikan skor similarity (0.0 - 1.0) untuk setiap dokumen berdasarkan seberapa relevan dokumen tersebut terhadap pertanyaan yang diberikan.

    Pertimbangkan aspek berikut dalam penilaian:
    1. Relevansi topik dan konsep
    2. Kesesuaian informasi dengan pertanyaan
    3. Kelengkapan informasi yang dibutuhkan
    4. Keakuratan dan keandalan informasi

    Berikan skor dalam format JSON dengan struktur:
    {
      "rerankedDocuments": [
        {
          "document": "isi dokumen",
          "similarityScore": 0.85
        }
      ]
    }
  `;

  const docsStr = state.context.map((doc, i) => 
    `Dokumen ${i + 1}: ${doc.document.pageContent}`
  ).join('\n\n');

  const userPrompt = `
    - Pertanyaan:
    ${state.question}
    - Dokumen untuk direrank:
    ${docsStr}
  `;

  // Pemanggilan LLM dengan rotasi API key secara terus-menerus bila terjadi error 429
  let rerankResult: RerankResult;
  while (true) {
    try {
      const model = llmHolder.llm.getGenerativeModel({ model: 'gemini-2.0-flash-lite' });
      const result = await model.generateContent([systemPrompt, userPrompt]);
      const response = await result.response;
      const text = response.text();
      
      // Parse JSON response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        rerankResult = JSON.parse(jsonMatch[0]);
      } else {
        // Fallback: use original context with default scores
        rerankResult = {
          rerankedDocuments: state.context.map(doc => ({
            document: doc.document.pageContent,
            similarityScore: 0.5
          }))
        };
      }
      break;
    } catch (error: any) {
      const errorMessage = error.toString();
      if (errorMessage.includes('429')) {
        // Rotasi LLM secara asinkron untuk mengganti API key
        llmHolder.llm = await getNextLlm();
      } else {
        // Fallback: use original context with default scores
        rerankResult = {
          rerankedDocuments: state.context.map(doc => ({
            document: doc.document.pageContent,
            similarityScore: 0.5
          }))
        };
        break;
      }
    }
  }

  // Konversi hasil rerank ke format state semula
  const newContext: RetrievedDocument[] = [];
  for (const doc of rerankResult.rerankedDocuments) {
    // Lakukan filtering berdasarkan similarity score
    if (doc.similarityScore < similarityThreshold) {
      continue;
    }
    const newDoc: Document = {
      pageContent: doc.document,
      metadata: { source: 'reranked', chunkId: 'unknown' }
    };
    newContext.push({
      document: newDoc,
      similarityScore: doc.similarityScore
    });
  }

  // Perbarui state dengan dokumen yang direrank
  return { ...state, context: newContext };
}

export async function generate(state: State, llmHolder: LLMHolder): Promise<State> {
  // Menggabungkan isi dokumen dan menambahkan skor similarity untuk setiap dokumen
  const docsContent = state.context.map((doc, i) => 
    `Dokumen ${i + 1}: ${doc.document.pageContent} (Similarity: ${doc.similarityScore.toFixed(4)})`
  ).join('\n\n');
  
  const prompt = ANSWER_TEMPLATE
    .replace('{context}', docsContent)
    .replace('{question}', state.question);

  const result = await safeLlmInvoke(llmHolder, prompt);
  const rawAnswer = result.response.text();
  
  // Clean the answer text to replace unwanted source references
  const cleanedAnswer = cleanSourceText(rawAnswer);
  
  return { ...state, answer: cleanedAnswer };
}

export function createRagChain(
  vectorStore: MongoDBAtlasVectorSearch, 
  llmHolder: LLMHolder
) {
  return {
    async invoke(input: { question: string }): Promise<{ 
      question: string; 
      context: Array<{
        document: {
          id: string | null;
          metadata: any;
          page_content: string;
          type: string;
        };
        similarity_score: number;
      }>; 
      answer: string; 
    }> {
      const state: State = { question: input.question, context: [], answer: '' };
      
      // Retrieve relevant documents
      const retrievedState = await retrieve(state, vectorStore, llmHolder);
      
      // Rerank documents
      const rerankedState = await rerankNode(retrievedState, llmHolder);
      
      // Generate answer
      const finalState = await generate(rerankedState, llmHolder);
      
      // Transform to expected output format
      return {
        question: finalState.question,
        context: finalState.context.map(doc => ({
          document: {
            id: null,
            metadata: doc.document.metadata,
            page_content: doc.document.pageContent,
            type: 'markdown'
          },
          similarity_score: doc.similarityScore
        })),
        answer: finalState.answer
      };
    }
  };
}