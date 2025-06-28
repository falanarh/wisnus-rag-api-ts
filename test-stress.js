const axios = require('axios');
const { getApiConfig, getTestConfig } = require('./config');

const apiConfig = getApiConfig();
const testConfig = getTestConfig();
const API_BASE_URL = apiConfig.baseUrl;
const TIMEOUT = apiConfig.timeout;

// Stress test configuration
const STRESS_CONFIG = {
  burstRequests: testConfig.stressBurstRequests,
  burstInterval: testConfig.stressBurstInterval,
  totalBursts: testConfig.stressTotalBursts,
  rampUpTime: 5000,         // Time to gradually increase load (ms)
  coolDownTime: 10000       // Time to wait after stress test (ms)
};

// Sample questions for stress testing
const stressQuestions = [
  'apa yang dimaksud dengan ekowisata?',
  'jelaskan tentang wisata bahari',
  'apa itu wisata petualangan?',
  'bagaimana cara melakukan survei wisatawan?',
  'apa saja jenis kegiatan wisata?',
  'jelaskan tentang wisata sejarah dan religi',
  'apa yang dimaksud dengan wisata kuliner?',
  'bagaimana karakteristik wisata kota dan pedesaan?',
  'apa itu wisata MICE?',
  'jelaskan tentang wisata olahraga dan kesehatan',
  'apa perbedaan wisata domestik dan internasional?',
  'bagaimana metode pengumpulan data survei?',
  'apa yang dimaksud dengan sampling?',
  'jelaskan tentang kuesioner survei',
  'apa itu data primer dan sekunder?'
];

// Helper function to generate random question
function getRandomQuestion() {
  return stressQuestions[Math.floor(Math.random() * stressQuestions.length)];
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

// Single request with detailed error handling
async function makeRequest(question, requestId, burstId) {
  const startTime = Date.now();
  
  try {
    const response = await measureExecutionTime(() => 
      axios.post(`${API_BASE_URL}/api/rag/ask`, {
        question: question
      }, {
        timeout: TIMEOUT
      })
    );

    return {
      requestId,
      burstId,
      status: 'success',
      executionTime: response.executionTime,
      startTime,
      endTime: startTime + response.executionTime,
      question: response.result.data.question,
      contextCount: response.result.data.context.length,
      answerLength: response.result.data.answer.length
    };

  } catch (error) {
    const endTime = Date.now();
    
    if (error.response) {
      return {
        requestId,
        burstId,
        status: 'http_error',
        statusCode: error.response.status,
        error: error.response.data.error || 'HTTP Error',
        executionTime: endTime - startTime,
        startTime,
        endTime
      };
    } else if (error.code === 'ECONNABORTED') {
      return {
        requestId,
        burstId,
        status: 'timeout',
        error: 'Request timeout',
        executionTime: endTime - startTime,
        startTime,
        endTime
      };
    } else {
      return {
        requestId,
        burstId,
        status: 'network_error',
        error: error.message,
        executionTime: endTime - startTime,
        startTime,
        endTime
      };
    }
  }
}

// Burst request function
async function sendBurst(burstId, numRequests) {
  console.log(`🚀 Burst ${burstId}: Sending ${numRequests} concurrent requests...`);
  
  const requests = [];
  for (let i = 1; i <= numRequests; i++) {
    const question = getRandomQuestion();
    const requestId = `${burstId}-${i}`;
    requests.push(makeRequest(question, requestId, burstId));
  }
  
  const startTime = Date.now();
  const results = await Promise.allSettled(requests);
  const endTime = Date.now();
  
  // Process results
  const successfulRequests = [];
  const failedRequests = [];
  
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      if (result.value.status === 'success') {
        successfulRequests.push(result.value);
      } else {
        failedRequests.push(result.value);
      }
    } else {
      failedRequests.push({
        requestId: `${burstId}-${index + 1}`,
        burstId,
        status: 'promise_rejected',
        error: result.reason.message,
        startTime: Date.now(),
        endTime: Date.now()
      });
    }
  });
  
  const burstTime = endTime - startTime;
  const successRate = (successfulRequests.length / numRequests) * 100;
  
  console.log(`✅ Burst ${burstId}: ${successfulRequests.length}/${numRequests} successful (${successRate.toFixed(1)}%) in ${burstTime}ms`);
  
  return {
    burstId,
    totalRequests: numRequests,
    successful: successfulRequests.length,
    failed: failedRequests.length,
    successRate,
    burstTime,
    successfulRequests,
    failedRequests
  };
}

