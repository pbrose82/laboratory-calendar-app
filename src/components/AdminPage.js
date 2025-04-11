import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchAllTenants, createNewTenant, deleteTenantById } from '../services/apiClient';
import SwaggerDocs from './SwaggerDocs';
import TestRunner from './TestRunner';
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
  const [activeTab, setActiveTab] = useState('tenants'); // 'tenants', 'api-docs', or 'tests'

  // Base URL for tenant links - use window.location for Render host
  const baseUrl = window.location.origin;

  useEffect(() => {
    // Check if admin is authenticated
    const adminAuth = sessionStorage.getItem('adminAuthenticated');
    if (!adminAuth) {
      navigate('/admin-login');
      return;
    }
    
    // Load all tenants when the component mounts
    loadTenants();
  }, [navigate]);

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

  // Render the tenant management section
  const renderTenantSection = () => {
    return (
      <>
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
      </>
    );
  };

  return (
    <div className="dashboard-container">
      {/* Breadcrumbs */}
      <div className="breadcrumb-container">
        <ul className="breadcrumb">
          <li className="breadcrumb-item"><a href="/">Home</a></li>
          <li className="breadcrumb-item active">Administration</li>
        </ul>
      </div>
      
      {/* Header */}
      <div className="content-header">
        <h1>Laboratory Calendar Administration</h1>
      </div>
      
      {statusMessage && (
        <div className={`status-message ${statusType}`}>
          {statusMessage}
        </div>
      )}
      
      {/* Tab Navigation */}
      <div className="admin-tabs">
        <button 
          className={`tab-btn ${activeTab === 'tenants' ? 'active' : ''}`}
          onClick={() => setActiveTab('tenants')}
        >
          <i className="fas fa-users-cog me-2"></i>
          Tenant Management
        </button>
        <button 
          className={`tab-btn ${activeTab === 'api-docs' ? 'active' : ''}`}
          onClick={() => setActiveTab('api-docs')}
        >
          <i className="fas fa-book me-2"></i>
          API Documentation
        </button>
        <button 
          className={`tab-btn ${activeTab === 'tests' ? 'active' : ''}`}
          onClick={() => setActiveTab('tests')}
        >
          <i className="fas fa-vial me-2"></i>
          Automated Testing
        </button>
      </div>
      
      <div className="admin-page">
        {activeTab === 'tenants' ? renderTenantSection() : 
         activeTab === 'api-docs' ? <SwaggerDocs /> : 
         <TestRunner />}
      </div>
    </div>
  );
}

export default AdminPage;
