import React, { useState, useEffect } from 'react';
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
          
          // If no technicians are found in events, use some default ones
          if (uniqueTechnicians.length === 0) {
            setTechnicians(['Dr. Smith', 'Dr. Johnson', 'Lab Tech Sarah']);
          } else {
            setTechnicians(uniqueTechnicians);
          }
          
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

  // Get technician's events
  const getTechnicianEvents = (technicianName) => {
    // If 'all' is selected, return events for the first technician as a fallback
    const targetTechnician = technicianName === 'all' 
      ? (technicians.length > 0 ? technicians[0] : null)
      : technicianName;
    
    if (!targetTechnician) return [];
    
    // Filter events by technician and sort chronologically
    return events
      .filter(event => 
        event.technician === targetTechnician ||
        (technicianName === 'all' && event.technician)
      )
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
    return name ? name.charAt(0).toUpperCase() : '?';
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
  const filteredEvents = selectedTechnician === 'all'
    ? events.filter(event => event.technician)
    : getTechnicianEvents(selectedTechnician);

  return (
    <div className="dashboard-container">
      <div className="content-header">
        <h1>{getDisplayName()} - Technician Schedule</h1>
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
          
          {filteredEvents.length === 0 ? (
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
