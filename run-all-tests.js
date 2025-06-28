const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { getApiConfig, getTestConfig } = require('./config');

const apiConfig = getApiConfig();
const testConfig = getTestConfig();

// Test configuration
const TEST_CONFIG = {
  serverUrl: apiConfig.baseUrl,
  timeout: apiConfig.timeout,
  delayBetweenTests: 10000, // 10 seconds between tests
  saveResults: testConfig.saveResults,
  resultsDir: testConfig.resultsDir
};

// Test scripts to run
const testScripts = [
  {
    name: 'Basic API Test',
    script: 'test-api.js',
    description: 'Basic functionality test with single request'
  },
  {
    name: 'Concurrent Load Test',
    script: 'test-concurrent.js',
    description: 'Test with 5 concurrent requests and load testing'
  },
  {
    name: 'Stress Test',
    script: 'test-stress.js',
    description: 'Intensive stress testing with burst requests'
  }
];

// Helper function to check if server is running
async function checkServerHealth() {
  const axios = require('axios');
  
  try {
    console.log('🏥 Checking server health...');
    const response = await axios.get(`${TEST_CONFIG.serverUrl}/api/rag/health`, {
      timeout: 10000
    });
    
    if (response.data.rag_initialized && response.data.vector_store_ready && response.data.llm_ready) {
      console.log('✅ Server is healthy and ready for testing');
      return true;
    } else {
      console.log('⚠️  Server is running but not fully initialized');
      return false;
    }
  } catch (error) {
    console.error('❌ Server health check failed:', error.message);
    return false;
  }
}

// Helper function to create results directory
function createResultsDirectory() {
  if (!fs.existsSync(TEST_CONFIG.resultsDir)) {
    fs.mkdirSync(TEST_CONFIG.resultsDir, { recursive: true });
    console.log(`📁 Created results directory: ${TEST_CONFIG.resultsDir}`);
  }
}

// Helper function to run a test script
function runTestScript(scriptPath, testName) {
  return new Promise((resolve, reject) => {
    console.log(`\n🚀 Running ${testName}...`);
    console.log(`📝 Script: ${scriptPath}`);
    console.log('=' .repeat(60));
    
    const startTime = Date.now();
    
    const child = exec(`node ${scriptPath}`, {
      timeout: TEST_CONFIG.timeout,
      maxBuffer: 1024 * 1024 * 10 // 10MB buffer
    });
    
    let output = '';
    let errorOutput = '';
    
    child.stdout.on('data', (data) => {
      output += data;
      process.stdout.write(data);
    });
    
    child.stderr.on('data', (data) => {
      errorOutput += data;
      process.stderr.write(data);
    });
    
    child.on('close', (code) => {
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      console.log(`\n🏁 ${testName} completed in ${duration}ms`);
      console.log(`📊 Exit code: ${code}`);
      
      const result = {
        testName,
        scriptPath,
        startTime,
        endTime,
        duration,
        exitCode: code,
        success: code === 0,
        output,
        errorOutput
      };
      
      if (code === 0) {
        console.log(`✅ ${testName} passed`);
      } else {
        console.log(`❌ ${testName} failed`);
      }
      
      resolve(result);
    });
    
    child.on('error', (error) => {
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      console.log(`\n💥 ${testName} crashed after ${duration}ms`);
      console.log(`❌ Error: ${error.message}`);
      
      const result = {
        testName,
        scriptPath,
        startTime,
        endTime,
        duration,
        exitCode: -1,
        success: false,
        output,
        errorOutput: error.message
      };
      
      resolve(result);
    });
  });
}

// Helper function to save test results
function saveTestResults(results, summary) {
  if (!TEST_CONFIG.saveResults) return;
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const resultsFile = path.join(TEST_CONFIG.resultsDir, `test-results-${timestamp}.json`);
  
  const fullResults = {
    timestamp: new Date().toISOString(),
    config: TEST_CONFIG,
    summary,
    results
  };
  
  fs.writeFileSync(resultsFile, JSON.stringify(fullResults, null, 2));
  console.log(`💾 Test results saved to: ${resultsFile}`);
  
  // Also save a summary report
  const summaryFile = path.join(TEST_CONFIG.resultsDir, `test-summary-${timestamp}.txt`);
  const summaryText = generateSummaryReport(summary, results);
  fs.writeFileSync(summaryFile, summaryText);
  console.log(`📋 Summary report saved to: ${summaryFile}`);
}

