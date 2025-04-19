// src/services/demoTenantHelper.js
// Helper functions for working with demo tenant data

import { demoTenantEvents, demoTenantResources } from '../data/sample-events';

/**
 * Get demo tenant data that mimics the API response format
 * This ensures demo tenant data works consistently across components
 * @returns {Object} Demo tenant data structured like API response
 */
export const getDemoTenantData = () => {
  // Enhance demo events with purpose and cost if not present
  const enhancedEvents = demoTenantEvents.map(event => ({
    ...event,
    purpose: event.purpose || event.extendedProps?.purpose || ['Utilization', 'Maintenance', 'Broken'][Math.floor(Math.random() * 3)],
    cost: event.cost || event.extendedProps?.cost || Math.floor(Math.random() * 1000)
  }));
  
  // Try to load from localStorage if available
  try {
    const savedDemoData = localStorage.getItem('demo-tenant-events');
    if (savedDemoData) {
      const parsedEvents = JSON.parse(savedDemoData);
      // Use localStorage data but ensure all new fields are present
      return {
        id: 'demo-tenant',
        name: 'Demo Tenant',
        createdAt: new Date().toISOString(),
        events: parsedEvents.map(event => ({
          ...event,
          purpose: event.purpose || ['Utilization', 'Maintenance', 'Broken'][Math.floor(Math.random() * 3)],
          cost: event.cost || Math.floor(Math.random() * 1000)
        })),
        resources: demoTenantResources
      };
    }
  } catch (error) {
    console.error('Error loading demo data from localStorage:', error);
  }
  
  // Return the default data if no localStorage data is available
  return {
    id: 'demo-tenant',
    name: 'Demo Tenant',
    createdAt: new Date().toISOString(),
    events: enhancedEvents,
    resources: demoTenantResources
  };
};

/**
 * Save demo tenant data to localStorage
 * @param {Array} events - The events to save
 * @returns {boolean} - True if save was successful
 */
export const saveDemoTenantData = (events) => {
  try {
    localStorage.setItem('demo-tenant-events', JSON.stringify(events));
    return true;
  } catch (error) {
    console.error('Error saving demo data to localStorage:', error);
    return false;
  }
};

/**
 * Enhanced fetchTenant function that handles demo tenant specially
 * @param {string} tenantId - The tenant ID to fetch
 * @param {Function} fetchFn - The original fetchTenant function
 * @returns {Promise<Object>} - The tenant data
 */
export const fetchTenantWithDemo = async (tenantId, fetchFn) => {
  // For demo tenant, return our local data
  if (tenantId === 'demo-tenant') {
    return getDemoTenantData();
  }
  
  // For real tenants, use the provided fetch function
  return fetchFn(tenantId);
};
