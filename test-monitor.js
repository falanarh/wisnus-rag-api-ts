const axios = require('axios');
const readline = require('readline');
const { getApiConfig, getTestConfig } = require('./config');

const apiConfig = getApiConfig();
const testConfig = getTestConfig();
const API_BASE_URL = apiConfig.baseUrl;
const MONITORING_INTERVAL = testConfig.monitoringInterval;
const TEST_DURATION = testConfig.testDuration;

// Performance metrics storage
const metrics = {
  requests: [],
  startTime: null,
  endTime: null,
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  currentConcurrentRequests: 0,
  maxConcurrentRequests: 0
};

// Sample questions for monitoring
const monitorQuestions = [
  'apa yang dimaksud dengan ekowisata?',
  'jelaskan tentang wisata bahari',
  'apa itu wisata petualangan?',
  'bagaimana cara melakukan survei wisatawan?',
  'apa saja jenis kegiatan wisata?'
];

// Helper function to generate random question
function getRandomQuestion() {
  return monitorQuestions[Math.floor(Math.random() * monitorQuestions.length)];
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

// Single request with monitoring
async function makeMonitoredRequest(question, requestId) {
  metrics.currentConcurrentRequests++;
  metrics.maxConcurrentRequests = Math.max(metrics.maxConcurrentRequests, metrics.currentConcurrentRequests);
  
  const startTime = Date.now();
  
  try {
    const response = await measureExecutionTime(() => 
      axios.post(`${API_BASE_URL}/api/rag/ask`, {
        question: question
      }, {
        timeout: 60000
      })
    );

    const endTime = Date.now();
    const requestData = {
      requestId,
      status: 'success',
      executionTime: response.executionTime,
      startTime,
      endTime,
      question: response.result.data.question,
      contextCount: response.result.data.context.length,
      answerLength: response.result.data.answer.length
    };
    
    metrics.requests.push(requestData);
    metrics.totalRequests++;
    metrics.successfulRequests++;
    
    return requestData;

  } catch (error) {
    const endTime = Date.now();
    
    let errorType = 'unknown';
    let errorMessage = error.message;
    
    if (error.response) {
      errorType = 'http_error';
      errorMessage = error.response.data.error || 'HTTP Error';
    } else if (error.code === 'ECONNABORTED') {
      errorType = 'timeout';
      errorMessage = 'Request timeout';
    } else {
      errorType = 'network_error';
      errorMessage = error.message;
    }
    
    const requestData = {
      requestId,
      status: 'failed',
      errorType,
      error: errorMessage,
      executionTime: endTime - startTime,
      startTime,
      endTime
    };
    
    metrics.requests.push(requestData);
    metrics.totalRequests++;
    metrics.failedRequests++;
    
    return requestData;
  } finally {
    metrics.currentConcurrentRequests--;
  }
}

// Calculate current metrics
function calculateCurrentMetrics() {
  const now = Date.now();
  const runningTime = now - metrics.startTime;
  
  // Calculate success rate
  const successRate = metrics.totalRequests > 0 
    ? (metrics.successfulRequests / metrics.totalRequests) * 100 
    : 0;
  
  // Calculate throughput
  const throughput = runningTime > 0 
    ? (metrics.totalRequests / (runningTime / 1000)) 
    : 0;
  
  // Calculate average response time from recent requests (last 10)
  const recentRequests = metrics.requests.slice(-10).filter(r => r.status === 'success');
  const avgResponseTime = recentRequests.length > 0 
    ? recentRequests.reduce((sum, r) => sum + r.executionTime, 0) / recentRequests.length 
    : 0;
  
  // Calculate error rate
  const errorRate = metrics.totalRequests > 0 
    ? (metrics.failedRequests / metrics.totalRequests) * 100 
    : 0;
  
  return {
    runningTime,
    totalRequests: metrics.totalRequests,
    successfulRequests: metrics.successfulRequests,
    failedRequests: metrics.failedRequests,
    successRate,
    errorRate,
    throughput,
    avgResponseTime,
    currentConcurrentRequests: metrics.currentConcurrentRequests,
    maxConcurrentRequests: metrics.maxConcurrentRequests
  };
}

// Print real-time metrics
function printMetrics(currentMetrics) {
  const minutes = Math.floor(currentMetrics.runningTime / 60000);
  const seconds = Math.floor((currentMetrics.runningTime % 60000) / 1000);
  
  console.clear();
  console.log('📊 WISNUS RAG API - REAL-TIME MONITORING');
  console.log('=' .repeat(60));
  console.log(`⏱️  Running Time: ${minutes}m ${seconds}s`);
  console.log(`🔄 Current Concurrent Requests: ${currentMetrics.currentConcurrentRequests}`);
  console.log(`📈 Max Concurrent Requests: ${currentMetrics.maxConcurrentRequests}`);
  console.log('');
  console.log('📈 REQUEST STATISTICS:');
  console.log(`Total Requests: ${currentMetrics.totalRequests}`);
  console.log(`Successful: ${currentMetrics.successfulRequests}`);
  console.log(`Failed: ${currentMetrics.failedRequests}`);
  console.log(`Success Rate: ${currentMetrics.successRate.toFixed(2)}%`);
  console.log(`Error Rate: ${currentMetrics.errorRate.toFixed(2)}%`);
  console.log('');
  console.log('⚡ PERFORMANCE METRICS:');
  console.log(`Throughput: ${currentMetrics.throughput.toFixed(2)} requests/second`);
  console.log(`Average Response Time: ${currentMetrics.avgResponseTime.toFixed(0)}ms`);
  console.log('');
  
  // Recent activity
  const recentRequests = metrics.requests.slice(-5);
  if (recentRequests.length > 0) {
    console.log('🕒 RECENT ACTIVITY:');
    recentRequests.forEach(req => {
      const status = req.status === 'success' ? '✅' : '❌';
      const time = new Date(req.startTime).toLocaleTimeString();
      console.log(`${status} ${time} - ${req.executionTime}ms - ${req.question?.substring(0, 30) || req.error}`);
    });
  }
  
  console.log('');
  console.log('Press Ctrl+C to stop monitoring');
}

// Generate load based on pattern
async function generateLoad(pattern = 'steady') {
  const question = getRandomQuestion();
  const requestId = `monitor-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    await makeMonitoredRequest(question, requestId);
  } catch (error) {
    console.error('Load generation error:', error.message);
  }
}

// Load patterns
const loadPatterns = {
  steady: () => 1, // 1 request per interval
  increasing: (elapsed) => Math.min(Math.floor(elapsed / 30000) + 1, 5), // Increase every 30s, max 5
  burst: (elapsed) => Math.random() > 0.7 ? 3 : 1, // 30% chance of 3 requests
  wave: (elapsed) => Math.floor(Math.sin(elapsed / 20000) * 2) + 3 // Sine wave pattern
};

// Start monitoring
async function startMonitoring(pattern = 'steady') {
  console.log('🚀 Starting Real-Time API Monitoring...');
  console.log(`Pattern: ${pattern}`);
  console.log(`Duration: ${TEST_DURATION / 60000} minutes`);
  console.log(`Interval: ${MONITORING_INTERVAL / 1000} seconds`);
  console.log('');
  
  metrics.startTime = Date.now();
  
  // Health check
  try {
    const healthResponse = await axios.get(`${API_BASE_URL}/api/rag/health`);
    console.log('✅ Health check passed:', healthResponse.data);
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    return;
  }
  
  // Start monitoring loop
  const monitoringInterval = setInterval(async () => {
    const currentMetrics = calculateCurrentMetrics();
    printMetrics(currentMetrics);
    
    // Generate load based on pattern
    const elapsed = currentMetrics.runningTime;
    const loadCount = loadPatterns[pattern](elapsed);
    
    for (let i = 0; i < loadCount; i++) {
      generateLoad(pattern);
    }
    
    // Check if test duration is reached
    if (elapsed >= TEST_DURATION) {
      clearInterval(monitoringInterval);
      await finishMonitoring();
    }
  }, MONITORING_INTERVAL);
  
  // Handle Ctrl+C
  process.on('SIGINT', async () => {
    clearInterval(monitoringInterval);
    console.log('\n🛑 Monitoring stopped by user');
    await finishMonitoring();
    process.exit(0);
  });
}

// Finish monitoring and print final results
async function finishMonitoring() {
  metrics.endTime = Date.now();
  const finalMetrics = calculateCurrentMetrics();
  
  console.log('\n🎉 MONITORING COMPLETED!');
  console.log('=' .repeat(60));
  console.log('📊 FINAL RESULTS:');
  console.log(`Total Runtime: ${Math.floor(finalMetrics.runningTime / 60000)}m ${Math.floor((finalMetrics.runningTime % 60000) / 1000)}s`);
  console.log(`Total Requests: ${finalMetrics.totalRequests}`);
  console.log(`Successful: ${finalMetrics.successfulRequests}`);
  console.log(`Failed: ${finalMetrics.failedRequests}`);
  console.log(`Success Rate: ${finalMetrics.successRate.toFixed(2)}%`);
  console.log(`Error Rate: ${finalMetrics.errorRate.toFixed(2)}%`);
  console.log(`Average Throughput: ${finalMetrics.throughput.toFixed(2)} requests/second`);
  console.log(`Average Response Time: ${finalMetrics.avgResponseTime.toFixed(0)}ms`);
  console.log(`Max Concurrent Requests: ${finalMetrics.maxConcurrentRequests}`);
  
  // Performance analysis
  console.log('\n💡 PERFORMANCE ANALYSIS:');
  if (finalMetrics.successRate >= 95) {
    console.log('✅ Excellent reliability!');
  } else if (finalMetrics.successRate >= 80) {
    console.log('⚠️  Good reliability with some failures');
  } else {
    console.log('❌ Reliability needs improvement');
  }
  
  if (finalMetrics.avgResponseTime < 10000) {
    console.log('✅ Fast response times!');
  } else if (finalMetrics.avgResponseTime < 30000) {
    console.log('⚠️  Moderate response times');
  } else {
    console.log('❌ Slow response times');
  }
  
  if (finalMetrics.throughput > 0.5) {
    console.log('✅ Good throughput!');
  } else if (finalMetrics.throughput > 0.1) {
    console.log('⚠️  Moderate throughput');
  } else {
    console.log('❌ Low throughput');
  }
  
  // Save results to file
  const fs = require('fs');
  const results = {
    timestamp: new Date().toISOString(),
    duration: finalMetrics.runningTime,
    metrics: finalMetrics,
    requests: metrics.requests
  };
  
  const filename = `monitoring-results-${Date.now()}.json`;
  fs.writeFileSync(filename, JSON.stringify(results, null, 2));
  console.log(`\n💾 Results saved to: ${filename}`);
}

// Interactive pattern selection
async function selectPattern() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    console.log('🎯 Select Load Pattern:');
    console.log('1. steady - Constant 1 request per interval');
    console.log('2. increasing - Gradually increasing load');
    console.log('3. burst - Random burst pattern');
    console.log('4. wave - Sine wave pattern');
    console.log('');
    
    rl.question('Enter pattern number (1-4): ', (answer) => {
      rl.close();
      
      const patterns = ['steady', 'increasing', 'burst', 'wave'];
      const patternIndex = parseInt(answer) - 1;
      
      if (patternIndex >= 0 && patternIndex < patterns.length) {
        resolve(patterns[patternIndex]);
      } else {
        console.log('Invalid selection, using steady pattern');
        resolve('steady');
      }
    });
  });
}

// Main function
async function main() {
  try {
    const pattern = await selectPattern();
    await startMonitoring(pattern);
  } catch (error) {
    console.error('❌ Monitoring failed:', error.message);
    process.exit(1);
  }
}

// Run if this file is executed directly
if (require.main === module) {
  main();
}

module.exports = {
  startMonitoring,
  makeMonitoredRequest,
  calculateCurrentMetrics,
  loadPatterns
}; 