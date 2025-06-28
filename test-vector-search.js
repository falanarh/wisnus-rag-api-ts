const { GoogleGenerativeAIEmbeddings } = require('@langchain/google-genai');
const { MongoDBAtlasVectorSearch } = require('@langchain/mongodb');
const { MongoClient } = require('mongodb');
require('dotenv').config();

async function testVectorSearch() {
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const collection = client.db(process.env.MONGODB_DB_NAME).collection(process.env.MONGODB_COLLECTION_NAME);
    
    // Initialize embeddings
    const embeddings = new GoogleGenerativeAIEmbeddings({
      modelName: 'models/embedding-001',
      apiKey: process.env.GEMINI_API_KEY_1,
    });
    
    // Initialize vector store
    const vectorStore = new MongoDBAtlasVectorSearch(embeddings, {
      collection: collection,
      indexName: 'vector_index',
    });
    
    console.log('🔍 Testing vector search...');
    
    // Test query
    const query = 'wisatawan nusantara';
    console.log(`Query: "${query}"`);
    
    // Generate embedding for the query
    const queryEmbedding = await embeddings.embedQuery(query);
    console.log(`Query embedding length: ${queryEmbedding.length}`);
    
    // Perform similarity search
    const results = await vectorStore.similaritySearch(query, 3);
    
    console.log(`\n📄 Found ${results.length} results:`);
    
    results.forEach((doc, i) => {
      console.log(`\n--- Result ${i+1} ---`);
      console.log('pageContent length:', doc.pageContent ? doc.pageContent.length : 0);
      console.log('pageContent preview:', doc.pageContent ? doc.pageContent.substring(0, 200) + '...' : 'EMPTY');
      console.log('metadata:', JSON.stringify(doc.metadata, null, 2));
      console.log('Full doc object keys:', Object.keys(doc));
      console.log('Full doc object:', JSON.stringify(doc, null, 2));
    });
    
    // Test direct MongoDB vector search
    console.log('\n🔍 Testing direct MongoDB vector search...');
    
    const pipeline = [
      {
        $search: {
          index: 'vector_index',
          knnBeta: {
            vector: queryEmbedding,
            path: 'embedding',
            k: 3
          }
        }
      },
      {
        $limit: 3
      }
    ];
    
    const aggResults = await collection.aggregate(pipeline).toArray();
    
    console.log(`\n📄 Direct vector search found ${aggResults.length} results:`);
    
    aggResults.forEach((doc, i) => {
      console.log(`\n--- Direct Result ${i+1} ---`);
      console.log('pageContent length:', doc.pageContent ? doc.pageContent.length : 0);
      console.log('pageContent preview:', doc.pageContent ? doc.pageContent.substring(0, 200) + '...' : 'EMPTY');
      console.log('metadata:', JSON.stringify(doc.metadata, null, 2));
      console.log('score:', doc.score);
      console.log('Has embedding:', !!doc.embedding);
      console.log('Embedding length:', doc.embedding ? doc.embedding.length : 0);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

testVectorSearch(); 