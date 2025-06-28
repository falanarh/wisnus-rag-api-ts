const { cleanSourceText } = require('./src/services/ragService');

// Test cases for the source text cleaner
const testCases = [
  {
    input: "Wisata petualangan adalah jenis wisata yang melibatkan aktivitas fisik. (Sumber: Dokumen 1). Terima kasih sudah bertanya!",
    expected: "Wisata petualangan adalah jenis wisata yang melibatkan aktivitas fisik. (Sumber: Badan Pusat Statistik). Terima kasih sudah bertanya!"
  },
  {
    input: "Ekowisata adalah bentuk wisata yang bertanggung jawab. (Sumber: Dokumen [2]). Terima kasih sudah bertanya!",
    expected: "Ekowisata adalah bentuk wisata yang bertanggung jawab. (Sumber: Badan Pusat Statistik). Terima kasih sudah bertanya!"
  },
  {
    input: "Wisata bahari meliputi berbagai aktivitas di laut. (Sumber: Dokumen 3) dan (Sumber: Dokumen [4]). Terima kasih sudah bertanya!",
    expected: "Wisata bahari meliputi berbagai aktivitas di laut. (Sumber: Badan Pusat Statistik) dan (Sumber: Badan Pusat Statistik). Terima kasih sudah bertanya!"
  },
  {
    input: "Wisata budaya adalah pengalaman yang menarik. (Sumber: Badan Pusat Statistik). Terima kasih sudah bertanya!",
    expected: "Wisata budaya adalah pengalaman yang menarik. (Sumber: Badan Pusat Statistik). Terima kasih sudah bertanya!"
  },
  {
    input: "Wisata kuliner memberikan pengalaman gastronomi. (Sumber: Pengetahuan umum). Terima kasih sudah bertanya!",
    expected: "Wisata kuliner memberikan pengalaman gastronomi. (Sumber: Pengetahuan umum). Terima kasih sudah bertanya!"
  }
];

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Run tests
function runTests() {
  log('🧪 Testing Source Text Cleaner Function', 'blue');
  console.log('=' .repeat(60));
  
  let passedTests = 0;
  let totalTests = testCases.length;
  
  testCases.forEach((testCase, index) => {
    log(`\nTest ${index + 1}:`, 'yellow');
    console.log(`Input:    "${testCase.input}"`);
    
    const result = cleanSourceText(testCase.input);
    console.log(`Output:   "${result}"`);
    console.log(`Expected: "${testCase.expected}"`);
    
    if (result === testCase.expected) {
      log('✅ PASS', 'green');
      passedTests++;
    } else {
      log('❌ FAIL', 'red');
    }
  });
  
  // Summary
  log('\n📊 Test Summary:', 'blue');
  console.log('=' .repeat(30));
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${totalTests - passedTests}`);
  
  if (passedTests === totalTests) {
    log('🎉 All tests passed! Source text cleaner is working correctly.', 'green');
  } else {
    log('⚠️ Some tests failed. Please check the implementation.', 'red');
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests();
}

module.exports = {
  cleanSourceText,
  runTests
}; 