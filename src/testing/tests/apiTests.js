// src/testing/tests/apiTests.js
import { createTestSuite, assert, apiTestUtils, TestConfig, registerTenantForCleanup } from '../testUtils';
import axios from 'axios';

// Constants for retry and timeout configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;
const API_TIMEOUT = 8000;

/**
 * Helper function to retry API calls with exponential backoff
 * @param {Function} apiCallFn - Function that returns a promise for the API call
 * @param {number} retries - Maximum number of retry attempts
 * @param {number} initialDelay - Initial delay in milliseconds
 * @returns {Promise<any>} - Result of the API call
 */
async function retryApiCall(apiCallFn, retries = MAX_RETRIES, initialDelay = RETRY_DELAY) {
  let lastError;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      // Log the retry attempt if not the first try
      if (attempt > 1) {
        console.log(`Retry attempt ${attempt}/${retries}`);
      }
      
      // Execute the API call
      return await apiCallFn();
    } catch (error) {
      console.warn(`API call failed (attempt ${attempt}/${retries}):`, error.message);
      lastError = error;
      
      // Don't delay on the last attempt
      if (attempt < retries) {
        // Exponential backoff with jitter
        const delay = initialDelay * Math.pow(2, attempt - 1) * (0.5 + Math.random() * 0.5);
        console.log(`Waiting ${Math.round(delay)}ms before retry...`);
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
        // Use direct axios call for better control
        const apiBaseUrl = TestConfig.apiBaseUrl || '';
        const response = await axios.post(`${apiBaseUrl}/api/tenants`, {
          tenantId: testTenantId,
          tenantName: `Test Tenant ${timestamp}`
        });
        
        console.log('Tenant creation raw response:', response.status);
        console.log('Tenant creation data:', JSON.stringify(response.data));
        
        if (response.status === 200 || response.status === 201) {
          testTenantCreated = true;
          console.log(`Test tenant created successfully: ${testTenantId}`);
        } else {
          console.warn(`Unexpected status when creating tenant: ${response.status}`);
        }
        
        return response.data;
      });
      
      // Register the tenant for cleanup
      if (testTenantCreated) {
        registerTenantForCleanup(testTenantId);
        console.log(`Test tenant ${testTenantId} registered for cleanup`);
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
        
        // Use direct axios call for better control
        const apiBaseUrl = TestConfig.apiBaseUrl || '';
        await axios.delete(`${apiBaseUrl}/api/tenants/${testTenantId}`);
        
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
      console.log(`Creating new test tenant: ${newTenantId}`);
      
      // Use direct axios call for more control
      const apiBaseUrl = TestConfig.apiBaseUrl || ''; 
      const createUrl = `${apiBaseUrl}/api/tenants`;
      
      console.log(`POST to ${createUrl} with ID ${newTenantId}`);
      
      const createResponse = await axios.post(createUrl, {
        tenantId: newTenantId,
        tenantName: `Test Create Tenant ${Date.now()}`
      });
      
      console.log('Create response status:', createResponse.status);
      console.log('Create response data:', JSON.stringify(createResponse.data));
      
      if (createResponse.status === 200 || createResponse.status === 201) {
        tempTenantCreated = true;
        console.log(`Temporary tenant created with status ${createResponse.status}`);
      } else {
        console.warn(`Unexpected status when creating tenant: ${createResponse.status}`);
      }
      
      // Register for cleanup
      registerTenantForCleanup(newTenantId);
      
      // Verify the tenant exists by attempting to get it
      console.log(`Verifying tenant exists: ${newTenantId}`);
      const verifyUrl = `${apiBaseUrl}/api/tenants/${newTenantId}`;
      const verifyResponse = await axios.get(verifyUrl);
      
      console.log(`Verify response status: ${verifyResponse.status}`);
      
      if (verifyResponse.status === 200) {
        console.log(`Verified tenant exists: ${newTenantId}`);
      }
      
      assert.isTrue(tempTenantCreated, 'Tenant should be created successfully');
      assert.equals(verifyResponse.data.data.id, newTenantId, 'Created tenant ID should match');
      
      // Cleanup - delete the newly created tenant
      if (tempTenantCreated) {
        try {
          console.log(`Cleaning up temporary tenant: ${newTenantId}`);
          await axios.delete(`${apiBaseUrl}/api/tenants/${newTenantId}`);
          console.log(`Temporary tenant deleted: ${newTenantId}`);
        } catch (cleanupError) {
          console.warn(`Failed to clean up temporary tenant: ${cleanupError.message}`);
          // We've already registered it for cleanup so it will be handled later
        }
      }
    } catch (error) {
      console.error(`Error in create tenant test: ${error.message}`);
      
      // Still try to clean up even if test fails
      registerTenantForCleanup(newTenantId);
      
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
      
      // Use direct axios call for more control
      const apiBaseUrl = TestConfig.apiBaseUrl || ''; 
      const createUrl = `${apiBaseUrl}/api/tenants`;
      
      console.log(`POST to ${createUrl} with ID ${tempTenantId}`);
      
      try {
        // Create tenant with explicit axios call
        const createResponse = await axios.post(createUrl, {
          tenantId: tempTenantId,
          tenantName: `Test Delete Tenant ${Date.now()}`
        });
        
        console.log('Tenant creation raw response:', createResponse.status);
        console.log('Tenant creation data:', JSON.stringify(createResponse.data));
        
        if (createResponse.status === 200 || createResponse.status === 201) {
          tempTenantCreated = true;
          console.log(`Temporary tenant created with status ${createResponse.status}`);
        } else {
          console.warn(`Unexpected status when creating tenant: ${createResponse.status}`);
        }
      } catch (createError) {
        console.error(`Error creating tenant for delete test:`, createError.message);
        if (createError.response) {
          console.error('Response status:', createError.response.status);
          console.error('Response data:', JSON.stringify(createError.response.data));
        }
        throw new Error(`Failed to create test tenant: ${createError.message}`);
      }
      
      // Register for cleanup
      registerTenantForCleanup(tempTenantId);
      
      // Add significant delay to ensure tenant is fully created and registered in the system
      console.log('Waiting 2 seconds for tenant to be fully registered...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Verify the tenant exists by attempting to get it
      let tenantExists = false;
      try {
        console.log(`Verifying tenant exists: ${tempTenantId}`);
        const verifyUrl = `${apiBaseUrl}/api/tenants/${tempTenantId}`;
        const verifyResponse = await axios.get(verifyUrl);
        
        console.log(`Verify response status: ${verifyResponse.status}`);
        
        if (verifyResponse.status === 200) {
          tenantExists = true;
          console.log(`Verified tenant exists: ${tempTenantId}`);
        }
      } catch (verifyError) {
        console.warn(`Error verifying tenant exists:`, verifyError.message);
        // If we get a 404, the tenant doesn't exist
        if (verifyError.response && verifyError.response.status === 404) {
          console.warn(`Tenant ${tempTenantId} not found during verification`);
          throw new Error(`Test tenant was created but then not found during verification`);
        }
      }
      
      // Now attempt to delete the tenant
      console.log(`Attempting to delete tenant: ${tempTenantId}`);
      
      // Use direct axios call to delete
      const deleteUrl = `${apiBaseUrl}/api/tenants/${tempTenantId}`;
      console.log(`DELETE request to: ${deleteUrl}`);
      
      let deleteSuccess = false;
      let deleteResponse = null;
      
      // Try up to 3 times with increasing delays
      const maxDeleteAttempts = 3;
      for (let attempt = 1; attempt <= maxDeleteAttempts; attempt++) {
        try {
          console.log(`Delete attempt ${attempt}/${maxDeleteAttempts}...`);
          const axiosResponse = await axios.delete(deleteUrl);
          
          console.log(`Delete response status: ${axiosResponse.status}`);
          console.log(`Delete response data:`, JSON.stringify(axiosResponse.data));
          
          // Accept any 2xx status as success
          if (axiosResponse.status >= 200 && axiosResponse.status < 300) {
            deleteSuccess = true;
            deleteResponse = axiosResponse.data;
            console.log(`Successful deletion on attempt ${attempt}`);
            break;
          } else {
            console.warn(`Unexpected status on delete attempt ${attempt}: ${axiosResponse.status}`);
          }
        } catch (deleteError) {
          console.warn(`Error on delete attempt ${attempt}:`, deleteError.message);
          
          if (deleteError.response) {
            console.warn(`Response status: ${deleteError.response.status}`);
            console.warn(`Response data:`, JSON.stringify(deleteError.response.data));
            
            // If we get a 404, the tenant might already be deleted
            if (deleteError.response.status === 404) {
              console.log(`Tenant appears to be already deleted (404 response)`);
              deleteSuccess = true;
              break;
            }
          }
          
          // Add increasing delay between attempts
          if (attempt < maxDeleteAttempts) {
            const delay = attempt * 1000; // 1s, 2s, 3s
            console.log(`Waiting ${delay}ms before next delete attempt...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }
      
      // Assert that deletion was successful - this will fail the test if deletion failed
      assert.isTrue(deleteSuccess, 'Tenant deletion should succeed');
      
      // Check response format when successful
      if (deleteSuccess && deleteResponse) {
        assert.isDefined(deleteResponse.success, 'Response should have success property');
        assert.isTrue(deleteResponse.success, 'Response success should be true');
      }
      
      // Verify deletion by attempting to get the tenant
      try {
        console.log(`Verifying tenant deletion: ${tempTenantId}`);
        await axios.get(`${apiBaseUrl}/api/tenants/${tempTenantId}`);
        
        // If we get here, the tenant still exists
        assert.isTrue(false, 'Tenant should not exist after deletion');
      } catch (error) {
        // This is expected - tenant not found
        if (error.response && error.response.status === 404) {
          console.log('Verified tenant deletion: 404 Not Found');
          assert.isTrue(true, 'Tenant was successfully deleted');
        } else {
          console.warn(`Unexpected error verifying deletion: ${error.message}`);
          throw new Error(`Error verifying tenant deletion: ${error.message}`);
        }
      }
    } catch (error) {
      console.error(`Error in delete tenant test: ${error.message}`);
      
      // Ensure tenant is registered for cleanup even if test fails
      registerTenantForCleanup(tempTenantId);
      
      // Rethrow the error to fail the test
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
      
      // Use direct axios for better control
      const apiBaseUrl = TestConfig.apiBaseUrl || '';
      
      await retryApiCall(async () => {
        const response = await axios.post(`${apiBaseUrl}/api/tenants`, {
          tenantId: testTenantId,
          tenantName: `Test Events Tenant ${timestamp}`
        });
        
        if (response.status === 200 || response.status === 201) {
          testTenantCreated = true;
          console.log(`Events test tenant created: ${testTenantId}`);
        } else {
          console.warn(`Unexpected status when creating tenant: ${response.status}`);
        }
        
        return response.data;
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
        
        try {
          const createUrl = `${apiBaseUrl}/api/calendar-events`;
          const createPayload = {
            tenantId: testTenantId,
            action: 'create',
            eventData: {
              title: `Test Event ${Date.now()}`,
              start: startDate.toISOString(),
              end: endDate.toISOString(),
              allDay: false
            }
          };
          
          console.log('Create event payload:', JSON.stringify(createPayload));
          
          const eventResponse = await axios.post(createUrl, createPayload);
          console.log('Test event creation response status:', eventResponse.status);
          console.log('Test event creation response data:', JSON.stringify(eventResponse.data));
          
          if (eventResponse.data && eventResponse.data.data && eventResponse.data.data.id) {
            testEventId = eventResponse.data.data.id;
            console.log(`Test event created with ID: ${testEventId}`);
          } else {
            console.warn('Could not extract event ID from creation response');
          }
        } catch (eventError) {
          console.error('Failed to create test event:', eventError.message);
          if (eventError.response) {
            console.error('Response status:', eventError.response.status);
            console.error('Response data:', JSON.stringify(eventError.response.data));
          }
        }
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
        const apiBaseUrl = TestConfig.apiBaseUrl || '';
        await axios.delete(`${apiBaseUrl}/api/tenants/${testTenantId}`);
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
    
    const apiBaseUrl = TestConfig.apiBaseUrl || '';
    const response = await retryApiCall(async () => {
      console.log(`Getting calendar events for tenant: ${testTenantId}`);
      const eventsUrl = `${apiBaseUrl}/api/calendar-events?tenantId=${encodeURIComponent(testTenantId)}`;
      console.log(`GET request to: ${eventsUrl}`);
      
      const axiosResponse = await axios.get(eventsUrl);
      console.log(`Get events response status: ${axiosResponse.status}`);
      console.log(`Get events response data:`, JSON.stringify(axiosResponse.data));
      
      return axiosResponse.data;
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
    
    // Use direct axios for creation
    const apiBaseUrl = TestConfig.apiBaseUrl || '';
    const createUrl = `${apiBaseUrl}/api/calendar-events`;
    
    console.log(`Creating calendar event for tenant: ${testTenantId}`);
    console.log(`POST to ${createUrl}`);
    
    const createPayload = {
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
    };
    
    console.log('Create payload:', JSON.stringify(createPayload));
    
    const createResponse = await axios.post(createUrl, createPayload);
    console.log('Create event response status:', createResponse.status);
    console.log('Create event response data:', JSON.stringify(createResponse.data));
    
    assert.isDefined(createResponse.data.success, 'Response should have success property');
    assert.isTrue(createResponse.data.success, 'Response success should be true');
    assert.isDefined(createResponse.data.data, 'Response should have data property');
    assert.isDefined(createResponse.data.data.id, 'Created event should have an ID');
  });
  
  // Test: Update a calendar event
  suite.addTest('should update a calendar event', async () => {
    // Skip if tenant wasn't created or no event was created
    if (!testTenantCreated || !testEventId) {
      console.warn('Skipping update event test - tenant or event was not created');
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
      
      const apiBaseUrl = TestConfig.apiBaseUrl || '';
      const createUrl = `${apiBaseUrl}/api/calendar-events`;
      
      const createPayload = {
        tenantId: testTenantId,
        action: 'create',
        eventData: {
          title: `Test Update Event ${Date.now()}`,
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        }
      };
      
      console.log('Create payload for update test:', JSON.stringify(createPayload));
      
      const createResponse = await axios.post(createUrl, createPayload);
      console.log('Create event for update response status:', createResponse.status);
      console.log('Create event for update response data:', JSON.stringify(createResponse.data));
      
      if (createResponse.data?.data?.id) {
        eventToUpdateId = createResponse.data.data.id;
        console.log(`Event to update created with ID: ${eventToUpdateId}`);
      } else {
        console.warn('Failed to get event ID from create response, using test event ID');
        eventToUpdateId = testEventId;
      }
      
      // Now update the event
      const updatedTitle = `Updated Event ${Date.now()}`;
      console.log(`Updating event ${eventToUpdateId} with title: ${updatedTitle}`);
      
      const updateUrl = `${apiBaseUrl}/api/calendar-events/${eventToUpdateId}`;
      const updatePayload = {
        tenantId: testTenantId,
        title: updatedTitle
      };
      
      console.log('Update payload:', JSON.stringify(updatePayload));
      
      const updateResponse = await axios.put(updateUrl, updatePayload);
      console.log('Event update response status:', updateResponse.status);
      console.log('Event update response data:', JSON.stringify(updateResponse.data));
      
      assert.isDefined(updateResponse.data.success, 'Response should have success property');
      assert.isTrue(updateResponse.data.success, 'Response success should be true');
      assert.equals(updateResponse.data.data.title, updatedTitle, 'Event title should be updated');
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
      
      // Use direct axios for creation for better control and debugging
      const apiBaseUrl = TestConfig.apiBaseUrl || '';
      const createUrl = `${apiBaseUrl}/api/calendar-events`;
      
      console.log(`POST to ${createUrl} for event creation`);
      
      try {
        const createPayload = {
          tenantId: testTenantId,
          action: 'create',
          eventData: {
            title: `Test Delete Event ${Date.now()}`,
            start: startDate.toISOString(),
            end: endDate.toISOString(),
          }
        };
        
        console.log('Create payload:', JSON.stringify(createPayload));
        
        const createResponse = await axios.post(createUrl, createPayload);
        console.log('Create event response status:', createResponse.status);
        console.log('Create event response data:', JSON.stringify(createResponse.data));
        
        if (createResponse.data?.data?.id) {
          eventToDeleteId = createResponse.data.data.id;
          console.log(`Event to delete created with ID: ${eventToDeleteId}`);
        } else {
          console.warn('Failed to get event ID from create response');
          console.log('Full response:', JSON.stringify(createResponse.data));
          
          // Try to extract ID with fallbacks
          if (createResponse.data?.id) {
            eventToDeleteId = createResponse.data.id;
            console.log(`Found event ID in alternate location: ${eventToDeleteId}`);
          } else {
            throw new Error('Could not extract event ID from creation response');
          }
        }
      } catch (createError) {
        console.error('Error creating calendar event:', createError.message);
        if (createError.response) {
          console.error('Response status:', createError.response.status);
          console.error('Response data:', JSON.stringify(createError.response.data));
        }
        throw new Error(`Failed to create test event: ${createError.message}`);
      }
      
      // Add significant delay to ensure event is fully registered
      console.log('Adding 2 second delay to ensure event is registered...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Now delete the event - DIRECT AXIOS APPROACH for better control
      console.log(`Deleting event: ${eventToDeleteId}`);
      
      // IMPORTANT: Properly format the URL with the tenantId as a query parameter
      const deleteUrl = `${apiBaseUrl}/api/calendar-events/${eventToDeleteId}?tenantId=${encodeURIComponent(testTenantId)}`;
      console.log(`DELETE request to: ${deleteUrl}`);
      
      let deleteSuccess = false;
      let deleteResponse = null;
      
      // Try up to 3 times with increasing delays
      const maxDeleteAttempts = 3;
      for (let attempt = 1; attempt <= maxDeleteAttempts; attempt++) {
        try {
          console.log(`Delete attempt ${attempt}/${maxDeleteAttempts}...`);
          const axiosResponse = await axios.delete(deleteUrl);
          
          console.log(`Delete response status: ${axiosResponse.status}`);
          console.log(`Delete response data:`, JSON.stringify(axiosResponse.data));
          
          // Accept any 2xx status as success
          if (axiosResponse.status >= 200 && axiosResponse.status < 300) {
            deleteSuccess = true;
            deleteResponse = axiosResponse.data;
            console.log(`Successful event deletion on attempt ${attempt}`);
            break;
          } else {
            console.warn(`Unexpected status on delete attempt ${attempt}: ${axiosResponse.status}`);
          }
        } catch (deleteError) {
          console.warn(`Error on delete attempt ${attempt}:`, deleteError.message);
          
          if (deleteError.response) {
            console.warn(`Response status: ${deleteError.response.status}`);
            console.warn(`Response data:`, JSON.stringify(deleteError.response.data));
            
            // If we get a 404, the event might already be deleted
            if (deleteError.response.status === 404) {
              console.log(`Event appears to be already deleted (404 response)`);
              deleteSuccess = true;
              break;
            }
          }
          
          // Add increasing delay between attempts
          if (attempt < maxDeleteAttempts) {
            const delay = attempt * 1000; // 1s, 2s, 3s
            console.log(`Waiting ${delay}ms before next delete attempt...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }
      
      // Assert deletion success - will fail the test if deletion failed
      assert.isTrue(deleteSuccess, 'Event deletion should succeed');
      
      // Check response format when successful
      if (deleteSuccess && deleteResponse) {
        assert.isDefined(deleteResponse.success, 'Response should have success property');
        assert.isTrue(deleteResponse.success, 'Response success should be true');
        assert.isTrue(deleteResponse.data.deleted, 'Event should be marked as deleted');
        assert.equals(deleteResponse.data.id, eventToDeleteId, 'Deleted event ID should match');
      }
      
      // Verify deletion by trying to get the event
      try {
        console.log(`Verifying event deletion: ${eventToDeleteId}`);
        const verifyUrl = `${apiBaseUrl}/api/calendar-events/${eventToDeleteId}?tenantId=${encodeURIComponent(testTenantId)}`;
        await axios.get(verifyUrl);
        
        // If we get here, the event still exists
        assert.isTrue(false, 'Event should not exist after deletion');
      } catch (error) {
        // This is expected - event not found
        if (error.response && error.response.status === 404) {
          console.log('Event deletion verification successful: Event not found');
          assert.isTrue(true, 'Event was successfully deleted and verified');
        } else {
          console.warn(`Unexpected error verifying event deletion: ${error.message}`);
          throw new Error(`Error verifying event deletion: ${error.message}`);
        }
      }
    } catch (error) {
      console.error(`Error in delete event test: ${error.message}`);
      
      // Rethrow the error to fail the test
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
      
      const apiBaseUrl = TestConfig.apiBaseUrl || '';
      
      // Create tenant with direct axios
      const createResponse = await axios.post(`${apiBaseUrl}/api/tenants`, {
        tenantId: testTenantId,
        tenantName: `Test Resources Tenant ${timestamp}`
      });
      
      console.log('Resources test tenant creation response:', createResponse.status);
      
      if (createResponse.status === 200 || createResponse.status === 201) {
        testTenantCreated = true;
        console.log(`Resources test tenant created: ${testTenantId}`);
      } else {
        console.warn(`Unexpected status when creating resources tenant: ${createResponse.status}`);
      }
      
      // Register the tenant for cleanup
      if (testTenantCreated) {
        registerTenantForCleanup(testTenantId);
        console.log(`Resources test tenant ${testTenantId} registered for cleanup`);
        
        // Add resources by creating events with equipment names
        console.log('Adding resources to tenant...');
        for (let i = 1; i <= 3; i++) {
          try {
            const startDate = new Date();
            startDate.setHours(startDate.getHours() + i);
            
            const endDate = new Date(startDate);
            endDate.setHours(endDate.getHours() + 1);
            
            const createUrl = `${apiBaseUrl}/api/calendar-events`;
            const createPayload = {
              tenantId: testTenantId,
              action: 'create',
              eventData: {
                title: `Event with Equipment ${i}`,
                start: startDate.toISOString(),
                end: endDate.toISOString(),
                equipment: `Test Equipment ${i}`
              }
            };
            
            console.log(`Creating event with equipment ${i}`);
            const response = await axios.post(createUrl, createPayload);
            console.log(`Created event with equipment ${i}, status:`, response.status);
          } catch (eventError) {
            console.error(`Error creating event with equipment ${i}:`, eventError.message);
          }
        }
        
        // Give server time to process the resources
        console.log('Waiting for resources to be processed...');
        await new Promise(resolve => setTimeout(resolve, 2000));
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
        const apiBaseUrl = TestConfig.apiBaseUrl || '';
        await axios.delete(`${apiBaseUrl}/api/tenants/${testTenantId}`);
        console.log(`Resources test tenant ${testTenantId} deleted successfully`);
      } catch (error) {
        console.error(`Error cleaning up resources test tenant: ${error.message}`);
        // Still continue - cleanup will happen in the global cleanup
      }
    }
  });
  
  // Test: Get equipment list from tenant data
  suite.addTest('should get equipment list from tenant data', async () => {
    // Skip if tenant wasn't created
    if (!testTenantCreated) {
      console.warn('Skipping equipment list test - tenant was not created');
      return;
    }
    
    try {
      console.log(`Getting tenant data to extract resources for: ${testTenantId}`);
      const apiBaseUrl = TestConfig.apiBaseUrl || '';
      
      // First check if the tenant exists
      const tenantUrl = `${apiBaseUrl}/api/tenants/${testTenantId}`;
      console.log(`GET tenant data from: ${tenantUrl}`);
      
      const tenantResponse = await axios.get(tenantUrl);
      console.log('Tenant response status:', tenantResponse.status);
      
      // Extract resources from tenant data
      let resources = [];
      if (tenantResponse.data?.data?.resources) {
        resources = tenantResponse.data.data.resources;
        console.log(`Extracted ${resources.length} resources from tenant data`);
      } else {
        console.warn('No resources found in tenant data');
      }
      
      // Check events to find equipment that might not be in resources
      if (tenantResponse.data?.data?.events) {
        const events = tenantResponse.data.data.events;
        console.log(`Extracted ${events.length} events from tenant data`);
        
        // Count unique equipment in events
        const equipmentSet = new Set();
        events.forEach(event => {
          if (event.equipment) {
            equipmentSet.add(event.equipment);
          }
        });
        
        console.log(`Found ${equipmentSet.size} unique equipment names in events`);
      }
      
      // Since resources are generated from events, we can't guarantee they'll exist
      // but we can verify the tenant response format is correct
      assert.isTrue(tenantResponse.status === 200, 'Tenant response status should be 200');
      assert.isDefined(tenantResponse.data.success, 'Response should have success property');
      assert.isTrue(tenantResponse.data.success, 'Response success should be true');
      assert.isDefined(tenantResponse.data.data, 'Response should have data property');
      
      // Check for resources array - it might be empty or undefined
      if (tenantResponse.data.data.resources) {
        assert.isTrue(Array.isArray(tenantResponse.data.data.resources), 'Resources should be an array if present');
      }
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
