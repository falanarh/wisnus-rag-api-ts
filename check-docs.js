const { MongoClient } = require('mongodb');
require('dotenv').config();

async function checkDocs() {
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const collection = client.db(process.env.MONGODB_DB_NAME).collection(process.env.MONGODB_COLLECTION_NAME);
    
    // Check total documents
    const totalDocs = await collection.countDocuments({});
    console.log(`📊 Total documents in collection: ${totalDocs}`);
    
    // Get sample documents
    const docs = await collection.find({}).limit(3).toArray();
    console.log('\n📄 Sample documents:');
    
    docs.forEach((doc, i) => {
      console.log(`\n--- Document ${i+1} ---`);
      console.log('pageContent length:', doc.pageContent ? doc.pageContent.length : 0);
      console.log('pageContent preview:', doc.pageContent ? doc.pageContent.substring(0, 100) + '...' : 'EMPTY');
      console.log('metadata:', JSON.stringify(doc.metadata, null, 2));
      console.log('Has embedding:', !!doc.embedding);
      console.log('Embedding length:', doc.embedding ? doc.embedding.length : 0);
    });
    
    // Check for documents with empty pageContent
    const emptyDocs = await collection.countDocuments({ pageContent: { $in: ['', null, undefined] } });
    console.log(`\n⚠️ Documents with empty pageContent: ${emptyDocs}`);
    
    // Check for documents with non-empty pageContent
    const nonEmptyDocs = await collection.countDocuments({ 
      pageContent: { $exists: true, $ne: '', $ne: null } 
    });
    console.log(`✅ Documents with non-empty pageContent: ${nonEmptyDocs}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

checkDocs(); 