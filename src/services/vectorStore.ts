import { MongoClient } from 'mongodb';
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { MongoDBAtlasVectorSearch } from '@langchain/mongodb';

export class VectorStoreInitializer {
  private geminiApiKey: string;
  private mongodbUri: string;
  private mongodbDbName: string;
  private mongodbCollectionName: string;
  private indexName: string;

  constructor() {
    this.geminiApiKey = process.env.GEMINI_API_KEY_1 || '';
    this.mongodbUri = process.env.MONGODB_URI || '';
    this.mongodbDbName = process.env.MONGODB_DB_NAME || '';
    this.mongodbCollectionName = process.env.MONGODB_COLLECTION_NAME || '';
    this.indexName = 'vector_index';
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

      // Create a collection wrapper with timeoutMS property
      const collectionWithTimeout = {
        ...collection,
        timeoutMS: 30000
      } as any;

      // Initialize MongoDB Atlas Vector Store
      const vectorStore = new MongoDBAtlasVectorSearch(embeddings, {
        collection: collectionWithTimeout,
        indexName: this.indexName,
      });

      console.log('✅ Vector store initialized successfully');
      return vectorStore;
      
    } catch (error) {
      console.error('❌ Failed to initialize vector store:', error);
      throw error;
    }
  }
} 