// Helper function to generate summary report
function generateSummaryReport(summary, results) {
  let report = 'WISNUS RAG API - PERFORMANCE TEST SUMMARY\n';
  report += '=' .repeat(60) + '\n\n';
  report += `Test Date: ${new Date().toLocaleString()}\n`;
  report += `Total Duration: ${summary.totalDuration}ms (${Math.floor(summary.totalDuration / 60000)}m ${Math.floor((summary.totalDuration % 60000) / 1000)}s)\n`;
  report += `Tests Run: ${summary.totalTests}\n`;
  report += `Tests Passed: ${summary.passedTests}\n`;
  report += `Tests Failed: ${summary.failedTests}\n`;
  report += `Success Rate: ${summary.successRate.toFixed(1)}%\n\n';
  
  report += 'DETAILED RESULTS:\n';
  report += '-' .repeat(40) + '\n';
  
  results.forEach((result, index) => {
    const status = result.success ? '✅ PASS' : '❌ FAIL';
    const duration = `${result.duration}ms`;
    report += `${index + 1}. ${result.testName}\n`;
    report += `   Status: ${status}\n`;
    report += `   Duration: ${duration}\n`;
    report += `   Exit Code: ${result.exitCode}\n`;
    
    if (!result.success && result.errorOutput) {
      report += `   Error: ${result.errorOutput.substring(0, 200)}...\n`;
    }
    report += '\n';
  });
  
  // Performance recommendations
  report += 'PERFORMANCE RECOMMENDATIONS:\n';
  report += '-' .repeat(40) + '\n';
  
  if (summary.successRate >= 95) {
    report += '✅ Excellent performance! All tests passed successfully.\n';
  } else if (summary.successRate >= 80) {
    report += '⚠️  Good performance with some issues. Consider:\n';
    report += '   - Adding more API keys for redundancy\n';
    report += '   - Optimizing database queries\n';
    report += '   - Implementing request queuing\n';
  } else {
    report += '❌ Performance needs significant improvement. Consider:\n';
    report += '   - Scaling up server resources\n';
    report += '   - Implementing caching\n';
    report += '   - Adding load balancing\n';
    report += '   - Optimizing the RAG pipeline\n';
  }
  
  return report;
}

// Helper function to wait between tests
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Main function to run all tests
async function runAllTests() {
  console.log('🚀 WISNUS RAG API - COMPREHENSIVE PERFORMANCE TESTING');
  console.log('=' .repeat(70));
  console.log(`Server URL: ${TEST_CONFIG.serverUrl}`);
  console.log(`Timeout per test: ${TEST_CONFIG.timeout / 1000}s`);
  console.log(`Delay between tests: ${TEST_CONFIG.delayBetweenTests / 1000}s`);
  console.log(`Save results: ${TEST_CONFIG.saveResults ? 'Yes' : 'No'}`);
  console.log('');
  
  const startTime = Date.now();
  
  try {
    // Check server health
    const serverHealthy = await checkServerHealth();
    if (!serverHealthy) {
      console.log('❌ Server is not ready for testing. Please ensure:');
      console.log('   1. Server is running (npm run dev)');
      console.log('   2. RAG system is initialized');
      console.log('   3. API keys are configured');
      console.log('   4. Database is connected');
      process.exit(1);
    }
    
    // Create results directory
    if (TEST_CONFIG.saveResults) {
      createResultsDirectory();
    }
    
    // Run all test scripts
    const results = [];
    
    for (let i = 0; i < testScripts.length; i++) {
      const test = testScripts[i];
      
      console.log(`\n📋 Test ${i + 1}/${testScripts.length}: ${test.name}`);
      console.log(`📝 Description: ${test.description}`);
      
      const result = await runTestScript(test.script, test.name);
      results.push(result);
      
      // Wait between tests (except for the last one)
      if (i < testScripts.length - 1) {
        console.log(`\n⏳ Waiting ${TEST_CONFIG.delayBetweenTests / 1000} seconds before next test...`);
        await wait(TEST_CONFIG.delayBetweenTests);
      }
    }
    
    // Calculate summary
    const endTime = Date.now();
    const totalDuration = endTime - startTime;
    const totalTests = results.length;
    const passedTests = results.filter(r => r.success).length;
    const failedTests = totalTests - passedTests;
    const successRate = (passedTests / totalTests) * 100;
    
    const summary = {
      totalDuration,
      totalTests,
      passedTests,
      failedTests,
      successRate
    };
    
    // Print final summary
    console.log('\n🎉 ALL TESTS COMPLETED!');
    console.log('=' .repeat(60));
    console.log(`Total Duration: ${Math.floor(totalDuration / 60000)}m ${Math.floor((totalDuration % 60000) / 1000)}s`);
    console.log(`Tests Run: ${totalTests}`);
    console.log(`Tests Passed: ${passedTests}`);
    console.log(`Tests Failed: ${failedTests}`);
    console.log(`Success Rate: ${successRate.toFixed(1)}%`);
    
    // Performance assessment
    console.log('\n💡 PERFORMANCE ASSESSMENT:');
    if (successRate >= 95) {
      console.log('✅ Excellent! All tests passed successfully.');
    } else if (successRate >= 80) {
      console.log('⚠️  Good performance with minor issues.');
    } else {
      console.log('❌ Performance needs improvement.');
    }
    
    // Save results
    if (TEST_CONFIG.saveResults) {
      saveTestResults(results, summary);
    }
    
    // Exit with appropriate code
    if (failedTests > 0) {
      console.log('\n❌ Some tests failed. Check the results for details.');
      process.exit(1);
    } else {
      console.log('\n✅ All tests passed successfully!');
      process.exit(0);
    }
    
  } catch (error) {
    console.error('\n💥 Test suite failed:', error.message);
    process.exit(1);
  }
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log('\n🛑 Test suite interrupted by user');
  process.exit(0);
});

// Run if this file is executed directly
if (require.main === module) {
  runAllTests();
}

module.exports = {
  runAllTests,
  checkServerHealth,
  runTestScript
}; 