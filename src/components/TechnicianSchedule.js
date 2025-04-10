import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchTenant } from '../services/apiClient';
import './ResourceViews.css';

function TechnicianSchedule() {
  const { tenantId } = useParams();
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tenantName, setTenantName] = useState('');
  const [technicians, setTechnicians] = useState([]);
  const [selectedTechnician, setSelectedTechnician] = useState('all');
  
  // Ref to track if component is mounted
  const isMounted = useRef(true);
  
  // Load tenant data function - handles both initial load and background refresh
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
        const allEvents = tenantData.events || [];
        setEvents(allEvents);
        
        // Extract unique technicians from events
        const uniqueTechnicians = Array.from(
          new Set(
            allEvents
              .filter(event => event.technician)
              .map(event => event.technician)
          )
        );
        
        if (process.env.NODE_ENV === 'development') {
          console.log('Extracted technicians from events:', uniqueTechnicians);
        }
        
        // Only use default technicians if none found in events
        if (uniqueTechnicians.length === 0) {
          // Don't use fake names anymore since they're not in events
          setTechnicians([]);
        } else {
          setTechnicians(uniqueTechnicians);
          
          // Auto-select the first technician if one exists and none is selected
          if (selectedTechnician === 'all' && uniqueTechnicians.length > 0) {
            setSelectedTechnician(uniqueTechnicians[0]);
          }
        }
        
        if (!tenantName) {
          setTenantName(tenantData.name || tenantId);
        }
        
        if (process.env.NODE_ENV === 'development') {
          console.log('Technician schedule data refreshed at', new Date().toLocaleTimeString());
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
  
  // Load data initially
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

  // Get technician's events
  const getTechnicianEvents = (technicianName) => {
    // If 'all' is selected, return events for any technician
    if (technicianName === 'all') {
      return events
        .filter(event => event.technician)
        .sort((a, b) => new Date(a.start) - new Date(b.start));
    }
    
    // Otherwise filter events by the specific technician and sort chronologically
    return events
      .filter(event => event.technician === technicianName)
      .sort((a, b) => new Date(a.start) - new Date(b.start));
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    }).format(date);
  };

  // Format time range
  const formatTimeRange = (startString, endString) => {
    if (!startString || !endString) return 'N/A';
    
    const start = new Date(startString);
    const end = new Date(endString);
    
    const startTime = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    }).format(start);
    
    const endTime = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    }).format(end);
    
    return `${startTime} - ${endTime}`;
  };

  // Get initial letter of name for avatar
  const getInitial = (name) => {
    // Check if name is a string and not empty before using charAt
    if (typeof name === 'string' && name.trim().length > 0) {
      return name.charAt(0).toUpperCase();
    }
    return '?';
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

  // Get events for selected technician
  const filteredEvents = getTechnicianEvents(selectedTechnician);

  return (
    <div className="dashboard-container">
      <div className="content-header">
        <h1>{getDisplayName()} - Technician Schedule</h1>
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
          <div>Loading technician data...</div>
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
        <div className="technician-schedule">
          <div className="technician-header">
            <div className="technician-selector">
              <label className="filter-label">Select Technician</label>
              <select 
                className="filter-select"
                value={selectedTechnician}
                onChange={(e) => setSelectedTechnician(e.target.value)}
              >
                <option value="all">All Technicians</option>
                {technicians.map((tech, index) => (
                  <option key={index} value={tech}>{tech}</option>
                ))}
              </select>
            </div>
          </div>
          
          {selectedTechnician !== 'all' && (
            <div className="technician-card">
              <div className="technician-avatar">
                {getInitial(selectedTechnician)}
              </div>
              <div className="technician-info">
                <div className="technician-name">{selectedTechnician}</div>
                <div className="technician-role">Laboratory Technician</div>
              </div>
            </div>
          )}
          
          <h2 className="section-title">Scheduled Assignments</h2>
          
          {technicians.length === 0 ? (
            <div className="text-center py-4">
              <i className="fas fa-user-slash fa-3x mb-3 text-muted"></i>
              <p>No technicians found in any events. Try adding technician information to your calendar events.</p>
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="text-center py-4">
              <i className="fas fa-calendar-times fa-3x mb-3 text-muted"></i>
              <p>No scheduled assignments found for {selectedTechnician === 'all' ? 'technicians' : selectedTechnician}</p>
            </div>
          ) : (
            <div className="schedule-timeline">
              {filteredEvents.map((event, index) => (
                <div className="timeline-item" key={index}>
                  <div className="timeline-content">
                    <div className="timeline-time">{formatTimeRange(event.start, event.end)}</div>
                    <div className="timeline-title">{event.title}</div>
                    {selectedTechnician === 'all' && (
                      <div className="timeline-technician">Technician: {event.technician}</div>
                    )}
                    {event.location && (
                      <div className="timeline-location">
                        <i className="fas fa-map-marker-alt me-1"></i> {event.location}
                      </div>
                    )}
                    {event.equipment && (
                      <div className="timeline-equipment">
                        <i className="fas fa-microscope me-1"></i> {event.equipment}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default TechnicianSchedule;
