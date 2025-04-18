import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Card, Row, Col, Button, Typography, Select, DatePicker, Spin, 
  Alert, Space, Table, Tag, Tooltip, Statistic, Tabs, Progress
} from 'antd';
import { 
  CalendarOutlined, BarChartOutlined, LineChartOutlined, 
  FireOutlined, CheckCircleOutlined, ExclamationOutlined, 
  CloseCircleOutlined, WarningOutlined, ReloadOutlined
} from '@ant-design/icons';
import { fetchTenant } from '../services/apiClient';
import './ResourceViews.css';
import './CapacityPlanning.css'; // We'll create this stylesheet next

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;
const { TabPane } = Tabs;

function CapacityPlanning() {
  const { tenantId } = useParams();
  const navigate = useNavigate();
  const [resources, setResources] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tenantName, setTenantName] = useState('');
  
  // Capacity planning specific states
  const [viewType, setViewType] = useState('heatmap'); // 'heatmap', 'forecast', 'bottleneck'
  const [dateRange, setDateRange] = useState([null, null]);
  const [selectedResources, setSelectedResources] = useState([]);
  const [timeUnit, setTimeUnit] = useState('day'); // 'hour', 'day', 'week', 'month'
  const [capacityData, setCapacityData] = useState({});
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // Ref to track if component is mounted
  const isMounted = useRef(true);

  // Function to load tenant data
  const loadTenantData = async (isInitialLoad = false) => {
    try {
      if (isInitialLoad) {
        setLoading(true);
      }
      
      // Special handling for tenant name
      if (tenantId === 'productcaseelnlims4uat' || tenantId === 'productcaseelnandlims') {
        setTenantName('Product CASE UAT');
      }
      
      // Load data from API
      const tenantData = await fetchTenant(tenantId);
      
      if (tenantData && isMounted.current) {
        setResources(tenantData.resources || []);
        setEvents(tenantData.events || []);
        
        if (!tenantName) {
          setTenantName(tenantData.name || tenantId);
        }
        
        // Set default selection of resources if none selected yet
        if (selectedResources.length === 0 && tenantData.resources?.length > 0) {
          // Default to selecting top 5 most used resources
          const topResources = getTopResources(tenantData.resources, tenantData.events, 5);
          setSelectedResources(topResources.map(r => r.id));
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
    
    // Default date range to current month
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    setDateRange([start, end]);
    
    // Cleanup function
    return () => {
      isMounted.current = false;
    };
  }, [tenantId]);
  
  // Calculate capacity data when dependencies change
  useEffect(() => {
    if (!loading && resources.length > 0 && events.length > 0) {
      calculateCapacityData();
    }
  }, [resources, events, dateRange, selectedResources, timeUnit, viewType, refreshTrigger]);
  
  // Set up automatic background refresh
  useEffect(() => {
    // Refresh data every 60 seconds
    const refreshInterval = setInterval(() => {
      if (isMounted.current) {
        loadTenantData(false);
        // Trigger recalculation
        setRefreshTrigger(prev => prev + 1);
      }
    }, 60000);
    
    // Clean up interval on component unmount
    return () => {
      clearInterval(refreshInterval);
    };
  }, [tenantId]);

  // Helper function to get top N most used resources
  const getTopResources = (resourceList, eventList, count = 5) => {
    // Count events per resource
    const resourceUsage = {};
    resourceList.forEach(resource => {
      resourceUsage[resource.id] = 0;
    });
    
    // Count events for each resource
    eventList.forEach(event => {
      if (event.resourceId && resourceUsage[event.resourceId] !== undefined) {
        resourceUsage[event.resourceId]++;
      } 
      // Also check for equipment name match
      else if (event.equipment) {
        const matchingResource = resourceList.find(r => r.title === event.equipment);
        if (matchingResource) {
          resourceUsage[matchingResource.id]++;
        }
      }
    });
    
    // Sort resources by usage and get top N
    return resourceList
      .map(resource => ({
        ...resource,
        usageCount: resourceUsage[resource.id] || 0
      }))
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, count);
  };

  // Helper to format date for display and binning
  const formatDate = (date, unit = timeUnit) => {
    if (!date) return '';
    
    const d = new Date(date);
    
    switch (unit) {
      case 'hour':
        return d.toLocaleString('en-US', { 
          year: 'numeric', 
          month: 'numeric', 
          day: 'numeric', 
          hour: 'numeric'
        });
      case 'day':
        return d.toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'numeric', 
          day: 'numeric'
        });
      case 'week':
        // Get the first day of the week (Sunday)
        const firstDay = new Date(d);
        firstDay.setDate(d.getDate() - d.getDay());
        return `Week of ${firstDay.toLocaleDateString('en-US', { 
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        })}`;
      case 'month':
        return d.toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long'
        });
      default:
        return d.toLocaleDateString();
    }
  };

  // Helper to generate time slots based on time unit and date range
  const generateTimeSlots = () => {
    if (!dateRange[0] || !dateRange[1]) return [];
    
    const start = new Date(dateRange[0]);
    const end = new Date(dateRange[1]);
    const slots = [];
    
    let current = new Date(start);
    
    switch (timeUnit) {
      case 'hour':
        while (current <= end) {
          slots.push(new Date(current));
          current.setHours(current.getHours() + 1);
        }
        break;
      case 'day':
        while (current <= end) {
          slots.push(new Date(current));
          current.setDate(current.getDate() + 1);
        }
        break;
      case 'week':
        // Start from the first day of the week (Sunday)
        const firstDay = new Date(start);
        firstDay.setDate(start.getDate() - start.getDay());
        current = new Date(firstDay);
        
        while (current <= end) {
          slots.push(new Date(current));
          current.setDate(current.getDate() + 7);
        }
        break;
      case 'month':
        // Start from the first day of the month
        current = new Date(start.getFullYear(), start.getMonth(), 1);
        
        while (current <= end) {
          slots.push(new Date(current));
          current.setMonth(current.getMonth() + 1);
        }
        break;
    }
    
    return slots;
  };

  // Main function to calculate capacity data
  const calculateCapacityData = () => {
    if (!dateRange[0] || !dateRange[1] || selectedResources.length === 0) {
      setCapacityData({});
      return;
    }
    
    // Get selected resources details
    const selectedResourcesDetails = resources.filter(r => selectedResources.includes(r.id));
    
    // Generate time slots
    const timeSlots = generateTimeSlots();
    
    // Filter events to only include those within date range
    const startDate = new Date(dateRange[0]);
    const endDate = new Date(dateRange[1]);
    endDate.setHours(23, 59, 59, 999); // End of day
    
    const filteredEvents = events.filter(event => {
      try {
        const eventStart = new Date(event.start);
        const eventEnd = new Date(event.end || event.start);
        
        // Check if event overlaps with date range
        return eventStart <= endDate && eventEnd >= startDate;
      } catch (e) {
        return false;
      }
    });
    
    // Calculate utilization data for each resource and time slot
    const utilizationData = {};
    
    selectedResourcesDetails.forEach(resource => {
      utilizationData[resource.id] = {
        resourceName: resource.title,
        timeSlots: {}
      };
      
      // Initialize slots
      timeSlots.forEach(slot => {
        const slotKey = formatDate(slot);
        utilizationData[resource.id].timeSlots[slotKey] = {
          utilization: 0,
          maintenance: 0,
          broken: 0,
          total: 0,
          events: []
        };
      });
      
      // Calculate utilization for each event
      filteredEvents.forEach(event => {
        // Check if event is for this resource
        if (event.resourceId !== resource.id && event.equipment !== resource.title) {
          return;
        }
        
        const eventStart = new Date(event.start);
        const eventEnd = new Date(event.end || event.start);
        const purpose = event.purpose || 'Utilization';
        
        // Find all time slots this event overlaps with
        timeSlots.forEach(slotStart => {
          let slotEnd;
          
          // Calculate slot end based on time unit
          switch (timeUnit) {
            case 'hour':
              slotEnd = new Date(slotStart);
              slotEnd.setHours(slotStart.getHours() + 1);
              break;
            case 'day':
              slotEnd = new Date(slotStart);
              slotEnd.setDate(slotStart.getDate() + 1);
              break;
            case 'week':
              slotEnd = new Date(slotStart);
              slotEnd.setDate(slotStart.getDate() + 7);
              break;
            case 'month':
              slotEnd = new Date(slotStart);
              slotEnd.setMonth(slotStart.getMonth() + 1);
              break;
          }
          
          // Check if event overlaps with this slot
          if (eventStart < slotEnd && eventEnd > slotStart) {
            const slotKey = formatDate(slotStart);
            
            // Calculate overlap duration in hours
            const overlapStart = eventStart > slotStart ? eventStart : slotStart;
            const overlapEnd = eventEnd < slotEnd ? eventEnd : slotEnd;
            const overlapHours = (overlapEnd - overlapStart) / (1000 * 60 * 60);
            
            // Add to appropriate counter based on purpose
            if (purpose === 'Maintenance') {
              utilizationData[resource.id].timeSlots[slotKey].maintenance += overlapHours;
            } else if (purpose === 'Broken') {
              utilizationData[resource.id].timeSlots[slotKey].broken += overlapHours;
            } else {
              utilizationData[resource.id].timeSlots[slotKey].utilization += overlapHours;
            }
            
            utilizationData[resource.id].timeSlots[slotKey].total += overlapHours;
            
            // Add event to the slot
            utilizationData[resource.id].timeSlots[slotKey].events.push({
              ...event,
              overlapHours
            });
          }
        });
      });
    });
    
    // Calculate capacity limits based on time unit
    const hoursPerSlot = {
      hour: 1,
      day: 24,
      week: 24 * 7,
      month: 24 * 30 // Approximation
    };
    
    // Process utilization data into heatmap, forecast, and bottleneck formats
    const heatmapData = [];
    const forecastData = [];
    const bottleneckData = [];
    
    selectedResourcesDetails.forEach(resource => {
      const resourceData = utilizationData[resource.id];
      
      // Process for heatmap
      Object.entries(resourceData.timeSlots).forEach(([slotKey, data]) => {
        const maxCapacity = hoursPerSlot[timeUnit];
        const utilizationPercent = Math.min(100, Math.round((data.utilization / maxCapacity) * 100));
        const maintenancePercent = Math.min(100, Math.round((data.maintenance / maxCapacity) * 100));
        const brokenPercent = Math.min(100, Math.round((data.broken / maxCapacity) * 100));
        const totalPercent = Math.min(100, Math.round((data.total / maxCapacity) * 100));
        
        heatmapData.push({
          resource: resource.title,
          resourceId: resource.id,
          timeSlot: slotKey,
          utilizationHours: data.utilization.toFixed(1),
          maintenanceHours: data.maintenance.toFixed(1),
          brokenHours: data.broken.toFixed(1),
          totalHours: data.total.toFixed(1),
          utilizationPercent,
          maintenancePercent,
          brokenPercent,
          totalPercent,
          events: data.events,
          maxCapacity
        });
      });
      
      // Process for forecast
      // For simplicity, we'll use past data to project future trends
      // In a real implementation, you'd use more sophisticated forecasting
      forecastData.push({
        resource: resource.title,
        resourceId: resource.id,
        current: Object.values(resourceData.timeSlots).reduce((sum, data) => sum + data.total, 0),
        projected: Object.values(resourceData.timeSlots).reduce((sum, data) => sum + data.total, 0) * 1.15, // Example 15% growth
        availableHours: timeSlots.length * hoursPerSlot[timeUnit],
        utilizationRate: Math.round(
          (Object.values(resourceData.timeSlots).reduce((sum, data) => sum + data.utilization, 0) / 
          (timeSlots.length * hoursPerSlot[timeUnit])) * 100
        )
      });
      
      // Process for bottleneck analysis
      const totalUtilizationHours = Object.values(resourceData.timeSlots).reduce(
        (sum, data) => sum + data.utilization, 0
      );
      const totalMaintenanceHours = Object.values(resourceData.timeSlots).reduce(
        (sum, data) => sum + data.maintenance, 0
      );
      const totalBrokenHours = Object.values(resourceData.timeSlots).reduce(
        (sum, data) => sum + data.broken, 0
      );
      const totalHours = Object.values(resourceData.timeSlots).reduce(
        (sum, data) => sum + data.total, 0
      );
      const maxCapacityHours = timeSlots.length * hoursPerSlot[timeUnit];
      
      bottleneckData.push({
        resource: resource.title,
        resourceId: resource.id,
        utilizationHours: totalUtilizationHours.toFixed(1),
        maintenanceHours: totalMaintenanceHours.toFixed(1),
        brokenHours: totalBrokenHours.toFixed(1),
        totalHours: totalHours.toFixed(1),
        capacityHours: maxCapacityHours,
        utilizationPercent: Math.round((totalUtilizationHours / maxCapacityHours) * 100),
        downtimePercent: Math.round(((totalMaintenanceHours + totalBrokenHours) / maxCapacityHours) * 100),
        peakUtilization: Math.max(
          ...Object.values(resourceData.timeSlots).map(data => Math.round((data.total / hoursPerSlot[timeUnit]) * 100))
        ),
        // Calculate bottleneck score (0-100) - higher means more likely to be a bottleneck
        bottleneckScore: Math.round(
          (totalUtilizationHours / maxCapacityHours) * 70 + // 70% weight on utilization
          (Object.values(resourceData.timeSlots).filter(
            data => data.total > 0.8 * hoursPerSlot[timeUnit]
          ).length / timeSlots.length) * 30 // 30% weight on frequency of high utilization
        )
      });
    });
    
    // Sort bottlenecks by bottleneck score descending
    bottleneckData.sort((a, b) => b.bottleneckScore - a.bottleneckScore);
    
    setCapacityData({
      heatmap: heatmapData,
      forecast: forecastData,
      bottleneck: bottleneckData,
      timeSlots
    });
  };

  // Get color for heatmap cell based on utilization percentage
  const getHeatmapColor = (percent) => {
    if (percent >= 90) return '#f5222d'; // Red - very high
    if (percent >= 75) return '#fa8c16'; // Orange - high
    if (percent >= 50) return '#faad14'; // Yellow - medium
    if (percent >= 25) return '#52c41a'; // Green - low
    return '#d9d9d9'; // Grey - very low
  };

  // Get status for bottleneck analysis
  const getBottleneckStatus = (score) => {
    if (score >= 85) return { status: 'critical', color: '#f5222d', text: 'Critical Bottleneck' };
    if (score >= 70) return { status: 'high', color: '#fa8c16', text: 'High Risk' };
    if (score >= 50) return { status: 'medium', color: '#faad14', text: 'Moderate Risk' };
    return { status: 'low', color: '#52c41a', text: 'Low Risk' };
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

  // Handle resource selection change
  const handleResourceChange = (value) => {
    setSelectedResources(value);
  };

  // Handle date range change
  const handleDateRangeChange = (dates) => {
    setDateRange(dates);
  };

  // Handle time unit change
  const handleTimeUnitChange = (value) => {
    setTimeUnit(value);
  };

  // Handle view type change
  const handleViewTypeChange = (key) => {
    setViewType(key);
  };

  // Handle manual refresh
  const handleRefresh = () => {
    loadTenantData(true);
  };

  // Render the capacity heatmap
  const renderHeatmap = () => {
    if (!capacityData.heatmap || capacityData.heatmap.length === 0) {
      return (
        <Alert
          message="No data available for the selected time period and resources"
          type="info"
          showIcon
        />
      );
    }
    
    // Group heatmap data by resource
    const groupedData = {};
    capacityData.heatmap.forEach(item => {
      if (!groupedData[item.resourceId]) {
        groupedData[item.resourceId] = {
          resource: item.resource,
          resourceId: item.resourceId,
          slots: []
        };
      }
      
      groupedData[item.resourceId].slots.push(item);
    });
    
    // Sort time slots chronologically for each resource
    Object.values(groupedData).forEach(resource => {
      resource.slots.sort((a, b) => {
        // Convert formatted date strings back to comparable dates
        const dateA = new Date(a.timeSlot);
        const dateB = new Date(b.timeSlot);
        return dateA - dateB;
      });
    });
    
    // Get unique time slots for headers
    const allTimeSlots = [...new Set(capacityData.heatmap.map(item => item.timeSlot))];
    
    // Sort time slots chronologically
    allTimeSlots.sort((a, b) => {
      const dateA = new Date(a);
      const dateB = new Date(b);
      return dateA - dateB;
    });
    
    return (
      <div className="heatmap-container">
        <div className="heatmap-header">
          <div className="heatmap-resource-header">Resource</div>
          {allTimeSlots.map((slot, index) => (
            <div key={index} className="heatmap-time-header">
              {timeUnit === 'hour' ? slot.split(' ')[3] + (slot.includes('PM') ? 'PM' : 'AM') : 
               timeUnit === 'day' ? slot.split(',')[0] : 
               timeUnit === 'week' ? `W${index + 1}` : 
               slot}
            </div>
          ))}
        </div>
        
        <div className="heatmap-body">
          {Object.values(groupedData).map((resource, resourceIndex) => (
            <div key={resourceIndex} className="heatmap-row">
              <div className="heatmap-resource-cell">
                {resource.resource}
              </div>
              
              {allTimeSlots.map((timeSlot, slotIndex) => {
                const slotData = resource.slots.find(s => s.timeSlot === timeSlot);
                
                // If no data for this slot, show empty cell
                if (!slotData) {
                  return (
                    <div key={slotIndex} className="heatmap-cell empty">
                      <div className="cell-content">-</div>
                    </div>
                  );
                }
                
                const totalPercent = slotData.totalPercent;
                const color = getHeatmapColor(totalPercent);
                
                return (
                  <Tooltip 
                    key={slotIndex} 
                    title={
                      <>
                        <p><strong>{resource.resource} - {timeSlot}</strong></p>
                        <p>Utilization: {slotData.utilizationHours}h ({slotData.utilizationPercent}%)</p>
                        <p>Maintenance: {slotData.maintenanceHours}h ({slotData.maintenancePercent}%)</p>
                        <p>Downtime: {slotData.brokenHours}h ({slotData.brokenPercent}%)</p>
                        <p>Total: {slotData.totalHours}h ({slotData.totalPercent}%)</p>
                        <p>Events: {slotData.events.length}</p>
                      </>
                    }
                  >
                    <div 
                      className="heatmap-cell" 
                      style={{ backgroundColor: color }}
                    >
                      <div className="cell-content">{totalPercent}%</div>
                    </div>
                  </Tooltip>
                );
              })}
            </div>
          ))}
        </div>
        
        <div className="heatmap-legend">
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: '#d9d9d9' }}></div>
            <span>0-25%</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: '#52c41a' }}></div>
            <span>25-50%</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: '#faad14' }}></div>
            <span>50-75%</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: '#fa8c16' }}></div>
            <span>75-90%</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: '#f5222d' }}></div>
            <span>90-100%</span>
          </div>
        </div>
      </div>
    );
  };

  // Render the capacity forecast
  const renderForecast = () => {
    if (!capacityData.forecast || capacityData.forecast.length === 0) {
      return (
        <Alert
          message="No forecast data available for the selected resources"
          type="info"
          showIcon
        />
      );
    }
    
    const columns = [
      {
        title: 'Resource',
        dataIndex: 'resource',
        key: 'resource',
      },
      {
        title: 'Current Utilization',
        dataIndex: 'current',
        key: 'current',
        render: (text, record) => (
          <Space direction="vertical" size={0}>
            <span>{record.current.toFixed(1)} hours</span>
            <Progress 
              percent={record.utilizationRate} 
              size="small" 
              status={record.utilizationRate > 85 ? 'exception' : 'normal'}
            />
          </Space>
        ),
        sorter: (a, b) => a.current - b.current,
      },
      {
        title: 'Projected Utilization',
        dataIndex: 'projected',
        key: 'projected',
        render: (text, record) => (
          <Space direction="vertical" size={0}>
            <span>{record.projected.toFixed(1)} hours</span>
            <Progress 
              percent={Math.min(100, Math.round((record.projected / record.availableHours) * 100))} 
              size="small" 
              status={record.projected > record.availableHours * 0.85 ? 'exception' : 'normal'}
            />
          </Space>
        ),
        sorter: (a, b) => a.projected - b.projected,
      },
      {
        title: 'Available Capacity',
        dataIndex: 'availableHours',
        key: 'availableHours',
        render: hours => `${hours.toFixed(1)} hours`,
      },
      {
        title: 'Utilization Rate',
        dataIndex: 'utilizationRate',
        key: 'utilizationRate',
        render: rate => {
          let color = 'green';
          if (rate > 85) color = 'red';
          else if (rate > 70) color = 'orange';
          else if (rate > 50) color = 'blue';
          
          return (
            <Tag color={color}>{rate}%</Tag>
          );
        },
        sorter: (a, b) => a.utilizationRate - b.utilizationRate,
      },
      {
        title: 'Status',
        key: 'status',
        render: (_, record) => {
          const projectedRate = Math.round((record.projected / record.availableHours) * 100);
          
          if (projectedRate > 95) {
            return <Tag color="red">Capacity Exceeded</Tag>;
          } else if (projectedRate > 85) {
            return <Tag color="orange">At Risk</Tag>;
          } else if (projectedRate > 70) {
            return <Tag color="blue">Optimal</Tag>;
          } else {
            return <Tag color="green">Underutilized</Tag>;
          }
        },
      },
    ];
    
    return (
      <div className="forecast-container">
        <Row gutter={[16, 16]}>
          <Col span={24}>
            <Table 
              dataSource={capacityData.forecast} 
              columns={columns}
              rowKey="resourceId"
              pagination={false}
            />
          </Col>
          
          <Col span={24}>
            <Card title="Capacity Forecast Insights">
              <Row gutter={16}>
                <Col xs={24} sm={12} md={8}>
                  <Statistic
                    title="Average Utilization"
                    value={Math.round(
                      capacityData.forecast.reduce((sum, item) => sum + item.utilizationRate, 0) / 
                      capacityData.forecast.length
                    )}
                    suffix="%"
                    valueStyle={{ color: '#1890ff' }}
                  />
                </Col>
                <Col xs={24} sm={12} md={8}>
                  <Statistic
                    title="Resources at Risk"
                    value={capacityData.forecast.filter(item => 
                      Math.round((item.projected / item.availableHours) * 100) > 85
                    ).length}
                    suffix={`/ ${capacityData.forecast.length}`}
                    valueStyle={{ color: '#fa8c16' }}
                  />
                </Col>
                <Col xs={24} sm={12} md={8}>
                  <Statistic
                    title="Additional Capacity Needed"
                    value={capacityData.forecast.reduce((sum, item) => {
                      const excess = item.projected - (item.availableHours * 0.85);
                      return sum + (excess > 0 ? excess : 0);
                    }, 0).toFixed(1)}
                    suffix="hours"
                    valueStyle={{ color: '#f5222d' }}
                  />
                </Col>
              </Row>
            </Card>
          </Col>
        </Row>
      </div>
    );
  };

  // Render the bottleneck analysis
  const renderBottleneckAnalysis = () => {
    if (!capacityData.bottleneck || capacityData.bottleneck.length === 0) {
      return (
        <Alert
          message="No bottleneck data available for the selected resources"
          type="info"
          showIcon
        />
      );
    }
    
    const columns = [
      {
        title: 'Resource',
        dataIndex: 'resource',
        key: 'resource',
      },
      {
        title: 'Utilization',
        dataIndex: 'utilizationPercent',
        key: 'utilizationPercent',
        render: percent => (
          <Space direction="vertical" size={0}>
            <Progress 
              percent={percent} 
              size="small" 
              status={percent > 85 ? 'exception' : 'normal'}
            />
            <span>{percent}%</span>
          </Space>
        ),
        sorter: (a, b) => a.utilizationPercent - b.utilizationPercent,
      },
      {
        title: 'Peak Utilization',
        dataIndex: 'peakUtilization',
        key: 'peakUtilization',
        render: percent => (
          <Tag color={
            percent > 95 ? 'red' : 
            percent > 85 ? 'orange' : 
            percent > 70 ? 'blue' : 
            'green'
          }>
            {percent}%
          </Tag>
        ),
        sorter: (a, b) => a.peakUtilization - b.peakUtilization,
      },
      {
        title: 'Downtime',
        dataIndex: 'downtimePercent',
        key: 'downtimePercent',
        render: percent => (
          <Tag color={
            percent > 20 ? 'red' : 
            percent > 10 ? 'orange' : 
            percent > 5 ? 'blue' : 
            'green'
          }>
            {percent}%
          </Tag>
        ),
        sorter: (a, b) => a.downtimePercent - b.downtimePercent,
      },
      {
        title: 'Bottleneck Score',
        dataIndex: 'bottleneckScore',
        key: 'bottleneckScore',
        render: score => {
          const { color, text } = getBottleneckStatus(score);
          return (
            <Space direction="vertical" size={0}>
              <Progress 
                percent={score} 
                size="small" 
                strokeColor={color}
              />
              <span>{score} - {text}</span>
            </Space>
          );
        },
        sorter: (a, b) => a.bottleneckScore - b.bottleneckScore,
        defaultSortOrder: 'descend',
      },
      {
        title: 'Action Needed',
        key: 'action',
        render: (_, record) => {
          const { status } = getBottleneckStatus(record.bottleneckScore);
          
          if (status === 'critical') {
            return (
              <Tag color="red" icon={<WarningOutlined />}>
                Immediate Action Required
              </Tag>
            );
          } else if (status === 'high') {
            return (
              <Tag color="orange" icon={<ExclamationOutlined />}>
                Plan Additional Capacity
              </Tag>
            );
          } else if (status === 'medium') {
            return (
              <Tag color="blue" icon={<ExclamationOutlined />}>
                Monitor Closely
              </Tag>
            );
          } else {
            return (
              <Tag color="green" icon={<CheckCircleOutlined />}>
                No Action Needed
              </Tag>
            );
          }
        },
      },
    ];
    
    return (
      <div className="bottleneck-container">
        <Row gutter={[16, 16]}>
          <Col span={24}>
            <Table 
              dataSource={capacityData.bottleneck} 
              columns={columns}
              rowKey="resourceId"
              pagination={false}
            />
          </Col>
          
          <Col span={24}>
            <Card title="Bottleneck Resolution Recommendations">
              {capacityData.bottleneck.some(item => item.bottleneckScore >= 70) ? (
                <div className="recommendations">
                  <h4>Critical Recommendations:</h4>
                  <ul>
                    {capacityData.bottleneck
                      .filter(item => item.bottleneckScore >= 70)
                      .map((item, index) => (
                        <li key={index}>
                          <strong>{item.resource}:</strong> {
                            item.bottleneckScore >= 85 ? 
                              `Consider adding additional ${item.resource} capacity immediately. Current utilization is at ${item.utilizationPercent}% with peak utilization at ${item.peakUtilization}%.` :
                              `Plan for additional ${item.resource} capacity within the next planning cycle. Current utilization is at ${item.utilizationPercent}% with peak utilization at ${item.peakUtilization}%.`
                          }
                        </li>
                      ))
                    }
                  </ul>
                </div>
              ) : (
                <Alert
                  message="No critical bottlenecks detected"
                  description="All resources are currently operating within acceptable capacity limits."
                  type="success"
                  showIcon
                />
              )}
              
              {capacityData.bottleneck.some(item => item.downtimePercent > 10) && (
                <div className="recommendations" style={{ marginTop: '16px' }}>
                  <h4>Downtime Recommendations:</h4>
                  <ul>
                    {capacityData.bottleneck
                      .filter(item => item.downtimePercent > 10)
                      .map((item, index) => (
                        <li key={index}>
                          <strong>{item.resource}:</strong> {
                            `Review maintenance schedule for ${item.resource}. Current downtime is ${item.downtimePercent}%, which may be impacting overall capacity.`
                          }
                        </li>
                      ))
                    }
                  </ul>
                </div>
              )}
            </Card>
          </Col>
        </Row>
      </div>
    );
  };

  return (
    <div className="dashboard-container">
      <Card className="header-card">
        <div className="header-content">
          <Title level={3}>{getDisplayName()} - Capacity Planning</Title>
          <div className="header-actions">
            <Button 
              type="primary"
              icon={<CalendarOutlined />}
              onClick={() => navigate(`/${tenantId}`)}
            >
              Calendar View
            </Button>
          </div>
        </div>
      </Card>
      
      {loading ? (
        <Card>
          <div className="loading-container">
            <Spin size="large" tip="Loading capacity data..." />
          </div>
        </Card>
      ) : error ? (
        <Card>
          <Alert
            message="Error Loading Capacity Data"
            description={error}
            type="error"
            showIcon
            action={
              <Button onClick={() => navigate('/')} type="primary">
                Return to Main Dashboard
              </Button>
            }
          />
        </Card>
      ) : (
        <>
          <Card className="filter-card">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Row gutter={16} align="middle">
                <Col xs={24} sm={12} md={6}>
                  <Text strong>Date Range:</Text>
                  <RangePicker 
                    style={{ width: '100%', marginTop: '8px' }}
                    value={dateRange}
                    onChange={handleDateRangeChange}
                  />
                </Col>
                
                <Col xs={24} sm={12} md={6}>
                  <Text strong>Time Granularity:</Text>
                  <Select
                    style={{ width: '100%', marginTop: '8px' }}
                    value={timeUnit}
                    onChange={handleTimeUnitChange}
                  >
                    <Option value="hour">Hourly</Option>
                    <Option value="day">Daily</Option>
                    <Option value="week">Weekly</Option>
                    <Option value="month">Monthly</Option>
                  </Select>
                </Col>
                
                <Col xs={24} md={10}>
                  <Text strong>Equipment:</Text>
                  <Select
                    mode="multiple"
                    style={{ width: '100%', marginTop: '8px' }}
                    placeholder="Select equipment"
                    value={selectedResources}
                    onChange={handleResourceChange}
                    optionFilterProp="children"
                  >
                    {resources.map(resource => (
                      <Option key={resource.id} value={resource.id}>
                        {resource.title}
                      </Option>
                    ))}
                  </Select>
                </Col>
                
                <Col xs={24} md={2}>
                  <Button 
                    icon={<ReloadOutlined />} 
                    onClick={handleRefresh}
                    style={{ marginTop: '28px' }}
                  >
                    Refresh
                  </Button>
                </Col>
              </Row>
            </Space>
          </Card>
          
          <Card style={{ marginTop: '16px' }}>
            <Tabs activeKey={viewType} onChange={handleViewTypeChange}>
              <TabPane 
                tab={<span><BarChartOutlined /> Capacity Heatmap</span>} 
                key="heatmap"
              >
                {renderHeatmap()}
              </TabPane>
              
              <TabPane 
                tab={<span><LineChartOutlined /> Capacity Forecast</span>} 
                key="forecast"
              >
                {renderForecast()}
              </TabPane>
              
              <TabPane 
                tab={<span><FireOutlined /> Bottleneck Analysis</span>} 
                key="bottleneck"
              >
                {renderBottleneckAnalysis()}
              </TabPane>
            </Tabs>
          </Card>
        </>
      )}
    </div>
  );
}

export default CapacityPlanning;
