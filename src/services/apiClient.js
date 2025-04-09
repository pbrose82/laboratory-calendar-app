// src/services/apiClient.js
// Client for interacting with the backend API

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
 * Get all tenants from the API
 * @returns {Promise<Array>} Array of tenant objects
 */
export const fetchAllTenants = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/tenants`);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch tenants');
    }
    
    const data = await response.json();
    return data.data || [];
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
    const response = await fetch(`${API_BASE_URL}/api/tenants/${tenantId}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch tenant');
    }
    
    const data = await response.json();
    return data.data;
  } catch (error) {
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
    const response = await fetch(`${API_BASE_URL}/api/tenants`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ tenantId, tenantName }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create tenant');
    }
    
    const data = await response.json();
    return data.data;
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
    const response = await fetch(`${API_BASE_URL}/api/tenants/${tenantId}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to delete tenant');
    }
    
    return true;
  } catch (error) {
    console.error(`Error deleting tenant ${tenantId}:`, error);
    throw error;
  }
};

/**
 * Process an Alchemy event update
 * @param {string} tenantId - The tenant ID
 * @param {Object} eventData - The event data
 * @param {string} action - The action to perform (create, update, delete)
 * @returns {Promise<Object>} The result of the operation
 */
export const processAlchemyEvent = async (tenantId, eventData, action) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/alchemy-update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ tenantId, eventData, action }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to process event');
    }
    
    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error('Error processing event:', error);
    throw error;
  }
};
