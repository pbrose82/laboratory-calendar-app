import React, { useState, useEffect } from 'react';
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

  useEffect(() => {
    async function loadTenantData() {
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
        } else {
          setError(`Tenant "${tenantId}" not found`);
        }
      } catch (err) {
        console.error('Failed to load tenant data:', err);
        setError(`Error loading tenant data: ${err.message}`);
      } finally {
        setLoading(false);
      }
    }

    if (tenantId) {
      loadTenantData();
    }
  }, [tenantId, tenantName]);

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
      const eventStart = new Date(event.start);
      return eventStart >= startOfWeek && eventStart < endOfWeek;
    });
    
    return {
      total: resourceEvents.length,
      thisWeek: eventsThisWeek.length,
      utilization: resourceEvents.length > 0 ? 
        Math.round((eventsThisWeek.length / 5) * 100) : 0 // Assuming 5 workdays per week
    };
  };

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
            className="btn btn-outline-secondary"
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
          <button className="btn btn-primary mt-3" onClick={() => navigate('/')}>
            Return to Main Dashboard
          </button>
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
                <div className="summary-title">In Use Now</div>
                <div className="summary-value">
                  {resources.filter(r => getResourceStatus(r.id) === 'in-use').length}
                </div>
              </div>
            </div>
          </div>
          
          <h2 className="section-title">Equipment Status</h2>
          <div className="resource-grid">
            {resources.map(resource => {
              const utilization = calculateUtilization(resource.id);
              const status = getResourceStatus(resource.id);
              
              return (
                <div className="resource-card" key={resource.id}>
                  <div className={`resource-status ${status}`}>
                    {status === 'available' ? 'Available' : 'In Use'}
                  </div>
                  <h3 className="resource-title">{resource.title}</h3>
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
        </div>
      )}
    </div>
  );
}

export default ResourceDashboard;
