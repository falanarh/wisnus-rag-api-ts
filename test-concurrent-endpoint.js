const axios = require('axios');
const { getApiConfig, getTestConfig } = require('./config');

const apiConfig = getApiConfig();
const testConfig = getTestConfig();
const API_BASE_URL = apiConfig.baseUrl;
const CONCURRENT_REQUESTS = testConfig.concurrentRequests;
const TIMEOUT = apiConfig.timeout;

// Sample questions for testing
const testQuestions = [
  'apa yang dimaksud dengan ekowisata?',
  'jelaskan tentang wisata bahari',
  'apa itu wisata petualangan?',
  'bagaimana cara melakukan survei wisatawan?',
  'apa saja jenis kegiatan wisata?',
  'jelaskan tentang wisata sejarah dan religi',
  'apa yang dimaksud dengan wisata kuliner?',
  'bagaimana karakteristik wisata kota dan pedesaan?',
  'apa itu wisata MICE?',
  'jelaskan tentang wisata olahraga dan kesehatan'
];

// Helper function to generate random question
function getRandomQuestion() {
  return testQuestions[Math.floor(Math.random() * testQuestions.length)];
}

// Helper function to measure execution time
function measureExecutionTime(fn) {
  const start = Date.now();
  return fn().then(result => {
    const end = Date.now();
    return {
      result,
      executionTime: end - start
    };
  });
}

