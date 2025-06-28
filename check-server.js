const axios = require('axios');
const { getApiConfig } = require('./config');

const apiConfig = getApiConfig();
const API_BASE_URL = apiConfig.baseUrl;

async function checkServer() {
  console.log('🔍 Checking Wisnus RAG API Server Status...\n');
  console.log(`📡 Server URL: ${API_BASE_URL}`);
  console.log(`⏱️  Timeout: ${apiConfig.timeout / 1000}s\n`);
  
  try {
    console.log('📡 Attempting to connect to server...');
    const response = await axios.get(`${API_BASE_URL}/api/rag/health`, {
      timeout: apiConfig.timeout
    });
    
    console.log('✅ Server is running and responding!');
    console.log('📊 Server Status:');
    console.log(`   - RAG Initialized: ${response.data.rag_initialized ? '✅ Yes' : '❌ No'}`);
    console.log(`   - Vector Store Ready: ${response.data.vector_store_ready ? '✅ Yes' : '❌ No'}`);
    console.log(`   - LLM Ready: ${response.data.llm_ready ? '✅ Yes' : '❌ No'}`);
    
    if (response.data.rag_initialized && response.data.vector_store_ready && response.data.llm_ready) {
      console.log('\n🎉 Server is fully ready for testing!');
      console.log('You can now run: npm run test:concurrent');
      return true;
    } else {
      console.log('\n⚠️  Server is running but not fully initialized.');
      console.log('Please initialize the RAG system first.');
      return false;
    }
    
  } catch (error) {
    console.log('❌ Server check failed!');
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n🔧 Server is not running. Please:');
      console.log('   1. Start the server: npm run dev');
      console.log('   2. Wait for initialization to complete');
      console.log('   3. Run this check again');
    } else if (error.code === 'ENOTFOUND') {
      console.log('\n🔧 Cannot resolve localhost. Please check:');
      console.log(`   1. Server is running on port ${apiConfig.port}`);
      console.log('   2. No firewall blocking localhost');
    } else if (error.code === 'ETIMEDOUT') {
      console.log('\n🔧 Connection timeout. Please check:');
      console.log('   1. Server is running');
      console.log('   2. Server is not overloaded');
      console.log('   3. Network connection is stable');
    } else if (error.response) {
      console.log(`\n🔧 Server responded with error ${error.response.status}:`);
      console.log(`   ${error.response.data.error || 'Unknown error'}`);
    } else {
      console.log('\n🔧 Unknown error occurred:');
      console.log(`   ${error.message}`);
    }
    
    return false;
  }
}

// Run if this file is executed directly
if (require.main === module) {
  checkServer().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = { checkServer }; 