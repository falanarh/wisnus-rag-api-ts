const axios = require('axios');
require('dotenv').config();

const BASE_URL = process.env.API_URL || 'http://localhost:3001';

async function quickTest() {
  console.log('🧪 Quick System Test\n');
  
  try {
    // Test 1: Check if server is running
    console.log('1️⃣ Testing server health...');
    const healthResponse = await axios.get(`${BASE_URL}/api/rag/health`);
    console.log('✅ Server is running:', healthResponse.data);
    console.log('');
    
    // Test 2: Test simple RAG question
    console.log('2️⃣ Testing RAG system...');
    const ragResponse = await axios.post(`${BASE_URL}/api/rag/ask`, {
      question: 'Apa itu survei wisatawan nusantara?'
    });
    console.log('✅ RAG response received');
    console.log('📝 Answer length:', ragResponse.data.answer?.length || 0);
    console.log('');
    
    // Test 3: Test API key management (if available)
    try {
      console.log('3️⃣ Testing API key management...');
      const keyStatusResponse = await axios.get(`${BASE_URL}/api/keys/status`);
      console.log('✅ API Key management working');
      console.log('📊 Total keys:', keyStatusResponse.data.metadata?.totalKeys || 0);
    } catch (keyError) {
      console.log('⚠️ API Key management not available (this is OK for basic setup)');
    }
    
    console.log('\n🎉 All tests passed! System is working correctly.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Server is not running. Start it with:');
      console.log('   npm run dev');
    } else if (error.response?.status === 503) {
      console.log('\n💡 RAG system is initializing. Wait a moment and try again.');
    } else {
      console.log('\n💡 Check your environment variables and MongoDB connection.');
    }
  }
}

// Run test if this file is executed directly
if (require.main === module) {
  quickTest();
}

module.exports = { quickTest }; 