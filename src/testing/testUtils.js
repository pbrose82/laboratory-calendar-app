// src/testing/testUtils.js
import axios from 'axios';

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined' && window.document;

// Check if browser environment fully supports UI testing
const hasFullUiSupport = isBrowser && 
  typeof document.querySelector === 'function' &&
  typeof window.MouseEvent === 'function' &&
  typeof window.Event === 'function';

/**
 * Test framework utilities for the Laboratory Calendar application
 */

// Configuration object for the test runner
export const TestConfig = {
  // Base URL for API tests - defaults to local dev environment
  apiBaseUrl: process.env.REACT_APP_API_URL || '',
  // Default timeout for async tests in milliseconds
  defaultTimeout: 5000,
  // Default tenant ID to use for tests
  defaultTestTenant: 'test-tenant',
  // Flag to enable detailed logging
  verbose: true,
  // Flag to indicate if environment supports UI testing
  uiTestingSupported: hasFullUiSupport
};

// Global variable to keep track of resources that need cleanup
const testResourcesToCleanup = {
  tenants: [],
  events: []
};

/**
 * Register a test tenant to be cleaned up
 * @param {string} tenantId - ID of the tenant to be cleaned up
 */
export const registerTenantForCleanup = (tenantId) => {
  if (!testResourcesToCleanup.tenants.includes(tenantId)) {
    testResourcesToCleanup.tenants.push(tenantId);
    console.log(`Registered tenant for cleanup: ${tenantId}`);
  }
};

/**
 * Logger function that respects verbose setting
 * @param {string} message - Message to log
 * @param {string} level - Log level (log, warn, error)
 */
export const testLog = (message, level = 'log') => {
  if (TestConfig.verbose || level === 'error') {
    console[level](`[Test] ${message}`);
  }
};

/**
 * Creates a test suite
 * @param {string} suiteName - Name of the test suite
 * @param {Function} testFn - Function containing the tests
 * @returns {Object} Test suite object
 */
export const createTestSuite = (suiteName, testFn) => {
  return {
    name: suiteName,
    tests: [],
    beforeAll: null,
    afterAll: null,
    beforeEach: null,
    afterEach: null,
    
    // Initialize the suite by running the test function
    initialize() {
      testFn(this);
      return this;
    },
    
    // Add a test to the suite
    addTest(testName, testFunction) {
      this.tests.push({
        name: testName,
        fn: testFunction,
        status: 'pending',
        error: null,
        duration: 0
      });
    },
    
    // Set up hooks
    setBeforeAll(fn) {
      this.beforeAll = fn;
    },
    
    setAfterAll(fn) {
      this.afterAll = fn;
    },
    
    setBeforeEach(fn) {
      this.beforeEach = fn;
    },
    
    setAfterEach(fn) {
      this.afterEach = fn;
    },
    
    // Run all tests in the suite
    async run() {
      testLog(`Running test suite: ${this.name}`);
      const results = {
        suiteName: this.name,
        tests: [],
        passed: 0,
        failed: 0,
        skipped: 0,
        totalDuration: 0,
        startTime: new Date(),
        endTime: null
      };
      
      try {
        // Run beforeAll hook if defined
        if (this.beforeAll) {
          await this.beforeAll();
        }
        
        // Run each test
        for (const test of this.tests) {
          const testResult = {
            name: test.name,
            status: 'pending',
            error: null,
            duration: 0
          };
          
          const startTime = performance.now();
          
          try {
            // Run beforeEach hook if defined
            if (this.beforeEach) {
              await this.beforeEach();
            }
            
            // Check if this is a UI test and we don't have UI support
            const isUiTest = this.name.includes('UI Test');
            if (isUiTest && !TestConfig.uiTestingSupported) {
              testLog(`Skipping UI test in non-UI environment: ${test.name}`);
              testResult.status = 'skipped';
              results.skipped++;
            } else {
              // Run the test with timeout safety
              const testTimeout = setTimeout(() => {
                throw new Error(`Test timed out after ${TestConfig.defaultTimeout}ms`);
              }, TestConfig.defaultTimeout);
              
              await test.fn();
              clearTimeout(testTimeout);
              
              // Update test status to passed
              testResult.status = 'passed';
              results.passed++;
              testLog(`✓ ${test.name}`);
            }
          } catch (error) {
            // Update test status to failed
            testResult.status = 'failed';
            testResult.error = error.message || 'Unknown error';
            results.failed++;
            testLog(`✗ ${test.name} - ${error.message}`, 'error');
          }
          
          // Run afterEach hook if defined
          if (this.afterEach) {
            try {
              await this.afterEach();
            } catch (error) {
              testLog(`Error in afterEach hook: ${error.message}`, 'error');
            }
          }
          
          // Calculate test duration
          testResult.duration = performance.now() - startTime;
          results.tests.push(testResult);
        }
      } catch (error) {
        testLog(`Error in test suite: ${error.message}`, 'error');
      } finally {
        // Run afterAll hook if defined
        if (this.afterAll) {
          try {
            await this.afterAll();
          } catch (error) {
            testLog(`Error in afterAll hook: ${error.message}`, 'error');
          }
        }
      }
      
      // Calculate overall metrics
      results.endTime = new Date();
      results.totalDuration = results.endTime - results.startTime;
      
      // Return test results
      return results;
    }
  };
};

