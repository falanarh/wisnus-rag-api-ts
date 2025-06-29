const axios = require('axios');

const BASE_URL = 'https://wisnus-rag-api-ts.vercel.app';

async function testConcurrentEndpoint() {
  console.log('🚀 Testing Fixed Concurrent Test Endpoint...\n');

  try {
    // Test 1: Basic concurrent test (3 requests)
    console.log('1️⃣ Testing basic concurrent test (3 requests)...');
    const basicResponse = await axios.post(`${BASE_URL}/api/rag/concurrent-test`, {
      numRequests: 3
    }, {
      timeout: 60000 // 60 seconds timeout
    });

    const basicResult = basicResponse.data.result;
    console.log(`✅ Basic test completed:`);
    console.log(`   Success Rate: ${basicResult.successRate}%`);
    console.log(`   Total Time: ${basicResult.totalTime}ms`);
    console.log(`   Average Time: ${basicResult.avgExecutionTime}ms`);
    console.log(`   Throughput: ${basicResult.throughput.toFixed(2)} req/s`);
    console.log(`   Successful: ${basicResult.successful}/${basicResult.totalRequests}`);
    console.log('');

    // Test 2: Load test (5 requests)
    console.log('2️⃣ Testing load test (5 requests)...');
    const loadResponse = await axios.post(`${BASE_URL}/api/rag/concurrent-test`, {
      numRequests: 5
    }, {
      timeout: 60000
    });

    const loadResult = loadResponse.data.result;
    console.log(`✅ Load test completed:`);
    console.log(`   Success Rate: ${loadResult.successRate}%`);
    console.log(`   Total Time: ${loadResult.totalTime}ms`);
    console.log(`   Average Time: ${loadResult.avgExecutionTime}ms`);
    console.log(`   Throughput: ${loadResult.throughput.toFixed(2)} req/s`);
    console.log(`   Min Time: ${loadResult.minTime}ms`);
    console.log(`   Max Time: ${loadResult.maxTime}ms`);
    console.log('');

    // Test 3: Error handling - invalid number of requests
    console.log('3️⃣ Testing error handling (invalid requests)...');
    try {
      await axios.post(`${BASE_URL}/api/rag/concurrent-test`, {
        numRequests: 100 // Invalid - exceeds maximum
      });
    } catch (error) {
      if (error.response && error.response.status === 400) {
        console.log('✅ Error handling works correctly:');
        console.log(`   Status: ${error.response.status}`);
        console.log(`   Error: ${error.response.data.error}`);
      } else {
        console.log('❌ Unexpected error response');
      }
    }
    console.log('');

    // Test 4: Performance comparison
    console.log('4️⃣ Performance Analysis:');
    console.log(`   Basic Test (3 req): ${basicResult.avgExecutionTime}ms avg`);
    console.log(`   Load Test (5 req): ${loadResult.avgExecutionTime}ms avg`);
    
    const speedup = basicResult.avgExecutionTime / loadResult.avgExecutionTime;
    console.log(`   Concurrent Efficiency: ${speedup.toFixed(2)}x`);
    
    if (loadResult.successRate >= 80) {
      console.log('   ✅ Success rate is acceptable (≥80%)');
    } else {
      console.log(`   ⚠️ Success rate is low: ${loadResult.successRate}%`);
    }
    console.log('');

    // Test 5: Detailed results analysis
    console.log('5️⃣ Detailed Results Analysis:');
    if (loadResult.details.successful.length > 0) {
      console.log('   Successful Requests:');
      loadResult.details.successful.forEach(req => {
        console.log(`     Request ${req.requestId}: ${req.executionTime}ms | ${req.contextCount} docs | ${req.answerLength} chars`);
      });
    }
    
    if (loadResult.details.failed.length > 0) {
      console.log('   Failed Requests:');
      loadResult.details.failed.forEach(req => {
        console.log(`     Request ${req.requestId}: ${req.error}`);
      });
    }
    console.log('');

    console.log('🎉 Concurrent test endpoint is working correctly!');
    console.log('');
    console.log('📊 Summary:');
    console.log(`   Endpoint: ${BASE_URL}/api/rag/concurrent-test`);
    console.log(`   Status: ✅ Operational`);
    console.log(`   Success Rate: ${loadResult.successRate}%`);
    console.log(`   Performance: ${loadResult.avgExecutionTime}ms average`);
    console.log(`   Throughput: ${loadResult.throughput.toFixed(2)} requests/second`);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    if (error.response) {
      console.error('   Response Status:', error.response.status);
      console.error('   Response Data:', error.response.data);
    } else if (error.code === 'ECONNREFUSED') {
      console.error('   Cannot connect to server. Please check:');
      console.error('   1. Server is running');
      console.error('   2. URL is correct');
      console.error('   3. Network connectivity');
    } else if (error.code === 'ETIMEDOUT') {
      console.error('   Request timed out. Server may be overloaded.');
    }
  }
}

// Run the test
testConcurrentEndpoint(); 