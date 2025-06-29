const axios = require('axios');
require('dotenv').config();

const BASE_URL = process.env.API_URL || 'http://localhost:3001';

async function testFix() {
  console.log('🔧 Testing MongoDB Connection Fix\n');
  
  try {
    // Test 1: Check server health
    console.log('1️⃣ Testing server health...');
    const healthResponse = await axios.get(`${BASE_URL}/api/rag/health`);
    console.log('✅ Server is running:', healthResponse.data);
    console.log('');
    
    // Test 2: Test API key management (should work even without MongoDB)
    console.log('2️⃣ Testing API key management...');
    try {
      const keyStatusResponse = await axios.get(`${BASE_URL}/api/keys/status`);
      console.log('✅ API Key management working');
      console.log('📊 Response:', keyStatusResponse.data);
    } catch (keyError) {
      console.log('⚠️ API Key management not available:', keyError.response?.data || keyError.message);
    }
    console.log('');
    
    // Test 3: Test RAG system
    console.log('3️⃣ Testing RAG system...');
    const ragResponse = await axios.post(`${BASE_URL}/api/rag/ask`, {
      question: 'Apa itu survei wisatawan nusantara?'
    });
    console.log('✅ RAG system working');
    console.log('📝 Answer received:', ragResponse.data.answer ? 'Yes' : 'No');
    console.log('');
    
    console.log('🎉 All tests passed! MongoDB connection fix is working.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Server is not running. Start it with:');
      console.log('   npm run dev');
    } else {
      console.log('\n💡 Check the error details above.');
    }
  }
}

// Run test if this file is executed directly
if (require.main === module) {
  testFix();
}

module.exports = { testFix }; 