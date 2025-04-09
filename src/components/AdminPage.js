import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchAllTenants, createNewTenant, deleteTenantById } from '../services/apiClient';
import './AdminPage.css';

function AdminPage() {
  const navigate = useNavigate();
  const [tenants, setTenants] = useState([]);
  const [newTenantId, setNewTenantId] = useState('');
  const [newTenantName, setNewTenantName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState('');
  const [statusType, setStatusType] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Base URL for tenant links - use window.location for Render host
  const baseUrl = window.location.origin;

  useEffect(() => {
    // Load all tenants when the component mounts
    loadTenants();
  }, []);

  const loadTenants = async () => {
    setIsLoading(true);
    try {
      const tenantList = await fetchAllTenants();
      setTenants(tenantList);
    } catch (error) {
      showStatus(`Error loading tenants: ${error.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTenant = async (e) => {
    e.preventDefault();
    
    if (!newTenantId.trim() || !newTenantName.trim()) {
      showStatus('Please provide both ID and Name for the new tenant', 'error');
      return;
    }
    
    // Sanitize tenant ID - keep only alphanumeric chars, dashes, and underscores
    const sanitizedId = newTenantId.trim().replace(/[^a-zA-Z0-9-_]/g, '');
    
    if (sanitizedId !== newTenantId.trim()) {
      showStatus('Tenant ID can only contain letters, numbers, dashes, and underscores', 'error');
      return;
    }

    try {
      setIsCreating(true);
      await createNewTenant(sanitizedId, newTenantName);
      setNewTenantId('');
      setNewTenantName('');
      showStatus(`Tenant ${sanitizedId} created successfully`, 'success');
      loadTenants(); // Refresh the tenant list
    } catch (error) {
      showStatus(`Error creating tenant: ${error.message}`, 'error');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteTenant = async (tenantId) => {
    if (window.confirm(`Are you sure you want to delete tenant "${tenantId}"? This action cannot be undone.`)) {
      try {
        await deleteTenantById(tenantId);
        showStatus(`Tenant ${tenantId} deleted successfully`, 'success');
        loadTenants(); // Refresh the tenant list
      } catch (error) {
        showStatus(`Error deleting tenant: ${error.message}`, 'error');
      }
    }
  };

  const showStatus = (message, type) => {
    setStatusMessage(message);
    setStatusType(type);
    
    // Clear status message after 5 seconds
    setTimeout(() => {
      setStatusMessage('');
    }, 5000);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        showStatus('URL copied to clipboard!', 'success');
      })
      .catch(err => {
        showStatus('Failed to copy URL', 'error');
        console.error('Could not copy text: ', err);
      });
  };

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h2>Laboratory Calendar Administration</h2>
        <button 
          className="btn btn-sm btn-outline-secondary" 
          onClick={() => navigate('/')}
        >
          Back to Main Calendar
        </button>
      </div>
      
      {statusMessage && (
        <div className={`status-message ${statusType}`}>
          {statusMessage}
        </div>
      )}
      
      <div className="admin-section">
        <h3>Create New Tenant</h3>
        <form onSubmit={handleCreateTenant}>
          <div className="form-group">
            <label htmlFor="tenantId">
              Tenant ID:
              <input 
                id="tenantId"
                type="text" 
                value={newTenantId} 
                onChange={(e) => setNewTenantId(e.target.value)}
                placeholder="e.g. productcaseelnandlims4uat"
                required
              />
            </label>
            <small className="helper-text">This will be used in the URL: /tenant-id (letters, numbers, dashes, and underscores only)</small>
          </div>
          <div className="form-group">
            <label htmlFor="tenantName">
              Tenant Name:
              <input 
                id="tenantName"
                type="text" 
                value={newTenantName}
                onChange={(e) => setNewTenantName(e.target.value)}
                placeholder="e.g. Product Case ELN and LIMS"
                required
              />
            </label>
          </div>
          <button 
            type="submit" 
            className="submit-btn" 
            disabled={isCreating}
          >
            {isCreating ? 'Creating...' : 'Create Tenant'}
          </button>
        </form>
      </div>
      
      <div className="admin-section">
        <h3>Tenant List</h3>
        {isLoading ? (
          <div className="loading">Loading tenants...</div>
        ) : tenants.length === 0 ? (
          <p className="no-tenants">No tenants created yet. Create your first tenant above.</p>
        ) : (
          <div className="table-responsive">
            <table className="tenant-table">
              <thead>
                <tr>
                  <th>Tenant ID</th>
                  <th>Tenant Name</th>
                  <th>Calendar URL</th>
                  <th>Created At</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tenants.map(tenant => (
                  <tr key={tenant.id}>
                    <td>{tenant.id}</td>
                    <td>{tenant.name}</td>
                    <td>
                      <div className="url-container">
                        <Link 
                          to={`/${tenant.id}`} 
                          target="_blank"
                          className="tenant-url"
                        >
                          {baseUrl}/{tenant.id}
                        </Link>
                        <button 
                          className="copy-btn"
                          onClick={() => copyToClipboard(`${baseUrl}/${tenant.id}`)}
                          title="Copy URL to clipboard"
                        >
                          <i className="fas fa-copy"></i>
                        </button>
                      </div>
                    </td>
                    <td>{new Date(tenant.createdAt).toLocaleString()}</td>
                    <td>
                      <button 
                        className="action-btn view-btn" 
                        onClick={() => navigate(`/${tenant.id}`)}
                        title="View calendar"
                      >
                        <i className="fas fa-eye"></i>
                      </button>
                      <button 
                        className="action-btn delete-btn" 
                        onClick={() => handleDeleteTenant(tenant.id)}
                        title="Delete tenant"
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      <div className="admin-section">
        <h3>API Documentation</h3>
        <div className="api-docs">
          <p>To update a tenant's calendar from Alchemy, send a POST request to:</p>
          <div className="code-block">
            <code>{baseUrl}/api/alchemy-update</code>
            <button 
              className="copy-btn"
              onClick={() => copyToClipboard(`${baseUrl}/api/alchemy-update`)}
              title="Copy URL to clipboard"
            >
              <i className="fas fa-copy"></i>
            </button>
          </div>
          
          <p>Request body format:</p>
          <pre className="json-example">
{`{
  "tenantId": "tenant-identifier",
  "action": "create", // or "update" or "delete"
  "eventData": {
    "id": "unique-event-id", // optional for "create", required for "update"/"delete"
    "title": "Event Title",
    "start": "2024-04-15T09:00:00",
    "end": "2024-04-15T11:00:00",
    "resourceId": "equipment-1", // optional
    "extendedProps": {
      "equipment": "HPLC Machine",
      "technician": "Dr. Smith",
      "sampleType": "Water Solubility Test"
    }
  }
}`}
          </pre>
        </div>
      </div>
    </div>
  );
}

export default AdminPage;
