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
      return vectorStore;
      
    } catch (error) {
      console.error('❌ Failed to initialize vector store:', error);
      throw error;
    }
  }

  // Enhanced method to check if documents already exist using content hash
  async checkExistingDocuments(documents: Document[]): Promise<{ existing: Document[], newDocs: Document[] }> {
    try {
      const client = new MongoClient(this.mongodbUri);
      await client.connect();
      
      const collection = client.db(this.mongodbDbName).collection(this.mongodbCollectionName);
      
      const existing: Document[] = [];
      const newDocs: Document[] = [];
      
      // Create content hash index if it doesn't exist
      try {
        await collection.createIndex({ 'contentHash': 1 }, { unique: true, sparse: true });
        console.log('✅ Content hash index created/verified');
      } catch (indexError) {
        // Index might already exist, continue
        console.log('ℹ️ Content hash index already exists');
      }
      
      for (const doc of documents) {
        const contentHash = this.generateContentHash(doc.pageContent, doc.metadata);
        
        // Check if document with same content hash already exists
        const existingDoc = await collection.findOne({ 'contentHash': contentHash });
        
        if (existingDoc) {
          existing.push(doc);
          console.log(`📋 Document already exists (hash: ${contentHash.substring(0, 8)}...): ${doc.metadata.chunkId}`);
        } else {
          newDocs.push(doc);
          console.log(`🆕 New document to add (hash: ${contentHash.substring(0, 8)}...): ${doc.metadata.chunkId}`);
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

  // Enhanced method to add only new documents with content hash
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
          const contentHash = this.generateContentHash(doc.pageContent, doc.metadata);
          
          documentsToAdd.push({
            pageContent: doc.pageContent,
            metadata: doc.metadata,
            embedding: embedding,
            contentHash: contentHash, // Add content hash for future deduplication
            createdAt: new Date()
          });
          
          console.log(`🔗 Generated embedding for: ${doc.metadata.chunkId} (hash: ${contentHash.substring(0, 8)}...)`);
        } catch (error) {
          console.error(`❌ Failed to generate embedding for ${doc.metadata.chunkId}:`, error);
        }
      }
      
      if (documentsToAdd.length > 0) {
        // Use insertMany with ordered: false to continue on individual document errors
        await collection.insertMany(documentsToAdd, { ordered: false });
        console.log(`✅ Successfully added ${documentsToAdd.length} new documents to vector store`);
      }
      
      await client.close();
      
      return { added: documentsToAdd.length, skipped: existing.length };
      
    } catch (error) {
      console.error('❌ Error adding documents:', error);
      throw error;
    }
  }

  // Method to check if initialization is needed
  async isInitializationNeeded(): Promise<boolean> {
    try {
      const client = new MongoClient(this.mongodbUri);
      await client.connect();
      
      const collection = client.db(this.mongodbDbName).collection(this.mongodbCollectionName);
      
      // Check if collection has documents
      const documentCount = await collection.countDocuments({});
      
      await client.close();
      
      console.log(`📊 Current document count: ${documentCount}`);
      
      // If no documents exist, initialization is needed
      return documentCount === 0;
      
    } catch (error) {
      console.error('❌ Error checking initialization status:', error);
      // If check fails, assume initialization is needed
      return true;
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
      
      // Get last updated timestamp
      const lastDoc = await collection.findOne({}, { sort: { createdAt: -1 } });
      const lastUpdated = lastDoc?.createdAt;
      
      await client.close();
      
      return {
        totalDocuments: totalCount,
        sourceBreakdown: sourceStats,
        lastUpdated
      };
      
    } catch (error) {
      console.error('❌ Error getting database stats:', error);
      throw error;
    }
  }

  // Method to find documents without embeddings
  async findDocumentsWithoutEmbeddings(): Promise<Document[]> {
    try {
      const client = new MongoClient(this.mongodbUri);
      await client.connect();
      
      const collection = client.db(this.mongodbDbName).collection(this.mongodbCollectionName);
      
      // Find documents that don't have embeddings
      const documentsWithoutEmbeddings = await collection.find({
        $or: [
          { embedding: { $exists: false } },
          { embedding: null },
          { embedding: { $size: 0 } }
        ]
      }).toArray();
      
      await client.close();
      
      console.log(`📋 Found ${documentsWithoutEmbeddings.length} documents without embeddings`);
      
      return documentsWithoutEmbeddings.map(doc => ({
        pageContent: doc.pageContent,
        metadata: doc.metadata,
        _id: doc._id
      }));
      
    } catch (error) {
      console.error('❌ Error finding documents without embeddings:', error);
      throw error;
    }
  }

  // Method to generate embeddings for existing documents
  async generateEmbeddingsForExistingDocuments(batchSize: number = 10): Promise<{ processed: number, failed: number }> {
    try {
      const documentsWithoutEmbeddings = await this.findDocumentsWithoutEmbeddings();
      
      if (documentsWithoutEmbeddings.length === 0) {
        console.log('✅ All documents already have embeddings');
        return { processed: 0, failed: 0 };
      }
      
      console.log(`🔄 Generating embeddings for ${documentsWithoutEmbeddings.length} existing documents...`);
      
      // Initialize embeddings
      const embeddings = new GoogleGenerativeAIEmbeddings({
        modelName: 'models/embedding-001',
        apiKey: this.geminiApiKey,
      });
      
      const client = new MongoClient(this.mongodbUri);
      await client.connect();
      
      const collection = client.db(this.mongodbDbName).collection(this.mongodbCollectionName);
      
      let processed = 0;
      let failed = 0;
      
      // Process in batches
      for (let i = 0; i < documentsWithoutEmbeddings.length; i += batchSize) {
        const batch = documentsWithoutEmbeddings.slice(i, i + batchSize);
        console.log(`📦 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(documentsWithoutEmbeddings.length / batchSize)}`);
        
        const batchPromises = batch.map(async (doc) => {
          try {
            // Generate embedding
            const embedding = await embeddings.embedQuery(doc.pageContent);
            
            // Update document with embedding
            await collection.updateOne(
              { _id: doc._id },
              { 
                $set: { 
                  embedding: embedding,
                  embeddingGeneratedAt: new Date()
                }
              }
            );
            
            console.log(`✅ Generated embedding for: ${doc.metadata?.chunkId || 'unknown'}`);
            return { success: true };
          } catch (error) {
            console.error(`❌ Failed to generate embedding for ${doc.metadata?.chunkId || 'unknown'}:`, error);
            return { success: false, error };
          }
        });
        
        const batchResults = await Promise.allSettled(batchPromises);
        
        batchResults.forEach(result => {
          if (result.status === 'fulfilled' && result.value.success) {
            processed++;
          } else {
            failed++;
          }
        });
        
        // Small delay between batches to avoid rate limiting
        if (i + batchSize < documentsWithoutEmbeddings.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      await client.close();
      
      console.log(`✅ Embedding generation completed: ${processed} processed, ${failed} failed`);
      return { processed, failed };
      
    } catch (error) {
      console.error('❌ Error generating embeddings for existing documents:', error);
      throw error;
    }
  }

  // Method to check and fix documents without embeddings
  async checkAndFixEmbeddings(): Promise<{ totalDocuments: number, withoutEmbeddings: number, processed: number, failed: number }> {
    try {
      const client = new MongoClient(this.mongodbUri);
      await client.connect();
      
      const collection = client.db(this.mongodbDbName).collection(this.mongodbCollectionName);
      
      // Get total document count
      const totalDocuments = await collection.countDocuments({});
      
      // Get count of documents without embeddings
      const withoutEmbeddings = await collection.countDocuments({
        $or: [
          { embedding: { $exists: false } },
          { embedding: null },
          { embedding: { $size: 0 } }
        ]
      });
      
      await client.close();
      
      console.log(`📊 Database status: ${totalDocuments} total documents, ${withoutEmbeddings} without embeddings`);
      
      if (withoutEmbeddings > 0) {
        console.log('🔄 Starting embedding generation for existing documents...');
        const { processed, failed } = await this.generateEmbeddingsForExistingDocuments();
        return { totalDocuments, withoutEmbeddings, processed, failed };
      } else {
        return { totalDocuments, withoutEmbeddings: 0, processed: 0, failed: 0 };
      }
      
    } catch (error) {
      console.error('❌ Error checking and fixing embeddings:', error);
      throw error;
    }
  }

  // Enhanced method to add documents with better handling of existing documents
  async addDocumentsWithEmbeddingCheck(documents: Document[]): Promise<{ added: number, skipped: number, updated: number }> {
    const { existing, newDocs } = await this.checkExistingDocuments(documents);
    
    let added = 0;
    let skipped = existing.length;
    let updated = 0;
    
    // Add new documents
    if (newDocs.length > 0) {
      const addResult = await this.addDocumentsIfNotExists(newDocs);
      added = addResult.added;
    }
    
    // Check if existing documents need embeddings
    if (existing.length > 0) {
      console.log(`🔍 Checking ${existing.length} existing documents for missing embeddings...`);
      
      const client = new MongoClient(this.mongodbUri);
      await client.connect();
      
      const collection = client.db(this.mongodbDbName).collection(this.mongodbCollectionName);
      
      const documentsNeedingEmbeddings = [];
      
      for (const doc of existing) {
        const contentHash = this.generateContentHash(doc.pageContent, doc.metadata);
        const existingDoc = await collection.findOne({ 'contentHash': contentHash });
        
        if (existingDoc && (!existingDoc.embedding || existingDoc.embedding.length === 0)) {
          documentsNeedingEmbeddings.push({
            ...doc,
            _id: existingDoc._id
          });
        }
      }
      
      await client.close();
      
      if (documentsNeedingEmbeddings.length > 0) {
        console.log(`🔄 Found ${documentsNeedingEmbeddings.length} existing documents without embeddings`);
        const { processed } = await this.generateEmbeddingsForExistingDocuments();
        updated = processed;
      }
    }
    
    return { added, skipped, updated };
  }
} 