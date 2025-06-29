import { MongoClient } from 'mongodb';
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { MongoDBAtlasVectorSearch } from '@langchain/mongodb';
import { Document } from './mdProcessor';
import { createHash } from 'crypto';
import { Settings } from '../configuration';

export class VectorStoreInitializer {
  private geminiApiKey: string;
  private mongodbUri: string;
  private mongodbDbName: string;
  private mongodbCollectionName: string;
  private indexName: string;

  constructor() {
    // Get first available Gemini API key
    const apiKeys = Settings.getGeminiApiKeys();
    if (apiKeys.length === 0) {
      throw new Error('No Gemini API keys found. Please set GEMINI_API_KEY_1 in your environment variables.');
    }
    this.geminiApiKey = apiKeys[0];
    
    this.mongodbUri = Settings.MONGO_URI;
    this.mongodbDbName = Settings.MONGO_DB_NAME;
    this.mongodbCollectionName = Settings.MONGO_COLLECTION_NAME;
    this.indexName = 'vector_index';
    
    console.log(`🔧 VectorStore Initializer configured:`);
    console.log(`   MongoDB URI: ${this.mongodbUri}`);
    console.log(`   Database: ${this.mongodbDbName}`);
    console.log(`   Collection: ${this.mongodbCollectionName}`);
    console.log(`   API Key: ${this.geminiApiKey.substring(0, 8)}...`);
  }

  // Generate content hash for deduplication
  private generateContentHash(content: string, metadata: any): string {
    const contentToHash = `${content}_${metadata.source}_${metadata.chunkId}`;
    return createHash('sha256').update(contentToHash).digest('hex');
  }

  async initializeVectorStore(): Promise<MongoDBAtlasVectorSearch> {
    if (!this.geminiApiKey || !this.mongodbUri || 
        !this.mongodbDbName || !this.mongodbCollectionName) {
      throw new Error('Missing required environment variables');
    }

    // Initialize embeddings
    const embeddings = new GoogleGenerativeAIEmbeddings({
      modelName: 'models/embedding-001',
      apiKey: this.geminiApiKey,
    });

    try {
      // Create MongoDB client
      const client = new MongoClient(this.mongodbUri);
      await client.connect();
      console.log('✅ MongoDB connection successful');
      
      const collection = client.db(this.mongodbDbName).collection(this.mongodbCollectionName);

      // Ensure collection has all required methods by creating a proper wrapper
      const collectionWrapper = {
        ...collection,
        timeoutMS: 30000,
        aggregate: collection.aggregate.bind(collection),
        find: collection.find.bind(collection),
        findOne: collection.findOne.bind(collection),
        insertMany: collection.insertMany.bind(collection),
        countDocuments: collection.countDocuments.bind(collection),
        deleteMany: collection.deleteMany.bind(collection)
      } as any;

      // Initialize MongoDB Atlas Vector Store
      const vectorStore = new MongoDBAtlasVectorSearch(embeddings, {
        collection: collectionWrapper,
        indexName: this.indexName,
      });

      console.log('✅ Vector store initialized successfully');
      console.log('⚠️ Embedding generation and checking disabled - assuming embeddings already exist');
      return vectorStore;
      
    } catch (error) {
      console.error('❌ Failed to initialize vector store:', error);
      throw error;
    }
  }

  // DISABLED: Enhanced method to check if documents already exist using content hash
  async checkExistingDocuments(documents: Document[]): Promise<{ existing: Document[], newDocs: Document[] }> {
    console.log('⚠️ Document checking disabled - assuming all documents already exist');
    return { existing: documents, newDocs: [] };
  }

  // DISABLED: Enhanced method to add only new documents with content hash
  async addDocumentsIfNotExists(documents: Document[]): Promise<{ added: number, skipped: number }> {
    console.log('⚠️ Document addition disabled - assuming all documents already exist');
    console.log(`📊 Skipping ${documents.length} documents (embeddings assumed to exist)`);
    return { added: 0, skipped: documents.length };
  }

  // Method to check if initialization is needed
  async isInitializationNeeded(): Promise<boolean> {
    try {
      const client = new MongoClient(this.mongodbUri);
      await client.connect();
      
      const collection = client.db(this.mongodbDbName).collection(this.mongodbCollectionName);
      
      // Check if collection exists and has documents
      const documentCount = await collection.countDocuments({});
      
      await client.close();
      
      console.log(`📊 Database contains ${documentCount} documents`);
      return documentCount === 0;
      
    } catch (error) {
      console.error('❌ Error checking initialization status:', error);
      return true; // Assume initialization is needed if check fails
    }
  }

  // Method to get database statistics
  async getDatabaseStats(): Promise<{
    totalDocuments: number;
    sourceBreakdown: any[];
    lastUpdated?: Date;
  }> {
    try {
      const client = new MongoClient(this.mongodbUri);
      await client.connect();
      
      const collection = client.db(this.mongodbDbName).collection(this.mongodbCollectionName);
      
      // Get total document count
      const totalDocuments = await collection.countDocuments({});
      
      // Get source breakdown
      const sourceBreakdown = await collection.aggregate([
        {
          $group: {
            _id: '$metadata.source',
            count: { $sum: 1 }
          }
        },
        {
          $sort: { count: -1 }
        }
      ]).toArray();
      
      // Get last updated document
      const lastDocument = await collection.findOne(
        {},
        { sort: { createdAt: -1 } }
      );
      
      await client.close();
      
      return {
        totalDocuments,
        sourceBreakdown: sourceBreakdown.map(item => ({
          source: item._id,
          count: item.count
        })),
        lastUpdated: lastDocument?.createdAt
      };
      
    } catch (error) {
      console.error('❌ Error getting database stats:', error);
      return {
        totalDocuments: 0,
        sourceBreakdown: []
      };
    }
  }

  // DISABLED: Method to find documents without embeddings
  async findDocumentsWithoutEmbeddings(): Promise<Document[]> {
    console.log('⚠️ Embedding checking disabled - assuming all documents have embeddings');
    return [];
  }

  // DISABLED: Method to generate embeddings for existing documents
  async generateEmbeddingsForExistingDocuments(batchSize: number = 10): Promise<{ processed: number, failed: number }> {
    console.log('⚠️ Embedding generation disabled - assuming all documents already have embeddings');
    return { processed: 0, failed: 0 };
  }

  // DISABLED: Method to check and fix embeddings
  async checkAndFixEmbeddings(): Promise<{ totalDocuments: number, withoutEmbeddings: number, processed: number, failed: number }> {
    console.log('⚠️ Embedding checking and fixing disabled - assuming all documents are properly embedded');
    return { totalDocuments: 0, withoutEmbeddings: 0, processed: 0, failed: 0 };
  }

  // DISABLED: Method to add documents with embedding check
  async addDocumentsWithEmbeddingCheck(documents: Document[]): Promise<{ added: number, skipped: number, updated: number }> {
    console.log('⚠️ Document addition with embedding check disabled - assuming all documents already exist with embeddings');
    return { added: 0, skipped: documents.length, updated: 0 };
  }
} 