/**
 * Assertion utilities
 */
export const assert = {
  /**
   * Asserts that a condition is true
   * @param {boolean} condition - Condition to check
   * @param {string} message - Error message if assertion fails
   */
  isTrue(condition, message = 'Expected condition to be true') {
    if (!condition) {
      throw new Error(message);
    }
  },
  
  /**
   * Asserts that a condition is false
   * @param {boolean} condition - Condition to check
   * @param {string} message - Error message if assertion fails
   */
  isFalse(condition, message = 'Expected condition to be false') {
    if (condition) {
      throw new Error(message);
    }
  },
  
  /**
   * Asserts that two values are equal
   * @param {any} actual - Actual value
   * @param {any} expected - Expected value
   * @param {string} message - Error message if assertion fails
   */
  equals(actual, expected, message = `Expected ${actual} to equal ${expected}`) {
    if (actual !== expected) {
      throw new Error(message);
    }
  },
  
  /**
   * Asserts that a value is defined (not undefined)
   * @param {any} value - Value to check
   * @param {string} message - Error message if assertion fails
   */
  isDefined(value, message = 'Expected value to be defined') {
    if (value === undefined) {
      throw new Error(message);
    }
  },
  
  /**
   * Asserts that an object has a specific property
   * @param {Object} obj - Object to check
   * @param {string} property - Property to check for
   * @param {string} message - Error message if assertion fails
   */
  hasProperty(obj, property, message = `Expected object to have property ${property}`) {
    if (!obj.hasOwnProperty(property) && !(property in obj)) {
      throw new Error(message);
    }
  },
  
  /**
   * Asserts that an array contains a specific value
   * @param {Array} array - Array to check
   * @param {any} value - Value to check for
   * @param {string} message - Error message if assertion fails
   */
  contains(array, value, message = `Expected array to contain ${value}`) {
    if (!Array.isArray(array) || !array.includes(value)) {
      throw new Error(message);
    }
  },
  
  /**
   * Asserts that a function throws an error
   * @param {Function} fn - Function to check
   * @param {string} expectedError - Expected error message (optional)
   * @param {string} message - Error message if assertion fails
   */
  throws(fn, expectedError, message = 'Expected function to throw an error') {
    try {
      fn();
      throw new Error(message);
    } catch (error) {
      if (expectedError && error.message !== expectedError) {
        throw new Error(`Expected error message "${expectedError}" but got "${error.message}"`);
      }
    }
  },
  
  /**
   * Asserts that a value matches a regular expression
   * @param {string} value - Value to check
   * @param {RegExp} regex - Regular expression to match
   * @param {string} message - Error message if assertion fails
   */
  matches(value, regex, message = `Expected "${value}" to match ${regex}`) {
    if (!regex.test(value)) {
      throw new Error(message);
    }
  }
};

