import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchTenant } from '../services/apiClient';
import './ResourceViews.css';

function GanttChart() {
  const { tenantId } = useParams();
  const navigate = useNavigate();
  const [resources, setResources] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tenantName, setTenantName] = useState('');
  const [timeRange, setTimeRange] = useState('week'); // week, 2week, month
  const [startDate, setStartDate] = useState(getDefaultStartDate());
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Get default start date (beginning of current week)
  function getDefaultStartDate() {
    const date = new Date();
    date.setDate(date.getDate() - date.getDay()); // Start from Sunday
    date.setHours(0, 0, 0, 0);
    return date;
  }

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
        
        console.log('Gantt chart data refreshed at', new Date().toLocaleTimeString());
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
        console.log('Auto-refreshing gantt chart data...');
        loadTenantData();
      }, 30000);
    }
    
    // Clean up interval on component unmount
    return () => {
      if (refreshInterval) clearInterval(refreshInterval);
    };
  }, [autoRefresh, tenantId]);

  // Calculate days array for the gantt chart
  const getDays = () => {
    const days = [];
    const endDate = new Date(startDate);
    
    switch (timeRange) {
      case 'week':
        endDate.setDate(startDate.getDate() + 7);
        break;
      case '2week':
        endDate.setDate(startDate.getDate() + 14);
        break;
      case 'month':
        endDate.setMonth(startDate.getMonth() + 1);
        break;
      default:
        endDate.setDate(startDate.getDate() + 7);
    }
    
    let currentDate = new Date(startDate);
    
    while (currentDate < endDate) {
      days.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return days;
  };

  // Format date for display
  const formatDate = (date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric'
    }).format(date);
  };

  // Get short day name
  const getDayName = (date) => {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short'
    }).format(date);
  };

  // Get resource events for the gantt chart
  const getResourceEvents = (resourceId) => {
    return events.filter(event => {
      // Match by resourceId or equipment name
      const matchesResource = event.resourceId === resourceId || 
                              event.equipment === resources.find(r => r.id === resourceId)?.title;
      
      // Check if event falls within the displayed range
      const eventStart = new Date(event.start);
      const eventEnd = new Date(event.end);
      const rangeEnd = getDays()[getDays().length - 1];
      
      return matchesResource && eventEnd >= startDate && eventStart <= rangeEnd;
    });
  };

  // Calculate position and width of event bars
  const getEventBarStyle = (event) => {
    const days = getDays();
    const totalDays = days.length;
    const dayWidth = 100 / totalDays; // percentage width of each day
    
    const eventStart = new Date(event.start);
    const eventEnd = new Date(event.end);
    
    // Clamp event start/end to visible range
    const visibleStart = eventStart < startDate ? startDate : eventStart;
    const visibleEnd = eventEnd > days[days.length - 1] ? days[days.length - 1] : eventEnd;
    
    // Calculate how many days from start of range
    const daysFromStart = Math.floor((visibleStart - startDate) / (24 * 60 * 60 * 1000));
    
    // Calculate duration in days (or partial days)
    const durationInMs = visibleEnd - visibleStart;
    const durationInDays = durationInMs / (24 * 60 * 60 * 1000);
    
    // Calculate position and width
    const left = daysFromStart * dayWidth;
    const width = Math.max(durationInDays * dayWidth, dayWidth / 4); // Ensure minimum width
    
    return {
      left: `${left}%`,
      width: `${width}%`
    };
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

  // Move time range (previous/next)
  const moveTimeRange = (direction) => {
    const newStartDate = new Date(startDate);
    
    if (direction === 'prev') {
      switch (timeRange) {
        case 'week':
          newStartDate.setDate(newStartDate.getDate() - 7);
          break;
        case '2week':
          newStartDate.setDate(newStartDate.getDate() - 14);
          break;
        case 'month':
          newStartDate.setMonth(newStartDate.getMonth() - 1);
          break;
        default:
          newStartDate.setDate(newStartDate.getDate() - 7);
      }
    } else {
      switch (timeRange) {
        case 'week':
          newStartDate.setDate(newStartDate.getDate() + 7);
          break;
        case '2week':
          newStartDate.setDate(newStartDate.getDate() + 14);
          break;
        case 'month':
          newStartDate.setMonth(newStartDate.getMonth() + 1);
          break;
        default:
          newStartDate.setDate(newStartDate.getDate() + 7);
      }
    }
    
    setStartDate(newStartDate);
  };

  return (
    <div className="dashboard-container">
      <div className="content-header">
        <h1>{getDisplayName()} - Gantt Chart</h1>
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
          <div>Loading gantt chart data...</div>
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
        <div className="gantt-chart">
          <div className="gantt-header">
            <div className="date-selector">
              <button 
                className="btn btn-outline-secondary me-2"
                onClick={() => moveTimeRange('prev')}
              >
                <i className="fas fa-chevron-left"></i>
              </button>
              
              <select 
                className="filter-select me-2"
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
              >
                <option value="week">1 Week</option>
                <option value="2week">2 Weeks</option>
                <option value="month">1 Month</option>
              </select>
              
              <button 
                className="btn btn-outline-secondary me-2"
                onClick={() => moveTimeRange('next')}
              >
                <i className="fas fa-chevron-right"></i>
              </button>
              
              <button 
                className="btn btn-outline-secondary"
                onClick={() => setStartDate(getDefaultStartDate())}
              >
                Today
              </button>
            </div>
          </div>
          
          {resources.length === 0 ? (
            <div className="text-center py-4 mt-4">
              <i className="fas fa-microscope fa-3x mb-3 text-muted"></i>
              <p>No equipment found. Equipment will appear here when added to calendar events.</p>
            </div>
          ) : (
            <div className="gantt-container">
              {/* Day headers */}
              <div className="gantt-row">
                <div className="gantt-label"></div>
                <div className="gantt-timeline">
                  <div className="gantt-days">
                    {getDays().map((day, index) => (
                      <div className="gantt-day" key={index}>
                        {getDayName(day)} {formatDate(day)}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Resource rows */}
              {resources.map(resource => (
                <div className="gantt-row" key={resource.id}>
                  <div className="gantt-label" onClick={() => handleViewEquipmentCalendar(resource.id)}>
                    {resource.title}
                  </div>
                  <div className="gantt-timeline">
                    <div className="gantt-days">
                      {getDays().map((day, index) => (
                        <div className="gantt-day" key={index}></div>
                      ))}
                    </div>
                    
                    {/* Event bars */}
                    {getResourceEvents(resource.id).map((event, eventIndex) => (
                      <div 
                        className="gantt-bar"
                        key={eventIndex}
                        style={getEventBarStyle(event)}
                        title={`${event.title}\n${new Date(event.start).toLocaleString()} - ${new Date(event.end).toLocaleString()}`}
                      >
                        {event.title}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          
          <div className="gantt-legend">
            <div className="legend-item">
              <div className="legend-color" style={{ backgroundColor: '#0047BB' }}></div>
              <div className="legend-label">Equipment Reservation</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default GanttChart;
