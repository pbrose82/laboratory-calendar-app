// src/testing/tests/uiTests.js
import { createTestSuite, assert, uiTestUtils } from '../testUtils';

/**
 * Calendar UI Test Suite
 */
export const calendarUiTests = createTestSuite('Calendar UI Tests', (suite) => {
  // Test: Calendar renders correctly
  suite.addTest('calendar should render correctly', async () => {
    // Wait for the calendar to render
    const calendarElement = await uiTestUtils.waitForElement('.laboratory-calendar');
    assert.isDefined(calendarElement, 'Calendar element should be rendered');
    
    // Check for FullCalendar container
    const fullCalendarElement = await uiTestUtils.waitForElement('.fc');
    assert.isDefined(fullCalendarElement, 'FullCalendar element should be rendered');
  });
  
  // Test: Calendar navigation works
  suite.addTest('calendar navigation should work', async () => {
    // Wait for the calendar to render
    await uiTestUtils.waitForElement('.fc');
    
    // Get initial title
    const initialTitle = document.querySelector('.fc-toolbar-title').textContent;
    
    // Click next button
    const nextButton = document.querySelector('.fc-next-button');
    uiTestUtils.click(nextButton);
    
    // Wait for update
    await uiTestUtils.wait(100);
    
    // Get new title
    const newTitle = document.querySelector('.fc-toolbar-title').textContent;
    
    // Titles should be different after navigation
    assert.isFalse(initialTitle === newTitle, 'Calendar title should change after navigation');
  });
  
  // Test: View switching works
  suite.addTest('calendar view switching should work', async () => {
    // Wait for the calendar to render
    await uiTestUtils.waitForElement('.fc');
    
    // Get initial view class
    const calendar = document.querySelector('.fc');
    const initialViewClass = Array.from(calendar.classList)
      .find(cls => cls.startsWith('fc-view-'));
    
    // Click month view button
    const monthButton = document.querySelector('.fc-dayGridMonth-button');
    uiTestUtils.click(monthButton);
    
    // Wait for update
    await uiTestUtils.wait(100);
    
    // Get new view class
    const newViewClass = Array.from(calendar.classList)
      .find(cls => cls.startsWith('fc-view-'));
    
    // View classes should be different
    assert.isFalse(initialViewClass === newViewClass, 'Calendar view should change');
    assert.isTrue(newViewClass === 'fc-view-dayGridMonth', 'Calendar should switch to month view');
  });
  
  // Test: Weekend toggle works
  suite.addTest('weekend toggle should work', async () => {
    // Find the weekend toggle button
    const weekendToggle = await uiTestUtils.waitForElement('button:contains("Weekend")');
    assert.isDefined(weekendToggle, 'Weekend toggle button should exist');
    
    // Get initial weekend state by checking Saturday column
    const initialSaturdayVisible = document.querySelectorAll('.fc-day-sat').length > 0;
    
    // Click the weekend toggle button
    uiTestUtils.click(weekendToggle);
    
    // Wait for update
    await uiTestUtils.wait(100);
    
    // Get new weekend state
    const newSaturdayVisible = document.querySelectorAll('.fc-day-sat').length > 0;
    
    // Weekend visibility should toggle
    assert.isFalse(initialSaturdayVisible === newSaturdayVisible, 'Weekend visibility should toggle');
  });
});

/**
 * Admin UI Test Suite
 */
