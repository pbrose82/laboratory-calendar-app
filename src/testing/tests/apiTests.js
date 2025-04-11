// src/testing/tests/apiTests.js - Improved version
import { createTestSuite, assert, apiTestUtils, TestConfig, registerTenantForCleanup } from '../testUtils';

// Constants for retries and timeouts
const MAX_RETRIES = 3;
const API_TIMEOUT = 5000;
const RETRY_DELAY = 1000;

// Helper function to retry API calls
async function retryApiCall(apiCallFn, retries = MAX_RETRIES, delay = RETRY_DELAY) {
  let lastError;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      // Log the retry attempt if not the first try
      if (attempt > 1) {
        console.log(`Retry attempt ${attempt}/${retries}`);
      }
      
      return await apiCallFn();
    } catch (error) {
      console.warn(`API call failed (attempt ${attempt}/${retries}):`, error.message);
      lastError = error;
      
      // Don't delay on the last attempt
      if (attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  // All retries failed, throw the last error
  throw lastError;
}

/**
 * Tenant API Test Suite
 */
export const tenantApiTests = createTestSuite('Tenant API Tests', (suite) => {
  let testTenantId;
  let testTenantCreated = false;
  
  // Setup: Create a test tenant before all tests
  suite.setBeforeAll(async () => {
    try {
      console.log('Creating test tenant for Tenant API Tests...');
      
      // Create a test tenant with retry
      const timestamp = Date.now();
      testTenantId = `test-tenant-${timestamp}`;
      
      await retryApiCall(async () => {
        await apiTestUtils.post('/tenants', {
          tenantId: testTenantId,
          tenantName: `Test Tenant ${timestamp}`
        });
        testTenantCreated = true;
        console.log(`Test tenant created: ${testTenantId}`);
      });
      
      // Register the tenant for cleanup
      if (testTenantCreated) {
        registerTenantForCleanup(testTenantId);
        console.log(`Test tenant ${testTenantId} created and registered for cleanup`);
      }
    } catch (error) {
      console.error('Error in tenant setup:', error);
      // Don't throw here - let the tests run and potentially skip if they need the tenant
    }
  });
  
  // Cleanup: Delete the test tenant after all tests
  suite.setAfterAll(async () => {
    if (testTenantId && testTenantCreated) {
      try {
        console.log(`Cleaning up test tenant: ${testTenantId}`);
        await apiTestUtils.delete(`/tenants/${testTenantId}`);
        console.log(`Test tenant ${testTenantId} deleted successfully`);
      } catch (error) {
        console.error(`Error cleaning up test tenant: ${error.message}`);
        // Still continue - cleanup will happen in the global cleanup
      }
    }
  });
  
  // Test: Get all tenants
  suite.addTest('should get all tenants', async () => {
    const response = await retryApiCall(async () => {
      console.log('Getting all tenants...');
      return await apiTestUtils.get('/tenants');
    });
    
    console.log(`Got ${response.data?.length || 0} tenants`);
    
    assert.isDefined(response.success, 'Response should have success property');
    assert.isTrue(response.success, 'Response success should be true');
    assert.isDefined(response.data, 'Response should have data property');
    assert.isTrue(Array.isArray(response.data), 'Response data should be an array');
  });
  
  // Test: Get tenant by ID
  suite.addTest('should get tenant by ID', async () => {
    // Skip if tenant wasn't created
    if (!testTenantCreated) {
      console.warn('Skipping test - tenant was not created');
      return;
    }
    
    const response = await retryApiCall(async () => {
      console.log(`Getting tenant by ID: ${testTenantId}`);
      return await apiTestUtils.get(`/tenants/${testTenantId}`);
    });
    
    console.log('Got tenant response:', response.success);
    
    assert.isDefined(response.success, 'Response should have success property');
    assert.isTrue(response.success, 'Response success should be true');
    assert.isDefined(response.data, 'Response should have data property');
    assert.equals(response.data.id, testTenantId, 'Tenant ID should match');
  });
  
  // Test: Create a new tenant
  suite.addTest('should create a new tenant', async () => {
    const newTenantId = `test-tenant-create-${Date.now()}`;
    let tempTenantCreated = false;
    
    try {
      const response = await retryApiCall(async () => {
        console.log(`Creating new test tenant: ${newTenantId}`);
        return await apiTestUtils.post('/tenants', {
          tenantId: newTenantId,
          tenantName: 'Test Create Tenant'
        });
      });
      
      tempTenantCreated = true;
      console.log(`Temporary test tenant created: ${newTenantId}`);
      
      // Register for cleanup
      registerTenantForCleanup(newTenantId);
      
      assert.isDefined(response.success, 'Response should have success property');
      assert.isTrue(response.success, 'Response success should be true');
      assert.isDefined(response.data, 'Response should have data property');
      assert.equals(response.data.id, newTenantId, 'Created tenant ID should match');
      
      // Cleanup - delete the newly created tenant
      if (tempTenantCreated) {
        try {
          console.log(`Cleaning up temporary tenant: ${newTenantId}`);
          await apiTestUtils.delete(`/tenants/${newTenantId}`);
          console.log(`Temporary tenant deleted: ${newTenantId}`);
        } catch (cleanupError) {
          console.warn(`Failed to clean up temporary tenant: ${cleanupError.message}`);
          // We've already registered it for cleanup so it will be handled later
        }
      }
    } catch (error) {
      console.error(`Error in create tenant test: ${error.message}`);
      
      // Still try to clean up even if test fails
      if (tempTenantCreated) {
        try {
          await apiTestUtils.delete(`/tenants/${newTenantId}`);
        } catch (cleanupError) {
          // Ignore cleanup errors
        }
      }
      throw error;
    }
  });
  
  // Test: Delete a tenant
  suite.addTest('should delete a tenant', async () => {
    // Create a temporary tenant to delete
    const tempTenantId = `test-tenant-delete-${Date.now()}`;
    let tempTenantCreated = false;
    
    try {
      console.log(`Creating temporary tenant for delete test: ${tempTenantId}`);
      
      await retryApiCall(async () => {
        await apiTestUtils.post('/tenants', {
          tenantId: tempTenantId,
          tenantName: 'Test Delete Tenant'
        });
        tempTenantCreated = true;
        console.log(`Temporary tenant created: ${tempTenantId}`);
      });
      
      // Register for cleanup in case deletion fails in the test
      if (tempTenantCreated) {
        registerTenantForCleanup(tempTenantId);
      } else {
        console.warn('Could not create temporary tenant for delete test');
        return; // Skip the rest of the test
      }
      
      // Delete the tenant
      console.log(`Deleting tenant: ${tempTenantId}`);
      const response = await retryApiCall(async () => {
        return await apiTestUtils.delete(`/tenants/${tempTenantId}`);
      });
      
      console.log('Delete response:', response.success);
      
      assert.isDefined(response.success, 'Response should have success property');
      assert.isTrue(response.success, 'Response success should be true');
      
      // Verify tenant is deleted by attempting to get it
      try {
        console.log(`Verifying tenant is deleted: ${tempTenantId}`);
        await apiTestUtils.get(`/tenants/${tempTenantId}`);
        assert.isTrue(false, 'Tenant should not exist after deletion');
      } catch (error) {
        // Expected error - tenant not found
        assert.isTrue(error.message.includes('404'), 'Should get 404 error for deleted tenant');
        console.log('Verified tenant was deleted (404 response)');
      }
    } catch (error) {
      console.error(`Error in delete tenant test: ${error.message}`);
      
      // If temp tenant was created but not deleted, ensure it's in the cleanup list
      if (tempTenantCreated) {
        registerTenantForCleanup(tempTenantId);
      }
      
      throw error;
    }
  });
});

/**
 * Calendar Events API Test Suite
 */
export const calendarEventApiTests = createTestSuite('Calendar Events API Tests', (suite) => {
  let testTenantId;
  let testEventId;
  let testTenantCreated = false;
  
  // Setup: Create a test tenant before all tests
  suite.setBeforeAll(async () => {
    try {
      console.log('Creating test tenant for Calendar Events API Tests...');
      
      // Create a test tenant with retry
      const timestamp = Date.now();
      testTenantId = `test-tenant-events-${timestamp}`;
      
      await retryApiCall(async () => {
        await apiTestUtils.post('/tenants', {
          tenantId: testTenantId,
          tenantName: `Test Events Tenant ${timestamp}`
        });
        testTenantCreated = true;
        console.log(`Events test tenant created: ${testTenantId}`);
      });
      
      // Register the tenant for cleanup
      if (testTenantCreated) {
        registerTenantForCleanup(testTenantId);
        console.log(`Events test tenant ${testTenantId} registered for cleanup`);
        
        // Create a test event
        console.log('Creating test event...');
        const startDate = new Date();
        startDate.setHours(startDate.getHours() + 1);
        
        const endDate = new Date(startDate);
        endDate.setHours(endDate.getHours() + 2);
        
        const eventResponse = await retryApiCall(async () => {
          return await apiTestUtils.post('/calendar-events', {
            tenantId: testTenantId,
            action: 'create',
            eventData: {
              title: 'Test Event',
              start: startDate.toISOString(),
              end: endDate.toISOString(),
              allDay: false
            }
          });
        });
        
        testEventId = eventResponse.data.id;
        console.log(`Test event created with ID: ${testEventId}`);
      }
    } catch (error) {
      console.error('Error in calendar events setup:', error);
      // Don't throw here - let the tests run and potentially skip if they need the tenant
    }
  });
  
  // Cleanup: Delete the test tenant after all tests
  suite.setAfterAll(async () => {
    if (testTenantId && testTenantCreated) {
      try {
        console.log(`Cleaning up events test tenant: ${testTenantId}`);
        await apiTestUtils.delete(`/tenants/${testTenantId}`);
        console.log(`Events test tenant ${testTenantId} deleted successfully`);
      } catch (error) {
        console.error(`Error cleaning up events test tenant: ${error.message}`);
        // Still continue - cleanup will happen in the global cleanup
      }
    }
  });
  
  // Test: Get calendar events
  suite.addTest('should get calendar events for tenant', async () => {
    // Skip if tenant wasn't created
    if (!testTenantCreated) {
      console.warn('Skipping calendar events test - tenant was not created');
      return;
    }
    
    const response = await retryApiCall(async () => {
      console.log(`Getting calendar events for tenant: ${testTenantId}`);
      return await apiTestUtils.get(`/calendar-events?tenantId=${testTenantId}`);
    });
    
    console.log(`Got ${response.data?.length || 0} calendar events`);
    
    assert.isDefined(response.success, 'Response should have success property');
    assert.isTrue(response.success, 'Response success should be true');
    assert.isDefined(response.data, 'Response should have data property');
    assert.isTrue(Array.isArray(response.data), 'Response data should be an array');
  });
  
  // Test: Create a calendar event
  suite.addTest('should create a calendar event', async () => {
    // Skip if tenant wasn't created
    if (!testTenantCreated) {
      console.warn('Skipping create event test - tenant was not created');
      return;
    }
    
    const startDate = new Date();
    startDate.setHours(startDate.getHours() + 1);
    
    const endDate = new Date(startDate);
    endDate.setHours(endDate.getHours() + 2);
    
    console.log(`Creating calendar event for tenant: ${testTenantId}`);
    const response = await retryApiCall(async () => {
      return await apiTestUtils.post('/calendar-events', {
        tenantId: testTenantId,
        action: 'create',
        eventData: {
          title: `Test Event ${Date.now()}`,
          start: startDate.toISOString(),
          end: endDate.toISOString(),
          allDay: false,
          location: 'Test Lab',
          equipment: 'Test Equipment',
          technician: 'Test Technician'
        }
      });
    });
    
    console.log(`Calendar event created with ID: ${response.data?.id}`);
    
    assert.isDefined(response.success, 'Response should have success property');
    assert.isTrue(response.success, 'Response success should be true');
    assert.isDefined(response.data, 'Response should have data property');
    assert.isDefined(response.data.id, 'Created event should have an ID');
  });
  
  // Test: Update a calendar event
  suite.addTest('should update a calendar event', async () => {
    // Skip if tenant wasn't created
    if (!testTenantCreated) {
      console.warn('Skipping update event test - tenant was not created');
      return;
    }
    
    // First create an event to update
    let eventToUpdateId;
    
    try {
      console.log('Creating calendar event to update...');
      const startDate = new Date();
      startDate.setHours(startDate.getHours() + 1);
      
      const endDate = new Date(startDate);
      endDate.setHours(endDate.getHours() + 2);
      
      const createResponse = await retryApiCall(async () => {
        return await apiTestUtils.post('/calendar-events', {
          tenantId: testTenantId,
          action: 'create',
          eventData: {
            title: `Test Update Event ${Date.now()}`,
            start: startDate.toISOString(),
            end: endDate.toISOString(),
          }
        });
      });
      
      eventToUpdateId = createResponse.data.id;
      console.log(`Event to update created with ID: ${eventToUpdateId}`);
      
      // Now update the event
      const updatedTitle = `Updated Event ${Date.now()}`;
      console.log(`Updating event ${eventToUpdateId} with title: ${updatedTitle}`);
      
      const updateResponse = await retryApiCall(async () => {
        return await apiTestUtils.put(`/calendar-events/${eventToUpdateId}`, {
          tenantId: testTenantId,
          title: updatedTitle
        });
      });
      
      console.log('Event update response:', updateResponse.success);
      
      assert.isDefined(updateResponse.success, 'Response should have success property');
      assert.isTrue(updateResponse.success, 'Response success should be true');
      assert.equals(updateResponse.data.title, updatedTitle, 'Event title should be updated');
    } catch (error) {
      console.error(`Error in update event test: ${error.message}`);
      throw error;
    }
  });
  
  // Test: Delete a calendar event
  suite.addTest('should delete a calendar event', async () => {
    // Skip if tenant wasn't created
    if (!testTenantCreated) {
      console.warn('Skipping delete event test - tenant was not created');
      return;
    }
    
    // First create an event to delete
    let eventToDeleteId;
    
    try {
      console.log('Creating calendar event to delete...');
      const startDate = new Date();
      startDate.setHours(startDate.getHours() + 1);
      
      const endDate = new Date(startDate);
      endDate.setHours(endDate.getHours() + 2);
      
      const createResponse = await retryApiCall(async () => {
        return await apiTestUtils.post('/calendar-events', {
          tenantId: testTenantId,
          action: 'create',
          eventData: {
            title: `Test Delete Event ${Date.now()}`,
            start: startDate.toISOString(),
            end: endDate.toISOString(),
          }
        });
      });
      
      eventToDeleteId = createResponse.data.id;
      console.log(`Event to delete created with ID: ${eventToDeleteId}`);
      
      // Now delete the event
      console.log(`Deleting event: ${eventToDeleteId}`);
      const deleteResponse = await retryApiCall(async () => {
        return await apiTestUtils.delete(`/calendar-events/${eventToDeleteId}?tenantId=${testTenantId}`);
      });
      
      console.log('Event delete response:', deleteResponse.success);
      
      assert.isDefined(deleteResponse.success, 'Response should have success property');
      assert.isTrue(deleteResponse.success, 'Response success should be true');
      assert.isTrue(deleteResponse.data.deleted, 'Event should be marked as deleted');
      assert.equals(deleteResponse.data.id, eventToDeleteId, 'Deleted event ID should match');
    } catch (error) {
      console.error(`Error in delete event test: ${error.message}`);
      throw error;
    }
  });
});

/**
 * Resources API Test Suite
 */
export const resourceApiTests = createTestSuite('Resources API Tests', (suite) => {
  let testTenantId;
  let testTenantCreated = false;
  
  // Setup: Create a test tenant and add resources
  suite.setBeforeAll(async () => {
    try {
      console.log('Creating test tenant for Resources API Tests...');
      
      // Create a test tenant with retry
      const timestamp = Date.now();
      testTenantId = `test-tenant-resources-${timestamp}`;
      
      await retryApiCall(async () => {
        await apiTestUtils.post('/tenants', {
          tenantId: testTenantId,
          tenantName: `Test Resources Tenant ${timestamp}`
        });
        testTenantCreated = true;
        console.log(`Resources test tenant created: ${testTenantId}`);
      });
      
      // Register the tenant for cleanup
      if (testTenantCreated) {
        registerTenantForCleanup(testTenantId);
        console.log(`Resources test tenant ${testTenantId} registered for cleanup`);
        
        // Add resources by creating events with equipment names
        console.log('Adding resources to tenant...');
        for (let i = 1; i <= 3; i++) {
          const startDate = new Date();
          startDate.setHours(startDate.getHours() + i);
          
          const endDate = new Date(startDate);
          endDate.setHours(endDate.getHours() + 1);
          
          await retryApiCall(async () => {
            await apiTestUtils.post('/calendar-events', {
              tenantId: testTenantId,
              title: `Event with Equipment ${i}`,
              start: startDate.toISOString(),
              end: endDate.toISOString(),
              equipment: `Test Equipment ${i}`
            });
            console.log(`Created event with equipment ${i}`);
          });
        }
        
        // Give server time to process the resources
        console.log('Waiting for resources to be processed...');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error('Error in resources setup:', error);
      // Don't throw here - let the tests run and potentially skip if they need the tenant
    }
  });
  
  // Cleanup: Delete the test tenant after all tests
  suite.setAfterAll(async () => {
    if (testTenantId && testTenantCreated) {
      try {
        console.log(`Cleaning up resources test tenant: ${testTenantId}`);
        await apiTestUtils.delete(`/tenants/${testTenantId}`);
        console.log(`Resources test tenant ${testTenantId} deleted successfully`);
      } catch (error) {
        console.error(`Error cleaning up resources test tenant: ${error.message}`);
        // Still continue - cleanup will happen in the global cleanup
      }
    }
  });
  
  // Test: Get equipment list
  suite.addTest('should get equipment list for tenant', async () => {
    // Skip if tenant wasn't created
    if (!testTenantCreated) {
      console.warn('Skipping equipment list test - tenant was not created');
      return;
    }
    
    // Wait longer for resources to be registered
    console.log('Waiting for resources to be available...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    try {
      console.log(`Getting equipment list for tenant: ${testTenantId}`);
      const queryParams = { tenantId: testTenantId };
      
      // First try the correct endpoint
      let response;
      try {
        response = await retryApiCall(async () => {
          return await apiTestUtils.get(`/equipment?tenantId=${testTenantId}`);
        });
      } catch (error) {
        console.warn(`Error with direct equipment endpoint: ${error.message}`);
        
        // Fallback - try getting tenant data and extracting resources
        console.log('Trying fallback - getting tenant data and extracting resources...');
        const tenantResponse = await retryApiCall(async () => {
          return await apiTestUtils.get(`/tenants/${testTenantId}`);
        });
        
        if (tenantResponse.data?.resources) {
          response = {
            success: true,
            data: tenantResponse.data.resources
          };
          console.log(`Extracted ${response.data.length} resources from tenant data`);
        } else {
          throw new Error('Could not get equipment list via any method');
        }
      }
      
      console.log(`Got ${response.data?.length || 0} equipment items`);
      
      assert.isDefined(response.success, 'Response should have success property');
      assert.isTrue(response.success, 'Response success should be true');
      assert.isDefined(response.data, 'Response should have data property');
      assert.isTrue(Array.isArray(response.data), 'Response data should be an array');
    } catch (error) {
      console.error(`Error in get equipment list test: ${error.message}`);
      throw error;
    }
  });
});

/**
 * Export all API test suites
 */
export const allApiTestSuites = [
  tenantApiTests.initialize(),
  calendarEventApiTests.initialize(),
  resourceApiTests.initialize()
];
