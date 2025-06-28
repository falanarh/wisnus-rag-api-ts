const axios = require('axios');
const { getApiConfig } = require('./config');

const apiConfig = getApiConfig();
const API_BASE_URL = apiConfig.baseUrl;

async function testRagEndpoint() {
  try {
    console.log('Testing RAG endpoint with new response structure...');
    
    const response = await axios.post(`${API_BASE_URL}/api/rag/ask`, {
      question: 'apa yang dimaksud dengan ekowisata?'
    }, {
      timeout: 60000 // 60 second timeout
    });

    console.log('✅ Success! Response structure:');
    console.log(JSON.stringify(response.data, null, 2));
    
    // Verify response structure
    if (response.data.question && response.data.context && response.data.answer) {
      console.log('✅ Response structure is correct!');
      console.log(`📝 Question: ${response.data.question}`);
      console.log(`📚 Context documents: ${response.data.context.length}`);
      console.log(`💬 Answer length: ${response.data.answer.length} characters`);
    } else {
      console.log('❌ Response structure is missing required fields');
    }

  } catch (error) {
    console.error('❌ Error testing RAG endpoint:');
    
    if (error.response) {
      // Server responded with error status
      console.error('Status:', error.response.status);
      console.error('Error:', error.response.data);
      
      // Check if it's a retryable error
      if (error.response.status === 503 || error.response.status === 429) {
        console.log('🔄 This is a retryable error. The system should handle it automatically.');
        if (error.response.data.retry_after) {
          console.log(`⏰ Suggested retry after: ${error.response.data.retry_after} seconds`);
        }
      }
    } else if (error.code === 'ECONNREFUSED') {
      console.error('❌ Cannot connect to server. Make sure the server is running on port 7001');
    } else if (error.code === 'ETIMEDOUT') {
      console.error('❌ Request timed out. The server might be overloaded.');
    } else {
      console.error('❌ Network error:', error.message);
    }
  }
}

async function testHealthCheck() {
  try {
    console.log('\nTesting health check...');
    const response = await axios.get(`${API_BASE_URL}/api/rag/health`);
    console.log('✅ Health check response:', response.data);
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
  }
}

async function runTests() {
  console.log('🚀 Starting API tests...\n');
  
  await testHealthCheck();
  await testRagEndpoint();
  
  console.log('\n🏁 Tests completed!');
}

runTests(); 