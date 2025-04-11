// debugTests.js - Standalone test script for debugging
// Run with: node debugTests.js

// Load environment variables if needed
try {
  require('dotenv').config();
} catch (e) {
  console.log('dotenv not available, continuing without it');
}

const path = require('path');

// Check environment info
console.log('=== TEST ENVIRONMENT INFO ===');
console.log(`Node version: ${process.version}`);
console.log(`Current directory: ${process.cwd()}`);
console.log(`API Base URL: ${process.env.REACT_APP_API_URL || '(not set)'}`);
console.log('================================\n');

// Import test utilities
let testing;
try {
  testing = require('./src/testing');
} catch (e) {
  console.error('Could not import testing module. Error:', e);
  
  // Try relative path as fallback
  try {
    testing = require(path.join(__dirname, 'src', 'testing'));
    console.log('Loaded testing module via relative path');
  } catch (fallbackError) {
    console.error('Failed to load testing module via fallback path. Error:', fallbackError);
    process.exit(1);
  }
}

// Extract functions we need
const { 
  runAllTests, 
  runTestSuite,
  getAvailableTestSuites,
  TestConfig
} = testing;

// Import diagnostic functions
let preDiagnoseTestEnvironment, forceCleanupAllTestTenants;
try {
  ({ 
    preDiagnoseTestEnvironment, 
    forceCleanupAllTestTenants 
  } = require('./src/testing/testUtils'));
} catch (e) {
  console.warn('Could not import diagnostic functions directly:', e.message);
  console.log('Will proceed without diagnostics');
  
  // Create stub functions
  preDiagnoseTestEnvironment = async () => console.log('Diagnostic function not available');
  forceCleanupAllTestTenants = async () => console.log('Cleanup function not available');
}

// Get command line arguments
const args = process.argv.slice(2);
const testType = args[0] || 'api'; // Default to API tests
const suiteName = args[1]; // Optional specific suite to run

// Configure test options
TestConfig.verbose = true;

// Main function for test debugging
async function debugTestsWithCleanup() {
  try {
    console.log('\n=== TEST DEBUGGING START ===');
    console.log(`Test type: ${testType}`);
    console.log(`Suite name: ${suiteName || 'All suites'}`);
    
    // First run pre-diagnosis
    console.log('\n=== Running environment diagnosis... ===');
    await preDiagnoseTestEnvironment();
    
    // Force cleanup before tests
    console.log('\n=== Running initial cleanup... ===');
    await forceCleanupAllTestTenants();
    
    // List available test suites
    try {
      const availableSuites = getAvailableTestSuites();
      console.log('\n=== Available Test Suites ===');
      console.log(availableSuites);
    } catch (e) {
      console.warn('Could not get available test suites:', e.message);
    }
    
    // Run tests
    console.log(`\n=== Running ${suiteName || 'all'} ${testType} tests... ===`);
    
    let results;
    if (suiteName) {
      // Run a specific test suite
      results = await runTestSuite(suiteName, { 
        verbose: true
      });
    } else {
      // Run all tests of specified type
      results = await runAllTests({ 
        testType,
        verbose: true
      });
    }
    
    // Print test results
    console.log('\n=== TEST RESULTS ===');
    console.log(`Total tests: ${results.totalTests}`);
    console.log(`Passed: ${results.passed}`);
    console.log(`Failed: ${results.failed}`);
    console.log(`Skipped: ${results.skipped}`);
    console.log(`Duration: ${results.totalDuration}ms`);
    
    // Print detailed results for failed tests
    if (results.failed > 0) {
      console.log('\n=== FAILED TESTS ===');
      for (const suite of results.suites) {
        const failedTests = suite.tests.filter(t => t.status === 'failed');
        if (failedTests.length > 0) {
          console.log(`\nSuite: ${suite.suiteName}`);
          failedTests.forEach(test => {
            console.log(`  ✗ ${test.name}`);
            console.log(`    Error: ${test.error}`);
          });
        }
      }
    }
    
    // Force cleanup after tests
    console.log('\n=== Running final cleanup... ===');
    await forceCleanupAllTestTenants();
    
    console.log('\n=== TEST DEBUGGING COMPLETE ===');
  } catch (error) {
    console.error('\n!!! ERROR IN TEST DEBUGGING !!!');
    console.error(error);
    
    // Still try to clean up even if tests fail
    try {
      console.log('\n=== Running emergency cleanup... ===');
      await forceCleanupAllTestTenants();
    } catch (cleanupError) {
      console.error('Emergency cleanup also failed:', cleanupError);
    }
    
    process.exit(1);
  }
}

// Run the debug function
debugTestsWithCleanup().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('Unhandled error in debug script:', error);
  process.exit(1);
});
