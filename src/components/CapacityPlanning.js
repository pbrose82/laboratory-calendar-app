import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import dayjs from 'dayjs'; // Import dayjs
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
  // Initialize dateRange with null or initial dayjs objects
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

  // Initial data load and default date range
  useEffect(() => {
    if (tenantId) {
      loadTenantData(true);
    }

    // Default date range to current month using dayjs
    // Only set the default date range if it hasn't been set already
    if (!dateRange[0] || !dateRange[1]) {
      const today = dayjs();
      const startOfMonth = today.startOf('month');
      const endOfMonth = today.endOf('month');
      setDateRange([startOfMonth, endOfMonth]);
    }

    // Cleanup function
    return () => {
      isMounted.current = false;
    };
  }, [tenantId]); // Added dateRange to dependencies to prevent resetting if already set by picker

  // Calculate capacity data when dependencies change
  useEffect(() => {
    // Add a check to ensure dateRange has valid dayjs objects before calculating
    if (!loading && resources.length > 0 && events.length > 0 && dateRange[0] && dateRange[1] && dayjs(dateRange[0]).isValid() && dayjs(dateRange[1]).isValid()) {
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
  }, [tenantId]); // Added tenantId as it's used in loadTenantData

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
  // Use dayjs for formatting
  const formatDate = (date, unit = timeUnit) => {
    if (!date) return '';

    const d = dayjs(date); // Convert to dayjs object

    switch (unit) {
      case 'hour':
        return d.format('MM/DD/YYYY h A'); // Example format: 04/18/2025 5 PM
      case 'day':
        return d.format('MM/DD/YYYY'); // Example format: 04/18/2025
      case 'week':
        return `Week of ${d.startOf('week').format('MMM D, YYYY')}`; // Example: Week of Apr 14, 2025
      case 'month':
        return d.format('MMMM YYYY'); // Example: April 2025
      default:
        return d.format('L'); // Default dayjs locale format
    }
  };

  // Helper to generate time slots based on time unit and date range
  // Use dayjs for date manipulation
  const generateTimeSlots = () => {
    if (!dateRange[0] || !dateRange[1]) return [];

    let start = dayjs(dateRange[0]); // Use dayjs object
    let end = dayjs(dateRange[1]); // Use dayjs object
    const slots = [];

    let current = dayjs(start); // Use dayjs object

    switch (timeUnit) {
      case 'hour':
        while (current.isBefore(end) || current.isSame(end, 'hour')) {
          slots.push(current);
          current = current.add(1, 'hour');
        }
        break;
      case 'day':
        while (current.isBefore(end) || current.isSame(end, 'day')) {
          slots.push(current);
          current = current.add(1, 'day');
        }
        break;
      case 'week':
        // Start from the first day of the week (Sunday) using dayjs
        current = start.startOf('week');

        while (current.isBefore(end) || current.isSame(end, 'week')) {
          slots.push(current);
          current = current.add(1, 'week');
        }
        break;
      case 'month':
        // Start from the first day of the month using dayjs
        current = start.startOf('month');

        while (current.isBefore(end) || current.isSame(end, 'month')) {
          slots.push(current);
          current = current.add(1, 'month');
        }
        break;
      default:
        slots.push(start); // Fallback or error handling
    }

    // Convert dayjs objects back to Date objects if needed later, or process as dayjs objects
    // For compatibility with existing code that might expect Date objects:
    return slots; // Keep as dayjs objects for calculations
    // return slots.map(slot => slot.toDate()); // Convert to Date objects if necessary for other parts
  };

  // Main function to calculate capacity data
  const calculateCapacityData = () => {
    if (!dateRange[0] || !dateRange[1] || selectedResources.length === 0) {
      setCapacityData({});
      return;
    }

    // Ensure dateRange elements are dayjs objects before using them
    const startDate = dayjs(dateRange[0]).startOf('day'); // Use dayjs
    const endDate = dayjs(dateRange[1]).endOf('day'); // Use dayjs

    if (!startDate.isValid() || !endDate.isValid()) {
      console.error("Invalid date range provided to calculateCapacityData");
      setCapacityData({});
      return;
    }

    // Get selected resources details
    const selectedResourcesDetails = resources.filter(r => selectedResources.includes(r.id));

    // Generate time slots (these will be dayjs objects)
    const timeSlots = generateTimeSlots();

    // Filter events to only include those within date range
    const filteredEvents = events.filter(event => {
      try {
        const eventStart = dayjs(event.start); // Use dayjs
        const eventEnd = dayjs(event.end || event.start); // Use dayjs

        if (!eventStart.isValid() || !eventEnd.isValid()) {
            return false; // Exclude events with invalid dates
        }

        // Check if event overlaps with date range using dayjs methods
        return eventStart.isBefore(endDate) && eventEnd.isAfter(startDate);
      } catch (e) {
        console.error("Error processing event dates:", e);
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
        const slotKey = formatDate(slot); // slot is a dayjs object
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

        const eventStart = dayjs(event.start); // Use dayjs
        const eventEnd = dayjs(event.end || event.start); // Use dayjs

        if (!eventStart.isValid() || !eventEnd.isValid()) {
            return; // Skip events with invalid dates
        }

        const purpose = event.purpose || 'Utilization';

        // Find all time slots this event overlaps with
        timeSlots.forEach(slotStart => { // slotStart is a dayjs object
          let slotEnd;

          // Calculate slot end based on time unit using dayjs
          switch (timeUnit) {
            case 'hour':
              slotEnd = slotStart.add(1, 'hour');
              break;
            case 'day':
              slotEnd = slotStart.add(1, 'day');
              break;
            case 'week':
              slotEnd = slotStart.add(1, 'week');
              break;
            case 'month':
              slotEnd = slotStart.add(1, 'month');
              break;
            default:
              slotEnd = dayjs(slotStart); // Should not happen with defined units
          }

          // Check if event overlaps with this slot using dayjs methods
          if (eventStart.isBefore(slotEnd) && eventEnd.isAfter(slotStart)) {
            const slotKey = formatDate(slotStart); // slotStart is a dayjs object

            // Calculate overlap duration in hours using dayjs diff
            const overlapStart = eventStart.isAfter(slotStart) ? eventStart : slotStart;
            const overlapEnd = eventEnd.isBefore(slotEnd) ? eventEnd : slotEnd;
            const overlapHours = overlapEnd.diff(overlapStart, 'hour', true); // Get difference in hours as a float

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
              overlapHours: overlapHours.toFixed(1) // Format overlap hours for display
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
        // Ensure no division by zero if maxCapacity is 0 (though unlikely with these units)
        const utilizationPercent = maxCapacity > 0 ? Math.min(100, Math.round((data.utilization / maxCapacity) * 100)) : 0;
        const maintenancePercent = maxCapacity > 0 ? Math.min(100, Math.round((data.maintenance / maxCapacity) * 100)) : 0;
        const brokenPercent = maxCapacity > 0 ? Math.min(100, Math.round((data.broken / maxCapacity) * 100)) : 0;
        const totalPercent = maxCapacity > 0 ? Math.min(100, Math.round((data.total / maxCapacity) * 100)) : 0;


        heatmapData.push({
          resource: resource.title,
          resourceId: resource.id,
          timeSlot: slotKey, // This is the formatted string
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
       const totalUtilizationForForecast = Object.values(resourceData.timeSlots).reduce((sum, data) => sum + data.utilization, 0);
       const totalTotalForForecast = Object.values(resourceData.timeSlots).reduce((sum, data) => sum + data.total, 0);
       const availableHoursForForecast = timeSlots.length * hoursPerSlot[timeUnit];

      forecastData.push({
        resource: resource.title,
        resourceId: resource.id,
        current: totalTotalForForecast,
        projected: totalTotalForForecast * 1.15, // Example 15% growth
        availableHours: availableHoursForForecast,
        utilizationRate: availableHoursForForecast > 0 ? Math.round((totalUtilizationForForecast / availableHoursForForecast) * 100) : 0
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

      const peakUtilization = Math.max(
          0, // Ensure minimum peak is 0
          ...Object.values(resourceData.timeSlots).map(data =>
            maxCapacityHours > 0 ? Math.round((data.total / maxCapacityHours) * 100) : 0
          )
        );

      const highUtilizationSlotsCount = Object.values(resourceData.timeSlots).filter(
         data => maxCapacityHours > 0 && data.total > 0.8 * hoursPerSlot[timeUnit]
      ).length;

      const bottleneckScore = (maxCapacityHours > 0 && timeSlots.length > 0) ?
        Math.round(
          (totalUtilizationHours / maxCapacityHours) * 70 + // 70% weight on utilization
          (highUtilizationSlotsCount / timeSlots.length) * 30 // 30% weight on frequency of high utilization
        ) : 0; // Handle cases with no capacity or time slots


      bottleneckData.push({
        resource: resource.title,
        resourceId: resource.id,
        utilizationHours: totalUtilizationHours.toFixed(1),
        maintenanceHours: totalMaintenanceHours.toFixed(1),
        brokenHours: totalBrokenHours.toFixed(1),
        totalHours: totalHours.toFixed(1),
        capacityHours: maxCapacityHours.toFixed(1),
        utilizationPercent: maxCapacityHours > 0 ? Math.round((totalUtilizationHours / maxCapacityHours) * 100) : 0,
        downtimePercent: maxCapacityHours > 0 ? Math.round(((totalMaintenanceHours + totalBrokenHours) / maxCapacityHours) * 100) : 0,
        peakUtilization: peakUtilization,
        // Calculate bottleneck score (0-100) - higher means more likely to be a bottleneck
        bottleneckScore: bottleneckScore
      });
    });

    // Sort bottlenecks by bottleneck score descending
    bottleneckData.sort((a, b) => b.bottleneckScore - a.bottleneckScore);

    setCapacityData({
      heatmap: heatmapData,
      forecast: forecastData,
      bottleneck: bottleneckData,
      timeSlots // Keep as dayjs objects here
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

  // Handle date range change - dates will be dayjs objects from Ant Design
  const handleDateRangeChange = (dates) => {
    // dates is typically [dayjs, dayjs] or [null, null]
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
        // Compare based on the original dayjs objects if available,
        // or try parsing the formatted string (less reliable)
        // Assuming timeSlots in capacityData are the original dayjs objects now:
        const dateA = capacityData.timeSlots.find(slot => formatDate(slot) === a.timeSlot);
        const dateB = capacityData.timeSlots.find(slot => formatDate(slot) === b.timeSlot);
        if (dateA && dateB) {
            return dateA.valueOf() - dateB.valueOf(); // Compare using dayjs valueOf
        }
         // Fallback to parsing formatted string if dayjs objects are not in capacityData
         try {
            const parsedDateA = dayjs(a.timeSlot, { strict: false }); // Non-strict parsing
            const parsedDateB = dayjs(b.timeSlot, { strict: false }); // Non-strict parsing
             if (parsedDateA.isValid() && parsedDateB.isValid()) {
                 return parsedDateA.valueOf() - parsedDateB.valueOf();
             }
         } catch (e) {
             console.error("Error parsing heatmap time slots for sorting:", e);
         }
        return 0; // Cannot sort
      });
    });


    // Get unique time slots for headers
    // Use the original dayjs objects from capacityData.timeSlots for reliable sorting
    const allTimeSlotsDayjs = capacityData.timeSlots || [];

    // Sort dayjs time slots chronologically
     allTimeSlotsDayjs.sort((a, b) => a.valueOf() - b.valueOf());


    return (
      <div className="heatmap-container">
        <div className="heatmap-header">
          <div className="heatmap-resource-header">Resource</div>
          {allTimeSlotsDayjs.map((slotDayjs, index) => {
              const slot = formatDate(slotDayjs); // Format for display
              return (
            <div key={index} className="heatmap-time-header">
              {timeUnit === 'hour' ? slot.split(' ')[3] + (slot.includes('PM') ? 'PM' : 'AM') :
               timeUnit === 'day' ? slot.split(',')[0] :
               timeUnit === 'week' ? `W${index + 1}` :
               slot}
            </div>
          )})}
        </div>

        <div className="heatmap-body">
          {Object.values(groupedData).map((resource, resourceIndex) => (
            <div key={resourceIndex} className="heatmap-row">
              <div className="heatmap-resource-cell">
                {resource.resource}
              </div>

              {allTimeSlotsDayjs.map((timeSlotDayjs, slotIndex) => {
                 const timeSlotFormatted = formatDate(timeSlotDayjs);
                 const slotData = resource.slots.find(s => s.timeSlot === timeSlotFormatted);


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
                        <p><strong>{resource.resource} - {timeSlotFormatted}</strong></p>
                        <p>Utilization: {slotData.utilizationHours}h ({slotData.utilizationPercent}%)</p>
                        <p>Maintenance: {slotData.maintenanceHours}h ({slotData.maintenancePercent}%)</p>
                        <p>Downtime: {slotData.brokenHours}h ({slotData.brokenPercent}%)</p>
                        <p>Total: {slotData.totalHours}h ({slotData.totalPercent}%)</p>
                        <p>Events: {slotData.events.length}</p>
                        <p>Max Capacity (per slot): {slotData.maxCapacity}h</p>
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
        sorter: (a, b) => a.resource.localeCompare(b.resource),
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
        render: (text, record) => {
             const projectedRate = record.availableHours > 0 ? Math.min(100, Math.round((record.projected / record.availableHours) * 100)) : 0;
             const status = record.projected > record.availableHours * 0.85 ? 'exception' : 'normal';
             return (
                <Space direction="vertical" size={0}>
                  <span>{record.projected.toFixed(1)} hours</span>
                  <Progress
                    percent={projectedRate}
                    size="small"
                    status={status}
                  />
                </Space>
            );
        },
        sorter: (a, b) => a.projected - b.projected,
      },
      {
        title: 'Available Capacity',
        dataIndex: 'availableHours',
        key: 'availableHours',
        render: hours => `${hours.toFixed(1)} hours`,
        sorter: (a, b) => a.availableHours - b.availableHours,
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
          const projectedRate = record.availableHours > 0 ? Math.round((record.projected / record.availableHours) * 100) : 0;

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
              scroll={{ x: 'max-content' }} // Add horizontal scroll for smaller screens
            />
          </Col>

          <Col span={24}>
            <Card title="Capacity Forecast Insights">
              <Row gutter={16}>
                <Col xs={24} sm={12} md={8}>
                  <Statistic
                    title="Average Utilization"
                    value={capacityData.forecast.length > 0 ? Math.round(
                      capacityData.forecast.reduce((sum, item) => sum + item.utilizationRate, 0) /
                      capacityData.forecast.length
                    ) : 0}
                    suffix="%"
                    valueStyle={{ color: '#1890ff' }}
                  />
                </Col>
                <Col xs={24} sm={12} md={8}>
                  <Statistic
                    title="Resources at Risk"
                    value={capacityData.forecast.filter(item =>
                      item.availableHours > 0 && Math.round((item.projected / item.availableHours) * 100) > 85
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
        sorter: (a, b) => a.resource.localeCompare(b.resource),
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
              scroll={{ x: 'max-content' }} // Add horizontal scroll for smaller screens
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
                    value={dateRange} // dateRange now contains dayjs objects or null
                    onChange={handleDateRangeChange} // This will receive dayjs objects
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
