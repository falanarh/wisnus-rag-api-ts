import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { Document } from './mdProcessor';
import { MongoDBAtlasVectorSearch } from '@langchain/mongodb';
import { getCurrentLlm, invokeWithRetry } from '../config/llm';
import { createRAGGraph, RAGState, RetrievedDocument } from './ragGraph';

// Kelas pembungkus untuk menyimpan instance LLM agar bisa diperbarui saat rotasi
export class LLMHolder {
  constructor(public llm: ChatGoogleGenerativeAI) {}
}

export interface State {
  question: string;
  context: RetrievedDocument[];
  answer: string;
  sources?: string[];
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

// Legacy functions for backward compatibility
export async function multiQueryRetrievalChain(
  state: State,
  vectorStore: MongoDBAtlasVectorSearch,
  llmHolder: LLMHolder,
  topK: number = 3,
  similarityThreshold: number = 0.8,
  fetchK: number = 20,
  lambdaMult: number = 0.5
): Promise<RetrievedDocument[]> {
  console.warn('⚠️ multiQueryRetrievalChain is deprecated. Use LangGraph-based RAG instead.');
  
  // Create initial RAG state
  const ragState: RAGState = {
    question: state.question,
    context: [],
    answer: '',
    step: 'initialized'
  };
  
  // Use LangGraph for retrieval
  const graph = createRAGGraph(vectorStore);
  const result = await graph.invoke(ragState);
  
  return result.context || [];
}

export async function retrieve(state: State, vectorStore: MongoDBAtlasVectorSearch, llmHolder: LLMHolder): Promise<State> {
  console.warn('⚠️ retrieve is deprecated. Use LangGraph-based RAG instead.');
  
  // Create initial RAG state
  const ragState: RAGState = {
    question: state.question,
    context: [],
    answer: '',
    step: 'initialized'
  };
  
  // Use LangGraph for retrieval
  const graph = createRAGGraph(vectorStore);
  const result = await graph.invoke(ragState);
  
  return {
    question: result.question,
    context: result.context || [],
    answer: result.answer,
    sources: result.sources
  };
}

export async function rerankNode(state: State, llmHolder: LLMHolder, similarityThreshold: number = 0.8): Promise<State> {
  console.warn('⚠️ rerankNode is deprecated. Use LangGraph-based RAG instead.');
  
  // Create RAG state with existing context
  const ragState: RAGState = {
    question: state.question,
    context: state.context,
    answer: '',
    retrieved_documents: state.context,
    step: 'documents_retrieved'
  };
  
  // Use LangGraph for reranking
  const graph = createRAGGraph({} as MongoDBAtlasVectorSearch); // Dummy vector store since we already have documents
  const result = await graph.invoke(ragState);
  
  return {
    question: result.question,
    context: result.context || [],
    answer: result.answer,
    sources: result.sources
  };
}

export async function generate(state: State, llmHolder: LLMHolder): Promise<State> {
  console.warn('⚠️ generate is deprecated. Use LangGraph-based RAG instead.');
  
  // Create RAG state with existing context
  const ragState: RAGState = {
    question: state.question,
    context: state.context,
    answer: '',
    reranked_documents: state.context,
    step: 'documents_reranked'
  };
  
  // Use LangGraph for answer generation
  const graph = createRAGGraph({} as MongoDBAtlasVectorSearch); // Dummy vector store since we already have documents
  const result = await graph.invoke(ragState);
  
  return {
    question: result.question,
    context: result.context || [],
    answer: result.answer,
    sources: result.sources
  };
}

// New LangGraph-based RAG chain
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
      console.log('🚀 Starting LangGraph-based RAG pipeline...');
      
      // Create initial RAG state
      const initialState: RAGState = {
        question: input.question,
        context: [],
        answer: '',
        step: 'initialized'
      };
      
      try {
        // Execute LangGraph workflow
        const graph = createRAGGraph(vectorStore);
        const result = await graph.invoke(initialState);
        
        console.log(`✅ LangGraph pipeline completed. Step: ${result.step}`);
        
        // Handle errors
        if (result.error) {
          console.error('❌ LangGraph pipeline error:', result.error);
          return {
            question: result.question,
            context: [],
            answer: `Maaf, terjadi kesalahan dalam memproses pertanyaan Anda: ${result.error}`
          };
        }
        
        // Transform to expected output format
        return {
          question: result.question,
          context: (result.context || []).map(doc => ({
            document: {
              id: null,
              metadata: doc.document.metadata,
              page_content: doc.document.pageContent,
              type: 'markdown'
            },
            similarity_score: doc.similarityScore
          })),
          answer: result.answer
        };
        
      } catch (error: any) {
        console.error('❌ Error in LangGraph pipeline:', error);
        return {
          question: input.question,
          context: [],
          answer: `Maaf, terjadi kesalahan dalam memproses pertanyaan Anda: ${error.message}`
        };
      }
    }
  };
}

// New function to get pipeline status and debugging info
export async function getRAGPipelineInfo(
  vectorStore: MongoDBAtlasVectorSearch,
  question: string
): Promise<{
  step: string;
  queries?: string[];
  retrievedCount?: number;
  rerankedCount?: number;
  error?: string;
}> {
  try {
    const initialState: RAGState = {
      question,
      context: [],
      answer: '',
      step: 'initialized'
    };
    
    const graph = createRAGGraph(vectorStore);
    const result = await graph.invoke(initialState);
    
    return {
      step: result.step || 'unknown',
      queries: result.queries,
      retrievedCount: result.retrieved_documents?.length,
      rerankedCount: result.reranked_documents?.length,
      error: result.error
    };
  } catch (error: any) {
    return {
      step: 'error',
      error: error.message
    };
  }
} 