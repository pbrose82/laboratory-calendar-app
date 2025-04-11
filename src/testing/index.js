// src/testing/index.js
import { 
  runTests, 
  TestConfig, 
  cleanupTestResources, 
  preDiagnoseTestEnvironment, 
  forceCleanupAllTestTenants 
} from './testUtils';
import { allApiTestSuites } from './tests/apiTests';
import { allUiTestSuites } from './tests/uiTests';
import { allComponentTestSuites } from './componentTests';

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined' && window.document;

/**
 * Main entry point for running all tests
 * @param {Object} options - Test run options
 * @param {Function} progressCallback - Optional callback for progress updates
 * @returns {Promise<Object>} Test results
 */
export const runAllTests = async (options = {}, progressCallback = null) => {
  // Update test configuration if options provided
  if (options.apiBaseUrl) {
    TestConfig.apiBaseUrl = options.apiBaseUrl;
  }
  
  if (options.defaultTimeout) {
    TestConfig.defaultTimeout = options.defaultTimeout;
  }
  
  if (options.defaultTestTenant) {
    TestConfig.defaultTestTenant = options.defaultTestTenant;
  }
  
  if (options.verbose !== undefined) {
    TestConfig.verbose = options.verbose;
  }
  
  // Determine which test suites to run
  const suitesToRun = [];
  
  if (options.testType === 'api' || !options.testType) {
    suitesToRun.push(...allApiTestSuites);
  }
  
  if (options.testType === 'ui' || !options.testType) {
    if (isBrowser) {
      suitesToRun.push(...allUiTestSuites);
    } else {
      console.warn('UI tests cannot be run in a non-browser environment');
    }
  }
  
  if (options.testType === 'component' || !options.testType) {
    if (isBrowser) {
      suitesToRun.push(...allComponentTestSuites);
    } else {
      console.warn('Component tests cannot be run in a non-browser environment');
    }
  }
  
  try {
    // Run pre-diagnosis if requested
    if (options.runDiagnostics) {
      await preDiagnoseTestEnvironment();
    }
    
    // Force cleanup before tests if requested
    if (options.cleanupBeforeTests) {
      await forceCleanupAllTestTenants();
    }
    
    // Run the tests
    const results = await runTests(suitesToRun, progressCallback);
    
    // Clean up test resources
    await cleanupTestResources();
    
    // Force cleanup after tests if requested
    if (options.cleanupAfterTests) {
      await forceCleanupAllTestTenants();
    }
    
    return results;
  } catch (error) {
    console.error('Error running tests:', error);
    
    // Ensure cleanup happens even if tests fail
    await cleanupTestResources();
    
    throw error;
  }
};

/**
 * Run a specific test suite by name
 * @param {string} suiteName - Name of the test suite to run
 * @param {Object} options - Test run options
 * @param {Function} progressCallback - Optional callback for progress updates
 * @returns {Promise<Object>} Test results
 */
export const runTestSuite = async (suiteName, options = {}, progressCallback = null) => {
  // Update test configuration if options provided
  if (options.apiBaseUrl) {
    TestConfig.apiBaseUrl = options.apiBaseUrl;
  }
  
  if (options.defaultTimeout) {
    TestConfig.defaultTimeout = options.defaultTimeout;
  }
  
  if (options.defaultTestTenant) {
    TestConfig.defaultTestTenant = options.defaultTestTenant;
  }
  
  if (options.verbose !== undefined) {
    TestConfig.verbose = options.verbose;
  }
  
  // Find the requested test suite from all available suites
  const allSuites = [
    ...allApiTestSuites,
    ...(isBrowser ? allUiTestSuites : []),
    ...(isBrowser ? allComponentTestSuites : [])
  ];
  
  let targetSuite = null;
  
  for (const suite of allSuites) {
    if (suite.name === suiteName) {
      targetSuite = suite;
      break;
    }
  }
  
  if (!targetSuite) {
    throw new Error(`Test suite "${suiteName}" not found`);
  }
  
  // Run the test suite
  try {
    // Run pre-diagnosis if requested
    if (options.runDiagnostics) {
      await preDiagnoseTestEnvironment();
    }
    
    // Force cleanup before tests if requested
    if (options.cleanupBeforeTests) {
      await forceCleanupAllTestTenants();
    }
    
    const results = await runTests([targetSuite], progressCallback);
    
    // Clean up test resources
    await cleanupTestResources();
    
    // Force cleanup after tests if requested
    if (options.cleanupAfterTests) {
      await forceCleanupAllTestTenants();
    }
    
    return results;
  } catch (error) {
    console.error(`Error running test suite ${suiteName}:`, error);
    
    // Ensure cleanup happens even if tests fail
    await cleanupTestResources();
    
    throw error;
  }
};

/**
 * Get a list of all available test suites
 * @returns {Array<string>} Array of test suite names
 */
export const getAvailableTestSuites = () => {
  return [
    ...allApiTestSuites.map(suite => suite.name),
    ...(isBrowser ? allUiTestSuites.map(suite => suite.name) : []),
    ...(isBrowser ? allComponentTestSuites.map(suite => suite.name) : [])
  ];
};

// Export all test suites and utilities
export { 
  TestConfig, 
  cleanupTestResources, 
  preDiagnoseTestEnvironment, 
  forceCleanupAllTestTenants 
} from './testUtils';
export { allApiTestSuites } from './tests/apiTests';
export { allUiTestSuites } from './tests/uiTests';
export { allComponentTestSuites } from './componentTests';
