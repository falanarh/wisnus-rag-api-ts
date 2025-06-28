import { MongoClient } from 'mongodb';
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { MongoDBAtlasVectorSearch } from '@langchain/mongodb';
import { Document } from './mdProcessor';

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
      return vectorStore;
      
    } catch (error) {
      console.error('❌ Failed to initialize vector store:', error);
      throw error;
    }
  }

  // Method to check if documents already exist in the database
  async checkExistingDocuments(documents: Document[]): Promise<{ existing: Document[], newDocs: Document[] }> {
    try {
      const client = new MongoClient(this.mongodbUri);
      await client.connect();
      
      const collection = client.db(this.mongodbDbName).collection(this.mongodbCollectionName);
      
      const existing: Document[] = [];
      const newDocs: Document[] = [];
      
      for (const doc of documents) {
        // Check if document with same content and metadata already exists
        const existingDoc = await collection.findOne({
          'pageContent': doc.pageContent,
          'metadata.source': doc.metadata.source,
          'metadata.chunkId': doc.metadata.chunkId
        });
        
        if (existingDoc) {
          existing.push(doc);
          console.log(`📋 Document already exists: ${doc.metadata.chunkId}`);
        } else {
          newDocs.push(doc);
          console.log(`🆕 New document to add: ${doc.metadata.chunkId}`);
        }
      }
      
      await client.close();
      
      console.log(`📊 Document analysis: ${existing.length} existing, ${newDocs.length} new`);
      return { existing, newDocs };
      
    } catch (error) {
      console.error('❌ Error checking existing documents:', error);
      // If check fails, treat all as new documents
      return { existing: [], newDocs: documents };
    }
  }

  // Method to add only new documents
  async addDocumentsIfNotExists(documents: Document[]): Promise<{ added: number, skipped: number }> {
    const { existing, newDocs } = await this.checkExistingDocuments(documents);
    
    if (newDocs.length === 0) {
      console.log('✅ All documents already exist in database, skipping addition');
      return { added: 0, skipped: existing.length };
    }
    
    try {
      const client = new MongoClient(this.mongodbUri);
      await client.connect();
      
      const collection = client.db(this.mongodbDbName).collection(this.mongodbCollectionName);
      
      // Initialize embeddings for new documents only
      const embeddings = new GoogleGenerativeAIEmbeddings({
        modelName: 'models/embedding-001',
        apiKey: this.geminiApiKey,
      });
      
      const documentsToAdd = [];
      
      for (const doc of newDocs) {
        try {
          // Generate embedding for the new document
          const embedding = await embeddings.embedQuery(doc.pageContent);
          
          documentsToAdd.push({
            pageContent: doc.pageContent,
            metadata: doc.metadata,
            embedding: embedding
          });
          
          console.log(`🔗 Generated embedding for: ${doc.metadata.chunkId}`);
        } catch (error) {
          console.error(`❌ Failed to generate embedding for ${doc.metadata.chunkId}:`, error);
        }
      }
      
      if (documentsToAdd.length > 0) {
        await collection.insertMany(documentsToAdd);
        console.log(`✅ Successfully added ${documentsToAdd.length} new documents to vector store`);
      }
      
      await client.close();
      
      return { added: documentsToAdd.length, skipped: existing.length };
      
    } catch (error) {
      console.error('❌ Error adding documents:', error);
      throw error;
    }
  }
} 