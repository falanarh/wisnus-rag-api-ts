import { Request, Response } from 'express';
import { MarkdownProcessor } from '../services/mdProcessor';
import { VectorStoreInitializer } from '../services/vectorStore';
import { createRagChain, LLMHolder } from '../services/ragService';
import { getCurrentLlm } from '../config/llm';
import { QuestionRequest } from '../models/questionRequest';
import { MongoClient } from 'mongodb';

let ragChain: any = null;
let ragVectorStore: any = null;
let llmHolder: LLMHolder | null = null;
let isInitializing: boolean = false;
let lastInitializationCheck: number = 0;
const INITIALIZATION_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes

// Internal initialization function that doesn't require response object
export const initializeRagSystem = async (force: boolean = false): Promise<void> => {
  // Prevent concurrent initialization
  if (isInitializing) {
    console.log('⏳ RAG system is already initializing, waiting...');
    while (isInitializing) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    return;
  }

  // Check if initialization is needed (unless forced)
  if (!force) {
    const now = Date.now();
    if (now - lastInitializationCheck < INITIALIZATION_CHECK_INTERVAL) {
      console.log('ℹ️ Skipping initialization check (recently checked)');
      return;
    }
    
    const vectorStoreInitializer = new VectorStoreInitializer();
    const needsInit = await vectorStoreInitializer.isInitializationNeeded();
    
    if (!needsInit && ragChain) {
      console.log('✅ RAG system already initialized and database has documents');
      lastInitializationCheck = now;
      return;
    }
  }

  isInitializing = true;
  lastInitializationCheck = Date.now();

  try {
    console.log('🚀 Initializing RAG system...');
    
    // Initialize LLM
    const llm = await getCurrentLlm();
    llmHolder = new LLMHolder(llm);
    console.log('✅ LLM initialized');
    
    // Process markdown documents
    const processor = new MarkdownProcessor();
    const docs = processor.processMarkdowns();
    console.log(`📚 Processed ${docs.length} document chunks`);
    
    // Initialize vector store
    const vectorStoreInitializer = new VectorStoreInitializer();
    ragVectorStore = await vectorStoreInitializer.initializeVectorStore();
    
    // Add documents only if they don't exist (avoid duplicate embeddings)
    const result = await vectorStoreInitializer.addDocumentsIfNotExists(docs);
    console.log(`📊 Document addition result: ${result.added} added, ${result.skipped} skipped`);
    
    // Create RAG chain
    ragChain = createRagChain(ragVectorStore, llmHolder);
    console.log('✅ RAG system initialized successfully!');
    
  } catch (error: any) {
    console.error('❌ Initialization failed:', error.message);
    throw error;
  } finally {
    isInitializing = false;
  }
};

export const getHealthStatus = async (_req: Request, res: Response): Promise<void> => {
  res.json({ 
    status: 'healthy',
    ragInitialized: !!ragChain,
    timestamp: new Date().toISOString()
  });
};

export const initializeRag = async (req: Request, res: Response): Promise<void> => {
  try {
    const { force = false } = req.body;
    
    if (force) {
      console.log('🔄 Force initialization requested');
    }
    
    await initializeRagSystem(force);
    res.json({ 
      message: 'RAG system initialized',
      force: force,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({ error: `Initialization failed: ${error.message}` });
  }
};

export const askQuestion = async (req: Request, res: Response): Promise<void> => {
  try {
    const { question } = req.body as QuestionRequest;
    
    if (!question || question.trim() === '') {
      res.status(400).json({ error: 'Question is required' });
      return;
    }
    
    // Auto-initialize RAG system if not initialized
    if (!ragChain) {
      console.log('🔄 RAG system not initialized. Auto-initializing...');
      try {
        await initializeRagSystem();
        console.log('✅ RAG system auto-initialized successfully!');
      } catch (initError: any) {
        console.error('❌ Auto-initialization failed:', initError.message);
        res.status(503).json({ 
          error: 'RAG system is not ready. Please try again in a few moments.',
          details: 'Auto-initialization failed',
          retry_after: 30
        });
        return;
      }
    }
    
    const result = await ragChain.invoke({ question });
    // Return the complete response structure
    res.json(result);
    
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

export const runConcurrentTest = async (req: Request, res: Response): Promise<void> => {
  try {
    const { numRequests = 5 } = req.body;
    
    // Import and run the test function
    const { runConcurrentTest } = require('../../test-concurrent.js');
    const result = await runConcurrentTest(numRequests);
    
    res.json({
      success: true,
      testType: 'concurrent',
      numRequests,
      result
    });
    
  } catch (error: any) {
    console.error('Error in concurrent test:', error);
    res.status(500).json({ 
      error: 'Failed to run concurrent test',
      details: error.message 
    });
  }
};

export const getDatabaseStatus = async (_req: Request, res: Response): Promise<void> => {
  try {
    const vectorStoreInitializer = new VectorStoreInitializer();
    
    // Get detailed database statistics
    const stats = await vectorStoreInitializer.getDatabaseStats();
    
    // Check if initialization is needed
    const needsInit = await vectorStoreInitializer.isInitializationNeeded();
    
    res.json({
      status: 'success',
      totalDocuments: stats.totalDocuments,
      sourceBreakdown: stats.sourceBreakdown,
      lastUpdated: stats.lastUpdated,
      ragInitialized: !!ragChain,
      needsInitialization: needsInit,
      isInitializing: isInitializing,
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('Error getting database status:', error);
    res.status(500).json({ 
      error: 'Failed to get database status',
      details: error.message 
    });
  }
}; 