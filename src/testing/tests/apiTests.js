// src/testing/tests/apiTests.js
import { createTestSuite, assert, apiTestUtils, TestConfig, registerTenantForCleanup } from '../testUtils';

/**
 * Tenant API Test Suite
 */
export const tenantApiTests = createTestSuite('Tenant API Tests', (suite) => {
  let testTenantId;
  
  // Setup: Create a test tenant before all tests
  suite.setBeforeAll(async () => {
    // Create a test tenant
    const timestamp = Date.now();
    testTenantId = `test-tenant-${timestamp}`;
    
    await apiTestUtils.post('/tenants', {
      tenantId: testTenantId,
      tenantName: `Test Tenant ${timestamp}`
    });
    
    // Register the tenant for cleanup
    registerTenantForCleanup(testTenantId);
    console.log(`Test tenant ${testTenantId} created and registered for cleanup`);
  });
  
  // Cleanup: Delete the test tenant after all tests
  suite.setAfterAll(async () => {
    if (testTenantId) {
      try {
        console.log(`Cleaning up test tenant: ${testTenantId}`);
        await apiTestUtils.delete(`/tenants/${testTenantId}`);
        console.log(`Test tenant ${testTenantId} deleted successfully`);
      } catch (error) {
        console.error(`Error cleaning up test tenant: ${error.message}`);
      }
    }
  });
  
  // Test: Get all tenants
  suite.addTest('should get all tenants', async () => {
    const response = await apiTestUtils.get('/tenants');
    
    assert.isDefined(response.success, 'Response should have success property');
    assert.isTrue(response.success, 'Response success should be true');
    assert.isDefined(response.data, 'Response should have data property');
    assert.isTrue(Array.isArray(response.data), 'Response data should be an array');
  });
  
  // Test: Get tenant by ID
  suite.addTest('should get tenant by ID', async () => {
    const response = await apiTestUtils.get(`/tenants/${testTenantId}`);
    
    assert.isDefined(response.success, 'Response should have success property');
    assert.isTrue(response.success, 'Response success should be true');
    assert.isDefined(response.data, 'Response should have data property');
    assert.equals(response.data.id, testTenantId, 'Tenant ID should match');
  });
  
  // Test: Create a new tenant
  suite.addTest('should create a new tenant', async () => {
    const newTenantId = `test-tenant-create-${Date.now()}`;
    
    try {
      const response = await apiTestUtils.post('/tenants', {
        tenantId: newTenantId,
        tenantName: 'Test Create Tenant'
      });
      
      // Register for cleanup
      registerTenantForCleanup(newTenantId);
      
      assert.isDefined(response.success, 'Response should have success property');
      assert.isTrue(response.success, 'Response success should be true');
      assert.isDefined(response.data, 'Response should have data property');
      assert.equals(response.data.id, newTenantId, 'Created tenant ID should match');
      
      // Cleanup - delete the newly created tenant
      await apiTestUtils.delete(`/tenants/${newTenantId}`);
    } catch (error) {
      // Ensure cleanup even if test fails
      try {
        await apiTestUtils.delete(`/tenants/${newTenantId}`);
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
      throw error;
    }
  });
  
  // Test: Delete a tenant
  suite.addTest('should delete a tenant', async () => {
    // Create a temporary tenant to delete
    const tempTenantId = `test-tenant-delete-${Date.now()}`;
    
    await apiTestUtils.post('/tenants', {
      tenantId: tempTenantId,
      tenantName: 'Test Delete Tenant'
    });
    
    // Register for cleanup in case deletion fails in the test
    registerTenantForCleanup(tempTenantId);
    
    // Delete the tenant
    const response = await apiTestUtils.delete(`/tenants/${tempTenantId}`);
    
    assert.isDefined(response.success, 'Response should have success property');
    assert.isTrue(response.success, 'Response success should be true');
    
    // Verify tenant is deleted by attempting to get it
    try {
      await apiTestUtils.get(`/tenants/${tempTenantId}`);
      assert.isTrue(false, 'Tenant should not exist after deletion');
    } catch (error) {
      // Expected error - tenant not found
      assert.isTrue(error.message.includes('404'), 'Should get 404 error for deleted tenant');
    }
  });
});

/**
 * Calendar Events API Test Suite
 */
export const calendarEventApiTests = createTestSuite('Calendar Events API Tests', (suite) => {
  let testTenantId;
  let testEventId;
  
  // Setup: Create a test tenant before all tests
  suite.setBeforeAll(async () => {
    // Create a test tenant
    const timestamp = Date.now();
    testTenantId = `test-tenant-events-${timestamp}`;
    
    await apiTestUtils.post('/tenants', {
      tenantId: testTenantId,
      tenantName: `Test Events Tenant ${timestamp}`
    });
    
    // Register the tenant for cleanup
    registerTenantForCleanup(testTenantId);
    console.log(`Events test tenant ${testTenantId} created and registered for cleanup`);
    
    // Create a test event
    const startDate = new Date();
    startDate.setHours(startDate.getHours() + 1);
    
    const endDate = new Date(startDate);
    endDate.setHours(endDate.getHours() + 2);
    
    const eventResponse = await apiTestUtils.post('/calendar-events', {
      tenantId: testTenantId,
      action: 'create',
      eventData: {
        title: 'Test Event',
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        allDay: false
      }
    });
    
    testEventId = eventResponse.data.id;
  });
  
  // Cleanup: Delete the test tenant after all tests
  suite.setAfterAll(async () => {
    if (testTenantId) {
      try {
        console.log(`Cleaning up test tenant: ${testTenantId}`);
        await apiTestUtils.delete(`/tenants/${testTenantId}`);
        console.log(`Test tenant ${testTenantId} deleted successfully`);
      } catch (error) {
        console.error(`Error cleaning up test tenant: ${error.message}`);
      }
    }
  });
  
  // Test: Get calendar events
  suite.addTest('should get calendar events for tenant', async () => {
    const response = await apiTestUtils.get(`/calendar-events?tenantId=${testTenantId}`);
    
    assert.isDefined(response.success, 'Response should have success property');
    assert.isTrue(response.success, 'Response success should be true');
    assert.isDefined(response.data, 'Response should have data property');
    assert.isTrue(Array.isArray(response.data), 'Response data should be an array');
  });
  
  // Test: Create a calendar event
  suite.addTest('should create a calendar event', async () => {
    const startDate = new Date();
    startDate.setHours(startDate.getHours() + 1);
    
    const endDate = new Date(startDate);
    endDate.setHours(endDate.getHours() + 2);
    
    const response = await apiTestUtils.post('/calendar-events', {
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
    
    assert.isDefined(response.success, 'Response should have success property');
    assert.isTrue(response.success, 'Response success should be true');
    assert.isDefined(response.data, 'Response should have data property');
    assert.isDefined(response.data.id, 'Created event should have an ID');
  });
  
  // Test: Update a calendar event
  suite.addTest('should update a calendar event', async () => {
    // First create an event to update
    const startDate = new Date();
    startDate.setHours(startDate.getHours() + 1);
    
    const endDate = new Date(startDate);
    endDate.setHours(endDate.getHours() + 2);
    
    const createResponse = await apiTestUtils.post('/calendar-events', {
      tenantId: testTenantId,
      action: 'create',
      eventData: {
        title: `Test Update Event ${Date.now()}`,
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      }
    });
    
    const eventId = createResponse.data.id;
    
    // Now update the event
    const updatedTitle = `Updated Event ${Date.now()}`;
    
    const updateResponse = await apiTestUtils.put(`/calendar-events/${eventId}`, {
      tenantId: testTenantId,
      title: updatedTitle
    });
    
    assert.isDefined(updateResponse.success, 'Response should have success property');
    assert.isTrue(updateResponse.success, 'Response success should be true');
    assert.equals(updateResponse.data.title, updatedTitle, 'Event title should be updated');
  });
  
  // Test: Delete a calendar event
  suite.addTest('should delete a calendar event', async () => {
    // First create an event to delete
    const startDate = new Date();
    startDate.setHours(startDate.getHours() + 1);
    
    const endDate = new Date(startDate);
    endDate.setHours(endDate.getHours() + 2);
    
    const createResponse = await apiTestUtils.post('/calendar-events', {
      tenantId: testTenantId,
      action: 'create',
      eventData: {
        title: `Test Delete Event ${Date.now()}`,
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      }
    });
    
    const eventId = createResponse.data.id;
    
    // Now delete the event
    const deleteResponse = await apiTestUtils.delete(`/calendar-events/${eventId}?tenantId=${testTenantId}`);
    
    assert.isDefined(deleteResponse.success, 'Response should have success property');
    assert.isTrue(deleteResponse.success, 'Response success should be true');
    assert.isTrue(deleteResponse.data.deleted, 'Event should be marked as deleted');
    assert.equals(deleteResponse.data.id, eventId, 'Deleted event ID should match');
  });
});

/**
 * Resources API Test Suite
 */
export const resourceApiTests = createTestSuite('Resources API Tests', (suite) => {
  let testTenantId;
  
  // Setup: Create a test tenant and add resources
  suite.setBeforeAll(async () => {
    // Create a test tenant
    const timestamp = Date.now();
    testTenantId = `test-tenant-resources-${timestamp}`;
    
    await apiTestUtils.post('/tenants', {
      tenantId: testTenantId,
      tenantName: `Test Resources Tenant ${timestamp}`
    });
    
    // Register the tenant for cleanup
    registerTenantForCleanup(testTenantId);
    console.log(`Resources test tenant ${testTenantId} created and registered for cleanup`);
    
    // Add resources by creating events with equipment names
    for (let i = 1; i <= 3; i++) {
      const startDate = new Date();
      startDate.setHours(startDate.getHours() + i);
      
      const endDate = new Date(startDate);
      endDate.setHours(endDate.getHours() + 1);
      
      await apiTestUtils.post('/calendar-events', {
        tenantId: testTenantId,
        title: `Event with Equipment ${i}`,
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        equipment: `Test Equipment ${i}`
      });
    }
  });
  
  // Cleanup: Delete the test tenant after all tests
  suite.setAfterAll(async () => {
    if (testTenantId) {
      try {
        await apiTestUtils.delete(`/tenants/${testTenantId}`);
      } catch (error) {
        console.error(`Error cleaning up test tenant: ${error.message}`);
      }
    }
  });
  
  // Test: Get equipment list
  suite.addTest('should get equipment list for tenant', async () => {
    // Wait for resources to be registered
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const response = await apiTestUtils.get('/equipment', {
      params: { tenantId: testTenantId }
    });
    
    assert.isDefined(response.success, 'Response should have success property');
    assert.isTrue(response.success, 'Response success should be true');
    assert.isDefined(response.data, 'Response should have data property');
    assert.isTrue(Array.isArray(response.data), 'Response data should be an array');
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
