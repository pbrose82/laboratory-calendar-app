import React, { useState, useEffect, useRef } from 'react';
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
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  
  // Ref to track if component is mounted
  const isMounted = useRef(true);

  // Function to load tenant data - handles both initial load and background refresh
  const loadTenantData = async (isInitialLoad = false) => {
    try {
      if (isInitialLoad) {
        setLoading(true);
      }
      
      // Special handling for tenant name
      if (tenantId === 'productcaseelnlims4uat' || tenantId === 'productcaseelnandlims') {
        setTenantName('Product CASE UAT');
      }
      
      // Normal tenant handling from API
      const tenantData = await fetchTenant(tenantId);
      
      if (tenantData && isMounted.current) {
        // Get resources from API 
        let resourcesList = [...(tenantData.resources || [])];
        
        // Add example Extruder equipment with maintenance status if not present
        if (!resourcesList.some(r => r.title === 'Extruder')) {
          resourcesList.push({
            id: 'extruder-123',
            title: 'Extruder',
            maintenanceStatus: 'due', 
            lastMaintenance: '2024-12-15',
            nextMaintenance: '2025-04-15',
            maintenanceInterval: '90 days'
          });
        }
        
        setResources(resourcesList);
        setEvents(tenantData.events || []);
        
        if (!tenantName) {
          setTenantName(tenantData.name || tenantId);
        }
      }
    } catch (err) {
      if (isMounted.current) {
        console.error('Failed to load tenant data:', err);
        setError(`Error loading tenant data: ${err.message}`);
      }
    } finally {
      if (isInitialLoad && isMounted.current) {
        setLoading(false);
      }
    }
  };

  // Initial data load
  useEffect(() => {
    if (tenantId) {
      loadTenantData(true);
    }
    
    // Cleanup function
    return () => {
      isMounted.current = false;
    };
  }, [tenantId]);
  
  // Set up automatic background refresh
  useEffect(() => {
    // Refresh data every 30 seconds
    const refreshInterval = setInterval(() => {
      if (isMounted.current) {
        loadTenantData(false);
      }
    }, 30000);
    
    // Clean up interval on component unmount
    return () => {
      clearInterval(refreshInterval);
    };
  }, [tenantId]);

  // Get current equipment status
  const getResourceStatus = (resourceId) => {
    const resource = resources.find(r => r.id === resourceId);
    
    // Check if equipment is marked for maintenance
    if (resource?.maintenanceStatus === 'overdue') {
      return 'maintenance-overdue';
    } else if (resource?.maintenanceStatus === 'due') {
      return 'maintenance-due';
    }
    
    // Otherwise check if it's in use
    const now = new Date();
    
    const currentEvent = events.find(event => {
      try {
        const eventStart = new Date(event.start);
        const eventEnd = new Date(event.end);
        return (
          (event.resourceId === resourceId || 
           event.equipment === resource?.title) &&
          eventStart <= now && eventEnd >= now
        );
      } catch (e) {
        return false;
      }
    });
    
    return currentEvent ? 'in-use' : 'available';
  };

  // Get next reservation for a resource
  const getNextReservation = (resourceId) => {
    const now = new Date();
    
    const futureEvents = events
      .filter(event => {
        try {
          const eventStart = new Date(event.start);
          return (
            (event.resourceId === resourceId || 
             event.equipment === resources.find(r => r.id === resourceId)?.title) &&
            eventStart > now
          );
        } catch (e) {
          return false;
        }
      })
      .sort((a, b) => {
        try {
          return new Date(a.start) - new Date(b.start);
        } catch (e) {
          return 0;
        }
      });
    
    return futureEvents.length > 0 ? futureEvents[0] : null;
  };

  // Count reservations for a resource
  const countReservations = (resourceId) => {
    return events.filter(event => {
      try {
        return event.resourceId === resourceId || 
               event.equipment === resources.find(r => r.id === resourceId)?.title;
      } catch (e) {
        return false;
      }
    }).length;
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'N/A';
      
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        hour12: true
      }).format(date);
    } catch (e) {
      return 'N/A';
    }
  };

  // Get days until maintenance
  const getDaysUntilMaintenance = (nextMaintenanceDate) => {
    if (!nextMaintenanceDate) return null;
    
    try {
      const today = new Date();
      const nextDate = new Date(nextMaintenanceDate);
      
      // Calculate difference in days
      const diffTime = nextDate - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      return diffDays;
    } catch (e) {
      return null;
    }
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
        
        if (statusFilter === 'maintenance') {
          return status === 'maintenance-due' || status === 'maintenance-overdue';
        }
        
        return status === statusFilter;
      });
    }
    
    // Sort resources
    return filteredList.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return (a.title || '').localeCompare(b.title || '');
        case 'status': {
          const statusA = getResourceStatus(a.id);
          const statusB = getResourceStatus(b.id);
          // Maintenance status should come first, then in-use, then available
          const statusOrder = { 
            'maintenance-overdue': 0, 
            'maintenance-due': 1, 
            'in-use': 2, 
            'available': 3 
          };
          return (statusOrder[statusA] || 4) - (statusOrder[statusB] || 4);
        }
        case 'reservations':
          return countReservations(b.id) - countReservations(a.id);
        case 'maintenance': {
          const daysA = a.nextMaintenance ? getDaysUntilMaintenance(a.nextMaintenance) : 9999;
          const daysB = b.nextMaintenance ? getDaysUntilMaintenance(b.nextMaintenance) : 9999;
          return (daysA || 9999) - (daysB || 9999);
        }
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

  // Get status badge class
  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'available': return 'badge-success';
      case 'in-use': return 'badge-danger';
      case 'maintenance-due': return 'badge-maintenance';
      case 'maintenance-overdue': return 'badge-maintenance-overdue';
      default: return '';
    }
  };

  // Get formatted status text
  const getStatusText = (status) => {
    switch (status) {
      case 'available': return 'Available';
      case 'in-use': return 'In Use';
      case 'maintenance-due': return 'Maintenance Due';
      case 'maintenance-overdue': return 'Maintenance Overdue';
      default: return 'Unknown';
    }
  };

  return (
    <div className="dashboard-container">
      <div className="content-header">
        <h1>{getDisplayName()} - Equipment List</h1>
        <div className="header-actions">          
          <button 
            className="btn btn-outline-primary"
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
                <option value="maintenance">Maintenance Required</option>
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
                <option value="maintenance">Maintenance Due Date</option>
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
                  <th>Next Reservation / Maintenance</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {getFilteredResources().map(resource => {
                  const status = getResourceStatus(resource.id);
                  const nextReservation = getNextReservation(resource.id);
                  const maintenanceDays = resource.nextMaintenance ? 
                    getDaysUntilMaintenance(resource.nextMaintenance) : null;
                  
                  return (
                    <tr key={resource.id}>
                      <td>{resource.title}</td>
                      <td>
                        <span className={`badge ${getStatusBadgeClass(status)}`}>
                          {getStatusText(status)}
                        </span>
                      </td>
                      <td>{countReservations(resource.id)}</td>
                      <td>
                        {(status === 'maintenance-due' || status === 'maintenance-overdue') && resource.nextMaintenance ? (
                          <div>
                            <div><strong>Maintenance:</strong> {new Date(resource.nextMaintenance).toLocaleDateString()}</div>
                            {maintenanceDays !== null && (
                              <div className="small text-muted">
                                {maintenanceDays <= 0 ? 
                                  `${Math.abs(maintenanceDays)} days overdue` : 
                                  `Due in ${maintenanceDays} days`}
                              </div>
                            )}
                          </div>
                        ) : nextReservation ? (
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
