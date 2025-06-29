const axios = require('axios');

const BASE_URL = process.env.API_URL || 'http://localhost:3001';

async function testApiKeyManagement() {
  console.log('🧪 Testing API Key Management System...\n');

  try {
    // Test 1: Get all API keys status
    console.log('1️⃣ Testing GET /api/keys/status');
    const statusResponse = await axios.get(`${BASE_URL}/api/keys/status`);
    console.log('✅ Status Response:', JSON.stringify(statusResponse.data, null, 2));
    console.log('');

    // Test 2: Get best available API key
    console.log('2️⃣ Testing GET /api/keys/best');
    const bestKeyResponse = await axios.get(`${BASE_URL}/api/keys/best`);
    console.log('✅ Best Key Response:', JSON.stringify(bestKeyResponse.data, null, 2));
    console.log('');

    // Test 3: Get usage statistics
    console.log('3️⃣ Testing GET /api/keys/usage-stats');
    const usageStatsResponse = await axios.get(`${BASE_URL}/api/keys/usage-stats`);
    console.log('✅ Usage Stats Response:', JSON.stringify(usageStatsResponse.data, null, 2));
    console.log('');

    // Test 4: Test RAG endpoint to see API key usage in action
    console.log('4️⃣ Testing RAG endpoint to see API key management in action');
    const ragResponse = await axios.post(`${BASE_URL}/api/rag/ask`, {
      question: 'Apa itu survei wisatawan nusantara?'
    });
    console.log('✅ RAG Response Status:', ragResponse.status);
    console.log('✅ RAG Response Length:', ragResponse.data.answer?.length || 0);
    console.log('');

    // Test 5: Get status again to see if usage was recorded
    console.log('5️⃣ Testing GET /api/keys/status after RAG usage');
    const statusAfterResponse = await axios.get(`${BASE_URL}/api/keys/status`);
    console.log('✅ Status After RAG Response:', JSON.stringify(statusAfterResponse.data, null, 2));
    console.log('');

    console.log('🎉 All API Key Management tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    
    if (error.response?.status === 404) {
      console.log('💡 Make sure the server is running and the API key management routes are properly configured.');
    }
  }
}

// Test rate limit handling
async function testRateLimitHandling() {
  console.log('\n🧪 Testing Rate Limit Handling...\n');

  try {
    // Make multiple rapid requests to test rate limiting
    const promises = [];
    for (let i = 0; i < 5; i++) {
      promises.push(
        axios.post(`${BASE_URL}/api/rag/ask`, {
          question: `Test question ${i + 1}: Apa itu survei wisatawan nusantara?`
        }).catch(error => ({ error: true, data: error.response?.data || error.message }))
      );
    }

    const results = await Promise.all(promises);
    
    console.log('📊 Concurrent requests results:');
    results.forEach((result, index) => {
      if (result.error) {
        console.log(`❌ Request ${index + 1}: Failed - ${result.data}`);
      } else {
        console.log(`✅ Request ${index + 1}: Success - Status ${result.status}`);
      }
    });

    // Check API key status after concurrent requests
    console.log('\n📊 API Key Status after concurrent requests:');
    const finalStatus = await axios.get(`${BASE_URL}/api/keys/status`);
    console.log(JSON.stringify(finalStatus.data, null, 2));

  } catch (error) {
    console.error('❌ Rate limit test failed:', error.response?.data || error.message);
  }
}

// Test API key reactivation
async function testApiKeyReactivation() {
  console.log('\n🧪 Testing API Key Reactivation...\n');

  try {
    // Get current status
    const statusResponse = await axios.get(`${BASE_URL}/api/keys/status`);
    const keys = statusResponse.data.data;
    
    if (keys && keys.length > 0) {
      // Find a deactivated key (if any)
      const deactivatedKey = keys.find(key => !key.isActive);
      
      if (deactivatedKey) {
        console.log('🔄 Found deactivated key, attempting to reactivate...');
        const reactivateResponse = await axios.post(`${BASE_URL}/api/keys/reactivate/${deactivatedKey.apiKey}`);
        console.log('✅ Reactivation Response:', JSON.stringify(reactivateResponse.data, null, 2));
      } else {
        console.log('ℹ️ No deactivated keys found to test reactivation');
      }
    }

  } catch (error) {
    console.error('❌ Reactivation test failed:', error.response?.data || error.message);
  }
}

// Main test function
async function runAllTests() {
  console.log('🚀 Starting API Key Management Tests...\n');
  
  await testApiKeyManagement();
  await testRateLimitHandling();
  await testApiKeyReactivation();
  
  console.log('\n🎯 All tests completed!');
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = {
  testApiKeyManagement,
  testRateLimitHandling,
  testApiKeyReactivation,
  runAllTests
}; 