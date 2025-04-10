import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchTenant } from '../services/apiClient';
import './ResourceViews.css';

function Analytics() {
  const { tenantId } = useParams();
  const navigate = useNavigate();
  const [resources, setResources] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tenantName, setTenantName] = useState('');
  
  // Time range for analytics (default: last 30 days)
  const [timeRange, setTimeRange] = useState('30days');
  
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

  // Get events within the selected time range
  const getFilteredEvents = () => {
    const now = new Date();
    let rangeStart;
    
    switch (timeRange) {
      case '7days':
        rangeStart = new Date(now);
        rangeStart.setDate(now.getDate() - 7);
        break;
      case '30days':
        rangeStart = new Date(now);
        rangeStart.setDate(now.getDate() - 30);
        break;
      case '90days':
        rangeStart = new Date(now);
        rangeStart.setDate(now.getDate() - 90);
        break;
      case '12months':
        rangeStart = new Date(now);
        rangeStart.setMonth(now.getMonth() - 12);
        break;
      default:
        rangeStart = new Date(now);
        rangeStart.setDate(now.getDate() - 30);
    }
    
    return events.filter(event => {
      const eventDate = new Date(event.start);
      return eventDate >= rangeStart && eventDate <= now;
    });
  };

  // Calculate equipment utilization
  const calculateEquipmentUtilization = () => {
    const filteredEvents = getFilteredEvents();
    const utilization = resources.map(resource => {
      const resourceEvents = filteredEvents.filter(event => 
        event.resourceId === resource.id || 
        event.equipment === resource.title
      );
      
      return {
        name: resource.title,
        id: resource.id,
        count: resourceEvents.length,
        utilization: events.length > 0 ? 
          Math.round((resourceEvents.length / filteredEvents.length) * 100) : 0
      };
    }).sort((a, b) => b.count - a.count);
    
    return utilization;
  };

  // Get top technicians by number of events
  const getTopTechnicians = () => {
    const filteredEvents = getFilteredEvents();
    const technicianCounts = {};
    
    filteredEvents.forEach(event => {
      if (event.technician) {
        if (technicianCounts[event.technician]) {
          technicianCounts[event.technician]++;
        } else {
          technicianCounts[event.technician] = 1;
        }
      }
    });
    
    return Object.entries(technicianCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  };

  // Get monthly event counts
  const getMonthlyEventCounts = () => {
    const now = new Date();
    const months = [];
    
    // Generate last 6 months
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(now);
      monthDate.setMonth(now.getMonth() - i);
      months.push({
        name: monthDate.toLocaleString('default', { month: 'short' }),
        year: monthDate.getFullYear(),
        month: monthDate.getMonth(),
        count: 0
      });
    }
    
    // Count events per month
    events.forEach(event => {
      const eventDate = new Date(event.start);
      const monthIndex = months.findIndex(m => 
        m.month === eventDate.getMonth() && m.year === eventDate.getFullYear()
      );
      
      if (monthIndex >= 0) {
        months[monthIndex].count++;
      }
    });
    
    return months;
  };

  // Calculate overall metrics
  const calculateMetrics = () => {
    const filteredEvents = getFilteredEvents();
    const totalEvents = filteredEvents.length;
    
    // Calculate average events per day
    const days = getTimeRangeDays();
    const eventsPerDay = days > 0 ? Math.round((totalEvents / days) * 10) / 10 : 0;
    
    // Calculate utilization rate (events / (resources * days))
    const utilizationRate = resources.length > 0 && days > 0 
      ? Math.round((totalEvents / (resources.length * days)) * 100) 
      : 0;
    
    return {
      totalEvents,
      eventsPerDay,
      utilizationRate
    };
  };

  // Get number of days in the selected time range
  const getTimeRangeDays = () => {
    switch (timeRange) {
      case '7days': return 7;
      case '30days': return 30;
      case '90days': return 90;
      case '12months': return 365;
      default: return 30;
    }
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

  const metrics = calculateMetrics();
  const equipmentUtilization = calculateEquipmentUtilization();
  const topTechnicians = getTopTechnicians();
  const monthlyEventCounts = getMonthlyEventCounts();

  return (
    <div className="dashboard-container">
      <div className="content-header">
        <h1>{getDisplayName()} - Analytics & Reports</h1>
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
          <div>Loading analytics data...</div>
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
        <div className="analytics-dashboard">
          <div className="analytics-header">
            <div className="date-range-picker">
              <label className="filter-label">Time Range</label>
              <select 
                className="filter-select"
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
              >
                <option value="7days">Last 7 Days</option>
                <option value="30days">Last 30 Days</option>
                <option value="90days">Last 90 Days</option>
                <option value="12months">Last 12 Months</option>
              </select>
            </div>
          </div>
          
          <div className="stat-cards">
            <div className="stat-card">
              <div className="stat-title">Total Reservations</div>
              <div className="stat-value">{metrics.totalEvents}</div>
              <div className="stat-sub">in the selected period</div>
            </div>
            
            <div className="stat-card">
              <div className="stat-title">Reservations per Day</div>
              <div className="stat-value">{metrics.eventsPerDay}</div>
              <div className="stat-sub">average</div>
            </div>
            
            <div className="stat-card">
              <div className="stat-title">Utilization Rate</div>
              <div className="stat-value">{metrics.utilizationRate}%</div>
              <div className="stat-sub">of total capacity</div>
            </div>
            
            <div className="stat-card">
              <div className="stat-title">Active Equipment</div>
              <div className="stat-value">{equipmentUtilization.filter(e => e.count > 0).length}</div>
              <div className="stat-sub">of {resources.length} total</div>
            </div>
          </div>
          
          <div className="report-section">
            <h2 className="section-title">Equipment Utilization</h2>
            <table className="report-table">
              <thead>
                <tr>
                  <th>Equipment</th>
                  <th>Reservations</th>
                  <th>Utilization %</th>
                </tr>
              </thead>
              <tbody>
                {equipmentUtilization.map((equipment) => (
                  <tr key={equipment.id}>
                    <td>{equipment.name}</td>
                    <td>{equipment.count}
                    <td>{equipment.count}</td>
                    <td>
                      <div className="utilization-bar" style={{ width: '150px', display: 'inline-block', marginRight: '10px' }}>
                        <div className="utilization-fill" style={{ width: `${equipment.utilization}%` }}></div>
                      </div>
                      {equipment.utilization}%
                    </td>
                  </tr>
                ))}
                
                {equipmentUtilization.length === 0 && (
                  <tr>
                    <td colSpan="3" className="text-center py-4">
                      <i className="fas fa-info-circle me-2"></i>
                      No equipment utilization data available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          <div className="report-section">
            <h2 className="section-title">Top Technicians</h2>
            {topTechnicians.length > 0 ? (
              <table className="report-table">
                <thead>
                  <tr>
                    <th>Technician</th>
                    <th>Reservations</th>
                  </tr>
                </thead>
                <tbody>
                  {topTechnicians.map((technician, index) => (
                    <tr key={index}>
                      <td>{technician.name}</td>
                      <td>{technician.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-center py-4">
                <i className="fas fa-user-slash me-2"></i>
                No technician data available
              </div>
            )}
          </div>
          
          <div className="report-section">
            <h2 className="section-title">Monthly Trends</h2>
            <table className="report-table">
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Reservations</th>
                  <th>Trend</th>
                </tr>
              </thead>
              <tbody>
                {monthlyEventCounts.map((month, index) => (
                  <tr key={index}>
                    <td>{month.name} {month.year}</td>
                    <td>{month.count}</td>
                    <td>
                      <div className="utilization-bar" style={{ width: '150px', display: 'inline-block' }}>
                        <div 
                          className="utilization-fill" 
                          style={{ 
                            width: `${Math.min(month.count * 5, 100)}%`,
                            backgroundColor: month.count > 0 ? '#0047BB' : '#e9ecef'
                          }}
                        ></div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="report-section">
            <h2 className="section-title">Recent Reservations</h2>
            <table className="report-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Title</th>
                  <th>Equipment</th>
                  <th>Technician</th>
                </tr>
              </thead>
              <tbody>
                {getFilteredEvents().slice(0, 10).map((event, index) => (
                  <tr key={index}>
                    <td>{new Date(event.start).toLocaleDateString()}</td>
                    <td>{event.title}</td>
                    <td>{event.equipment || resources.find(r => r.id === event.resourceId)?.title || 'Unknown'}</td>
                    <td>{event.technician || 'N/A'}</td>
                  </tr>
                ))}
                
                {getFilteredEvents().length === 0 && (
                  <tr>
                    <td colSpan="4" className="text-center py-4">
                      <i className="fas fa-calendar-times me-2"></i>
                      No reservations found in the selected time period
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default Analytics;                      
