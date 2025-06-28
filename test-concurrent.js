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

// Single request test
async function makeSingleRequest(question, requestId) {
  try {
    console.log(`🚀 Request ${requestId}: Starting request for "${question.substring(0, 30)}..."`);
    
    const response = await measureExecutionTime(() => 
      axios.post(`${API_BASE_URL}/api/rag/ask`, {
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

// Concurrent requests test
async function testConcurrentRequests(numRequests = CONCURRENT_REQUESTS) {
  console.log(`\n🧪 Testing ${numRequests} concurrent requests...\n`);
  
  const startTime = Date.now();
  const requests = [];
  
  // Create array of promises for concurrent execution
  for (let i = 1; i <= numRequests; i++) {
    const question = getRandomQuestion();
    requests.push(makeSingleRequest(question, i));
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
    console.log('\n📊 CONCURRENT TEST RESULTS');
    console.log('=' .repeat(50));
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
    console.log('=' .repeat(50));
    
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
    console.error('❌ Concurrent test failed:', error.message);
    throw error;
  }
}

// Sequential requests test for comparison
async function testSequentialRequests(numRequests = CONCURRENT_REQUESTS) {
  console.log(`\n🧪 Testing ${numRequests} sequential requests for comparison...\n`);
  
  const startTime = Date.now();
  const results = [];
  
  for (let i = 1; i <= numRequests; i++) {
    const question = getRandomQuestion();
    const result = await makeSingleRequest(question, i);
    results.push(result);
  }
  
  const endTime = Date.now();
  const totalTime = endTime - startTime;
  
  const successfulRequests = results.filter(r => r.status === 'success');
  const successRate = (successfulRequests.length / numRequests) * 100;
  const avgExecutionTime = successfulRequests.length > 0 
    ? successfulRequests.reduce((sum, req) => sum + req.executionTime, 0) / successfulRequests.length 
    : 0;
  
  console.log('\n📊 SEQUENTIAL TEST RESULTS');
  console.log('=' .repeat(50));
  console.log(`Total Requests: ${numRequests}`);
  console.log(`Successful: ${successfulRequests.length}`);
  console.log(`Success Rate: ${successRate.toFixed(1)}%`);
  console.log(`Total Time: ${totalTime}ms`);
  console.log(`Average Execution Time: ${avgExecutionTime.toFixed(0)}ms`);
  console.log(`Throughput: ${(numRequests / (totalTime / 1000)).toFixed(2)} requests/second`);
  
  return {
    totalRequests: numRequests,
    successful: successfulRequests.length,
    totalTime,
    avgExecutionTime,
    throughput: numRequests / (totalTime / 1000)
  };
}

// Load testing with increasing concurrent requests
async function loadTest() {
  console.log('\n🔥 LOAD TESTING - Increasing Concurrent Requests\n');
  
  const testSizes = [1, 3, 5, 8, 10];
  const results = [];
  
  for (const size of testSizes) {
    console.log(`\n📈 Testing with ${size} concurrent requests...`);
    try {
      const result = await testConcurrentRequests(size);
      results.push({ ...result, concurrentRequests: size });
      
      // Wait between tests to avoid overwhelming the server
      if (size < testSizes[testSizes.length - 1]) {
        console.log('⏳ Waiting 5 seconds before next test...');
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    } catch (error) {
      console.error(`❌ Load test failed for ${size} requests:`, error.message);
      results.push({ 
        concurrentRequests: size, 
        error: error.message,
        successRate: 0 
      });
    }
  }
  
  // Print load test summary
  console.log('\n📊 LOAD TEST SUMMARY');
  console.log('=' .repeat(60));
  console.log('Concurrent | Success Rate | Avg Time | Throughput');
  console.log('Requests   | (%)          | (ms)     | (req/s)');
  console.log('-' .repeat(60));
  
  results.forEach(result => {
    if (result.error) {
      console.log(`${result.concurrentRequests.toString().padEnd(11)} | ${'ERROR'.padEnd(12)} | ${'N/A'.padEnd(8)} | ${'N/A'.padEnd(8)}`);
    } else {
      console.log(`${result.concurrentRequests.toString().padEnd(11)} | ${result.successRate.toFixed(1).padEnd(12)} | ${result.avgExecutionTime.toFixed(0).padEnd(8)} | ${result.throughput.toFixed(2).padEnd(8)}`);
    }
  });
  
  return results;
}

// Main test runner
async function runAllTests() {
  console.log('🚀 Starting Comprehensive API Performance Tests\n');
  
  try {
    // Test 1: Health check with better error handling
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
      } else if (error.response) {
        console.error('❌ Server responded with error:', error.response.status, error.response.data);
        throw new Error(`Server error: ${error.response.status}`);
      } else {
        console.error('❌ Health check failed:', error.message);
        throw error;
      }
    }
    
    // Test 2: Single request baseline
    console.log('\n2️⃣ Testing single request baseline...');
    const singleResult = await makeSingleRequest('apa yang dimaksud dengan ekowisata?', 'BASELINE');
    console.log(`✅ Baseline request: ${singleResult.executionTime}ms`);
    
    // Test 3: Sequential requests
    console.log('\n3️⃣ Testing sequential requests...');
    const sequentialResult = await testSequentialRequests(5);
    
    // Test 4: Concurrent requests
    console.log('\n4️⃣ Testing concurrent requests...');
    const concurrentResult = await testConcurrentRequests(5);
    
    // Test 5: Load testing
    console.log('\n5️⃣ Running load test...');
    const loadResults = await loadTest();
    
    // Final summary
    console.log('\n🎉 ALL TESTS COMPLETED!');
    console.log('=' .repeat(50));
    console.log('Performance Summary:');
    console.log(`- Single Request: ${singleResult.executionTime}ms`);
    console.log(`- Sequential (5 req): ${sequentialResult.totalTime}ms (${sequentialResult.throughput.toFixed(2)} req/s)`);
    console.log(`- Concurrent (5 req): ${concurrentResult.totalTime}ms (${concurrentResult.throughput.toFixed(2)} req/s)`);
    console.log(`- Concurrent Success Rate: ${concurrentResult.successRate.toFixed(1)}%`);
    
    // Performance comparison
    const speedup = sequentialResult.totalTime / concurrentResult.totalTime;
    console.log(`- Concurrent Speedup: ${speedup.toFixed(2)}x faster than sequential`);
    
  } catch (error) {
    console.error('\n❌ Test suite failed:', error.message);
    
    // Provide helpful troubleshooting information
    console.error('\n🔧 Troubleshooting Guide:');
    console.error('1. Check if server is running: npm run dev');
    console.error('2. Check if RAG is initialized: POST /api/rag/initialize');
    console.error('3. Check API keys in .env file');
    console.error('4. Check MongoDB connection');
    console.error('5. Check console logs for detailed error messages');
    
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = {
  testConcurrentRequests,
  testSequentialRequests,
  loadTest,
  makeSingleRequest
}; 