/**
 * API test utilities
 */
export const apiTestUtils = {
  /**
   * Make an API request
   * @param {string} method - HTTP method
   * @param {string} endpoint - API endpoint
   * @param {Object} data - Request data (for POST, PUT)
   * @param {Object} headers - Request headers
   * @returns {Promise<Object>} Response data
   */
  async request(method, endpoint, data = null, headers = {}) {
    const url = `${TestConfig.apiBaseUrl}/api${endpoint}`;
    
    try {
      const response = await axios({
        method,
        url,
        data,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        }
      });
      
      return response.data;
    } catch (error) {
      if (error.response) {
        throw new Error(`API request failed: ${error.response.status} ${error.response.statusText}`);
      }
      throw error;
    }
  },
  
  /**
   * Helper for GET requests
   * @param {string} endpoint - API endpoint
   * @param {Object} headers - Request headers
   * @returns {Promise<Object>} Response data
   */
  async get(endpoint, headers = {}) {
    return this.request('GET', endpoint, null, headers);
  },
  
  /**
   * Helper for POST requests
   * @param {string} endpoint - API endpoint
   * @param {Object} data - Request data
   * @param {Object} headers - Request headers
   * @returns {Promise<Object>} Response data
   */
  async post(endpoint, data, headers = {}) {
    return this.request('POST', endpoint, data, headers);
  },
  
  /**
   * Helper for PUT requests
   * @param {string} endpoint - API endpoint
   * @param {Object} data - Request data
   * @param {Object} headers - Request headers
   * @returns {Promise<Object>} Response data
   */
  async put(endpoint, data, headers = {}) {
    return this.request('PUT', endpoint, data, headers);
  },
  
  /**
   * Helper for DELETE requests
   * @param {string} endpoint - API endpoint
   * @param {Object} headers - Request headers
   * @returns {Promise<Object>} Response data
   */
  async delete(endpoint, headers = {}) {
    return this.request('DELETE', endpoint, null, headers);
  },
  
  /**
   * Create a test tenant for testing
   * @param {string} idSuffix - Suffix to append to the tenant ID
   * @returns {Promise<Object>} Created tenant
   */
  async createTestTenant(idSuffix = Date.now()) {
    const tenantId = `test-tenant-${idSuffix}`;
    const response = await this.post('/tenants', {
      tenantId,
      tenantName: `Test Tenant ${idSuffix}`
    });
    
    // Register for cleanup
    registerTenantForCleanup(tenantId);
    
    return response.data;
  },
  
  /**
   * Delete a test tenant
   * @param {string} tenantId - Tenant ID to delete
   * @returns {Promise<boolean>} Success status
   */
  async deleteTestTenant(tenantId) {
    await this.delete(`/tenants/${tenantId}`);
    return true;
  },
  
  /**
   * Create a test event for a tenant
   * @param {string} tenantId - Tenant ID
   * @param {Object} eventData - Event data (optional)
   * @returns {Promise<Object>} Created event
   */
  async createTestEvent(tenantId, eventData = {}) {
    const startDate = new Date();
    startDate.setHours(startDate.getHours() + 1);
    
    const endDate = new Date(startDate);
    endDate.setHours(endDate.getHours() + 2);
    
    const defaultEvent = {
      title: `Test Event ${Date.now()}`,
      start: startDate.toISOString(),
      end: endDate.toISOString(),
      allDay: false
    };
    
    const event = { ...defaultEvent, ...eventData };
    
    const response = await this.post('/calendar-events', {
      tenantId,
      action: 'create',
      eventData: event
    });
    
    return response.data;
  }
};

/**
 * Enhanced UI test utilities with better error handling and fallbacks
 * These methods only work in a browser environment
 */
