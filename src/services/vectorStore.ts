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

  initializeVectorStore(): MongoDBAtlasVectorSearch {
    if (!this.geminiApiKey || !this.mongodbUri || 
        !this.mongodbDbName || !this.mongodbCollectionName) {
      throw new Error('Missing required environment variables');
    }

    // Initialize embeddings
    const embeddings = new GoogleGenerativeAIEmbeddings({
      modelName: 'models/embedding-001',
      apiKey: this.geminiApiKey,
    });

    // Connect to MongoDB with proper configuration
    const client = new MongoClient(this.mongodbUri, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 30000,
      connectTimeoutMS: 30000,
    });
    
    const collection = client.db(this.mongodbDbName).collection(this.mongodbCollectionName);

    // Cast collection to handle type mismatch between MongoDB versions
    const typedCollection = collection as any;
    typedCollection.timeoutMS = 30000;

    // Initialize MongoDB Atlas Vector Store
    const vectorStore = new MongoDBAtlasVectorSearch(embeddings, {
      collection: typedCollection,
      indexName: this.indexName,
    });

    return vectorStore;
  }
} 