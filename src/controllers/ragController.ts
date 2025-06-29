import { Request, Response } from 'express';
import { MarkdownProcessor } from '../services/mdProcessor';
import { VectorStoreInitializer } from '../services/vectorStore';
import { createRagChain, LLMHolder, getRAGPipelineInfo } from '../services/ragService';
import { getCurrentLlm } from '../config/llm';
import { QuestionRequest } from '../models/questionRequest';
import { MongoClient } from 'mongodb';

let ragChain: any = null;
let ragVectorStore: any = null;
let llmHolder: LLMHolder | null = null;

// Internal initialization function that doesn't require response object
export const initializeRagSystem = async (): Promise<void> => {
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
  }
};

export const getHealthStatus = async (_req: Request, res: Response): Promise<void> => {
  res.json({ 
    status: 'healthy',
    ragInitialized: !!ragChain,
    timestamp: new Date().toISOString()
  });
};

export const initializeRag = async (_req: Request, res: Response): Promise<void> => {
  try {
    await initializeRagSystem();
    res.json({ message: 'RAG system initialized' });
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
    
    console.log(`🧪 Starting concurrent test with ${numRequests} requests...`);
    
    // Validate input
    if (numRequests < 1 || numRequests > 50) {
      res.status(400).json({
        success: false,
        error: 'Invalid number of requests. Must be between 1 and 50.',
        message: 'Please provide a valid number of requests'
      });
      return;
    }
    
    // Define types for request results
    interface RequestResult {
      requestId: number;
      status: 'success' | 'error' | 'promise_rejected';
      executionTime: number;
      question?: string;
      answerLength?: number;
      contextCount?: number;
      error?: string;
    }
    
    // Sample questions for testing
    const testQuestions = [
      'apa yang dimaksud dengan ekowisata?',
      'jelaskan tentang wisata bahari',
      'apa itu wisata petualangan?',
      'bagaimana cara melakukan survei wisatawan?',
      'apa saja jenis kegiatan wisata?',
      'jelaskan tentang wisata sejarah dan religi',
      'apa yang dimaksud dengan wisata kuliner?',
      'bagaimana karakteristik wisata kota dan pedesaan?',
      'apa itu wisata MICE?',
      'jelaskan tentang wisata olahraga dan kesehatan'
    ];
    
    // Helper function to get random question
    const getRandomQuestion = (): string => {
      return testQuestions[Math.floor(Math.random() * testQuestions.length)];
    };
    
    // Helper function to measure execution time
    const measureExecutionTime = async (fn: () => Promise<any>) => {
      const start = Date.now();
      const result = await fn();
      const end = Date.now();
      return { result, executionTime: end - start };
    };
    
    // Single request function
    const makeSingleRequest = async (question: string, requestId: number): Promise<RequestResult> => {
      try {
        console.log(`🚀 Request ${requestId}: Starting request for "${question.substring(0, 30)}..."`);
        
        // Auto-initialize RAG system if not initialized
        if (!ragChain) {
          console.log('🔄 RAG system not initialized. Auto-initializing...');
          await initializeRagSystem();
          console.log('✅ RAG system auto-initialized successfully!');
        }
        
        const response = await measureExecutionTime(async () => {
          const result = await ragChain.invoke({
            question: question
          });
          return result;
        });
        
        console.log(`✅ Request ${requestId}: Success (${response.executionTime}ms)`);
        
        return {
          requestId,
          status: 'success',
          executionTime: response.executionTime,
          question: question,
          answerLength: response.result.answer?.length || 0,
          contextCount: response.result.context?.length || 0
        };
        
      } catch (error: any) {
        console.log(`❌ Request ${requestId}: Failed`);
        console.log(`   Error: ${error.message}`);
        
        return {
          requestId,
          status: 'error',
          error: error.message,
          executionTime: 0
        };
      }
    };
    
    // Create array of promises for concurrent execution
    const requests: Promise<RequestResult>[] = [];
    for (let i = 1; i <= numRequests; i++) {
      const question = getRandomQuestion();
      requests.push(makeSingleRequest(question, i));
    }
    
    // Execute all requests concurrently
    const startTime = Date.now();
    const results = await Promise.allSettled(requests);
    const endTime = Date.now();
    const totalTime = endTime - startTime;
    
    // Process results
    const successfulRequests: RequestResult[] = [];
    const failedRequests: RequestResult[] = [];
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        if (result.value.status === 'success') {
          successfulRequests.push(result.value);
        } else {
          failedRequests.push(result.value);
        }
      } else {
        failedRequests.push({
          requestId: index + 1,
          status: 'promise_rejected',
          error: result.reason?.message || 'Unknown error',
          executionTime: 0
        });
      }
    });
    
    // Calculate statistics
    const successRate = (successfulRequests.length / numRequests) * 100;
    const avgExecutionTime = successfulRequests.length > 0 
      ? successfulRequests.reduce((sum, req) => sum + req.executionTime, 0) / successfulRequests.length 
      : 0;
    
    const result = {
      totalRequests: numRequests,
      successful: successfulRequests.length,
      failed: failedRequests.length,
      successRate,
      totalTime,
      avgExecutionTime,
      minTime: successfulRequests.length > 0 ? Math.min(...successfulRequests.map(r => r.executionTime)) : 0,
      maxTime: successfulRequests.length > 0 ? Math.max(...successfulRequests.map(r => r.executionTime)) : 0,
      throughput: numRequests / (totalTime / 1000),
      details: {
        successful: successfulRequests,
        failed: failedRequests
      }
    };
    
    console.log('\n📊 CONCURRENT TEST RESULTS');
    console.log('=' .repeat(50));
    console.log(`Total Requests: ${result.totalRequests}`);
    console.log(`Successful: ${result.successful}`);
    console.log(`Failed: ${result.failed}`);
    console.log(`Success Rate: ${result.successRate.toFixed(1)}%`);
    console.log(`Total Time: ${result.totalTime}ms`);
    console.log(`Average Execution Time: ${result.avgExecutionTime.toFixed(0)}ms`);
    console.log(`Throughput: ${result.throughput.toFixed(2)} requests/second`);
    
    res.json({
      success: true,
      testType: 'concurrent',
      numRequests,
      result,
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('Error in concurrent test:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to run concurrent test',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

export const getDatabaseStatus = async (_req: Request, res: Response): Promise<void> => {
  try {
    const vectorStoreInitializer = new VectorStoreInitializer();
    
    // Get database connection
    const client = new MongoClient(vectorStoreInitializer['mongodbUri']);
    await client.connect();
    
    const collection = client.db(vectorStoreInitializer['mongodbDbName'])
                           .collection(vectorStoreInitializer['mongodbCollectionName']);
    
    // Get total documents count
    const totalCount = await collection.countDocuments({});
    
    // Get documents by source
    const pipeline = [
      {
        $group: {
          _id: '$metadata.source',
          count: { $sum: 1 }
        }
      }
    ];
    
    const sourceStats = await collection.aggregate(pipeline).toArray();
    
    await client.close();
    
    res.json({
      status: 'success',
      totalDocuments: totalCount,
      sourceBreakdown: sourceStats,
      ragInitialized: !!ragChain,
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

export const getPipelineInfo = async (req: Request, res: Response): Promise<void> => {
  try {
    const { question } = req.query as { question: string };
    
    if (!question || question.trim() === '') {
      res.status(400).json({ error: 'Question parameter is required' });
      return;
    }
    
    // Auto-initialize RAG system if not initialized
    if (!ragVectorStore) {
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
    
    const pipelineInfo = await getRAGPipelineInfo(ragVectorStore, question);
    
    res.json({
      success: true,
      question,
      pipelineInfo,
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('Error getting pipeline info:', error);
    res.status(500).json({ 
      error: 'Failed to get pipeline information',
      details: error.message 
    });
  }
};

// Generate embeddings for existing documents without embeddings
export const generateEmbeddingsForExisting = async (req: Request, res: Response): Promise<void> => {
  try {
    const { batchSize = 10 } = req.body;
    
    console.log('🔄 Starting embedding generation for existing documents...');
    
    const vectorStoreInitializer = new VectorStoreInitializer();
    const result = await vectorStoreInitializer.generateEmbeddingsForExistingDocuments(batchSize);
    
    res.json({
      success: true,
      data: result,
      message: `Embedding generation completed: ${result.processed} processed, ${result.failed} failed`
    });
  } catch (error: any) {
    console.error('Error generating embeddings for existing documents:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to generate embeddings for existing documents'
    });
  }
};

// Check and fix embeddings for all documents
export const checkAndFixEmbeddings = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('🔍 Checking and fixing embeddings for all documents...');
    
    const vectorStoreInitializer = new VectorStoreInitializer();
    const result = await vectorStoreInitializer.checkAndFixEmbeddings();
    
    res.json({
      success: true,
      data: result,
      message: `Embedding check completed: ${result.totalDocuments} total, ${result.withoutEmbeddings} without embeddings, ${result.processed} processed, ${result.failed} failed`
    });
  } catch (error: any) {
    console.error('Error checking and fixing embeddings:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to check and fix embeddings'
    });
  }
};

// Get documents without embeddings
export const getDocumentsWithoutEmbeddings = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('📋 Finding documents without embeddings...');
    
    const vectorStoreInitializer = new VectorStoreInitializer();
    const documents = await vectorStoreInitializer.findDocumentsWithoutEmbeddings();
    
    res.json({
      success: true,
      data: {
        count: documents.length,
        documents: documents.map(doc => ({
          chunkId: doc.metadata.chunkId,
          source: doc.metadata.source,
          pageContent: doc.pageContent.substring(0, 100) + '...' // Truncate for preview
        }))
      },
      message: `Found ${documents.length} documents without embeddings`
    });
  } catch (error: any) {
    console.error('Error finding documents without embeddings:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to find documents without embeddings'
    });
  }
} 