export const uiTestUtils = hasFullUiSupport ? {
  /**
   * Safely attempt to click an element with fallbacks
   * @param {HTMLElement|string} elementOrSelector - Element or selector to click
   * @param {Object} options - Click options
   * @returns {boolean} Whether the click was successful
   */
  safeClick(elementOrSelector, options = {}) {
    try {
      // Handle selector strings
      let element = elementOrSelector;
      if (typeof elementOrSelector === 'string') {
        element = document.querySelector(elementOrSelector);
      }
      
      if (!element) {
        console.warn(`Element not found for click: ${elementOrSelector}`);
        return false;
      }
      
      // Try normal click first
      try {
        const event = new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          view: window,
          ...options
        });
        
        element.dispatchEvent(event);
        return true;
      } catch (clickError) {
        console.warn('Standard click failed, trying fallback methods', clickError);
        
        // Fallback 1: Try to call click() method
        if (typeof element.click === 'function') {
          element.click();
          return true;
        }
        
        // Fallback 2: Try to find and call onClick handler
        if (element.onclick) {
          element.onclick();
          return true;
        }
        
        // Fallback 3: Try to use a basic event
        try {
          const basicEvent = document.createEvent('Event');
          basicEvent.initEvent('click', true, true);
          element.dispatchEvent(basicEvent);
          return true;
        } catch (e) {
          console.error('All click methods failed', e);
          return false;
        }
      }
    } catch (error) {
      console.error('Error in safeClick:', error);
      return false;
    }
  },
  
  /**
   * Simulate a click event on an element (original method for backward compatibility)
   * @param {HTMLElement} element - Element to click
   */
  click(element) {
    return this.safeClick(element);
  },
  
  /**
   * Safely change input value with fallbacks
   * @param {HTMLInputElement|string} inputOrSelector - Input element or selector
   * @param {string} value - New value to set
   * @returns {boolean} Whether the operation was successful
   */
  safeChangeInput(inputOrSelector, value) {
    try {
      // Handle selector strings
      let input = inputOrSelector;
      if (typeof inputOrSelector === 'string') {
        input = document.querySelector(inputOrSelector);
      }
      
      if (!input) {
        console.warn(`Input not found: ${inputOrSelector}`);
        return false;
      }
      
      // Set the value
      const originalValue = input.value;
      input.value = value;
      
      // Check if value was actually set
      if (input.value !== value) {
        console.warn('Setting value directly failed, trying alternative method');
        
        // Try to set via property descriptor
        try {
          Object.defineProperty(input, 'value', {
            value: value,
            writable: true
          });
        } catch (e) {
          console.warn('Property descriptor approach failed');
          // Revert to original attempt
          input.value = value;
        }
      }
      
      // Dispatch events - with try/catch for each one
      try {
        const inputEvent = new Event('input', { bubbles: true });
        input.dispatchEvent(inputEvent);
      } catch (inputError) {
        console.warn('Input event dispatch failed', inputError);
      }
      
      try {
        const changeEvent = new Event('change', { bubbles: true });
        input.dispatchEvent(changeEvent);
      } catch (changeError) {
        console.warn('Change event dispatch failed', changeError);
      }
      
      return input.value === value;
    } catch (error) {
      console.error('Error in safeChangeInput:', error);
      return false;
    }
  },
  
  /**
   * Simulate input change (original method for backward compatibility)
   * @param {HTMLInputElement} input - Input element
   * @param {string} value - New value
   */
  changeInput(input, value) {
    return this.safeChangeInput(input, value);
  },
  
  /**
   * Select an option in a select element
   * @param {HTMLSelectElement} select - Select element
   * @param {string} value - Option value to select
   */
  selectOption(select, value) {
    if (!select) {
      throw new Error('Select element not found');
    }
    
    select.value = value;
    
    try {
      const event = new Event('change', { bubbles: true });
      select.dispatchEvent(event);
    } catch (error) {
      console.warn('Change event dispatch failed, trying direct method', error);
      
      // Try calling onchange directly as fallback
      if (typeof select.onchange === 'function') {
        select.onchange();
      }
    }
  },
  
  /**
   * Safely wait for element with improved checking and fallbacks
   * @param {string} selector - CSS selector
   * @param {number} timeout - Timeout in milliseconds
   * @param {number} pollInterval - How often to check for the element
   * @param {Function} alternateCheck - Optional additional check function
   * @returns {Promise<HTMLElement|null>} Found element or null if not found
   */
  async enhancedWaitForElement(selector, timeout = 5000, pollInterval = 100, alternateCheck = null) {
    return new Promise((resolve) => {
      const startTime = Date.now();
      let checkCount = 0;
      
      const checkElement = () => {
        checkCount++;
        let element = null;
        
        try {
          // Try querySelector first
          element = document.querySelector(selector);
          
          // If not found and we have an alternate check, try that
          if (!element && alternateCheck) {
            element = alternateCheck();
          }
          
          // If found, resolve with element
          if (element) {
            console.log(`Found element after ${checkCount} checks (${Date.now() - startTime}ms)`);
            resolve(element);
            return;
          }
          
          // If not found but we haven't timed out, try again
          if (Date.now() - startTime < timeout) {
            setTimeout(checkElement, pollInterval);
            return;
          }
          
          // If we've timed out, resolve with null
          console.warn(`Element not found after ${timeout}ms: ${selector}`);
          resolve(null);
        } catch (error) {
          console.error('Error in waitForElement:', error);
          
          // If we've timed out, resolve with null
          if (Date.now() - startTime >= timeout) {
            resolve(null);
            return;
          }
          
          // Otherwise try again
          setTimeout(checkElement, pollInterval);
        }
      };
      
      // Start checking
      checkElement();
    });
  },
  
  /**
   * Wait for an element to appear in the DOM (original method for backward compatibility)
   * @param {string} selector - CSS selector
   * @param {number} timeout - Timeout in milliseconds
   * @returns {Promise<HTMLElement>} Found element
   */
  async waitForElement(selector, timeout = TestConfig.defaultTimeout) {
    const element = await this.enhancedWaitForElement(selector, timeout);
    if (!element) {
      throw new Error(`Element not found: ${selector} (timeout: ${timeout}ms)`);
    }
    return element;
  },
  
  /**
   * Wait for a condition to be true
   * @param {Function} condition - Function that returns boolean
   * @param {number} timeout - Timeout in milliseconds
   * @param {number} pollInterval - How often to check the condition
   * @returns {Promise<boolean>} Whether condition was met before timeout
   */
  async waitForCondition(condition, timeout = 5000, pollInterval = 100) {
    return new Promise((resolve) => {
      const startTime = Date.now();
      
      const checkCondition = () => {
        try {
          // Check condition
          if (condition()) {
            resolve(true);
            return;
          }
          
          // If not met but we haven't timed out, try again
          if (Date.now() - startTime < timeout) {
            setTimeout(checkCondition, pollInterval);
            return;
          }
          
          // If we've timed out, resolve with false
          resolve(false);
        } catch (error) {
          console.error('Error in waitForCondition:', error);
          
          // If we've timed out, resolve with false
          if (Date.now() - startTime >= timeout) {
            resolve(false);
            return;
          }
          
          // Otherwise try again
          setTimeout(checkCondition, pollInterval);
        }
      };
      
      // Start checking
      checkCondition();
    });
  },
  
  /**
   * Safely navigate to a URL with verification
   * @param {string} url - URL to navigate to
   * @param {Function} verificationFn - Function to verify navigation worked
   * @param {number} timeout - Timeout for verification
   * @returns {Promise<boolean>} Whether navigation was successful
   */
  async safeNavigate(url, verificationFn = null, timeout = 5000) {
    try {
      const startLocation = window.location.href;
      
      // Navigate
      window.location.href = url;
      
      // If no verification function, wait a bit and assume success
      if (!verificationFn) {
        await this.wait(500);
        return window.location.href !== startLocation;
      }
      
      // Otherwise wait for verification function to return true
      return await this.waitForCondition(verificationFn, timeout);
    } catch (error) {
      console.error('Error in safeNavigate:', error);
      return false;
    }
  },
  
  /**
   * Get computed style safely
   * @param {HTMLElement} element - Element to get style for
   * @param {string} property - CSS property
   * @returns {string} Computed style value or empty string
   */
  getComputedStyleSafe(element, property) {
    if (!element) return '';
    
    try {
      const computedStyle = window.getComputedStyle(element);
      return computedStyle[property] || '';
    } catch (error) {
      console.warn(`Error getting computed style for ${property}:`, error);
      return '';
    }
  },
  
  /**
   * Check if an element is visible
   * @param {HTMLElement} element - Element to check
   * @returns {boolean} Whether element is visible
   */
  isElementVisible(element) {
    if (!element) return false;
    
    try {
      const style = window.getComputedStyle(element);
      
      return !!(
        element.offsetWidth || 
        element.offsetHeight || 
        element.getClientRects().length
      ) && 
      style.visibility !== 'hidden' && 
      style.display !== 'none' && 
      style.opacity !== '0';
    } catch (error) {
      console.warn('Error checking element visibility:', error);
      
      // Fallback: just check if element is in DOM
      return !!element;
    }
  },
  
  /**
   * Wait for an async operation to complete
   * @param {number} ms - Time to wait in milliseconds
   * @returns {Promise<void>}
   */
  async wait(ms = 500) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
} : {
  // Stub implementations for non-browser environments
  safeClick: () => console.log('UI testing not available in non-browser environment'),
  click: () => console.log('UI testing not available in non-browser environment'),
  safeChangeInput: () => console.log('UI testing not available in non-browser environment'),
  changeInput: () => console.log('UI testing not available in non-browser environment'),
  selectOption: () => console.log('UI testing not available in non-browser environment'),
  enhancedWaitForElement: async () => {
    console.log('UI testing not available in non-browser environment');
    return null;
  },
  waitForElement: async () => {
    console.log('UI testing not available in non-browser environment');
    return null;
  },
  waitForCondition: async () => false,
  safeNavigate: async () => false,
  getComputedStyleSafe: () => '',
  isElementVisible: () => false,
  wait: async (ms = 500) => {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
};

/**
 * Run a test suite and generate a report
 * @param {Array<Object>} suites - Array of test suites to run
 * @param {Function} progressCallback - Optional callback for progress updates
 * @returns {Promise<Object>} Test report
 */
export const runTests = async (suites, progressCallback = null) => {
  const startTime = new Date();
  
  testLog(`Starting test run with ${suites.length} suites`);
  
  const results = {
    suites: [],
    startTime,
    endTime: null,
    totalTests: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    totalDuration: 0
  };
  
  // Calculate total tests for progress reporting
  const totalTests = suites.reduce((sum, suite) => sum + suite.tests.length, 0);
  let completedTests = 0;
  
  for (const suite of suites) {
    // Report progress before starting suite
    if (progressCallback) {
      progressCallback({
        phase: 'suite-start',
        suiteName: suite.name,
        progress: completedTests / totalTests,
        completedTests,
        totalTests
      });
    }
    
    // Skip UI test suites in non-browser environments
    if (suite.name.includes('UI Test') && !TestConfig.uiTestingSupported) {
      testLog(`Skipping UI test suite in non-UI environment: ${suite.name}`);
      
      // Create a skipped suite result
      const skippedSuiteResult = {
        suiteName: suite.name,
        tests: suite.tests.map(test => ({
          name: test.name,
          status: 'skipped',
          error: null,
          duration: 0
        })),
        passed: 0,
        failed: 0,
        skipped: suite.tests.length,
        totalDuration: 0,
        startTime: new Date(),
        endTime: new Date()
      };
      
      results.suites.push(skippedSuiteResult);
      results.skipped += suite.tests.length;
      completedTests += suite.tests.length;
      
      // Report progress after suite is skipped
      if (progressCallback) {
        progressCallback({
          phase: 'suite-complete',
          suiteName: suite.name,
          suiteResult: skippedSuiteResult,
          progress: completedTests / totalTests,
          completedTests,
          totalTests
        });
      }
      
      continue;
    }
    
    try {
      // Run the suite with timeout protection
      const suiteTimeout = setTimeout(() => {
        testLog(`Test suite ${suite.name} timed out after ${TestConfig.defaultTimeout * 3}ms`, 'error');
      }, TestConfig.defaultTimeout * 3); // 3x normal timeout for suite
      
      const suiteResult = await suite.run();
      clearTimeout(suiteTimeout);
      
      results.suites.push(suiteResult);
      results.totalTests += suiteResult.tests.length;
      results.passed += suiteResult.passed;
      results.failed += suiteResult.failed;
      results.skipped += suiteResult.skipped;
      
      // Update completed tests count
      completedTests += suiteResult.tests.length;
      
      // Report progress after suite completes
      if (progressCallback) {
        progressCallback({
          phase: 'suite-complete',
          suiteName: suite.name,
          suiteResult,
          progress: completedTests / totalTests,
          completedTests,
          totalTests
        });
      }
    } catch (error) {
      testLog(`Error running test suite ${suite.name}: ${error.message}`, 'error');
      
      // Create a failed suite result
      const failedSuiteResult = {
        suiteName: suite.name,
        tests: [{
          name: 'Suite execution',
          status: 'failed',
          error: error.message,
          duration: 0
        }],
        passed: 0,
        failed: 1,
        skipped: suite.tests.length - 1,
        totalDuration: 0,
        startTime: new Date(),
        endTime: new Date()
      };
      
      results.suites.push(failedSuiteResult);
      results.totalTests += 1;
      results.failed += 1;
      results.skipped += suite.tests.length - 1;
      
      // Update completed tests count
      completedTests += suite.tests.length;
      
      // Report progress after suite fails
      if (progressCallback) {
        progressCallback({
          phase: 'suite-complete',
          suiteName: suite.name,
          suiteResult: failedSuiteResult,
          progress: completedTests / totalTests,
          completedTests,
          totalTests
        });
      }
    }
  }
  
  results.endTime = new Date();
  results.totalDuration = results.endTime - results.startTime;
  
  testLog(`Test run completed in ${results.totalDuration}ms`);
  testLog(`Total: ${results.totalTests}, Passed: ${results.passed}, Failed: ${results.failed}, Skipped: ${results.skipped}`);
  
  // Final progress report
  if (progressCallback) {
    progressCallback({
      phase: 'complete',
      results,
      progress: 1,
      completedTests,
      totalTests
    });
  }
  
  return results;
};

/**
 * Clean up all test resources created during testing
 * @returns {Promise<void>}
 */
export const cleanupTestResources = async () => {
  console.log('Starting cleanup of test resources...');
  
  // Clean up test tenants
  const tenantsToCleanup = [...testResourcesToCleanup.tenants];
  console.log(`Found ${tenantsToCleanup.length} tenants to clean up`);
  
  for (const tenantId of tenantsToCleanup) {
    try {
      console.log(`Cleaning up tenant: ${tenantId}`);
      await apiTestUtils.delete(`/tenants/${tenantId}`);
      console.log(`Successfully deleted tenant: ${tenantId}`);
      
      // Remove from cleanup list
      const index = testResourcesToCleanup.tenants.indexOf(tenantId);
      if (index !== -1) {
        testResourcesToCleanup.tenants.splice(index, 1);
      }
    } catch (error) {
      console.error(`Error deleting tenant ${tenantId}:`, error.message);
      
      // If it's a 404 error, tenant doesn't exist anymore, so remove from cleanup list
      if (error.message && error.message.includes('404')) {
        const index = testResourcesToCleanup.tenants.indexOf(tenantId);
        if (index !== -1) {
          testResourcesToCleanup.tenants.splice(index, 1);
        }
      }
    }
  }
  
  // Clear any remaining cleanup items
  if (testResourcesToCleanup.tenants.length === 0) {
    console.log('All test tenants cleaned up successfully');
  } else {
    console.warn(`${testResourcesToCleanup.tenants.length} tenants could not be cleaned up`);
  }
  
  return true;
};
