const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

async function testEmbeddingManagement() {
  console.log('🚀 Testing Embedding Management for Existing Documents...\n');

  try {
    // Test 1: Check database status
    console.log('1️⃣ Checking database status...');
    const statusResponse = await axios.get(`${BASE_URL}/api/rag/status`);
    console.log(`✅ Database status: ${statusResponse.data.totalDocuments} total documents`);
    console.log(`   Sources: ${statusResponse.data.sourceBreakdown.map(s => `${s._id}: ${s.count}`).join(', ')}\n`);

    // Test 2: Find documents without embeddings
    console.log('2️⃣ Finding documents without embeddings...');
    const withoutEmbeddingsResponse = await axios.get(`${BASE_URL}/api/rag/documents-without-embeddings`);
    const withoutEmbeddings = withoutEmbeddingsResponse.data.data;
    console.log(`✅ Found ${withoutEmbeddings.count} documents without embeddings`);
    
    if (withoutEmbeddings.count > 0) {
      console.log('   Sample documents:');
      withoutEmbeddings.documents.slice(0, 3).forEach((doc, i) => {
        console.log(`   ${i + 1}. ${doc.chunkId} (${doc.source})`);
        console.log(`      Content: ${doc.pageContent}`);
      });
    }
    console.log('');

    // Test 3: Generate embeddings for existing documents (if any)
    if (withoutEmbeddings.count > 0) {
      console.log('3️⃣ Generating embeddings for existing documents...');
      const generateResponse = await axios.post(`${BASE_URL}/api/rag/generate-embeddings`, {
        batchSize: 5 // Small batch for testing
      });
      
      const result = generateResponse.data.data;
      console.log(`✅ Embedding generation completed:`);
      console.log(`   Processed: ${result.processed}`);
      console.log(`   Failed: ${result.failed}`);
      console.log(`   Message: ${generateResponse.data.message}\n`);
    } else {
      console.log('3️⃣ Skipping embedding generation (no documents without embeddings)\n');
    }

    // Test 4: Check and fix all embeddings
    console.log('4️⃣ Running comprehensive embedding check and fix...');
    const checkResponse = await axios.post(`${BASE_URL}/api/rag/check-and-fix-embeddings`);
    
    const checkResult = checkResponse.data.data;
    console.log(`✅ Comprehensive check completed:`);
    console.log(`   Total documents: ${checkResult.totalDocuments}`);
    console.log(`   Without embeddings: ${checkResult.withoutEmbeddings}`);
    console.log(`   Processed: ${checkResult.processed}`);
    console.log(`   Failed: ${checkResult.failed}`);
    console.log(`   Message: ${checkResponse.data.message}\n`);

    // Test 5: Verify no documents without embeddings
    console.log('5️⃣ Verifying all documents now have embeddings...');
    const finalCheckResponse = await axios.get(`${BASE_URL}/api/rag/documents-without-embeddings`);
    const finalCount = finalCheckResponse.data.data.count;
    
    if (finalCount === 0) {
      console.log('✅ All documents now have embeddings!');
    } else {
      console.log(`⚠️ Still ${finalCount} documents without embeddings`);
    }
    console.log('');

    // Test 6: Test RAG functionality with embeddings
    console.log('6️⃣ Testing RAG functionality with embeddings...');
    const ragResponse = await axios.post(`${BASE_URL}/api/rag/ask`, {
      question: 'Apa itu survei wisatawan nusantara?'
    });
    
    if (ragResponse.data.success) {
      console.log('✅ RAG system working with embeddings!');
      console.log(`   Answer: ${ragResponse.data.answer.substring(0, 100)}...`);
    } else {
      console.log('❌ RAG system failed');
    }
    console.log('');

    console.log('🎉 Embedding management test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Run the test
testEmbeddingManagement(); 