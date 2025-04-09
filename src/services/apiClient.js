// src/services/apiClient.js
// Simplified client for interacting with the backend API

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
 * Get a specific tenant by ID
 * @param {string} tenantId - The tenant ID to lookup
 * @returns {Promise<Object>} The tenant object
 */
export const fetchTenant = async (tenantId) => {
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
 * Process a calendar event
 * @param {string} tenantId - The tenant ID
 * @param {Object} eventData - The event data
 * @param {string} action - The action to perform (create, update, delete)
 * @returns {Promise<Object>} The result of the operation
 */
export const processCalendarEvent = async (tenantId, eventData, action) => {
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
