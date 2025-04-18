import React, { useState, useEffect, useRef } from 'react';

function Analytics() {
  const [resources, setResources] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tenantName, setTenantName] = useState('Laboratory Equipment');
  const [timeRange, setTimeRange] = useState('30days');
  const isMounted = useRef(true);

  // Function to load tenant data
  const loadTenantData = async (isInitialLoad = false) => {
    try {
      if (isInitialLoad) {
        setLoading(true);
      }

      // This would be your API call in a real implementation
      setTimeout(() => {
        // Sample data for demonstration
        const sampleResources = [
          { id: 'equipment-1', title: 'HPLC Agilent 1260' },
          { id: 'equipment-2', title: 'Mass Spec AB Sciex' },
          { id: 'equipment-3', title: 'NMR Bruker 400MHz' },
          { id: 'equipment-4', title: 'PCR Thermal Cycler' },
          { id: 'equipment-5', title: 'Microplate Reader' }
        ];

        const sampleEvents = [
          {
            id: '1',
            title: 'HPLC Analysis',
            start: new Date(2025, 3, 15, 9, 0),
            end: new Date(2025, 3, 15, 12, 0),
            resourceId: 'equipment-1',
            equipment: 'HPLC Agilent 1260',
            technician: 'John Smith',
            purpose: 'Utilization',
            cost: 350
          },
          {
            id: '2',
            title: 'Mass Spec Maintenance',
            start: new Date(2025, 3, 16, 13, 0),
            end: new Date(2025, 3, 16, 16, 0),
            resourceId: 'equipment-2',
            equipment: 'Mass Spec AB Sciex',
            technician: 'Maria Johnson',
            purpose: 'Maintenance',
            cost: 650
          },
          {
            id: '3',
            title: 'NMR Repair',
            start: new Date(2025, 3, 17, 10, 0),
            end: new Date(2025, 3, 17, 15, 0),
            resourceId: 'equipment-3',
            equipment: 'NMR Bruker 400MHz',
            technician: 'David Williams',
            purpose: 'Broken',
            cost: 1250
          },
          {
            id: '4',
            title: 'PCR Analysis',
            start: new Date(2025, 3, 18, 9, 0),
            end: new Date(2025, 3, 18, 11, 0),
            resourceId: 'equipment-4',
            equipment: 'PCR Thermal Cycler',
            technician: 'John Smith',
            purpose: 'Utilization',
            cost: 280
          },
          {
            id: '5',
            title: 'Microplate Reading',
            start: new Date(2025, 3, 19, 14, 0),
            end: new Date(2025, 3, 19, 16, 0),
            resourceId: 'equipment-5',
            equipment: 'Microplate Reader',
            technician: 'Lisa Brown',
            purpose: 'Utilization',
            cost: 190
          }
        ];

        setResources(sampleResources);
        setEvents(sampleEvents);

        if (isInitialLoad) {
          setLoading(false);
        }
      }, 1000);
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
    loadTenantData(true);
    
    // Cleanup function
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Get events within the selected time range
  const getFilteredEvents = () => {
    if (!events || events.length === 0) {
      return [];
    }
    
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
      try {
        const eventDate = new Date(event.start);
        return eventDate >= rangeStart && eventDate <= now;
      } catch (e) {
        console.error('Error parsing event date:', e, event);
        return false;
      }
    });
  };

  // Calculate equipment utilization
  const calculateEquipmentUtilization = () => {
    if (!resources || resources.length === 0) {
      return [];
    }
    
    const filteredEvents = getFilteredEvents();
    
    if (filteredEvents.length === 0) {
      return resources.map(resource => ({
        name: resource.title,
        id: resource.id,
        count: 0,
        utilization: 0,
        totalCost: 0,
        avgCost: 0,
        utilizationCount: 0,
        maintenanceCount: 0,
        brokenCount: 0
      }));
    }
    
    const utilization = resources.map(resource => {
      const resourceEvents = filteredEvents.filter(event => 
        event.resourceId === resource.id || 
        event.equipment === resource.title
      );
      
      // Calculate purpose counts
      const utilizationEvents = resourceEvents.filter(e => (e.purpose || 'Utilization') === 'Utilization');
      const maintenanceEvents = resourceEvents.filter(e => e.purpose === 'Maintenance');
      const brokenEvents = resourceEvents.filter(e => e.purpose === 'Broken');
      
      // Calculate cost metrics
      const totalCost = resourceEvents.reduce((sum, event) => sum + (Number(event.cost) || 0), 0);
      const avgCost = resourceEvents.length > 0 ? totalCost / resourceEvents.length : 0;
      
      return {
        name: resource.title || 'Unknown Equipment',
        id: resource.id,
        count: resourceEvents.length,
        utilization: filteredEvents.length > 0 ? 
          Math.round((resourceEvents.length / filteredEvents.length) * 100) : 0,
        totalCost: totalCost,
        avgCost: avgCost,
        utilizationCount: utilizationEvents.length,
        maintenanceCount: maintenanceEvents.length,
        brokenCount: brokenEvents.length
      };
    }).sort((a, b) => b.count - a.count);
    
    return utilization;
  };

  // Calculate purpose breakdown for all events
  const calculatePurposeBreakdown = () => {
    const filteredEvents = getFilteredEvents();
    
    if (filteredEvents.length === 0) {
      return {
        utilization: 0,
        maintenance: 0,
        broken: 0,
        total: 0,
        utilizationPercent: 0,
        maintenancePercent: 0,
        brokenPercent: 0
      };
    }
    
    const counts = {
      utilization: filteredEvents.filter(e => (e.purpose || 'Utilization') === 'Utilization').length,
      maintenance: filteredEvents.filter(e => e.purpose === 'Maintenance').length,
      broken: filteredEvents.filter(e => e.purpose === 'Broken').length,
      total: filteredEvents.length
    };
    
    return {
      ...counts,
      utilizationPercent: Math.round((counts.utilization / counts.total) * 100),
      maintenancePercent: Math.round((counts.maintenance / counts.total) * 100),
      brokenPercent: Math.round((counts.broken / counts.total) * 100)
    };
  };

  // Calculate total and average costs
  const calculateCostMetrics = () => {
    const filteredEvents = getFilteredEvents();
    
    if (filteredEvents.length === 0) {
      return {
        totalCost: 0,
        avgCost: 0,
        utilizationCost: 0,
        maintenanceCost: 0,
        brokenCost: 0
      };
    }
    
    // Calculate total costs
    const totalCost = filteredEvents.reduce((sum, event) => sum + (Number(event.cost) || 0), 0);
    
    // Calculate costs by purpose
    const utilizationCost = filteredEvents
      .filter(e => (e.purpose || 'Utilization') === 'Utilization')
      .reduce((sum, event) => sum + (Number(event.cost) || 0), 0);
      
    const maintenanceCost = filteredEvents
      .filter(e => e.purpose === 'Maintenance')
      .reduce((sum, event) => sum + (Number(event.cost) || 0), 0);
      
    const brokenCost = filteredEvents
      .filter(e => e.purpose === 'Broken')
      .reduce((sum, event) => sum + (Number(event.cost) || 0), 0);
    
    return {
      totalCost,
      avgCost: filteredEvents.length > 0 ? Math.round(totalCost / filteredEvents.length) : 0,
      utilizationCost,
      maintenanceCost,
      brokenCost
    };
  };

  // Get top technicians by number of events
  const getTopTechnicians = () => {
    const filteredEvents = getFilteredEvents();
    
    if (filteredEvents.length === 0) {
      return [];
    }
    
    const technicianCounts = {};
    const technicianCosts = {};
    
    filteredEvents.forEach(event => {
      if (event.technician) {
        // Count events
        if (technicianCounts[event.technician]) {
          technicianCounts[event.technician]++;
          technicianCosts[event.technician] += (Number(event.cost) || 0);
        } else {
          technicianCounts[event.technician] = 1;
          technicianCosts[event.technician] = (Number(event.cost) || 0);
        }
      }
    });
    
    return Object.entries(technicianCounts)
      .map(([name, count]) => ({ 
        name, 
        count,
        totalCost: technicianCosts[name],
        avgCost: Math.round(technicianCosts[name] / count)
      }))
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
        count: 0,
        cost: 0
      });
    }
    
    // Count events per month
    if (events && events.length > 0) {
      events.forEach(event => {
        try {
          const eventDate = new Date(event.start);
          const monthIndex = months.findIndex(m => 
            m.month === eventDate.getMonth() && m.year === eventDate.getFullYear()
          );
          
          if (monthIndex >= 0) {
            months[monthIndex].count++;
            months[monthIndex].cost += (Number(event.cost) || 0);
          }
        } catch (e) {
          console.error('Error processing event date:', e, event);
        }
      });
    }
    
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
    
    // Calculate downtime ratio (maintenance + broken / total events)
    const maintenanceEvents = filteredEvents.filter(e => e.purpose === 'Maintenance').length;
    const brokenEvents = filteredEvents.filter(e => e.purpose === 'Broken').length;
    const downtimeRatio = totalEvents > 0 
      ? Math.round(((maintenanceEvents + brokenEvents) / totalEvents) * 100) 
      : 0;
    
    return {
      totalEvents,
      eventsPerDay,
      utilizationRate,
      downtimeRatio
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

  // Format currency for display
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const metrics = calculateMetrics();
  const equipmentUtilization = calculateEquipmentUtilization();
  const topTechnicians = getTopTechnicians();
  const monthlyEventCounts = getMonthlyEventCounts();
  const purposeBreakdown = calculatePurposeBreakdown();
  const costMetrics = calculateCostMetrics();

  // Custom Chart for Purpose Breakdown
  const PurposeBreakdownChart = ({ data }) => {
    if (!data) return null;
    
    return (
      <div className="purpose-breakdown-chart">
        <div className="breakdown-bars">
          <div className="breakdown-bar">
            <div className="bar-label">Utilization</div>
            <div className="bar-container">
              <div className="bar-fill utilization" style={{ width: `${data.utilizationPercent}%` }}>
                {data.utilizationPercent}%
              </div>
            </div>
            <div className="bar-count">{data.utilization} events</div>
          </div>
          
          <div className="breakdown-bar">
            <div className="bar-label">Maintenance</div>
            <div className="bar-container">
              <div className="bar-fill maintenance" style={{ width: `${data.maintenancePercent}%` }}>
                {data.maintenancePercent}%
              </div>
            </div>
            <div className="bar-count">{data.maintenance} events</div>
          </div>
          
          <div className="breakdown-bar">
            <div className="bar-label">Broken</div>
            <div className="bar-container">
              <div className="bar-fill broken" style={{ width: `${data.brokenPercent}%` }}>
                {data.brokenPercent}%
              </div>
            </div>
            <div className="bar-count">{data.broken} events</div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="dashboard-container">
      <div className="content-header">
        <h1>{tenantName} - Analytics & Reports</h1>
        <div className="header-actions">
          <button 
            className="btn btn-outline-primary"
            onClick={() => console.log('Go to calendar view')}
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
          <button className="btn btn-primary mt-3" onClick={() => console.log('Return to dashboard')}>
            Return to Main Dashboard
          </button>
        </div>
      ) : (
        <div className="analytics-dashboard">
          <div className="analytics-header card">
            <div className="card-body">
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
          
          {/* Cost Summary Section */}
          <div className="report-section">
            <h2 className="section-title">Cost Summary</h2>
            <div className="stat-cards">
              <div className="stat-card">
                <div className="stat-title">Total Cost</div>
                <div className="stat-value">{formatCurrency(costMetrics.totalCost)}</div>
                <div className="stat-sub">all events</div>
              </div>
              
              <div className="stat-card">
                <div className="stat-title">Average Cost</div>
                <div className="stat-value">{formatCurrency(costMetrics.avgCost)}</div>
                <div className="stat-sub">per event</div>
              </div>
              
              <div className="stat-card">
                <div className="stat-title">Utilization Cost</div>
                <div className="stat-value">{formatCurrency(costMetrics.utilizationCost)}</div>
                <div className="stat-sub">{purposeBreakdown.utilization} events</div>
              </div>
              
              <div className="stat-card">
                <div className="stat-title">Maintenance Cost</div>
                <div className="stat-value">{formatCurrency(costMetrics.maintenanceCost)}</div>
                <div className="stat-sub">{purposeBreakdown.maintenance} events</div>
              </div>
            </div>
          </div>
          
          {/* Purpose Breakdown Section */}
          <div className="report-section card">
            <div className="card-header">
              <h2 className="card-title">Purpose Breakdown</h2>
            </div>
            <div className="card-body">
              <div className="purpose-breakdown">
                <PurposeBreakdownChart data={purposeBreakdown} />
                
                <div className="breakdown-stats">
                  <div className="breakdown-stat">
                    <div className="stat-title">Downtime Ratio</div>
                    <div className="stat-value">{metrics.downtimeRatio}%</div>
                    <div className="stat-sub">maintenance + broken events</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Equipment Utilization Table */}
          <div className="report-section card">
            <div className="card-header">
              <h2 className="card-title">Equipment Utilization & Costs</h2>
            </div>
            <div className="card-body">
              <table className="report-table">
                <thead>
                  <tr>
                    <th>Equipment</th>
                    <th>Total Events</th>
                    <th>Utilization %</th>
                    <th>Total Cost</th>
                    <th>Avg Cost/Event</th>
                    <th>Purpose Breakdown</th>
                  </tr>
                </thead>
                <tbody>
                  {equipmentUtilization.map((equipment) => (
                    <tr key={equipment.id}>
                      <td>{equipment.name}</td>
                      <td>{equipment.count}</td>
                      <td>
                        <div className="utilization-bar" style={{ width: '100px', display: 'inline-block', marginRight: '10px' }}>
                          <div className="utilization-fill" style={{ width: `${equipment.utilization}%` }}></div>
                        </div>
                        {equipment.utilization}%
                      </td>
                      <td>{formatCurrency(equipment.totalCost)}</td>
                      <td>{formatCurrency(equipment.avgCost)}</td>
                      <td>
                        <div className="purpose-mini-chart">
                          <div className="mini-bar utilization" style={{ width: `${equipment.count ? (equipment.utilizationCount / equipment.count) * 100 : 0}%` }}></div>
                          <div className="mini-bar maintenance" style={{ width: `${equipment.count ? (equipment.maintenanceCount / equipment.count) * 100 : 0}%` }}></div>
                          <div className="mini-bar broken" style={{ width: `${equipment.count ? (equipment.brokenCount / equipment.count) * 100 : 0}%` }}></div>
                        </div>
                        <div className="purpose-mini-legend">
                          U: {equipment.utilizationCount} | M: {equipment.maintenanceCount} | B: {equipment.brokenCount}
                        </div>
                      </td>
                    </tr>
                  ))}
                  
                  {equipmentUtilization.length === 0 && (
                    <tr>
                      <td colSpan="6" className="text-center py-4">
                        <i className="fas fa-info-circle me-2"></i>
                        No equipment utilization data available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* Top Technicians Section */}
          <div className="report-section card">
            <div className="card-header">
              <h2 className="card-title">Top Technicians</h2>
            </div>
            <div className="card-body">
              {topTechnicians.length > 0 ? (
                <table className="report-table">
                  <thead>
                    <tr>
                      <th>Technician</th>
                      <th>Reservations</th>
                      <th>Total Cost</th>
                      <th>Avg Cost/Event</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topTechnicians.map((technician, index) => (
                      <tr key={index}>
                        <td>{technician.name}</td>
                        <td>{technician.count}</td>
                        <td>{formatCurrency(technician.totalCost)}</td>
                        <td>{formatCurrency(technician.avgCost)}</td>
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
          </div>
          
          {/* Monthly Trends Section */}
          <div className="report-section card">
            <div className="card-header">
              <h2 className="card-title">Monthly Trends</h2>
            </div>
            <div className="card-body">
              <table className="report-table">
                <thead>
                  <tr>
                    <th>Month</th>
                    <th>Reservations</th>
                    <th>Total Cost</th>
                    <th>Activity Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyEventCounts.map((month, index) => (
                    <tr key={index}>
                      <td>{month.name} {month.year}</td>
                      <td>{month.count}</td>
                      <td>{formatCurrency(month.cost)}</td>
                      <td>
                        <div className="utilization-bar" style={{ width: '150px', display: 'inline-block' }}>
                          <div 
                            className="utilization-fill" 
                            style={{ 
                              width: `${Math.min(month.count * 5, 100)}%`,
                              backgroundColor: month.count > 0 ? '#4285F4' : '#e9ecef'
                            }}
                          ></div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Analytics;
