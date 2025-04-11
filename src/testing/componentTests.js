// New file: src/testing/componentTests.js
// This is a more reliable approach for testing React components 
// using React Testing Library instead of DOM manipulation

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import TenantCalendar from '../components/TenantCalendar';
import AdminLogin from '../components/AdminLogin';

// Helper to render components within Router context
const renderWithRouter = (ui, { route = '/' } = {}) => {
  window.history.pushState({}, 'Test page', route);
  return render(ui, { wrapper: BrowserRouter });
};

// Create a test suite for component testing
export const createComponentTestSuite = (suiteName, testFn) => {
  const suite = {
    name: suiteName,
    tests: [],
    
    // Add a test to the suite
    addTest(testName, testFunction) {
      this.tests.push({
        name: testName,
        fn: testFunction
      });
      return this;
    },
    
    // Run all tests in the suite
    async run() {
      console.log(`Running component test suite: ${this.name}`);
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
      
      for (const test of this.tests) {
        const testResult = {
          name: test.name,
          status: 'pending',
          error: null,
          duration: 0
        };
        
        const startTime = performance.now();
        
        try {
          await test.fn();
          
          // Update test status to passed
          testResult.status = 'passed';
          results.passed++;
          console.log(`✓ ${test.name}`);
        } catch (error) {
          // Update test status to failed
          testResult.status = 'failed';
          testResult.error = error.message || 'Unknown error';
          results.failed++;
          console.error(`✗ ${test.name} - ${error.message}`);
        }
        
        // Calculate test duration
        testResult.duration = performance.now() - startTime;
        results.tests.push(testResult);
      }
      
      // Calculate overall metrics
      results.endTime = new Date();
      results.totalDuration = results.endTime - results.startTime;
      
      // Return test results
      return results;
    },
    
    // Initialize the suite by running the test function
    initialize() {
      if (testFn) {
        testFn(this);
      }
      return this;
    }
  };
  
  return suite;
};

// Create component test suites

// TenantCalendar Component Tests
export const tenantCalendarTests = createComponentTestSuite('TenantCalendar Component Tests', (suite) => {
  // Mock the API client
  const mockFetchTenant = jest.fn().mockResolvedValue({
    id: 'test-tenant',
    name: 'Test Tenant',
    events: [
      {
        id: 'event-1',
        title: 'Test Event',
        start: '2025-04-15T10:00:00',
        end: '2025-04-15T12:00:00'
      }
    ],
    resources: [
      {
        id: 'resource-1',
        title: 'Test Equipment'
      }
    ]
  });
  
  // Sample test for rendering
  suite.addTest('should render calendar component', async () => {
    // Mock the API
    jest.mock('../services/apiClient', () => ({
      fetchTenant: mockFetchTenant
    }));
    
    // Render the component
    renderWithRouter(<TenantCalendar />, { route: '/test-tenant' });
    
    // Wait for the calendar to load
    await waitFor(() => {
      expect(screen.getByText('Test Tenant')).toBeInTheDocument();
    });
    
    // Check that calendar elements are rendered
    expect(screen.getByText(/calendar/i)).toBeInTheDocument();
  });
});

// AdminLogin Component Tests
export const adminLoginTests = createComponentTestSuite('AdminLogin Component Tests', (suite) => {
  suite.addTest('should render login form', async () => {
    render(<AdminLogin />);
    
    // Check form elements
    expect(screen.getByLabelText(/admin password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument();
  });
  
  suite.addTest('should handle login submission', async () => {
    // Mock sessionStorage
    const mockSetItem = jest.fn();
    Object.defineProperty(window, 'sessionStorage', {
      value: {
        setItem: mockSetItem,
        getItem: jest.fn().mockReturnValue(null)
      }
    });
    
    render(<AdminLogin />);
    
    // Fill out form
    fireEvent.change(screen.getByLabelText(/admin password/i), {
      target: { value: 'admin123' }
    });
    
    // Submit form
    fireEvent.click(screen.getByRole('button', { name: /log in/i }));
    
    // Wait for login to process
    await waitFor(() => {
      expect(mockSetItem).toHaveBeenCalledWith('adminAuthenticated', 'true');
    });
  });
});

// Export all component test suites
export const allComponentTestSuites = [
  tenantCalendarTests,
  adminLoginTests
];
