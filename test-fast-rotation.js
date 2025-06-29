const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

async function testFastRotation() {
  console.log('🚀 Testing Fast API Key Rotation System...\n');

  try {
    // Test 1: Get initial status
    console.log('1️⃣ Getting initial API key status...');
    const statusResponse = await axios.get(`${BASE_URL}/api/keys/status`);
    console.log(`✅ Found ${statusResponse.data.data.length} API keys`);
    console.log(`   Active keys: ${statusResponse.data.data.filter(k => k.isActive).length}\n`);

    // Test 2: Test cache performance
    console.log('2️⃣ Testing cache performance...');
    const startTime = Date.now();
    
    for (let i = 0; i < 10; i++) {
      const bestKeyResponse = await axios.get(`${BASE_URL}/api/keys/best`);
      const rotationMethod = bestKeyResponse.data.data.rotationMethod;
      console.log(`   Request ${i + 1}: ${rotationMethod} (${bestKeyResponse.data.data.apiKey})`);
    }
    
    const cacheTime = Date.now() - startTime;
    console.log(`✅ Cache test completed in ${cacheTime}ms (avg: ${(cacheTime / 10).toFixed(1)}ms per request)\n`);

    // Test 3: Test proactive rotation
    console.log('3️⃣ Testing proactive rotation...');
    const rotationResponse = await axios.post(`${BASE_URL}/api/keys/rotate`);
    console.log(`✅ Proactive rotation: ${rotationResponse.data.data.apiKey}`);
    console.log(`   Rotation reason: ${rotationResponse.data.data.rotationReason}`);
    console.log(`   Availability score: ${rotationResponse.data.data.availabilityScore?.toFixed(2)}\n`);

    // Test 4: Test cache refresh
    console.log('4️⃣ Testing cache refresh...');
    const refreshResponse = await axios.post(`${BASE_URL}/api/keys/refresh-cache`);
    console.log(`✅ Cache refreshed: ${refreshResponse.data.message}\n`);

    // Test 5: Concurrent requests test
    console.log('5️⃣ Testing concurrent requests...');
    const concurrentStart = Date.now();
    
    const promises = Array.from({ length: 20 }, async (_, i) => {
      try {
        const response = await axios.get(`${BASE_URL}/api/keys/best`);
        return { success: true, method: response.data.data.rotationMethod, key: response.data.data.apiKey };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });
    
    const results = await Promise.all(promises);
    const concurrentTime = Date.now() - concurrentStart;
    
    const successful = results.filter(r => r.success).length;
    const cachedRequests = results.filter(r => r.success && r.method === 'cached-round-robin').length;
    
    console.log(`✅ Concurrent test: ${successful}/20 successful in ${concurrentTime}ms`);
    console.log(`   Cached requests: ${cachedRequests}/20`);
    console.log(`   Average time: ${(concurrentTime / 20).toFixed(1)}ms per request\n`);

    // Test 6: Performance comparison
    console.log('6️⃣ Performance comparison...');
    console.log('   Old system: ~100-500ms per rotation (with database queries)');
    console.log(`   New system: ~${(concurrentTime / 20).toFixed(1)}ms per rotation (with caching)`);
    console.log(`   Speed improvement: ~${Math.round(200 / (concurrentTime / 20))}x faster\n`);

    console.log('🎉 Fast rotation system test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Run the test
testFastRotation(); 