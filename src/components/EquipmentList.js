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
  const [purposeFilter, setPurposeFilter] = useState('all'); // New purpose filter
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

  // Get current equipment purpose and status
  const getResourceInfo = (resourceId) => {
    const resource = resources.find(r => r.id === resourceId);
    const now = new Date();
    
    // Get the most recent events for this resource
    const resourceEvents = events.filter(event => 
      event.resourceId === resourceId || 
      event.equipment === resource?.title
    ).sort((a, b) => new Date(b.start) - new Date(a.start));
    
    // Check for active (current) events
    const activeEvent = resourceEvents.find(event => {
      try {
        const eventStart = new Date(event.start);
        const eventEnd = new Date(event.end);
        return eventStart <= now && eventEnd >= now;
      } catch (e) {
        return false;
      }
    });
    
    // Purpose hierarchy: active event purpose > most recent event purpose > default "Available"
    let purpose = "Available";
    let status = "available";
    
    if (activeEvent) {
      purpose = activeEvent.purpose || "Utilization";
      
      // Set status based on purpose
      if (purpose === "Maintenance") {
        status = "maintenance";
      } else if (purpose === "Broken") {
        status = "broken";
      } else {
        status = "in-use"; // For Utilization
      }
    } else if (resourceEvents.length > 0) {
      // Check the most recent event's purpose if no active event
      const lastPurpose = resourceEvents[0].purpose;
      
      // If the last event was for broken equipment and there's no new event,
      // equipment is likely still broken
      if (lastPurpose === "Broken") {
        purpose = "Broken";
        status = "broken";
      }
    }
    
    // Check if maintenance is due (from resource metadata)
    if (status === "available" && resource?.maintenanceStatus === 'due') {
      status = "maintenance-due";
      // Don't change purpose here, as maintenance is planned but not yet happening
    }
    
    // Check if maintenance is overdue
    if (resource?.maintenanceStatus === 'overdue') {
      status = "maintenance-overdue";
      // Don't change purpose here, as maintenance is planned but not yet happening
    }
    
    return { purpose, status };
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

  // Count reservations by purpose for a resource
  const countPurposeReservations = (resourceId) => {
    const resourceEvents = events.filter(event => {
      try {
        return event.resourceId === resourceId || 
               event.equipment === resources.find(r => r.id === resourceId)?.title;
      } catch (e) {
        return false;
      }
    });
    
    return {
      total: resourceEvents.length,
      utilization: resourceEvents.filter(e => !e.purpose || e.purpose === 'Utilization').length,
      maintenance: resourceEvents.filter(e => e.purpose === 'Maintenance').length,
      broken: resourceEvents.filter(e => e.purpose === 'Broken').length
    };
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
        const { status } = getResourceInfo(resource.id);
        
        if (statusFilter === 'maintenance') {
          return status === 'maintenance-due' || status === 'maintenance-overdue' || status === 'maintenance';
        }
        
        return status === statusFilter;
      });
    }
    
    // Apply purpose filter
    if (purposeFilter !== 'all') {
      filteredList = filteredList.filter(resource => {
        const { purpose } = getResourceInfo(resource.id);
        return purpose === purposeFilter;
      });
    }
    
    // Sort resources
    return filteredList.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return (a.title || '').localeCompare(b.title || '');
        case 'status': {
          const statusA = getResourceInfo(a.id).status;
          const statusB = getResourceInfo(b.id).status;
          // Status priority order
          const statusOrder = { 
            'broken': 0,
            'maintenance-overdue': 1, 
            'maintenance': 2,
            'maintenance-due': 3, 
            'in-use': 4, 
            'available': 5 
          };
          return (statusOrder[statusA] || 6) - (statusOrder[statusB] || 6);
        }
        case 'purpose': {
          const purposeA = getResourceInfo(a.id).purpose;
          const purposeB = getResourceInfo(b.id).purpose;
          // Purpose priority order
          const purposeOrder = {
            'Broken': 0,
            'Maintenance': 1,
            'Utilization': 2,
            'Available': 3
          };
          return (purposeOrder[purposeA] || 4) - (purposeOrder[purposeB] || 4);
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
      case 'in-use': return 'badge-primary'; // Changed from danger to primary for in-use
      case 'broken': return 'badge-danger';
      case 'maintenance': return 'badge-warning'; // Yellow for maintenance
      case 'maintenance-due': return 'badge-maintenance';
      case 'maintenance-overdue': return 'badge-maintenance-overdue';
      default: return '';
    }
  };

  // Get formatted status text
  const getStatusText = (status, purpose) => {
    switch (status) {
      case 'available': return 'Available';
      case 'in-use': return 'In Use';
      case 'broken': return 'Broken';
      case 'maintenance': return 'In Maintenance';
      case 'maintenance-due': return 'Maintenance Due';
      case 'maintenance-overdue': return 'Maintenance Overdue';
      default: return purpose || 'Unknown';
    }
  };

  // Handle purpose filter change
  const handlePurposeFilterChange = (e) => {
    setPurposeFilter(e.target.value);
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
            <div className="filter-row">
              <div className="filter-control">
                <label className="filter-label">Filter by Status</label>
                <select 
                  className="filter-select"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">All Statuses</option>
                  <option value="available">Available Now</option>
                  <option value="in-use">In Use Now</option>
                  <option value="broken">Broken</option>
                  <option value="maintenance">Maintenance</option>
                </select>
              </div>
              
              <div className="filter-control">
                <label className="filter-label">Filter by Purpose</label>
                <select 
                  className="filter-select"
                  value={purposeFilter}
                  onChange={handlePurposeFilterChange}
                >
                  <option value="all">All Purposes</option>
                  <option value="Available">Available</option>
                  <option value="Utilization">Utilization</option>
                  <option value="Maintenance">Maintenance</option>
                  <option value="Broken">Broken</option>
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
                  <option value="purpose">Purpose</option>
                  <option value="reservations">Total Reservations</option>
                  <option value="maintenance">Maintenance Due Date</option>
                </select>
              </div>
              
              <div className="filter-actions">
                <button 
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => {
                    setStatusFilter('all');
                    setPurposeFilter('all');
                    setSortBy('name');
                  }}
                >
                  <i className="fas fa-undo me-1"></i>
                  Reset Filters
                </button>
              </div>
            </div>
          </div>
          
          <div className="equipment-status-summary">
            <div className="status-item">
              <div className="status-count">{resources.filter(r => getResourceInfo(r.id).status === 'available').length}</div>
              <div className="status-label available">Available</div>
            </div>
            <div className="status-item">
              <div className="status-count">{resources.filter(r => getResourceInfo(r.id).status === 'in-use').length}</div>
              <div className="status-label in-use">In Use</div>
            </div>
            <div className="status-item">
              <div className="status-count">
                {resources.filter(r => 
                  getResourceInfo(r.id).status === 'maintenance' ||
                  getResourceInfo(r.id).status === 'maintenance-due' ||
                  getResourceInfo(r.id).status === 'maintenance-overdue'
                ).length}
              </div>
              <div className="status-label maintenance">Maintenance</div>
            </div>
            <div className="status-item">
              <div className="status-count">{resources.filter(r => getResourceInfo(r.id).status === 'broken').length}</div>
              <div className="status-label broken">Broken</div>
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
                  <th>Current Status</th>
                  <th>Purpose</th>
                  <th>Reservation Stats</th>
                  <th>Next Event</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {getFilteredResources().map(resource => {
                  const { status, purpose } = getResourceInfo(resource.id);
                  const nextReservation = getNextReservation(resource.id);
                  const maintenanceDays = resource.nextMaintenance ? 
                    getDaysUntilMaintenance(resource.nextMaintenance) : null;
                  const purposeCounts = countPurposeReservations(resource.id);
                  
                  return (
                    <tr key={resource.id} className={`equipment-row ${status}`}>
                      <td className="equipment-name">{resource.title}</td>
                      <td>
                        <span className={`badge ${getStatusBadgeClass(status)}`}>
                          {getStatusText(status, purpose)}
                        </span>
                        
                        {(status === 'maintenance-due' || status === 'maintenance-overdue') && (
                          <div className="maintenance-info">
                            {maintenanceDays !== null && (
                              <div className="small">
                                {maintenanceDays <= 0 ? 
                                  `${Math.abs(maintenanceDays)} days overdue` : 
                                  `Due in ${maintenanceDays} days`}
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                      <td>
                        <span className={`purpose-badge ${purpose.toLowerCase()}`}>
                          {purpose}
                        </span>
                      </td>
                      <td>
                        <div className="purpose-stats">
                          <div className="purpose-mini-chart">
                            <div className="mini-bar utilization" style={{ 
                              width: `${purposeCounts.total ? (purposeCounts.utilization / purposeCounts.total) * 100 : 0}%` 
                            }}></div>
                            <div className="mini-bar maintenance" style={{ 
                              width: `${purposeCounts.total ? (purposeCounts.maintenance / purposeCounts.total) * 100 : 0}%` 
                            }}></div>
                            <div className="mini-bar broken" style={{ 
                              width: `${purposeCounts.total ? (purposeCounts.broken / purposeCounts.total) * 100 : 0}%` 
                            }}></div>
                          </div>
                          <div className="purpose-counts">
                            <span className="total-count">{purposeCounts.total} events</span>
                            <span className="purpose-count">
                              <i className="fas fa-square utilization"></i> {purposeCounts.utilization}
                            </span>
                            <span className="purpose-count">
                              <i className="fas fa-square maintenance"></i> {purposeCounts.maintenance}
                            </span>
                            <span className="purpose-count">
                              <i className="fas fa-square broken"></i> {purposeCounts.broken}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td>
                        {status === 'maintenance-due' && resource.nextMaintenance ? (
                          <div className="event-info maintenance">
                            <i className="fas fa-tools"></i>
                            <div>
                              <div className="event-title">Scheduled Maintenance</div>
                              <div className="event-date">{new Date(resource.nextMaintenance).toLocaleDateString()}</div>
                            </div>
                          </div>
                        ) : nextReservation ? (
                          <div className={`event-info ${nextReservation.purpose?.toLowerCase() || 'utilization'}`}>
                            <i className={nextReservation.purpose === 'Maintenance' ? 'fas fa-tools' : 
                                         nextReservation.purpose === 'Broken' ? 'fas fa-exclamation-triangle' : 
                                         'fas fa-calendar-check'}></i>
                            <div>
                              <div className="event-title">{nextReservation.title}</div>
                              <div className="event-date">{formatDate(nextReservation.start)}</div>
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted">No upcoming events</span>
                        )}
                      </td>
                      <td>
                        <button 
                          className="btn btn-sm btn-primary"
                          onClick={() => handleViewSchedule(resource.id)}
                        >
                          <i className="fas fa-calendar-alt me-1"></i>
                          Schedule
                        </button>
                      </td>
                    </tr>
                  );
                })}
                
                {getFilteredResources().length === 0 && (
                  <tr>
                    <td colSpan="6" className="text-center py-4">
                      <i className="fas fa-info-circle me-2"></i>
                      No equipment found matching the selected filters
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
          
          <div className="status-legend">
            <div className="legend-title">Status Legend:</div>
            <div className="legend-items">
              <div className="legend-item">
                <span className="legend-color available"></span>
                <span className="legend-label">Available</span>
              </div>
              <div className="legend-item">
                <span className="legend-color in-use"></span>
                <span className="legend-label">In Use</span>
              </div>
              <div className="legend-item">
                <span className="legend-color maintenance"></span>
                <span className="legend-label">Maintenance</span>
              </div>
              <div className="legend-item">
                <span className="legend-color broken"></span>
                <span className="legend-label">Broken</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default EquipmentList;