// Ramp-up function for gradual load increase
async function rampUpLoad() {
  console.log('\n📈 RAMP-UP PHASE: Gradually increasing load...\n');
  
  const rampUpSteps = [1, 2, 3, 5, 8];
  const results = [];
  
  for (let i = 0; i < rampUpSteps.length; i++) {
    const numRequests = rampUpSteps[i];
    console.log(`Step ${i + 1}: Testing with ${numRequests} concurrent requests`);
    
    const result = await sendBurst(`RAMP-${i + 1}`, numRequests);
    results.push(result);
    
    // Wait between steps
    if (i < rampUpSteps.length - 1) {
      console.log('⏳ Waiting 2 seconds before next step...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  return results;
}

// Sustained load test
async function sustainedLoadTest() {
  console.log('\n🔥 SUSTAINED LOAD TEST: Sending multiple bursts...\n');
  
  const results = [];
  
  for (let burstId = 1; burstId <= STRESS_CONFIG.totalBursts; burstId++) {
    const result = await sendBurst(burstId, STRESS_CONFIG.burstRequests);
    results.push(result);
    
    // Wait between bursts
    if (burstId < STRESS_CONFIG.totalBursts) {
      console.log(`⏳ Waiting ${STRESS_CONFIG.burstInterval}ms before next burst...`);
      await new Promise(resolve => setTimeout(resolve, STRESS_CONFIG.burstInterval));
    }
  }
  
  return results;
}

// Calculate performance metrics
function calculateMetrics(allResults) {
  const allRequests = [];
  allResults.forEach(burst => {
    allRequests.push(...burst.successfulRequests, ...burst.failedRequests);
  });
  
  const successfulRequests = allRequests.filter(r => r.status === 'success');
  const failedRequests = allRequests.filter(r => r.status !== 'success');
  
  const totalRequests = allRequests.length;
  const totalSuccessful = successfulRequests.length;
  const successRate = (totalSuccessful / totalRequests) * 100;
  
  // Calculate timing statistics
  const executionTimes = successfulRequests.map(r => r.executionTime);
  const avgExecutionTime = executionTimes.length > 0 
    ? executionTimes.reduce((sum, time) => sum + time, 0) / executionTimes.length 
    : 0;
  
  const minExecutionTime = executionTimes.length > 0 ? Math.min(...executionTimes) : 0;
  const maxExecutionTime = executionTimes.length > 0 ? Math.max(...executionTimes) : 0;
  
  // Calculate throughput
  const totalTime = allRequests.length > 0 
    ? Math.max(...allRequests.map(r => r.endTime)) - Math.min(...allRequests.map(r => r.startTime))
    : 0;
  
  const throughput = totalTime > 0 ? (totalRequests / (totalTime / 1000)) : 0;
  
  // Error analysis
  const errorTypes = {};
  failedRequests.forEach(req => {
    const errorType = req.status;
    errorTypes[errorType] = (errorTypes[errorType] || 0) + 1;
  });
  
  return {
    totalRequests,
    totalSuccessful,
    totalFailed: failedRequests.length,
    successRate,
    avgExecutionTime,
    minExecutionTime,
    maxExecutionTime,
    throughput,
    totalTime,
    errorTypes,
    allRequests
  };
}

// Print detailed results
function printDetailedResults(metrics) {
  console.log('\n📊 DETAILED STRESS TEST RESULTS');
  console.log('=' .repeat(60));
  console.log(`Total Requests: ${metrics.totalRequests}`);
  console.log(`Successful: ${metrics.totalSuccessful}`);
  console.log(`Failed: ${metrics.totalFailed}`);
  console.log(`Success Rate: ${metrics.successRate.toFixed(2)}%`);
  console.log(`Total Test Time: ${metrics.totalTime}ms`);
  console.log(`Throughput: ${metrics.throughput.toFixed(2)} requests/second`);
  console.log('');
  console.log('⏱️  TIMING STATISTICS:');
  console.log(`Average Execution Time: ${metrics.avgExecutionTime.toFixed(0)}ms`);
  console.log(`Fastest Request: ${metrics.minExecutionTime}ms`);
  console.log(`Slowest Request: ${metrics.maxExecutionTime}ms`);
  console.log('');
  
  if (Object.keys(metrics.errorTypes).length > 0) {
    console.log('❌ ERROR ANALYSIS:');
    Object.entries(metrics.errorTypes).forEach(([errorType, count]) => {
      console.log(`${errorType}: ${count} requests`);
    });
  }
}

// Print performance recommendations
function printRecommendations(metrics) {
  console.log('\n💡 PERFORMANCE RECOMMENDATIONS:');
  console.log('=' .repeat(60));
  
  if (metrics.successRate >= 95) {
    console.log('✅ Excellent performance! System handles load well.');
  } else if (metrics.successRate >= 80) {
    console.log('⚠️  Good performance with some failures. Consider:');
    console.log('   - Adding more API keys for redundancy');
    console.log('   - Implementing request queuing');
    console.log('   - Optimizing database queries');
  } else {
    console.log('❌ Performance needs improvement. Consider:');
    console.log('   - Scaling up server resources');
    console.log('   - Implementing caching');
    console.log('   - Adding load balancing');
    console.log('   - Optimizing the RAG pipeline');
  }
  
  if (metrics.avgExecutionTime > 30000) {
    console.log('⏱️  Response times are slow. Consider:');
    console.log('   - Optimizing vector search');
    console.log('   - Using faster LLM models');
    console.log('   - Implementing response caching');
  }
  
  if (metrics.throughput < 0.1) {
    console.log('🚀 Throughput is low. Consider:');
    console.log('   - Parallel processing');
    console.log('   - Async operations');
    console.log('   - Database optimization');
  }
}

// Main stress test runner
async function runStressTest() {
  console.log('🔥 STRESS TESTING WISNUS RAG API');
  console.log('=' .repeat(50));
  console.log('Configuration:');
  console.log(`- Burst Requests: ${STRESS_CONFIG.burstRequests}`);
  console.log(`- Burst Interval: ${STRESS_CONFIG.burstInterval}ms`);
  console.log(`- Total Bursts: ${STRESS_CONFIG.totalBursts}`);
  console.log(`- Ramp-up Time: ${STRESS_CONFIG.rampUpTime}ms`);
  console.log(`- Cool-down Time: ${STRESS_CONFIG.coolDownTime}ms`);
  console.log('');
  
  try {
    // Health check before starting
    console.log('🏥 Pre-test health check...');
    const healthResponse = await axios.get(`${API_BASE_URL}/api/rag/health`);
    console.log('✅ Health check passed:', healthResponse.data);
    
    // Phase 1: Ramp-up
    const rampUpResults = await rampUpLoad();
    
    // Phase 2: Sustained load
    console.log('\n🔥 PHASE 2: SUSTAINED LOAD TESTING');
    const sustainedResults = await sustainedLoadTest();
    
    // Phase 3: Cool-down
    console.log(`\n❄️  COOL-DOWN PHASE: Waiting ${STRESS_CONFIG.coolDownTime}ms...`);
    await new Promise(resolve => setTimeout(resolve, STRESS_CONFIG.coolDownTime));
    
    // Combine all results
    const allResults = [...rampUpResults, ...sustainedResults];
    
    // Calculate metrics
    const metrics = calculateMetrics(allResults);
    
    // Print results
    printDetailedResults(metrics);
    printRecommendations(metrics);
    
    // Final summary
    console.log('\n🎉 STRESS TEST COMPLETED!');
    console.log('=' .repeat(50));
    console.log(`Overall Success Rate: ${metrics.successRate.toFixed(2)}%`);
    console.log(`Total Throughput: ${metrics.throughput.toFixed(2)} req/s`);
    console.log(`Average Response Time: ${metrics.avgExecutionTime.toFixed(0)}ms`);
    
    return metrics;
    
  } catch (error) {
    console.error('❌ Stress test failed:', error.message);
    throw error;
  }
}

// Run stress test if this file is executed directly
if (require.main === module) {
  runStressTest().catch(console.error);
}

module.exports = {
  runStressTest,
  sendBurst,
  rampUpLoad,
  sustainedLoadTest,
  calculateMetrics
}; 