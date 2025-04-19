// src/services/apiClient.js
// Enhanced client for interacting with the backend API and handling demo tenant

import { demoTenantEvents, demoTenantResources } from '../data/sample-events';

// Get the correct base URL for our API calls
const getBaseUrl = () => {
  // In development with two servers running
  if (process.env.NODE_ENV === 'development' && process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  
  // Production or single server in development 
  // (when running from Express server) - use relative paths
  return '';
};

const API_BASE_URL = getBaseUrl();

/**
 * Generic API request function with error handling
 * @param {string} endpoint - API endpoint
 * @param {Object} options - Fetch options
 * @returns {Promise<any>}
 */
const apiRequest = async (endpoint, options = {}) => {
  try {
    // Set default headers if not provided
    if (!options.headers) {
      options.headers = {
        'Content-Type': 'application/json',
      };
    }
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
    
    // Check if the request was successful
    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        // If we can't parse the error as JSON, use status text
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
      
      throw new Error(errorData.error || `API error: ${response.status}`);
    }
    
    // Parse and return the response data
    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error(`API request failed: ${error.message}`);
    throw error;
  }
};

/**
 * Get demo tenant data that mimics the API response format
 * This ensures demo tenant data works consistently across components
 * @returns {Object} Demo tenant data structured like API response
 */
const getDemoTenantData = () => {
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
const saveDemoTenantData = (events) => {
  try {
    localStorage.setItem('demo-tenant-events', JSON.stringify(events));
    return true;
  } catch (error) {
    console.error('Error saving demo data to localStorage:', error);
    return false;
  }
};

/**
 * Get all tenants from the API
 * @returns {Promise<Array>} Array of tenant objects
 */
export const fetchAllTenants = async () => {
  try {
    const data = await apiRequest('/api/tenants');
    return data || [];
  } catch (error) {
    console.error('Error fetching tenants:', error);
    throw error;
  }
};

/**
 * Get a specific tenant by ID with special handling for demo tenant
 * @param {string} tenantId - The tenant ID to lookup
 * @returns {Promise<Object>} The tenant object
 */
export const fetchTenant = async (tenantId) => {
  // Special handling for demo tenant
  if (tenantId === 'demo-tenant') {
    return getDemoTenantData();
  }
  
  try {
    const data = await apiRequest(`/api/tenants/${tenantId}`);
    return data;
  } catch (error) {
    // Special handling for 404 (not found)
    if (error.message.includes('404')) {
      return null;
    }
    console.error(`Error fetching tenant ${tenantId}:`, error);
    throw error;
  }
};

/**
 * Create a new tenant
 * @param {string} tenantId - The tenant ID (used in URL)
 * @param {string} tenantName - The display name for the tenant
 * @returns {Promise<Object>} The created tenant object
 */
export const createNewTenant = async (tenantId, tenantName) => {
  try {
    const data = await apiRequest('/api/tenants', {
      method: 'POST',
      body: JSON.stringify({ tenantId, tenantName }),
    });
    
    return data;
  } catch (error) {
    console.error('Error creating tenant:', error);
    throw error;
  }
};

/**
 * Delete a tenant
 * @param {string} tenantId - The tenant ID to delete
 * @returns {Promise<boolean>} True if deleted successfully
 */
export const deleteTenantById = async (tenantId) => {
  try {
    await apiRequest(`/api/tenants/${tenantId}`, {
      method: 'DELETE',
    });
    
    return true;
  } catch (error) {
    console.error(`Error deleting tenant ${tenantId}:`, error);
    throw error;
  }
};

/**
 * Process a calendar event with special handling for demo tenant
 * @param {string} tenantId - The tenant ID
 * @param {Object} eventData - The event data
 * @param {string} action - The action to perform (create, update, delete)
 * @returns {Promise<Object>} The result of the operation
 */
export const processCalendarEvent = async (tenantId, eventData, action) => {
  // Special handling for demo tenant
  if (tenantId === 'demo-tenant') {
    try {
      const demoData = getDemoTenantData();
      let result;
      
      if (action === 'create') {
        // Add the new event to demo events
        const updatedEvents = [...demoData.events, eventData];
        saveDemoTenantData(updatedEvents);
        result = eventData;
      } else if (action === 'update') {
        // Update existing event
        const updatedEvents = demoData.events.map(event => 
          event.id === eventData.id ? {...event, ...eventData} : event
        );
        saveDemoTenantData(updatedEvents);
        result = eventData;
      } else if (action === 'delete') {
        // Delete event
        const updatedEvents = demoData.events.filter(event => 
          event.id !== eventData.id
        );
        saveDemoTenantData(updatedEvents);
        result = { id: eventData.id, deleted: true };
      }
      
      return result;
    } catch (error) {
      console.error('Error processing demo event:', error);
      throw error;
    }
  }
  
  // Normal API handling for real tenants
  try {
    const data = await apiRequest('/api/calendar-events', {
      method: 'POST',
      body: JSON.stringify({ tenantId, eventData, action }),
    });
    
    return data;
  } catch (error) {
    console.error('Error processing calendar event:', error);
    throw error;
  }
};

/**
 * Export helper functions for demo tenant
 */
export const demoTenantHelpers = {
  getDemoTenantData,
  saveDemoTenantData
};
