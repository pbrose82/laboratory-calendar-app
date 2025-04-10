import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchTenant } from '../services/apiClient';
import './ResourceViews.css';

function EquipmentList() {
  const { tenantId } = useParams();
  const navigate = useNavigate();
  const [resources, setResources] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tenantName, setTenantName] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');

  // Function to load tenant data - extracted for reuse with auto-refresh
  const loadTenantData = async () => {
    try {
      setLoading(true);
      
      // Special handling for tenant name
      if (tenantId === 'productcaseelnlims4uat' || tenantId === 'productcaseelnandlims') {
        setTenantName('Product CASE UAT');
      }
      
      // Normal tenant handling from API
      const tenantData = await fetchTenant(tenantId);
      
      if (tenantData) {
        console.log('Loaded tenant data:', tenantData);
        setResources(tenantData.resources || []);
        setEvents(tenantData.events || []);
        
        if (!tenantName) {
          setTenantName(tenantData.name || tenantId);
        }
        
        console.log('Equipment data refreshed at', new Date().toLocaleTimeString());
      } else {
        setError(`Tenant "${tenantId}" not found`);
      }
    } catch (err) {
      console.error('Failed to load tenant data:', err);
      setError(`Error loading tenant data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Initial data load
  useEffect(() => {
    if (tenantId) {
      loadTenantData();
    }
  }, [tenantId, tenantName]);
  
  // Auto-refresh setup
  useEffect(() => {
    let refreshInterval;
    
    if (autoRefresh) {
      // Refresh data every 30 seconds
      refreshInterval = setInterval(() => {
        console.log('Auto-refreshing equipment list data...');
        loadTenantData();
      }, 30000);
    }
    
    // Clean up interval on component unmount
    return () => {
      if (refreshInterval) clearInterval(refreshInterval);
    };
  }, [autoRefresh, tenantId]);

  // Get current equipment status
  const getResourceStatus = (resourceId) => {
    const now = new Date();
    
    const currentEvent = events.find(event => {
      const eventStart = new Date(event.start);
      const eventEnd = new Date(event.end);
      return (
        (event.resourceId === resourceId || 
         event.equipment === resources.find(r => r.id === resourceId)?.title) &&
        eventStart <= now && eventEnd >= now
      );
    });
    
    return currentEvent ? 'in-use' : 'available';
  };

  // Get next reservation for a resource
  const getNextReservation = (resourceId) => {
    const now = new Date();
    
    const futureEvents = events
      .filter(event => {
        const eventStart = new Date(event.start);
        return (
          (event.resourceId === resourceId || 
           event.equipment === resources.find(r => r.id === resourceId)?.title) &&
          eventStart > now
        );
      })
      .sort((a, b) => new Date(a.start) - new Date(b.start));
    
    return futureEvents.length > 0 ? futureEvents[0] : null;
  };

  // Count reservations for a resource
  const countReservations = (resourceId) => {
    return events.filter(event => 
      event.resourceId === resourceId || 
      event.equipment === resources.find(r => r.id === resourceId)?.title
    ).length;
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    }).format(date);
  };

  // Handle view equipment schedule
  const handleViewSchedule = (resourceId) => {
    navigate(`/${tenantId}?resourceId=${resourceId}`);
  };

  // Filter and sort resources
  const getFilteredResources = () => {
    let filteredList = [...resources];
    
    // Apply status filter
    if (statusFilter !== 'all') {
      filteredList = filteredList.filter(resource => {
        const status = getResourceStatus(resource.id);
        return status === statusFilter;
      });
    }
    
    // Sort resources
    return filteredList.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.title.localeCompare(b.title);
        case 'status':
          return getResourceStatus(a.id).localeCompare(getResourceStatus(b.id));
        case 'reservations':
          return countReservations(b.id) - countReservations(a.id);
        default:
          return 0;
      }
    });
  };

  // Format display name for tenant
  const getDisplayName = () => {
    if (tenantId === 'demo-tenant') {
      return 'Demo Tenant';
    } else if (tenantId === 'productcaseelnlims4uat' || tenantId === 'productcaseelnandlims') {
      return 'Product CASE UAT';
    } else {
      return tenantName || tenantId;
    }
  };

  return (
    <div className="dashboard-container">
      <div className="content-header">
        <h1>{getDisplayName()} - Equipment List</h1>
        <div className="header-actions">
          {/* Auto-refresh toggle */}
          <button 
            className={`btn ${autoRefresh ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={() => setAutoRefresh(!autoRefresh)}
            title={autoRefresh ? "Auto-refresh on" : "Auto-refresh off"}
          >
            <i className={`fas fa-${autoRefresh ? 'sync-alt fa-spin' : 'sync-alt'} me-1`}></i>
            {autoRefresh ? "Auto" : "Manual"}
          </button>
          
          {/* Manual refresh button - only show when auto is off */}
          {!autoRefresh && (
            <button 
              className="btn btn-outline-secondary ms-2"
              onClick={loadTenantData}
              title="Refresh data"
            >
              <i className="fas fa-redo-alt me-1"></i>
              Refresh
            </button>
          )}
          
          <button 
            className="btn btn-outline-secondary ms-2"
            onClick={() => navigate(`/${tenantId}`)}
          >
            <i className="fas fa-calendar-alt me-1"></i>
            Calendar View
          </button>
        </div>
      </div>
      
      {loading ? (
        <div className="loading-container">
          <div>Loading equipment data...</div>
        </div>
      ) : error ? (
        <div className="error-message">
          <h3>Error</h3>
          <p>{error}</p>
          <button className="btn btn-primary mt-3" onClick={() => navigate('/')}>
            Return to Main Dashboard
          </button>
        </div>
      ) : (
        <div className="equipment-list">
          <div className="filter-controls">
            <div className="filter-control">
              <label className="filter-label">Filter by Status</label>
              <select 
                className="filter-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Equipment</option>
                <option value="available">Available Now</option>
                <option value="in-use">In Use Now</option>
              </select>
            </div>
            
            <div className="filter-control">
              <label className="filter-label">Sort By</label>
              <select 
                className="filter-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="name">Name</option>
                <option value="status">Current Status</option>
                <option value="reservations">Total Reservations</option>
              </select>
            </div>
          </div>
          
          {resources.length === 0 ? (
            <div className="text-center py-4 mt-4">
              <i className="fas fa-microscope fa-3x mb-3 text-muted"></i>
              <p>No equipment found. Equipment will appear here when added to calendar events.</p>
            </div>
          ) : (
            <table className="equipment-table">
              <thead>
                <tr>
                  <th>Equipment</th>
                  <th>Status</th>
                  <th>Total Reservations</th>
                  <th>Next Reservation</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {getFilteredResources().map(resource => {
                  const status = getResourceStatus(resource.id);
                  const nextReservation = getNextReservation(resource.id);
                  
                  return (
                    <tr key={resource.id}>
                      <td>{resource.title}</td>
                      <td>
                        <span className={`badge ${status === 'available' ? 'badge-success' : 'badge-danger'}`}>
                          {status === 'available' ? 'Available' : 'In Use'}
                        </span>
                      </td>
                      <td>{countReservations(resource.id)}</td>
                      <td>
                        {nextReservation ? (
                          <div>
                            <div>{formatDate(nextReservation.start)}</div>
                            <div className="small text-muted">{nextReservation.title}</div>
                          </div>
                        ) : (
                          <span className="text-muted">No upcoming reservations</span>
                        )}
                      </td>
                      <td>
                        <button 
                          className="btn btn-sm btn-primary"
                          onClick={() => handleViewSchedule(resource.id)}
                        >
                          <i className="fas fa-calendar-alt me-1"></i>
                          View Schedule
                        </button>
                      </td>
                    </tr>
                  );
                })}
                
                {getFilteredResources().length === 0 && (
                  <tr>
                    <td colSpan="5" className="text-center py-4">
                      <i className="fas fa-info-circle me-2"></i>
                      No equipment found matching the selected filters
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

export default EquipmentList;
