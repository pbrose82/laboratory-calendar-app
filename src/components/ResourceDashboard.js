import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchTenant } from '../services/apiClient';
import './ResourceViews.css';

function ResourceDashboard() {
  const { tenantId } = useParams();
  const navigate = useNavigate();
  const [resources, setResources] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tenantName, setTenantName] = useState('');
  
  // Reference to track if component is mounted
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

  // Calculate resource utilization
  const calculateUtilization = (resourceId) => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);
    
    const resourceEvents = events.filter(event => 
      event.resourceId === resourceId || 
      event.equipment === resources.find(r => r.id === resourceId)?.title
    );
    
    const eventsThisWeek = resourceEvents.filter(event => {
      try {
        const eventStart = new Date(event.start);
        return eventStart >= startOfWeek && eventStart < endOfWeek;
      } catch (e) {
        return false;
      }
    });
    
    return {
      total: resourceEvents.length,
      thisWeek: eventsThisWeek.length,
      utilization: eventsThisWeek.length > 0 ? 
        Math.round((eventsThisWeek.length / 5) * 100) : 0 // Assuming 5 workdays per week
    };
  };

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

  // Format days remaining until maintenance
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

  // Handle navigation to equipment calendar
  const handleViewEquipmentCalendar = (resourceId) => {
    navigate(`/${tenantId}?resourceId=${resourceId}`);
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
        <h1>{getDisplayName()} - Resource Dashboard</h1>
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
          <div>Loading resource data...</div>
        </div>
      ) : error ? (
        <div className="error-message">
          <h3>Error</h3>
          <p>{error}</p>
        </div>
      ) : (
        <div className="resource-dashboard">
          <div className="dashboard-summary">
            <div className="summary-card">
              <div className="summary-icon">
                <i className="fas fa-microscope"></i>
              </div>
              <div className="summary-content">
                <div className="summary-title">Total Equipment</div>
                <div className="summary-value">{resources.length}</div>
              </div>
            </div>
            
            <div className="summary-card">
              <div className="summary-icon">
                <i className="fas fa-calendar-check"></i>
              </div>
              <div className="summary-content">
                <div className="summary-title">Total Reservations</div>
                <div className="summary-value">{events.length}</div>
              </div>
            </div>
            
            <div className="summary-card">
              <div className="summary-icon">
                <i className="fas fa-clock"></i>
              </div>
              <div className="summary-content">
                <div className="summary-title">Available Now</div>
                <div className="summary-value">
                  {resources.filter(r => getResourceStatus(r.id) === 'available').length}
                </div>
              </div>
            </div>
            
            <div className="summary-card">
              <div className="summary-icon">
                <i className="fas fa-tools"></i>
              </div>
              <div className="summary-content">
                <div className="summary-title">Maintenance Required</div>
                <div className="summary-value">
                  {resources.filter(r => 
                    getResourceStatus(r.id) === 'maintenance-due' || 
                    getResourceStatus(r.id) === 'maintenance-overdue'
                  ).length}
                </div>
              </div>
            </div>
          </div>
          
          <h2 className="section-title">Equipment Status</h2>
          {resources.length === 0 ? (
            <div className="text-center py-4">
              <i className="fas fa-microscope fa-3x mb-3 text-muted"></i>
              <p>No equipment found. Equipment will appear here when added to calendar events.</p>
            </div>
          ) : (
            <div className="resource-grid">
              {resources.map(resource => {
                const utilization = calculateUtilization(resource.id);
                const status = getResourceStatus(resource.id);
                const daysUntilMaintenance = resource.nextMaintenance ? 
                  getDaysUntilMaintenance(resource.nextMaintenance) : null;
                
                return (
                  <div className="resource-card" key={resource.id}>
                    <div className={`resource-status ${status}`}>
                      {status === 'available' ? 'Available' : 
                       status === 'in-use' ? 'In Use' :
                       status === 'maintenance-due' ? 'Maintenance Due' :
                       status === 'maintenance-overdue' ? 'Maintenance Overdue' : 
                       'Unknown'}
                    </div>
                    <h3 className="resource-title">{resource.title}</h3>
                    
                    {/* Show maintenance info if available */}
                    {resource.maintenanceInterval && (
                      <div className="maintenance-info">
                        <div className="maintenance-label">
                          <i className="fas fa-tools me-1"></i>
                          Maintenance Interval: {resource.maintenanceInterval}
                        </div>
                        
                        {resource.lastMaintenance && (
                          <div className="maintenance-detail">
                            Last: {new Date(resource.lastMaintenance).toLocaleDateString()}
                          </div>
                        )}
                        
                        {resource.nextMaintenance && daysUntilMaintenance !== null && (
                          <div className="maintenance-detail">
                            Next: {new Date(resource.nextMaintenance).toLocaleDateString()}
                            <span className={`maintenance-days ${daysUntilMaintenance <= 0 ? 'overdue' : 'upcoming'}`}>
                              {daysUntilMaintenance <= 0 ? 
                                `(${Math.abs(daysUntilMaintenance)} days overdue)` : 
                                `(in ${daysUntilMaintenance} days)`}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div className="resource-utilization">
                      <div className="utilization-label">Weekly Utilization</div>
                      <div className="utilization-bar">
                        <div 
                          className="utilization-fill" 
                          style={{ width: `${utilization.utilization}%` }}
                        ></div>
                      </div>
                      <div className="utilization-value">{utilization.utilization}%</div>
                    </div>
                    
                    <div className="resource-stats">
                      <div className="resource-stat">
                        <div className="stat-label">Bookings (This Week)</div>
                        <div className="stat-value">{utilization.thisWeek}</div>
                      </div>
                      <div className="resource-stat">
                        <div className="stat-label">Total Bookings</div>
                        <div className="stat-value">{utilization.total}</div>
                      </div>
                    </div>
                    
                    <div className="resource-actions">
                      <button 
                        className="resource-btn resource-btn-primary"
                        onClick={() => handleViewEquipmentCalendar(resource.id)}
                      >
                        <i className="fas fa-calendar-alt"></i>
                        View Schedule
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ResourceDashboard;