export const adminUiTests = createTestSuite('Admin UI Tests', (suite) => {
  // Setup: Navigate to admin login page
  suite.setBeforeAll(async () => {
    // Navigate to admin login page
    window.location.href = '/admin-login';
    
    // Wait for the page to load
    await uiTestUtils.waitForElement('.admin-login-container');
  });
  
  // Test: Admin login page renders correctly
  suite.addTest('admin login page should render correctly', async () => {
    const loginForm = await uiTestUtils.waitForElement('form');
    assert.isDefined(loginForm, 'Login form should be rendered');
    
    const passwordInput = document.querySelector('#password');
    assert.isDefined(passwordInput, 'Password input should be rendered');
    
    const loginButton = document.querySelector('.login-button');
    assert.isDefined(loginButton, 'Login button should be rendered');
  });
  
  // Test: Admin login works
  suite.addTest('admin login should work with correct password', async () => {
    const passwordInput = document.querySelector('#password');
    const loginButton = document.querySelector('.login-button');
    
    // Enter the test password
    uiTestUtils.changeInput(passwordInput, 'admin123');
    
    // Click login button
    uiTestUtils.click(loginButton);
    
    // Wait for redirect to admin page
    await uiTestUtils.waitForElement('.admin-page');
    
    // Check if we're on the admin page
    assert.isTrue(window.location.pathname.includes('/admin'), 'Should redirect to admin page');
  });
  
  // Test: Admin can create a tenant
  suite.addTest('admin can create a tenant', async () => {
    // First ensure we're on the admin page
    if (!window.location.pathname.includes('/admin')) {
      window.location.href = '/admin';
      await uiTestUtils.waitForElement('.admin-page');
    }
    
    // Find the tenant creation form
    const tenantIdInput = await uiTestUtils.waitForElement('#tenantId');
    const tenantNameInput = document.querySelector('#tenantName');
    const createButton = document.querySelector('.submit-btn');
    
    // Fill in the form
    const timestamp = Date.now();
    uiTestUtils.changeInput(tenantIdInput, `test-tenant-${timestamp}`);
    uiTestUtils.changeInput(tenantNameInput, `Test Tenant ${timestamp}`);
    
    // Submit the form
    uiTestUtils.click(createButton);
    
    // Wait for success message
    const statusMessage = await uiTestUtils.waitForElement('.status-message.success');
    assert.isDefined(statusMessage, 'Success message should appear');
    
    // Check for tenant in the list
    const tenantRows = document.querySelectorAll('.tenant-table tbody tr');
    let found = false;
    
    for (const row of tenantRows) {
      if (row.textContent.includes(`test-tenant-${timestamp}`)) {
        found = true;
        break;
      }
    }
    
    assert.isTrue(found, 'New tenant should appear in the list');
  });
});

/**
 * Resource Views UI Test Suite
 */
export const resourceViewsUiTests = createTestSuite('Resource Views UI Tests', (suite) => {
  // Test: Resource dashboard renders correctly
  suite.addTest('resource dashboard should render correctly', async () => {
    // Navigate to resource dashboard
    window.location.href = '/demo-tenant/resource-dashboard';
    
    // Wait for the dashboard to render
    const dashboard = await uiTestUtils.waitForElement('.resource-dashboard');
    assert.isDefined(dashboard, 'Resource dashboard should be rendered');
    
    // Check for summary cards
    const summaryCards = document.querySelectorAll('.summary-card');
    assert.isTrue(summaryCards.length >= 4, 'Should display at least 4 summary cards');
    
    // Check for equipment grid
    const resourceGrid = document.querySelector('.resource-grid');
    assert.isDefined(resourceGrid, 'Resource grid should be rendered');
  });
  
  // Test: Equipment list renders correctly
  suite.addTest('equipment list should render correctly', async () => {
    // Navigate to equipment list
    window.location.href = '/demo-tenant/equipment-list';
    
    // Wait for the list to render
    const equipmentList = await uiTestUtils.waitForElement('.equipment-list');
    assert.isDefined(equipmentList, 'Equipment list should be rendered');
    
    // Check for filter controls
    const filterControls = document.querySelector('.filter-controls');
    assert.isDefined(filterControls, 'Filter controls should be rendered');
    
    // Check for equipment table
    const equipmentTable = document.querySelector('.equipment-table');
    assert.isDefined(equipmentTable, 'Equipment table should be rendered');
  });
  
  // Test: Gantt chart renders correctly
  suite.addTest('gantt chart should render correctly', async () => {
    // Navigate to gantt chart
    window.location.href = '/demo-tenant/gantt-chart';
    
    // Wait for the chart to render
    const ganttChart = await uiTestUtils.waitForElement('.gantt-chart');
    assert.isDefined(ganttChart, 'Gantt chart should be rendered');
    
    // Check for date controls
    const dateSelector = document.querySelector('.date-selector');
    assert.isDefined(dateSelector, 'Date selector should be rendered');
    
    // Check for gantt container
    const ganttContainer = document.querySelector('.gantt-container');
    assert.isDefined(ganttContainer, 'Gantt container should be rendered');
  });
  
  // Test: Analytics renders correctly
  suite.addTest('analytics should render correctly', async () => {
    // Navigate to analytics
    window.location.href = '/demo-tenant/analytics';
    
    // Wait for analytics to render
    const analytics = await uiTestUtils.waitForElement('.analytics-dashboard');
    assert.isDefined(analytics, 'Analytics dashboard should be rendered');
    
    // Check for stat cards
    const statCards = document.querySelectorAll('.stat-card');
    assert.isTrue(statCards.length >= 3, 'Should display at least 3 stat cards');
    
    // Check for report sections
    const reportSections = document.querySelectorAll('.report-section');
    assert.isTrue(reportSections.length >= 2, 'Should display at least 2 report sections');
  });
});

/**
 * Export all UI test suites
 */
export const allUiTestSuites = [
  calendarUiTests.initialize(),
  adminUiTests.initialize(),
  resourceViewsUiTests.initialize()
];