// Single request test using concurrent-test endpoint
async function makeSingleConcurrentRequest(question, requestId) {
  try {
    console.log(`🚀 Request ${requestId}: Starting concurrent test request for "${question.substring(0, 30)}..."`);
    
    const response = await measureExecutionTime(() => 
      axios.post(`${API_BASE_URL}/api/rag/concurrent-test`, {
        question: question
      }, {
        timeout: TIMEOUT
      })
    );

    console.log(`✅ Request ${requestId}: Success (${response.executionTime}ms)`);
    console.log(`   📝 Question: ${response.result.data.question}`);
    console.log(`   📚 Context docs: ${response.result.data.context.length}`);
    console.log(`   💬 Answer length: ${response.result.data.answer.length} chars`);
    
    return {
      requestId,
      status: 'success',
      executionTime: response.executionTime,
      question: response.result.data.question,
      contextCount: response.result.data.context.length,
      answerLength: response.result.data.answer.length
    };

  } catch (error) {
    console.log(`❌ Request ${requestId}: Failed (${Date.now() - Date.now()}ms)`);
    
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Error: ${error.response.data.error}`);
      
      return {
        requestId,
        status: 'error',
        statusCode: error.response.status,
        error: error.response.data.error,
        executionTime: 0
      };
    } else {
      console.log(`   Network Error: ${error.message}`);
      
      return {
        requestId,
        status: 'network_error',
        error: error.message,
        executionTime: 0
      };
    }
  }
}

// Concurrent requests test using concurrent-test endpoint
async function testConcurrentEndpointRequests(numRequests = CONCURRENT_REQUESTS) {
  console.log(`\n🧪 Testing ${numRequests} concurrent requests using /concurrent-test endpoint...\n`);
  
  const startTime = Date.now();
  const requests = [];
  
  // Create array of promises for concurrent execution
  for (let i = 1; i <= numRequests; i++) {
    const question = getRandomQuestion();
    requests.push(makeSingleConcurrentRequest(question, i));
  }
  
  try {
    // Execute all requests concurrently
    const results = await Promise.allSettled(requests);
    
    const endTime = Date.now();
    const totalTime = endTime - startTime;
    
    // Process results
    const successfulRequests = [];
    const failedRequests = [];
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        successfulRequests.push(result.value);
      } else {
        failedRequests.push({
          requestId: index + 1,
          status: 'promise_rejected',
          error: result.reason.message
        });
      }
    });
    
    // Calculate statistics
    const successRate = (successfulRequests.length / numRequests) * 100;
    const avgExecutionTime = successfulRequests.length > 0 
      ? successfulRequests.reduce((sum, req) => sum + req.executionTime, 0) / successfulRequests.length 
      : 0;
    
    // Print summary
    console.log('\n📊 CONCURRENT ENDPOINT TEST RESULTS');
    console.log('=' .repeat(60));
    console.log(`Total Requests: ${numRequests}`);
    console.log(`Successful: ${successfulRequests.length}`);
    console.log(`Failed: ${failedRequests.length}`);
    console.log(`Success Rate: ${successRate.toFixed(1)}%`);
    console.log(`Total Time: ${totalTime}ms`);
    console.log(`Average Execution Time: ${avgExecutionTime.toFixed(0)}ms`);
    console.log(`Throughput: ${(numRequests / (totalTime / 1000)).toFixed(2)} requests/second`);
    
    if (successfulRequests.length > 0) {
      const minTime = Math.min(...successfulRequests.map(r => r.executionTime));
      const maxTime = Math.max(...successfulRequests.map(r => r.executionTime));
      console.log(`Fastest Request: ${minTime}ms`);
      console.log(`Slowest Request: ${maxTime}ms`);
    }
    
    // Print detailed results
    console.log('\n📋 DETAILED RESULTS');
    console.log('=' .repeat(60));
    
    successfulRequests.forEach(req => {
      console.log(`✅ Request ${req.requestId}: ${req.executionTime}ms | ${req.contextCount} docs | ${req.answerLength} chars`);
    });
    
    failedRequests.forEach(req => {
      console.log(`❌ Request ${req.requestId}: ${req.error || 'Unknown error'}`);
    });
    
    return {
      totalRequests: numRequests,
      successful: successfulRequests.length,
      failed: failedRequests.length,
      successRate,
      totalTime,
      avgExecutionTime,
      minTime: successfulRequests.length > 0 ? Math.min(...successfulRequests.map(r => r.executionTime)) : 0,
      maxTime: successfulRequests.length > 0 ? Math.max(...successfulRequests.map(r => r.executionTime)) : 0,
      throughput: numRequests / (totalTime / 1000)
    };
    
  } catch (error) {
    console.error('❌ Concurrent endpoint test failed:', error.message);
    throw error;
  }
}

// Comparison test between regular /ask and /concurrent-test endpoints
async function compareEndpoints(numRequests = 5) {
  console.log('\n🔄 COMPARING /ask vs /concurrent-test ENDPOINTS\n');
  
  // Test regular /ask endpoint
  console.log('📊 Testing /api/rag/ask endpoint...');
  const askResults = await testConcurrentRequests(numRequests);
  
  // Wait between tests
  console.log('\n⏳ Waiting 3 seconds before testing concurrent endpoint...');
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Test /concurrent-test endpoint
  console.log('\n📊 Testing /api/rag/concurrent-test endpoint...');
  const concurrentResults = await testConcurrentEndpointRequests(numRequests);
  
  // Print comparison
  console.log('\n📊 ENDPOINT COMPARISON RESULTS');
  console.log('=' .repeat(80));
  console.log('Metric          | /ask Endpoint | /concurrent-test | Difference');
  console.log('-' .repeat(80));
  console.log(`Success Rate    | ${askResults.successRate.toFixed(1)}%        | ${concurrentResults.successRate.toFixed(1)}%           | ${(concurrentResults.successRate - askResults.successRate).toFixed(1)}%`);
  console.log(`Avg Time (ms)   | ${askResults.avgExecutionTime.toFixed(0)}ms        | ${concurrentResults.avgExecutionTime.toFixed(0)}ms           | ${(concurrentResults.avgExecutionTime - askResults.avgExecutionTime).toFixed(0)}ms`);
  console.log(`Throughput      | ${askResults.throughput.toFixed(2)} req/s    | ${concurrentResults.throughput.toFixed(2)} req/s       | ${(concurrentResults.throughput - askResults.throughput).toFixed(2)} req/s`);
  console.log(`Total Time      | ${askResults.totalTime}ms        | ${concurrentResults.totalTime}ms           | ${concurrentResults.totalTime - askResults.totalTime}ms`);
  
  return {
    askEndpoint: askResults,
    concurrentEndpoint: concurrentResults
  };
}

// Main test runner for concurrent endpoint
async function runConcurrentEndpointTests() {
  console.log('🚀 Starting Concurrent Endpoint Performance Tests\n');
  
  try {
    // Test 1: Health check
    console.log('1️⃣ Testing health check...');
    try {
      const healthResponse = await axios.get(`${API_BASE_URL}/api/rag/health`, {
        timeout: 10000
      });
      console.log('✅ Health check passed:', healthResponse.data);
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        console.error('❌ Cannot connect to server. Please ensure:');
        console.error('   1. Server is running: npm run dev');
        console.error('   2. Server is listening on port 7001');
        console.error('   3. No firewall blocking the connection');
        throw new Error('Server connection failed');
      } else {
        console.error('❌ Health check failed:', error.message);
        throw error;
      }
    }
    
    // Test 2: Single concurrent endpoint request
    console.log('\n2️⃣ Testing single concurrent endpoint request...');
    const singleResult = await makeSingleConcurrentRequest('apa yang dimaksud dengan ekowisata?', 'BASELINE');
    console.log(`✅ Concurrent endpoint baseline: ${singleResult.executionTime}ms`);
    
    // Test 3: Multiple concurrent requests
    console.log('\n3️⃣ Testing multiple concurrent requests...');
    const concurrentResult = await testConcurrentEndpointRequests(5);
    
    // Test 4: Endpoint comparison
    console.log('\n4️⃣ Comparing endpoints...');
    const comparisonResult = await compareEndpoints(5);
    
    // Final summary
    console.log('\n🎉 CONCURRENT ENDPOINT TESTS COMPLETED!');
    console.log('=' .repeat(60));
    console.log('Performance Summary:');
    console.log(`- Single Request: ${singleResult.executionTime}ms`);
    console.log(`- Concurrent (5 req): ${concurrentResult.totalTime}ms (${concurrentResult.throughput.toFixed(2)} req/s)`);
    console.log(`- Success Rate: ${concurrentResult.successRate.toFixed(1)}%`);
    
  } catch (error) {
    console.error('\n❌ Concurrent endpoint test suite failed:', error.message);
    
    console.error('\n🔧 Troubleshooting Guide:');
    console.error('1. Check if server is running: npm run dev');
    console.error('2. Check if RAG is initialized: POST /api/rag/initialize');
    console.error('3. Check API keys in .env file');
    console.error('4. Check MongoDB connection');
    console.error('5. Check console logs for detailed error messages');
    
    process.exit(1);
  }
}

// Import the regular test functions for comparison
const { testConcurrentRequests } = require('./test-concurrent');

// Run tests if this file is executed directly
if (require.main === module) {
  runConcurrentEndpointTests().catch(console.error);
}

module.exports = {
  testConcurrentEndpointRequests,
  makeSingleConcurrentRequest,
  compareEndpoints,
  runConcurrentEndpointTests
}; 