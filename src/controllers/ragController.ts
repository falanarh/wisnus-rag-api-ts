import { Request, Response } from 'express';
import { MarkdownProcessor } from '../services/mdProcessor';
import { VectorStoreInitializer } from '../services/vectorStore';
import { createRagChain, LLMHolder } from '../services/ragService';
import { getCurrentLlm } from '../config/llm';
import { QuestionRequest } from '../models/questionRequest';

let ragChain: any = null;
let ragVectorStore: any = null;
let llmHolder: LLMHolder | null = null;
const isStreaming = false;

// Internal initialization function that doesn't require response object
export const initializeRagSystem = async (): Promise<void> => {
  try {
    // Pastikan untuk await pemanggilan getCurrentLlm() agar instance yang dihasilkan bukan coroutine
    const llm = await getCurrentLlm();
    llmHolder = new LLMHolder(llm);
    
    // Proses dokumen PDF
    const processor = new MarkdownProcessor();
    const docs = processor.processMarkdowns();
    
    const vectorStoreInitializer = new VectorStoreInitializer();
    ragVectorStore = vectorStoreInitializer.initializeVectorStore();
    
    // Check if collection is empty and add documents
    const collection = ragVectorStore.collection;
    const count = await collection.countDocuments({});
    if (count === 0) {
      await ragVectorStore.addDocuments(docs);
    }

    // Buat RAG chain dengan vector_store dan llm_holder
    ragChain = createRagChain(ragVectorStore, llmHolder, isStreaming);
    
    console.log('RAG system initialized successfully');
  } catch (error: any) {
    console.error(`Initialization failed: ${error.message}`);
    throw error;
  }
};

export const healthCheck = async (_req: Request, res: Response) => {
  try {
    res.json({
      status: 'healthy',
      message: 'Wisnus RAG API is running',
      rag_initialized: ragChain !== null,
      vector_store_ready: ragVectorStore !== null,
      llm_ready: llmHolder !== null
    });
  } catch (error: any) {
    res.status(500).json({ error: `Health check failed: ${error.message}` });
  }
};

export const initializeRag = async (_req: Request, res: Response) => {
  try {
    await initializeRagSystem();
    res.json({ message: 'RAG system initialized' });
  } catch (error: any) {
    res.status(500).json({ error: `Initialization failed: ${error.message}` });
  }
};

export const askQuestion = async (req: Request, res: Response) => {
  if (!ragChain) {
    return res.status(400).json({ error: 'RAG not initialized' });
  }
  
  try {
    const { question } = req.body as QuestionRequest;
    
    if (!question || question.trim() === '') {
      return res.status(400).json({ error: 'Question is required' });
    }
    
    if (isStreaming) {
      // Set headers for streaming response
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      
      // Create streaming response
      const stream = ragChain.astream({ question }, { streamMode: 'messages' });
      
      for await (const chunk of stream) {
        if (chunk.metadata?.langgraph_node === 'generate') {
          // Encode to bytes for streaming (similar to Python version)
          const encodedChunk = Buffer.from(chunk.content, 'utf-8');
          res.write(encodedChunk);
        }
      }
      
      res.end();
    } else {
      const result = await ragChain.invoke({ question });
      // Return the complete response structure
      res.json(result);
    }
  } catch (error: any) {
    console.error('Error in askQuestion:', error);
    
    // Handle specific error types
    const errorMessage = error.toString();
    
    if (errorMessage.includes('503') || errorMessage.includes('overloaded')) {
      res.status(503).json({ 
        error: 'Service temporarily unavailable. The AI model is currently overloaded. Please try again in a few moments.',
        details: errorMessage,
        retry_after: 30 // seconds
      });
    } else if (errorMessage.includes('429')) {
      res.status(429).json({ 
        error: 'Rate limit exceeded. Please try again later.',
        details: errorMessage,
        retry_after: 60 // seconds
      });
    } else if (errorMessage.includes('timeout')) {
      res.status(408).json({ 
        error: 'Request timeout. The request took too long to process. Please try again.',
        details: errorMessage
      });
    } else if (errorMessage.includes('All retry attempts')) {
      res.status(503).json({ 
        error: 'All AI models are currently unavailable. Please try again later.',
        details: errorMessage,
        retry_after: 120 // seconds
      });
    } else {
      res.status(500).json({ 
        error: 'Internal server error occurred while processing your question.',
        details: errorMessage
      });
    }
  }
}; 