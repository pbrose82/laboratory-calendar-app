import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Card, Row, Col, Select, Button, Typography, Spin, Alert, 
  Table, Statistic, Tag, Space, Divider, Progress, Dropdown, Menu,
  Tooltip, List, Badge, Rate, Tabs, Empty, Avatar, DatePicker
} from 'antd';
import {
  BarChartOutlined, PieChartOutlined, CalendarOutlined, DollarOutlined,
  CheckCircleOutlined, ExclamationOutlined, CloseCircleOutlined,
  DownloadOutlined, FileExcelOutlined, FilePdfOutlined, ClockCircleOutlined,
  BulbOutlined, AimOutlined, BankOutlined, RiseOutlined, FallOutlined,
  TeamOutlined, SettingOutlined, UserOutlined, LikeOutlined, WarningOutlined,
  RocketOutlined, InfoCircleOutlined, TrophyOutlined, ToolOutlined, EyeOutlined,
  AppstoreOutlined, AreaChartOutlined, SyncOutlined, PartitionOutlined
} from '@ant-design/icons';
import { fetchTenant } from '../services/apiClient';
import './Analytics.css';

const { Option } = Select;
const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;
const { RangePicker } = DatePicker;

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
  
  // Active tab for report sections
  const [activeTab, setActiveTab] = useState('overview');
  
  // Custom date range
  const [customDateRange, setCustomDateRange] = useState(null);
  
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
        console.log('Analytics - setting resources and events');
        setResources(tenantData.resources || []);
        setEvents(tenantData.events || []);
        
        if (!tenantName) {
          setTenantName(tenantData.name || tenantId);
        }
        
        if (process.env.NODE_ENV === 'development') {
          console.log('Analytics data refreshed at', new Date().toLocaleTimeString());
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
  
  // Set up automatic background refresh - using 30 seconds interval for consistency
  useEffect(() => {
    // Refresh data every 30 seconds
    const refreshInterval = setInterval(() => {
      if (isMounted.current) {
        console.log('Analytics - triggering background refresh');
        loadTenantData(false);
      }
    }, 30000);
    
    // Clean up interval on component unmount
    return () => {
      clearInterval(refreshInterval);
    };
  }, [tenantId]);

  // Get events within the selected time range
  const getFilteredEvents = () => {
    if (!events || events.length === 0) {
      return [];
    }
    
    const now = new Date();
    let rangeStart;
    
    // Handle custom date range
    if (timeRange === 'custom' && customDateRange && customDateRange.length === 2) {
      const [start, end] = customDateRange;
      return events.filter(event => {
        try {
          const eventDate = new Date(event.start);
          return eventDate >= start.startOf('day').toDate() && 
                 eventDate <= end.endOf('day').toDate();
        } catch (e) {
          console.error('Error parsing event date:', e, event);
          return false;
        }
      });
    }
    
    // Handle predefined ranges
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

  // Get the total time period in hours for the selected range
  const getTotalTimePeriodHours = () => {
    // Handle custom date range
    if (timeRange === 'custom' && customDateRange && customDateRange.length === 2) {
      const [start, end] = customDateRange;
      const diffHours = end.diff(start, 'hours');
      return diffHours > 0 ? diffHours : 24; // Minimum 1 day
    }
    
    // Handle predefined ranges
    switch (timeRange) {
      case '7days': return 7 * 24;
      case '30days': return 30 * 24;
      case '90days': return 90 * 24;
      case '12months': return 365 * 24;
      default: return 30 * 24;
    }
  };
  
  // Get number of days in the selected time range
  const getTimeRangeDays = () => {
    // Handle custom date range
    if (timeRange === 'custom' && customDateRange && customDateRange.length === 2) {
      const [start, end] = customDateRange;
      const diffDays = end.diff(start, 'days');
      return diffDays > 0 ? diffDays : 1; // Minimum 1 day
    }
    
    // Handle predefined ranges
    switch (timeRange) {
      case '7days': return 7;
      case '30days': return 30;
      case '90days': return 90;
      case '12months': return 365;
      default: return 30;
    }
  };

  // Calculate equipment utilization with idle time, uptime and downtime percentages
  const calculateEquipmentUtilization = () => {
    if (!resources || resources.length === 0) {
      return [];
    }
    
    const filteredEvents = getFilteredEvents();
    const totalPeriodHours = getTotalTimePeriodHours();
    
    if (filteredEvents.length === 0) {
      return resources.map(resource => ({
        name: resource.title,
        id: resource.id,
        count: 0,
        utilizationHours: 0,
        maintenanceHours: 0,
        brokenHours: 0,
        idleHours: totalPeriodHours, // All hours are idle if no events
        uptimePercent: 100, // Everything is up when no events (assume available)
        downtimePercent: 0,
        totalCost: 0,
        avgCost: 0,
        utilizationCount: 0,
        maintenanceCount: 0,
        brokenCount: 0,
        location: resource.location || 'Unknown'
      }));
    }
    
    const utilization = resources.map(resource => {
      const resourceEvents = filteredEvents.filter(event => 
        event.resourceId === resource.id || 
        event.equipment === resource.title
      );
      
      // Calculate purpose counts and hours
      const utilizationEvents = resourceEvents.filter(e => (e.purpose || 'Utilization') === 'Utilization');
      const maintenanceEvents = resourceEvents.filter(e => e.purpose === 'Maintenance');
      const brokenEvents = resourceEvents.filter(e => e.purpose === 'Broken');
      
      // Calculate hours for each category by summing event durations
      const calculateHours = (eventList) => {
        return eventList.reduce((total, event) => {
          const start = new Date(event.start);
          const end = new Date(event.end || event.start);
          const durationHours = (end - start) / (1000 * 60 * 60); // Convert milliseconds to hours
          return total + (isNaN(durationHours) ? 0 : durationHours);
        }, 0);
      };
      
      const utilizationHours = calculateHours(utilizationEvents);
      const maintenanceHours = calculateHours(maintenanceEvents);
      const brokenHours = calculateHours(brokenEvents);
      
      // Calculate idle time
      const occupiedHours = utilizationHours + maintenanceHours + brokenHours;
      const idleHours = Math.max(0, totalPeriodHours - occupiedHours);
      
      // Calculate uptime and downtime percentages
      const uptimeHours = utilizationHours + idleHours;
      const downtimeHours = maintenanceHours + brokenHours;
      
      const uptimePercent = Math.round((uptimeHours / totalPeriodHours) * 100);
      const downtimePercent = Math.round((downtimeHours / totalPeriodHours) * 100);
      
      // Calculate cost metrics
      const totalCost = resourceEvents.reduce((sum, event) => sum + (Number(event.cost) || 0), 0);
      const avgCost = resourceEvents.length > 0 ? totalCost / resourceEvents.length : 0;
      
      // Find most common location
      const locationCounts = {};
      resourceEvents.forEach(event => {
        const location = event.location || 'Unknown';
        locationCounts[location] = (locationCounts[location] || 0) + 1;
      });
      
      let mostCommonLocation = resource.location || 'Unknown';
      let maxCount = 0;
      
      Object.entries(locationCounts).forEach(([location, count]) => {
        if (count > maxCount) {
          maxCount = count;
          mostCommonLocation = location;
        }
      });
      
      return {
        name: resource.title || 'Unknown Equipment',
        id: resource.id,
        count: resourceEvents.length,
        utilization: filteredEvents.length > 0 ? 
          Math.round((resourceEvents.length / filteredEvents.length) * 100) : 0,
        utilizationHours: Math.round(utilizationHours * 100) / 100, // Round to 2 decimal places
        maintenanceHours: Math.round(maintenanceHours * 100) / 100,
        brokenHours: Math.round(brokenHours * 100) / 100,
        idleHours: Math.round(idleHours * 100) / 100,
        uptimePercent: uptimePercent,
        downtimePercent: downtimePercent,
        totalCost: totalCost,
        avgCost: avgCost,
        utilizationCount: utilizationEvents.length,
        maintenanceCount: maintenanceEvents.length,
        brokenCount: brokenEvents.length,
        location: mostCommonLocation
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
        total: 0
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
    const technicianHours = {};
    const technicianPurpose = {};
    
    filteredEvents.forEach(event => {
      if (event.technician) {
        // Count events
        if (technicianCounts[event.technician]) {
          technicianCounts[event.technician]++;
          technicianCosts[event.technician] += (Number(event.cost) || 0);
        } else {
          technicianCounts[event.technician] = 1;
          technicianCosts[event.technician] = (Number(event.cost) || 0);
          technicianPurpose[event.technician] = {
            utilization: 0,
            maintenance: 0,
            broken: 0
          };
          technicianHours[event.technician] = 0;
        }
        
        // Track purpose
        const purpose = event.purpose || 'Utilization';
        technicianPurpose[event.technician][purpose.toLowerCase()]++;
        
        // Track hours
        const start = new Date(event.start);
        const end = new Date(event.end || event.start);
        const durationHours = (end - start) / (1000 * 60 * 60);
        technicianHours[event.technician] += (isNaN(durationHours) ? 0 : durationHours);
      }
    });
    
    return Object.entries(technicianCounts)
      .map(([name, count]) => ({ 
        name,
        count,
        totalCost: technicianCosts[name],
        avgCost: Math.round(technicianCosts[name] / count),
        totalHours: Math.round(technicianHours[name] * 10) / 10,
        costPerHour: technicianHours[name] > 0 ? 
          Math.round((technicianCosts[name] / technicianHours[name]) * 10) / 10 : 0,
        purpose: technicianPurpose[name]
      }))
      .sort((a, b) => b.count - a.count);
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
          console.error('Error parsing event date:', e, event);
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

  // Calculate total hours for all equipment combined
  const calculateTotalHours = () => {
    const equipment = calculateEquipmentUtilization();
    const totalHours = {
      utilizationHours: 0,
      maintenanceHours: 0,
      brokenHours: 0,
      idleHours: 0,
      totalHours: 0
    };
    
    equipment.forEach(item => {
      totalHours.utilizationHours += item.utilizationHours;
      totalHours.maintenanceHours += item.maintenanceHours;
      totalHours.brokenHours += item.brokenHours;
      totalHours.idleHours += item.idleHours;
    });
    
    totalHours.totalHours = totalHours.utilizationHours + totalHours.maintenanceHours + 
                           totalHours.brokenHours + totalHours.idleHours;
    
    // Calculate percentages
    if (totalHours.totalHours > 0) {
      totalHours.utilizationPercent = Math.round((totalHours.utilizationHours / totalHours.totalHours) * 100);
      totalHours.maintenancePercent = Math.round((totalHours.maintenanceHours / totalHours.totalHours) * 100);
      totalHours.brokenPercent = Math.round((totalHours.brokenHours / totalHours.totalHours) * 100);
      totalHours.idlePercent = Math.round((totalHours.idleHours / totalHours.totalHours) * 100);
      
      // Calculate uptime and downtime
      totalHours.uptimePercent = Math.round(((totalHours.utilizationHours + totalHours.idleHours) / totalHours.totalHours) * 100);
      totalHours.downtimePercent = Math.round(((totalHours.maintenanceHours + totalHours.brokenHours) / totalHours.totalHours) * 100);
    } else {
      totalHours.utilizationPercent = 0;
      totalHours.maintenancePercent = 0;
      totalHours.brokenPercent = 0;
      totalHours.idlePercent = 100;
      totalHours.uptimePercent = 100;
      totalHours.downtimePercent = 0;
    }
    
    return totalHours;
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

  // Format currency for display
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Format hours for display
  const formatHours = (hours) => {
    return `${Math.round(hours * 100) / 100} h`;
  };

  // Get purpose tag
  const getPurposeTag = (purpose) => {
    switch(purpose) {
      case 'Maintenance':
        return <Tag color="gold" icon={<ExclamationOutlined />}>Maintenance</Tag>;
      case 'Broken':
        return <Tag color="red" icon={<CloseCircleOutlined />}>Broken</Tag>;
      default:
        return <Tag color="blue" icon={<CheckCircleOutlined />}>Utilization</Tag>;
    }
  };

  // Generate exported CSV content from data
  const generateCSV = (data, columns) => {
    // Create header row
    const header = columns.map(col => col.title || col.key || '').join(',');
    
    // Create data rows
    const rows = data.map(record => {
      return columns.map(col => {
        // Handle column render functions for custom formatting
        if (col.render) {
          const value = col.dataIndex ? record[col.dataIndex] : record;
          // Remove HTML tags from rendered content
          const renderedValue = col.render(value, record, 0);
          return typeof renderedValue === 'object' ? 'N/A' : renderedValue;
        } else if (col.dataIndex) {
          return record[col.dataIndex] || '';
        } else if (col.key && record[col.key]) {
          return record[col.key] || '';
        }
        return '';
      }).join(',');
    }).join('\n');
    
    return `${header}\n${rows}`;
  };

  // Export equipment utilization data to CSV
  const exportEquipmentCSV = () => {
    const data = calculateEquipmentUtilization();
    const columns = [
      { title: 'Equipment', dataIndex: 'name' },
      { title: 'Utilization Hours', dataIndex: 'utilizationHours' },
      { title: 'Maintenance Hours', dataIndex: 'maintenanceHours' },
      { title: 'Broken Hours', dataIndex: 'brokenHours' },
      { title: 'Idle Hours', dataIndex: 'idleHours' },
      { title: 'Uptime %', dataIndex: 'uptimePercent' },
      { title: 'Downtime %', dataIndex: 'downtimePercent' },
      { title: 'Total Cost', key: 'totalCost', render: (value) => formatCurrency(value) }
    ];
    
    const csvContent = generateCSV(data, columns);
    downloadCSV(csvContent, `equipment-utilization-${timeRange}.csv`);
  };

  // Export technician data to CSV
  const exportTechnicianCSV = () => {
    const data = getTopTechnicians();
    const columns = [
      { title: 'Technician', dataIndex: 'name' },
      { title: 'Reservations', dataIndex: 'count' },
      { title: 'Total Cost', key: 'totalCost', render: (value) => formatCurrency(value) },
      { title: 'Avg Cost/Event', key: 'avgCost', render: (value) => formatCurrency(value) }
    ];
    
    const csvContent = generateCSV(data, columns);
    downloadCSV(csvContent, `technician-data-${timeRange}.csv`);
  };

  // Export monthly trends to CSV
  const exportMonthlyCSV = () => {
    const data = getMonthlyEventCounts();
    const columns = [
      { title: 'Month', key: 'month', render: (_, record) => `${record.name} ${record.year}` },
      { title: 'Reservations', dataIndex: 'count' },
      { title: 'Total Cost', key: 'cost', render: (value) => formatCurrency(value) }
    ];
    
    const csvContent = generateCSV(data, columns);
    downloadCSV(csvContent, `monthly-trends-${timeRange}.csv`);
  };

  // Export recent events to CSV
  const exportEventsCSV = () => {
    const data = getFilteredEvents();
    const columns = [
      { title: 'Date', key: 'date', render: (_, record) => new Date(record.start).toLocaleDateString() },
      { title: 'Title', dataIndex: 'title' },
      { title: 'Equipment', key: 'equipment', render: (_, record) => record.equipment || resources.find(r => r.id === record.resourceId)?.title || 'Unknown' },
      { title: 'Purpose', key: 'purpose', render: (_, record) => record.purpose || 'Utilization' },
      { title: 'Cost', key: 'cost', render: (_, record) => formatCurrency(record.cost || 0) }
    ];
    
    const csvContent = generateCSV(data, columns);
    downloadCSV(csvContent, `events-${timeRange}.csv`);
  };

  // Helper to download CSV file
  const downloadCSV = (csvContent, filename) => {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ADVANCED ANALYTICS FUNCTIONS

  // Calculate ROI metrics
  const calculateROI = () => {
    const filteredEvents = getFilteredEvents();
    const totalHoursObj = calculateTotalHours();
    
    if (filteredEvents.length === 0) {
      return {
        totalCost: 0,
        averageRatePerHour: 0,
        utilizationRevenue: 0,
        totalRevenue: 0,
        totalProfit: 0,
        roi: 0,
        paybackPeriodDays: 0,
        costSavings: 0
      };
    }
    
    // Get equipment costs
    const equipmentCosts = {};
    resources.forEach(resource => {
      // Default hourly rate for equipment if not specified
      const hourlyRate = resource.hourlyRate || 100; 
      const acquisitionCost = resource.acquisitionCost || 50000;
      const maintenanceCost = resource.maintenanceCost || 5000;
      
      equipmentCosts[resource.id] = {
        hourlyRate,
        acquisitionCost,
        maintenanceCost
      };
    });
    
    // Calculate total revenue based on utilization hours
    let totalRevenue = 0;
    let costSavings = 0;
    
    // Calculate revenue for each equipment
    const equipmentUtilization = calculateEquipmentUtilization();
    equipmentUtilization.forEach(equipment => {
      const equipmentCost = equipmentCosts[equipment.id] || {
        hourlyRate: 100,
        acquisitionCost: 50000,
        maintenanceCost: 5000
      };
      
      // Calculate revenue from actual utilization
      const revenue = equipment.utilizationHours * equipmentCost.hourlyRate;
      totalRevenue += revenue;
      
      // Calculate potential revenue if equipment was utilized at 85% (excluding maintenance and broken time)
      const potentialHours = getTotalTimePeriodHours() * 0.85;
      const actualUtilizationHours = equipment.utilizationHours;
      
      // Calculate cost of outsourcing the additional utilized hours
      const externalServiceRate = equipmentCost.hourlyRate * 1.5; // External service costs 50% more
      costSavings += actualUtilizationHours * (externalServiceRate - equipmentCost.hourlyRate);
    });
    
    // Calculate total costs
    const totalCost = filteredEvents.reduce((sum, event) => {
      return sum + (Number(event.cost) || 0);
    }, 0);
    
    // Add fixed costs (approximation)
    const fixedCosts = resources.reduce((sum, resource) => {
      const equipmentCost = equipmentCosts[resource.id] || {
        maintenanceCost: 5000
      };
      // Calculate prorated maintenance cost for the time period
      const days = getTimeRangeDays();
      const yearFraction = days / 365;
      return sum + (equipmentCost.maintenanceCost * yearFraction);
    }, 0);
    
    const adjustedTotalCost = totalCost + fixedCosts;
    
    // Calculate profit
    const totalProfit = totalRevenue - adjustedTotalCost;
    
    // Calculate ROI
    const roi = adjustedTotalCost > 0 ? (totalProfit / adjustedTotalCost) * 100 : 0;
    
    // Calculate average rate per hour
    const totalUtilizationHours = totalHoursObj.utilizationHours || 1; // Avoid division by zero
    const averageRatePerHour = totalRevenue / totalUtilizationHours;
    
    // Calculate payback period (days) based on acquisition costs
    const totalAcquisitionCost = resources.reduce((sum, resource) => {
      const equipmentCost = equipmentCosts[resource.id] || {
        acquisitionCost: 50000
      };
      return sum + equipmentCost.acquisitionCost;
    }, 0);
    
    // Daily profit
    const dailyProfit = totalProfit / getTimeRangeDays();
    const paybackPeriodDays = dailyProfit > 0 ? Math.round(totalAcquisitionCost / dailyProfit) : 9999;
    
    return {
      totalCost: adjustedTotalCost,
      averageRatePerHour,
      utilizationRevenue: totalRevenue,
      totalRevenue,
      totalProfit,
      roi,
      paybackPeriodDays,
      costSavings
    };
  };

  // Get utilization targets
  const getUtilizationTargets = () => {
    // In a real implementation, these would come from the database or user settings
    const targets = {
      overall: 80, // 80% overall utilization target
      equipment: {
        // Equipment-specific targets
        // Default to 75% if not specified
        default: 75
      },
      departments: {
        // Department-specific targets
        'R&D': 85,
        'QA': 80,
        'Manufacturing': 90,
        default: 75
      }
    };
    
    // Get equipment-specific targets
    resources.forEach(resource => {
      // Set target based on equipment type or role
      if (resource.title && (resource.title.includes('GCMS') || resource.title.includes('HPLC'))) {
        targets.equipment[resource.id] = 85; // Higher targets for expensive analytical equipment
      } else if (resource.title && resource.title.includes('Microscope')) {
        targets.equipment[resource.id] = 70; // Lower targets for shared basic equipment
      } else {
        targets.equipment[resource.id] = targets.equipment.default;
      }
    });
    
    return targets;
  };

  // Calculate performance vs targets
  const calculateTargetPerformance = () => {
    const targets = getUtilizationTargets();
    const equipment = calculateEquipmentUtilization();
    
    const performanceData = equipment.map(item => {
      const target = targets.equipment[item.id] || targets.equipment.default;
      const utilizationPercent = Math.round((item.utilizationHours / getTotalTimePeriodHours()) * 100);
      
      return {
        ...item,
        targetUtilization: target,
        actualUtilization: utilizationPercent,
        gap: utilizationPercent - target,
        status: 
          utilizationPercent >= target ? 'above' :
          utilizationPercent >= target * 0.9 ? 'close' : 'below',
        improvement: item.count > 0 ? 
          Math.round((utilizationPercent / (targets.equipment.default * 0.8)) * 100) : 0
      };
    });
    
    // Calculate overall performance
    const totalHoursObj = calculateTotalHours();
    const overallUtilizationPercent = Math.round((totalHoursObj.utilizationHours / totalHoursObj.totalHours) * 100);
    
    const overallPerformance = {
      targetUtilization: targets.overall,
      actualUtilization: overallUtilizationPercent,
      gap: overallUtilizationPercent - targets.overall,
      status: 
        overallUtilizationPercent >= targets.overall ? 'above' :
        overallUtilizationPercent >= targets.overall * 0.9 ? 'close' : 'below'
    };
    
    return {
      equipment: performanceData,
      overall: overallPerformance
    };
  };

  // Calculate department comparisons
  const calculateDepartmentComparisons = () => {
    // In a real implementation, departments would be fetched from the database
    // For demo purposes, we'll infer departments from locations or other properties
    
    const departments = [
      { id: 1, name: 'R&D', locations: ['R&D', 'Laboratory A1', 'Laboratory Center'] },
      { id: 2, name: 'QA', locations: ['Cupboard Lab A1', 'Shelf A1'] },
      { id: 3, name: 'Manufacturing', locations: ['Manufacturing Plant'] },
      { id: 4, name: 'Research', locations: ['Cupboard A', 'Cupboard B'] },
      { id: 5, name: 'External', locations: ['Isidora Co loc 1', 'Test Location'] },
    ];
    
    const filteredEvents = getFilteredEvents();
    
    // Initialize department data
    const departmentData = departments.map(dept => ({
      ...dept,
      eventCount: 0,
      utilizationHours: 0,
      maintenanceHours: 0,
      brokenHours: 0,
      totalHours: 0,
      equipmentCount: 0,
      utilizationPercent: 0,
      resourceEfficiency: 0,
      costPerHour: 0,
      totalCost: 0,
      uniqueUsers: new Set()
    }));
    
    // Assign events to departments based on location
    filteredEvents.forEach(event => {
      // Get the location
      const location = event.location || '';
      
      // Find matching department
      const departmentIndex = departmentData.findIndex(dept => 
        dept.locations.some(loc => location.includes(loc))
      );
      
      if (departmentIndex >= 0) {
        const department = departmentData[departmentIndex];
        
        // Calculate event duration
        const start = new Date(event.start);
        const end = new Date(event.end || event.start);
        const durationHours = (end - start) / (1000 * 60 * 60);
        
        // Update department metrics
        department.eventCount++;
        
        if (event.purpose === 'Maintenance') {
          department.maintenanceHours += durationHours;
        } else if (event.purpose === 'Broken') {
          department.brokenHours += durationHours;
        } else {
          department.utilizationHours += durationHours;
        }
        
        department.totalHours += durationHours;
        department.totalCost += (Number(event.cost) || 0);
        
        // Track unique equipment
        const resourceId = event.resourceId || event.equipment;
        if (resourceId && !department.uniqueEquipment) {
          department.uniqueEquipment = new Set();
        }
        if (resourceId) {
          department.uniqueEquipment.add(resourceId);
        }
        
        // Track unique users
        if (event.technician) {
          department.uniqueUsers.add(event.technician);
        }
      }
    });
    
    // Calculate derived metrics for each department
    departmentData.forEach(dept => {
      // Convert sets to counts
      dept.equipmentCount = dept.uniqueEquipment ? dept.uniqueEquipment.size : 0;
      dept.userCount = dept.uniqueUsers.size;
      
      // Clean up sets (not needed in final output)
      delete dept.uniqueEquipment;
      delete dept.uniqueUsers;
      
      // Calculate utilization percentage
      dept.utilizationPercent = dept.totalHours > 0 
        ? Math.round((dept.utilizationHours / dept.totalHours) * 100) 
        : 0;
      
      // Calculate resource efficiency (events per equipment)
      dept.resourceEfficiency = dept.equipmentCount > 0 
        ? Math.round((dept.eventCount / dept.equipmentCount) * 10) / 10 
        : 0;
      
      // Calculate cost per hour
      dept.costPerHour = dept.utilizationHours > 0 
        ? Math.round((dept.totalCost / dept.utilizationHours) * 100) / 100 
        : 0;
      
      // Round hours to 2 decimal places
      dept.utilizationHours = Math.round(dept.utilizationHours * 100) / 100;
      dept.maintenanceHours = Math.round(dept.maintenanceHours * 100) / 100;
      dept.brokenHours = Math.round(dept.brokenHours * 100) / 100;
      dept.totalHours = Math.round(dept.totalHours * 100) / 100;
    });
    
    // Sort departments by utilization hours (descending)
    return departmentData.sort((a, b) => b.utilizationHours - a.utilizationHours);
  };

  // Analyze time distribution of equipment usage
  const analyzeTimeDistribution = () => {
    const filteredEvents = getFilteredEvents();
    
    if (filteredEvents.length === 0) {
      return {
        morning: 0,
        afternoon: 0,
        evening: 0
      };
    }
    
    // Count events by time of day
    let morning = 0; // 6:00 - 12:00
    let afternoon = 0; // 12:00 - 18:00
    let evening = 0; // 18:00 - 24:00
    
    filteredEvents.forEach(event => {
      try {
        const startDate = new Date(event.start);
        const hour = startDate.getHours();
        
        if (hour >= 6 && hour < 12) {
          morning++;
        } else if (hour >= 12 && hour < 18) {
          afternoon++;
        } else {
          evening++;
        }
      } catch (e) {
        console.error('Error parsing event date:', e, event);
      }
    });
    
    return {
      morning,
      afternoon,
      evening,
      total: morning + afternoon + evening
    };
  };

  // Generate optimization recommendations
  const generateOptimizationRecommendations = () => {
    const equipment = calculateEquipmentUtilization();
    const targetPerformance = calculateTargetPerformance();
    const departmentComparisons = calculateDepartmentComparisons();
    const roiData = calculateROI();
    
    // Initialize recommendations array
    const recommendations = [];
    
    // 1. Identify underutilized equipment (utilization < 30%)
    const underutilizedEquipment = equipment
      .filter(item => (item.utilizationHours / getTotalTimePeriodHours()) * 100 < 30)
      .sort((a, b) => a.utilizationHours - b.utilizationHours);
    
    if (underutilizedEquipment.length > 0) {
      recommendations.push({
        id: 'under-utilization',
        type: 'warning',
        priority: 'high',
        title: 'Underutilized Equipment',
        description: `${underutilizedEquipment.length} pieces of equipment are utilized less than 30% of available time.`,
        details: `Consider consolidating usage or repurposing: ${underutilizedEquipment.slice(0, 3).map(e => e.name).join(', ')}${underutilizedEquipment.length > 3 ? '...' : ''}`,
        impact: 'High cost savings potential',
        savings: formatCurrency(underutilizedEquipment.reduce((sum, item) => sum + (item.avgCost || 0) * 10, 0))
      });
    }
    
    // 2. Identify equipment with high maintenance hours (> 15%)
    const highMaintenanceEquipment = equipment
      .filter(item => (item.maintenanceHours / getTotalTimePeriodHours()) * 100 > 15)
      .sort((a, b) => b.maintenanceHours - a.maintenanceHours);
    
    if (highMaintenanceEquipment.length > 0) {
      recommendations.push({
        id: 'high-maintenance',
        type: 'alert',
        priority: 'medium',
        title: 'High Maintenance Equipment',
        description: `${highMaintenanceEquipment.length} pieces of equipment require excessive maintenance.`,
        details: `Consider service contracts or replacement: ${highMaintenanceEquipment.slice(0, 3).map(e => e.name).join(', ')}`,
        impact: 'Reduces downtime and increases availability',
        savings: formatCurrency(highMaintenanceEquipment.reduce((sum, item) => sum + item.maintenanceHours * 150, 0))
      });
    }
    
    // 3. Analyze department utilization imbalances
    const departmentUtilization = departmentComparisons.map(dept => ({
      name: dept.name,
      utilizationPercent: dept.utilizationPercent
    }));
    
    const validDepartments = departmentUtilization.filter(dept => dept.utilizationPercent > 0);
    
    if (validDepartments.length >= 2) {
      const maxUtilDept = validDepartments.reduce((max, dept) => 
        dept.utilizationPercent > max.utilizationPercent ? dept : max, 
        { utilizationPercent: 0 }
      );
      
      const minUtilDept = validDepartments.reduce((min, dept) => 
        (dept.utilizationPercent < min.utilizationPercent) ? dept : min, 
        { utilizationPercent: 100 }
      );
      
      if (maxUtilDept.utilizationPercent - minUtilDept.utilizationPercent > 30) {
        recommendations.push({
          id: 'dept-imbalance',
          type: 'info',
          priority: 'medium',
          title: 'Department Utilization Imbalance',
          description: `Significant imbalance between ${maxUtilDept.name} (${maxUtilDept.utilizationPercent}%) and ${minUtilDept.name} (${minUtilDept.utilizationPercent}%).`,
          details: 'Consider redistributing equipment or cross-department scheduling to balance utilization.',
          impact: 'Improved resource distribution and higher overall efficiency',
          savings: 'Variable'
        });
      }
    }
    
    // 4. Equipment clustering recommendation
    const locationDistribution = {};
    equipment.forEach(item => {
      const location = item.location || 'Unknown';
      if (!locationDistribution[location]) {
        locationDistribution[location] = {
          count: 0,
          utilizationHours: 0
        };
      }
      locationDistribution[location].count++;
      locationDistribution[location].utilizationHours += item.utilizationHours;
    });
    
    const locationsWithSingleEquipment = Object.entries(locationDistribution)
      .filter(([_, data]) => data.count === 1 && data.utilizationHours > 0)
      .map(([location]) => location);
    
    if (locationsWithSingleEquipment.length > 2) {
      recommendations.push({
        id: 'equipment-clustering',
        type: 'suggestion',
        priority: 'low',
        title: 'Equipment Clustering Opportunity',
        description: `${locationsWithSingleEquipment.length} locations have only a single piece of equipment.`,
        details: 'Consider centralizing equipment into fewer locations to improve accessibility and management.',
        impact: 'Reduced overhead and improved space utilization',
        savings: formatCurrency(locationsWithSingleEquipment.length * 5000)
      });
    }
    
    // 5. Scheduling optimization potential
    const timeDistribution = analyzeTimeDistribution();
    const hasSignificantTimeSkew = 
      (timeDistribution.morning > timeDistribution.afternoon * 2) || 
      (timeDistribution.afternoon > timeDistribution.morning * 2);
    
    if (hasSignificantTimeSkew) {
      const peakTime = timeDistribution.morning > timeDistribution.afternoon ? 'mornings' : 'afternoons';
      recommendations.push({
        id: 'schedule-optimization',
        type: 'suggestion',
        priority: 'medium',
        title: 'Scheduling Optimization',
        description: `Usage is heavily skewed toward ${peakTime}.`,
        details: 'Implement staggered scheduling to distribute equipment usage more evenly throughout the day.',
        impact: 'Increased equipment availability and reduced wait times',
        savings: 'Improved throughput (~15%)'
      });
    }
    
    // 6. ROI-based equipment investment recommendation
    if (roiData.roi > 50) {
      const highRoiEquipment = equipment
        .filter(item => (item.utilizationHours / getTotalTimePeriodHours()) * 100 > 75)
        .sort((a, b) => b.utilizationHours - a.utilizationHours);
      
      if (highRoiEquipment.length > 0) {
        recommendations.push({
          id: 'expansion-opportunity',
          type: 'opportunity',
          priority: 'high',
          title: 'Expansion Opportunity',
          description: `High ROI (${Math.round(roiData.roi)}%) justifies equipment investment.`,
          details: `Consider purchasing additional units of: ${highRoiEquipment.slice(0, 2).map(e => e.name).join(', ')}`,
          impact: 'Increased capacity and revenue generation',
          savings: 'Revenue potential: ' + formatCurrency(highRoiEquipment.reduce((sum, item) => sum + item.utilizationHours * 150, 0))
        });
      }
    }
    
    // 7. Cross-training recommendation
    const technicianData = getTopTechnicians();
    if (technicianData.length >= 2) {
      const hasUserImbalance = technicianData[0].count > (technicianData[technicianData.length - 1].count * 3);
      
      if (hasUserImbalance) {
        recommendations.push({
          id: 'cross-training',
          type: 'suggestion',
          priority: 'medium',
          title: 'Cross-Training Opportunity',
          description: 'Significant imbalance in equipment usage among technicians.',
          details: 'Implement cross-training program to distribute expertise and equipment usage more evenly.',
          impact: 'Reduced bottlenecks and dependency on key personnel',
          savings: 'Risk mitigation and improved flexibility'
        });
      }
    }
    
    // Sort recommendations by priority
    const priorityOrder = { 'high': 0, 'medium': 1, 'low': 2 };
    return recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  };

  // Calculate overall efficiency score (0-100)
  const calculateEfficiencyScore = () => {
    const totalHoursObj = calculateTotalHours();
    const targetPerformance = calculateTargetPerformance();
    const roiData = calculateROI();
    
    // Components of the score
    const utilizationScore = Math.min(100, (totalHoursObj.utilizationPercent / targetPerformance.overall.targetUtilization) * 80);
    const downtimeScore = Math.min(100, (100 - totalHoursObj.downtimePercent) / 95 * 90);
    const roiScore = Math.min(100, (roiData.roi / 40) * 70);
    
    // Weighted average
    const overallScore = Math.round(
      (utilizationScore * 0.5) +
      (downtimeScore * 0.3) +
      (roiScore * 0.2)
    );
    
    return Math.min(100, Math.max(0, overallScore));
  };

  // Export ROI data to CSV
  const exportROIData = () => {
    const roiData = calculateROI();
    const data = [
      {
        metric: 'Total Revenue',
        value: formatCurrency(roiData.utilizationRevenue)
      },
      {
        metric: 'Total Cost',
        value: formatCurrency(roiData.totalCost)
      },
      {
        metric: 'Net Profit',
        value: formatCurrency(roiData.totalProfit)
      },
      {
        metric: 'ROI',
        value: `${Math.round(roiData.roi * 10) / 10}%`
      },
      {
        metric: 'Average Rate Per Hour',
        value: formatCurrency(roiData.averageRatePerHour)
      },
      {
        metric: 'Cost Savings',
        value: formatCurrency(roiData.costSavings)
      },
      {
        metric: 'Payback Period',
        value: `${roiData.paybackPeriodDays} days`
      }
    ];
    
    const columns = [
      { title: 'Metric', dataIndex: 'metric' },
      { title: 'Value', dataIndex: 'value' }
    ];
    
    const csvContent = generateCSV(data, columns);
    downloadCSV(csvContent, `roi-analysis-${timeRange}.csv`);
  };

  // Export department data to CSV
  const exportDepartmentData = () => {
    const data = calculateDepartmentComparisons();
    const columns = [
      { title: 'Department', dataIndex: 'name' },
      { title: 'Equipment Count', dataIndex: 'equipmentCount' },
      { title: 'Reservations', dataIndex: 'eventCount' },
      { title: 'Utilization Hours', key: 'utilizationHours', render: (value) => formatHours(value) },
      { title: 'Maintenance Hours', key: 'maintenanceHours', render: (value) => formatHours(value) },
      { title: 'Broken Hours', key: 'brokenHours', render: (value) => formatHours(value) },
      { title: 'Utilization %', key: 'utilizationPercent', render: (value) => `${value}%` },
      { title: 'Resource Efficiency', dataIndex: 'resourceEfficiency' },
      { title: 'Cost/Hour', key: 'costPerHour', render: (value) => formatCurrency(value) },
      { title: 'Total Cost', key: 'totalCost', render: (value) => formatCurrency(value) }
    ];
    
    const csvContent = generateCSV(data, columns);
    downloadCSV(csvContent, `department-comparison-${timeRange}.csv`);
  };

  // Export optimization recommendations to CSV
  const exportRecommendationsData = () => {
    const data = generateOptimizationRecommendations();
    const columns = [
      { title: 'Priority', dataIndex: 'priority' },
      { title: 'Recommendation', dataIndex: 'title' },
      { title: 'Description', dataIndex: 'description' },
      { title: 'Details', dataIndex: 'details' },
      { title: 'Impact', dataIndex: 'impact' },
      { title: 'Potential Value', dataIndex: 'savings' }
    ];
    
    const csvContent = generateCSV(data, columns);
    downloadCSV(csvContent, `optimization-recommendations-${timeRange}.csv`);
  };

  // Export full analytics report to CSV - this was previously duplicated causing the build error
  const exportFullReport = () => {
    // Create a zip file with all reports
    // For simplicity, we'll just export all data separately
    exportEquipmentCSV();
    setTimeout(() => exportTechnicianCSV(), 500);
    setTimeout(() => exportMonthlyCSV(), 1000);
    setTimeout(() => exportEventsCSV(), 1500);
    setTimeout(() => exportROIData(), 2000);
    setTimeout(() => exportDepartmentData(), 2500);
    setTimeout(() => exportRecommendationsData(), 3000);
  };

  // Data for charts and tables
  const metrics = calculateMetrics();
  const equipmentUtilization = calculateEquipmentUtilization();
  const topTechnicians = getTopTechnicians();
  const monthlyEventCounts = getMonthlyEventCounts();
  const purposeBreakdown = calculatePurposeBreakdown();
  const costMetrics = calculateCostMetrics();
  const totalHours = calculateTotalHours();
  const roiData = calculateROI();
  const efficiencyScore = calculateEfficiencyScore();
  const departmentData = calculateDepartmentComparisons();
  const targetPerformance = calculateTargetPerformance();
  const recommendations = generateOptimizationRecommendations();

  // Table columns for Equipment Utilization
  const equipmentColumns = [
    {
      title: 'Equipment',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: 'Utilization [h]',
      dataIndex: 'utilizationHours',
      key: 'utilizationHours',
      render: (hours) => formatHours(hours),
      sorter: (a, b) => a.utilizationHours - b.utilizationHours,
    },
    {
      title: 'Maintenance [h]',
      dataIndex: 'maintenanceHours',
      key: 'maintenanceHours',
      render: (hours) => formatHours(hours),
      sorter: (a, b) => a.maintenanceHours - b.maintenanceHours,
    },
    {
      title: 'Broken [h]',
      dataIndex: 'brokenHours',
      key: 'brokenHours',
      render: (hours) => formatHours(hours),
      sorter: (a, b) => a.brokenHours - b.brokenHours,
    },
    {
      title: 'Idle [h]',
      dataIndex: 'idleHours',
      key: 'idleHours',
      render: (hours) => formatHours(hours),
      sorter: (a, b) => a.idleHours - b.idleHours,
    },
    {
      title: 'Uptime [%]',
      dataIndex: 'uptimePercent',
      key: 'uptimePercent',
      render: (percent) => `${percent}%`,
      sorter: (a, b) => a.uptimePercent - b.uptimePercent,
    },
    {
      title: 'Downtime [%]',
      dataIndex: 'downtimePercent',
      key: 'downtimePercent',
      render: (percent) => `${percent}%`,
      sorter: (a, b) => a.downtimePercent - b.downtimePercent,
    },
  ];

  // Table columns for Top Technicians
  const technicianColumns = [
    {
      title: 'Technician',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Reservations',
      dataIndex: 'count',
      key: 'count',
      sorter: (a, b) => a.count - b.count,
    },
    {
      title: 'Total Cost',
      key: 'totalCost',
      render: (_, record) => formatCurrency(record.totalCost),
      sorter: (a, b) => a.totalCost - b.totalCost,
    },
    {
      title: 'Avg Cost/Event',
      key: 'avgCost',
      render: (_, record) => formatCurrency(record.avgCost),
      sorter: (a, b) => a.avgCost - b.avgCost,
    },
  ];

  // Table columns for Monthly Trends
  const monthlyColumns = [
    {
      title: 'Month',
      key: 'month',
      render: (_, record) => `${record.name} ${record.year}`,
    },
    {
      title: 'Reservations',
      dataIndex: 'count',
      key: 'count',
      sorter: (a, b) => a.count - b.count,
    },
    {
      title: 'Total Cost',
      key: 'cost',
      render: (_, record) => formatCurrency(record.cost),
      sorter: (a, b) => a.cost - b.cost,
    },
    {
      title: 'Activity Trend',
      key: 'trend',
      render: (_, record) => (
        <Progress 
          percent={Math.min(record.count * 5, 100)} 
          size="small" 
          showInfo={false}
          strokeColor={record.count > 0 ? '#1890ff' : '#f0f0f0'}
          style={{ width: 150 }}
        />
      ),
    },
  ];

  // Table columns for Recent Reservations
  const recentEventsColumns = [
    {
      title: 'Date',
      key: 'date',
      render: (_, record) => new Date(record.start).toLocaleDateString(),
    },
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
    },
    {
      title: 'Equipment',
      key: 'equipment',
      render: (_, record) => record.equipment || resources.find(r => r.id === record.resourceId)?.title || 'Unknown',
    },
    {
      title: 'Purpose',
      key: 'purpose',
      render: (_, record) => getPurposeTag(record.purpose || 'Utilization'),
    },
    {
      title: 'Cost',
      key: 'cost',
      render: (_, record) => formatCurrency(record.cost || 0),
    },
  ];

  // Department table columns
  const departmentColumns = [
    {
      title: 'Department',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: 'Equipment',
      dataIndex: 'equipmentCount',
      key: 'equipmentCount',
      sorter: (a, b) => a.equipmentCount - b.equipmentCount,
    },
    {
      title: 'Reservations',
      dataIndex: 'eventCount',
      key: 'eventCount',
      sorter: (a, b) => a.eventCount - b.eventCount,
    },
    {
      title: 'Utilization [h]',
      key: 'utilizationHours',
      render: (_, record) => formatHours(record.utilizationHours),
      sorter: (a, b) => a.utilizationHours - b.utilizationHours,
    },
    {
      title: 'Utilization [%]',
      key: 'utilizationPercent',
      render: (_, record) => `${record.utilizationPercent}%`,
      sorter: (a, b) => a.utilizationPercent - b.utilizationPercent,
    },
    {
      title: 'Efficiency',
      dataIndex: 'resourceEfficiency',
      key: 'resourceEfficiency',
      sorter: (a, b) => a.resourceEfficiency - b.resourceEfficiency,
      render: (value) => value.toFixed(1),
    },
    {
      title: 'Cost/Hour',
      key: 'costPerHour',
      render: (_, record) => formatCurrency(record.costPerHour),
      sorter: (a, b) => a.costPerHour - b.costPerHour,
    },
  ];

  // Export menu 
  const exportMenu = (
    <Menu>
      <Menu.Item key="csv-equipment" onClick={exportEquipmentCSV}>
        <FileExcelOutlined /> Equipment Utilization
      </Menu.Item>
      <Menu.Item key="csv-technicians" onClick={exportTechnicianCSV}>
        <FileExcelOutlined /> Technician Data
      </Menu.Item>
      <Menu.Item key="csv-monthly" onClick={exportMonthlyCSV}>
        <FileExcelOutlined /> Monthly Trends
      </Menu.Item>
      <Menu.Item key="csv-events" onClick={exportEventsCSV}>
        <FileExcelOutlined /> Event Data
      </Menu.Item>
      <Menu.Divider />
      <Menu.Item key="csv-roi" onClick={exportROIData}>
        <FileExcelOutlined /> ROI Analysis
      </Menu.Item>
      <Menu.Item key="csv-departments" onClick={exportDepartmentData}>
        <FileExcelOutlined /> Department Comparison
      </Menu.Item>
      <Menu.Item key="csv-recommendations" onClick={exportRecommendationsData}>
        <FileExcelOutlined /> Optimization Recommendations
      </Menu.Item>
      <Menu.Divider />
      <Menu.Item key="csv-all" onClick={exportFullReport}>
        <FileExcelOutlined /> Export All Data
      </Menu.Item>
    </Menu>
  );

  return (
    <div className="analytics-container">
      <Card className="header-card">
        <div className="header-content">
          <Title level={3}>{getDisplayName()} - Equipment Utilization Report</Title>
          <div className="header-actions">
            <Dropdown overlay={exportMenu} placement="bottomRight">
              <Button icon={<DownloadOutlined />}>
                Export Reports
              </Button>
            </Dropdown>
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
      
      <Card className="filter-card">
        <div className="date-range-picker">
          <Text strong>Report Time Period:</Text>
          <Select 
            value={timeRange}
            onChange={(value) => {
              setTimeRange(value);
              if (value === 'custom') {
                // If 'custom' is selected, default to last 30 days custom range
                const end = new Date();
                const start = new Date();
                start.setDate(start.getDate() - 30);
                setCustomDateRange([start, end]);
              }
            }}
            style={{ width: 170 }}
          >
            <Option value="7days">Last 7 Days</Option>
            <Option value="30days">Last 30 Days</Option>
            <Option value="90days">Last 90 Days</Option>
            <Option value="12months">Last 12 Months</Option>
            <Option value="custom">Custom Range</Option>
          </Select>
          
          {timeRange === 'custom' && (
            <RangePicker 
              value={customDateRange}
              onChange={(dates) => setCustomDateRange(dates)}
              style={{ marginLeft: 16 }}
            />
          )}
        </div>
      </Card>
      
      {loading ? (
        <Card>
          <div className="loading-container">
            <Spin size="large" tip="Loading analytics data..." />
          </div>
        </Card>
      ) : error ? (
        <Card>
          <Alert
            message="Error Loading Analytics"
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
        <div className="analytics-content">
          {/* Tabbed Reports Interface */}
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            type="card"
            className="report-tabs"
            tabBarExtraContent={
              <Tooltip title="All metrics update automatically based on the selected time period">
                <InfoCircleOutlined style={{ marginRight: 16 }} />
              </Tooltip>
            }
          >
            {/* Tab 1: Overview */}
            <TabPane 
              tab={<span><AppstoreOutlined /> Overview</span>}
              key="overview"
            >
              {/* Overall Summary Stats */}
              <Row gutter={16} className="stats-row">
                <Col xs={24} sm={12} md={6}>
                  <Card>
                    <Statistic
                      title="Total Equipment"
                      value={resources.length}
                      prefix={<BarChartOutlined />}
                    />
                  </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Card>
                    <Statistic
                      title="Active Equipment"
                      value={equipmentUtilization.filter(e => e.count > 0).length}
                      suffix={`/ ${resources.length}`}
                    />
                  </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Card>
                    <Statistic
                      title="Uptime %"
                      value={totalHours.uptimePercent}
                      suffix="%"
                      valueStyle={{ color: totalHours.uptimePercent > 75 ? '#3f8600' : '#faad14' }}
                    />
                  </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Card>
                    <Statistic
                      title="Downtime %"
                      value={totalHours.downtimePercent}
                      suffix="%"
                      valueStyle={{ color: totalHours.downtimePercent < 25 ? '#3f8600' : '#f5222d' }}
                    />
                  </Card>
                </Col>
              </Row>

              {/* Efficiency Score */}
              <Card className="section-card">
                <Row gutter={16}>
                  <Col xs={24} md={12}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text strong>Overall Efficiency Score</Text>
                        <span style={{ fontWeight: 'bold', fontSize: '18px', color: 
                          efficiencyScore >= 80 ? '#3f8600' : 
                          efficiencyScore >= 60 ? '#1890ff' : 
                          efficiencyScore >= 40 ? '#faad14' : '#f5222d' 
                        }}>
                          {efficiencyScore}%
                        </span>
                      </div>
                      <Progress 
                        percent={efficiencyScore} 
                        strokeColor={{
                          '0%': '#f5222d',
                          '25%': '#faad14',
                          '50%': '#1890ff',
                          '75%': '#52c41a',
                          '100%': '#52c41a',
                        }}
                        status="active"
                      />
                      <Text type="secondary">Based on utilization rates, downtime, and ROI metrics</Text>
                    </div>
                  </Col>
                  
                  <Col xs={24} md={12}>
                    <Row gutter={[16, 16]} style={{ marginTop: 8 }}>
                      <Col span={8}>
                        <Statistic
                          title="Utilization"
                          value={`${totalHours.utilizationPercent}%`}
                          valueStyle={{ color: '#1890ff', fontSize: '16px' }}
                        />
                      </Col>
                      <Col span={8}>
                        <Statistic
                          title="Maintenance"
                          value={`${totalHours.maintenancePercent}%`}
                          valueStyle={{ color: '#faad14', fontSize: '16px' }}
                        />
                      </Col>
                      <Col span={8}>
                        <Statistic
                          title="Downtime"
                          value={`${totalHours.brokenPercent}%`}
                          valueStyle={{ color: '#f5222d', fontSize: '16px' }}
                        />
                      </Col>
                    </Row>
                  </Col>
                </Row>
              </Card>
              
              {/* Time Distribution Section */}
              <Card 
                title={<span><ClockCircleOutlined /> Equipment Time Distribution</span>}
                className="section-card"
                extra={
                  <Button icon={<FileExcelOutlined />} size="small" onClick={() => exportEquipmentCSV()}>
                    Export
                  </Button>
                }
              >
                <Row gutter={16}>
                  <Col xs={24} md={12}>
                    <Card bordered={false} className="hour-stats-card">
                      <Row gutter={16}>
                        <Col span={12}>
                          <Statistic
                            title="Total Utilization [h]"
                            value={formatHours(totalHours.utilizationHours)}
                            prefix={<BarChartOutlined style={{ color: '#1890ff' }} />}
                          />
                        </Col>
                        <Col span={12}>
                          <Statistic
                            title="Total Maintenance [h]"
                            value={formatHours(totalHours.maintenanceHours)}
                            prefix={<ExclamationOutlined style={{ color: '#faad14' }} />}
                          />
                        </Col>
                      </Row>
                      <Row gutter={16} style={{ marginTop: '20px' }}>
                        <Col span={12}>
                          <Statistic
                            title="Total Broken [h]"
                            value={formatHours(totalHours.brokenHours)}
                            prefix={<CloseCircleOutlined style={{ color: '#f5222d' }} />}
                          />
                        </Col>
                        <Col span={12}>
                          <Statistic
                            title="Total Idle [h]"
                            value={formatHours(totalHours.idleHours)}
                            prefix={<ClockCircleOutlined style={{ color: '#52c41a' }} />}
                          />
                        </Col>
                      </Row>
                    </Card>
                  </Col>
                  <Col xs={24} md={12}>
                    <div className="uptime-downtime-chart">
                      <h4>Uptime vs Downtime</h4>
                      <div className="bar-chart-container">
                        <div className="stacked-bar">
                          <div 
                            className="bar-segment uptime" 
                            style={{ width: `${totalHours.uptimePercent}%` }}
                          >
                            Uptime: {totalHours.uptimePercent}%
                          </div>
                          <div 
                            className="bar-segment downtime" 
                            style={{ width: `${totalHours.downtimePercent}%` }}
                          >
                            Downtime: {totalHours.downtimePercent}%
                          </div>
                        </div>
                        <div className="bar-legend">
                          <div className="legend-item">
                            <div className="color-box uptime"></div>
                            <span>Uptime (Utilization + Idle): {formatHours(totalHours.utilizationHours + totalHours.idleHours)}</span>
                          </div>
                          <div className="legend-item">
                            <div className="color-box downtime"></div>
                            <span>Downtime (Maintenance + Broken): {formatHours(totalHours.maintenanceHours + totalHours.brokenHours)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Col>
                </Row>
              </Card>
              
              {/* Recent Reservations Section */}
              <Card 
                title={<span><CalendarOutlined /> Recent Reservations</span>}
                className="section-card"
                extra={
                  <Button icon={<FileExcelOutlined />} size="small" onClick={() => exportEventsCSV()}>
                    Export
                  </Button>
                }
              >
                <Table 
                  dataSource={getFilteredEvents().slice(0, 10)} 
                  columns={recentEventsColumns}
                  rowKey="id"
                  pagination={false}
                  locale={{
                    emptyText: (
                      <div style={{ padding: '20px 0' }}>
                        <Text type="secondary">No reservations found in the selected time period</Text>
                      </div>
                    )
                  }}
                />
              </Card>
            </TabPane>

            {/* Tab 2: Utilization Details */}
            <TabPane 
              tab={<span><BarChartOutlined /> Utilization Details</span>} 
              key="utilization"
            >
              {/* Equipment Utilization Table */}
              <Card 
                title={<span><BarChartOutlined /> Equipment Utilization Report</span>}
                className="section-card"
                extra={
                  <Button icon={<FileExcelOutlined />} size="small" onClick={() => exportEquipmentCSV()}>
                    Export
                  </Button>
                }
              >
                <Table 
                  dataSource={equipmentUtilization} 
                  columns={equipmentColumns}
                  rowKey="id"
                  pagination={{ pageSize: 10 }}
                  summary={pageData => {
                    let totalUtilizationHours = 0;
                    let totalMaintenanceHours = 0;
                    let totalBrokenHours = 0;
                    let totalIdleHours = 0;
                    
                    pageData.forEach(({ utilizationHours, maintenanceHours, brokenHours, idleHours }) => {
                      totalUtilizationHours += utilizationHours || 0;
                      totalMaintenanceHours += maintenanceHours || 0;
                      totalBrokenHours += brokenHours || 0;
                      totalIdleHours += idleHours || 0;
                    });
                    
                    // Calculate total uptime and downtime for the table
                    const totalHours = totalUtilizationHours + totalMaintenanceHours + totalBrokenHours + totalIdleHours;
                    const uptimePercent = totalHours > 0 
                      ? Math.round(((totalUtilizationHours + totalIdleHours) / totalHours) * 100) 
                      : 0;
                    const downtimePercent = totalHours > 0 
                      ? Math.round(((totalMaintenanceHours + totalBrokenHours) / totalHours) * 100) 
                      : 0;
                    
                    return (
                      <>
                        <Table.Summary.Row className="font-bold">
                          <Table.Summary.Cell index={0}>Total</Table.Summary.Cell>
                          <Table.Summary.Cell index={1}>{formatHours(totalUtilizationHours)}</Table.Summary.Cell>
                          <Table.Summary.Cell index={2}>{formatHours(totalMaintenanceHours)}</Table.Summary.Cell>
                          <Table.Summary.Cell index={3}>{formatHours(totalBrokenHours)}</Table.Summary.Cell>
                          <Table.Summary.Cell index={4}>{formatHours(totalIdleHours)}</Table.Summary.Cell>
                          <Table.Summary.Cell index={5}>{uptimePercent}%</Table.Summary.Cell>
                          <Table.Summary.Cell index={6}>{downtimePercent}%</Table.Summary.Cell>
                        </Table.Summary.Row>
                      </>
                    );
                  }}
                  locale={{
                    emptyText: (
                      <div style={{ padding: '20px 0' }}>
                        <Text type="secondary">No equipment utilization data available</Text>
                      </div>
                    )
                  }}
                />
              </Card>
              
              {/* Equipment Utilization Bar Chart */}
              <Card 
                title={<span><AreaChartOutlined /> Instrument Utilization Chart</span>}
                className="section-card"
              >
                <div className="instrument-bar-chart">
                  {equipmentUtilization.slice(0, 10).map((item, index) => (
                    <div key={index} className="equipment-bar-container">
                      <div className="equipment-name">{item.name}</div>
                      <div className="equipment-bar">
                        <div 
                          className="bar-segment utilization" 
                          style={{ width: `${(item.utilizationHours / (item.utilizationHours + item.maintenanceHours + item.brokenHours + item.idleHours)) * 100}%` }}
                          title={`Utilization: ${formatHours(item.utilizationHours)}`}
                        ></div>
                        <div 
                          className="bar-segment maintenance" 
                          style={{ width: `${(item.maintenanceHours / (item.utilizationHours + item.maintenanceHours + item.brokenHours + item.idleHours)) * 100}%` }}
                          title={`Maintenance: ${formatHours(item.maintenanceHours)}`}
                        ></div>
                        <div 
                          className="bar-segment broken" 
                          style={{ width: `${(item.brokenHours / (item.utilizationHours + item.maintenanceHours + item.brokenHours + item.idleHours)) * 100}%` }}
                          title={`Broken: ${formatHours(item.brokenHours)}`}
                        ></div>
                        <div 
                          className="bar-segment idle" 
                          style={{ width: `${(item.idleHours / (item.utilizationHours + item.maintenanceHours + item.brokenHours + item.idleHours)) * 100}%` }}
                          title={`Idle: ${formatHours(item.idleHours)}`}
                        ></div>
                      </div>
                      <div className="equipment-hours">
                        {formatHours(item.utilizationHours + item.maintenanceHours + item.brokenHours + item.idleHours)}
                      </div>
                    </div>
                  ))}
                  <div className="bar-chart-legend">
                    <div className="legend-item">
                      <div className="color-box utilization"></div>
                      <span>Utilization</span>
                    </div>
                    <div className="legend-item">
                      <div className="color-box maintenance"></div>
                      <span>Maintenance</span>
                    </div>
                    <div className="legend-item">
                      <div className="color-box broken"></div>
                      <span>Broken</span>
                    </div>
                    <div className="legend-item">
                      <div className="color-box idle"></div>
                      <span>Idle</span>
                    </div>
                  </div>
                </div>
              </Card>
              
              {/* Top Technicians Section */}
              <Card 
                title={<span><TeamOutlined /> Top Technicians</span>}
                className="section-card"
                extra={
                  <Button icon={<FileExcelOutlined />} size="small" onClick={() => exportTechnicianCSV()}>
                    Export
                  </Button>
                }
              >
                <Table 
                  dataSource={topTechnicians} 
                  columns={technicianColumns}
                  rowKey="name"
                  pagination={false}
                  locale={{
                    emptyText: (
                      <div style={{ padding: '20px 0' }}>
                        <Text type="secondary">No technician data available</Text>
                      </div>
                    )
                  }}
                />
              </Card>
              
              {/* Monthly Trends Section */}
              <Card 
                title={<span><AreaChartOutlined /> Monthly Trends</span>}
                className="section-card"
                extra={
                  <Button icon={<FileExcelOutlined />} size="small" onClick={() => exportMonthlyCSV()}>
                    Export
                  </Button>
                }
              >
                <Table 
                  dataSource={monthlyEventCounts} 
                  columns={monthlyColumns}
                  rowKey={(record) => `${record.month}-${record.year}`}
                  pagination={false}
                />
              </Card>
            </TabPane>

            {/* Tab 3: ROI Analysis */}
            <TabPane 
              tab={<span><DollarOutlined /> ROI Analysis</span>} 
              key="roi"
            >
              <Card 
                title={<span><DollarOutlined /> ROI Analysis & Financial Performance</span>}
                className="section-card"
                extra={
                  <Button icon={<FileExcelOutlined />} size="small" onClick={() => exportROIData()}>
                    Export
                  </Button>
                }
              >
                <Row gutter={16}>
                  <Col xs={24} md={12}>
                    <Card bordered={false} className="hour-stats-card">
                      <Row gutter={16}>
                        <Col span={12}>
                          <Statistic
                            title="Total Revenue"
                            value={formatCurrency(roiData.utilizationRevenue)}
                            prefix={<RiseOutlined style={{ color: '#52c41a' }} />}
                            precision={0}
                          />
                        </Col>
                        <Col span={12}>
                          <Statistic
                            title="Total Cost"
                            value={formatCurrency(roiData.totalCost)}
                            prefix={<FallOutlined style={{ color: '#f5222d' }} />}
                            precision={0}
                          />
                        </Col>
                      </Row>
                      <Row gutter={16} style={{ marginTop: '20px' }}>
                        <Col span={12}>
                          <Statistic
                            title="Net Profit"
                            value={formatCurrency(roiData.totalProfit)}
                            valueStyle={{ color: roiData.totalProfit >= 0 ? '#3f8600' : '#cf1322' }}
                            prefix={roiData.totalProfit >= 0 ? <RiseOutlined /> : <FallOutlined />}
                            precision={0}
                          />
                        </Col>
                        <Col span={12}>
                          <Statistic
                            title="ROI"
                            value={roiData.roi}
                            suffix="%"
                            valueStyle={{ color: roiData.roi >= 30 ? '#3f8600' : roiData.roi >= 0 ? '#faad14' : '#cf1322' }}
                            precision={1}
                          />
                        </Col>
                      </Row>
                    </Card>
                  </Col>
                  <Col xs={24} md={12}>
                    <Card bordered={false} className="hour-stats-card">
                      <Row gutter={16}>
                        <Col span={12}>
                          <Statistic
                            title="Avg. Rate/Hour"
                            value={formatCurrency(roiData.averageRatePerHour)}
                            prefix={<DollarOutlined />}
                            precision={0}
                          />
                        </Col>
                        <Col span={12}>
                          <Statistic
                            title="Cost Savings"
                            value={formatCurrency(roiData.costSavings)}
                            prefix={<DollarOutlined style={{ color: '#52c41a' }} />}
                            precision={0}
                            tooltip="Savings compared to outsourcing same work"
                          />
                        </Col>
                      </Row>
                      <Row gutter={16} style={{ marginTop: '20px' }}>
                        <Col span={24}>
                          <Statistic
                            title="Payback Period"
                            value={roiData.paybackPeriodDays}
                            suffix=" days"
                            valueStyle={{ 
                              color: roiData.paybackPeriodDays < 365 ? '#3f8600' : 
                                roiData.paybackPeriodDays < 730 ? '#faad14' : '#cf1322' 
                            }}
                          />
                        </Col>
                      </Row>
                    </Card>
                  </Col>
                </Row>
              </Card>
              
              {/* Equipment Cost Analysis */}
              <Card
                title={<span><BarChartOutlined /> Equipment Cost Analysis</span>}
                className="section-card"
              >
                <Row gutter={16}>
                  <Col xs={24} md={8}>
                    <Card bordered={false}>
                      <Statistic
                        title="Purpose Cost Distribution"
                        value=""
                        suffix=""
                      />
                      <div className="purpose-cost-breakdown" style={{ marginTop: 16 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                          <Text>Utilization</Text>
                          <Text>{formatCurrency(costMetrics.utilizationCost)}</Text>
                        </div>
                        <Progress 
                          percent={costMetrics.totalCost > 0 ? (costMetrics.utilizationCost / costMetrics.totalCost) * 100 : 0} 
                          strokeColor="#1890ff"
                          showInfo={false}
                        />
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16, marginBottom: 8 }}>
                          <Text>Maintenance</Text>
                          <Text>{formatCurrency(costMetrics.maintenanceCost)}</Text>
                        </div>
                        <Progress 
                          percent={costMetrics.totalCost > 0 ? (costMetrics.maintenanceCost / costMetrics.totalCost) * 100 : 0} 
                          strokeColor="#faad14"
                          showInfo={false}
                        />
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16, marginBottom: 8 }}>
                          <Text>Broken</Text>
                          <Text>{formatCurrency(costMetrics.brokenCost)}</Text>
                        </div>
                        <Progress 
                          percent={costMetrics.totalCost > 0 ? (costMetrics.brokenCost / costMetrics.totalCost) * 100 : 0} 
                          strokeColor="#f5222d"
                          showInfo={false}
                        />
                      </div>
                    </Card>
                  </Col>
                  
                  <Col xs={24} md={16}>
                    <Table
                      dataSource={equipmentUtilization.map(item => ({
                        ...item,
                        costPerHour: item.utilizationHours > 0 ? item.totalCost / item.utilizationHours : 0,
                        costEfficiencyRatio: item.totalCost > 0 ? item.utilizationHours / item.totalCost * 100 : 0
                      }))}
                      columns={[
                        {
                          title: 'Equipment',
                          dataIndex: 'name',
                          key: 'name',
                        },
                        {
                          title: 'Total Cost',
                          dataIndex: 'totalCost',
                          key: 'totalCost',
                          render: value => formatCurrency(value),
                          sorter: (a, b) => a.totalCost - b.totalCost,
                        },
                        {
                          title: 'Cost/Hour',
                          dataIndex: 'costPerHour',
                          key: 'costPerHour',
                          render: value => value ? formatCurrency(value) : '-',
                          sorter: (a, b) => a.costPerHour - b.costPerHour,
                        },
                        {
                          title: 'Efficiency Ratio',
                          dataIndex: 'costEfficiencyRatio',
                          key: 'costEfficiencyRatio',
                          render: value => value ? `${value.toFixed(2)}` : '-',
                          sorter: (a, b) => a.costEfficiencyRatio - b.costEfficiencyRatio,
                        }
                      ]}
                      pagination={{ pageSize: 5 }}
                      rowKey="id"
                    />
                  </Col>
                </Row>
              </Card>
            </TabPane>

            {/* Tab 4: Targets & Performance */}
            <TabPane 
              tab={<span><AimOutlined /> Targets & Performance</span>} 
              key="targets"
            >
              <Card 
                title={<span><AimOutlined /> Equipment Utilization Targets</span>}
                className="section-card"
              >
                <Row gutter={16}>
                  <Col xs={24} md={8}>
                    <Card bordered={false} className="hour-stats-card">
                      <Statistic
                        title="Overall Utilization vs Target"
                        value={targetPerformance.overall.actualUtilization}
                        suffix={`/ ${targetPerformance.overall.targetUtilization}%`}
                        valueStyle={{ 
                          color: targetPerformance.overall.status === 'above' ? '#3f8600' : 
                            targetPerformance.overall.status === 'close' ? '#faad14' : '#cf1322' 
                        }}
                      />
                      <div style={{ marginTop: 10 }}>
                        <Progress 
                          percent={targetPerformance.overall.actualUtilization} 
                          steps={20}
                          strokeColor={
                            targetPerformance.overall.status === 'above' ? '#52c41a' : 
                            targetPerformance.overall.status === 'close' ? '#faad14' : '#f5222d'
                          }
                          size="small"
                        />
                        <div style={{ marginTop: 5, display: 'flex', justifyContent: 'space-between' }}>
                          <Text type="secondary">0%</Text>
                          <div>
                            <Tag color="gold">Target: {targetPerformance.overall.targetUtilization}%</Tag>
                          </div>
                          <Text type="secondary">100%</Text>
                        </div>
                      </div>
                    </Card>
                  </Col>
                  <Col xs={24} md={16}>
                    <div style={{ overflowX: 'auto' }}>
                      <div style={{ minWidth: 500 }}>
                        {targetPerformance.equipment.slice(0, 5).map((item, index) => (
                          <div key={index} style={{ marginBottom: 16 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                              <Text strong style={{ maxWidth: '70%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {item.name}
                              </Text>
                              <div>
                                <Badge 
                                  status={
                                    item.status === 'above' ? 'success' : 
                                    item.status === 'close' ? 'warning' : 'error'
                                  } 
                                />
                                <Text>{item.actualUtilization}% vs {item.targetUtilization}% target</Text>
                              </div>
                            </div>
                            <Progress 
                              percent={item.actualUtilization} 
                              size="small"
                              strokeColor={{
                                '0%': '#108ee9',
                                '100%': item.status === 'above' ? '#52c41a' : 
                                  item.status === 'close' ? '#faad14' : '#f5222d',
                              }}
                              success={{ 
                                percent: Math.min(item.targetUtilization, item.actualUtilization),
                                strokeColor: '#52c41a'
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </Col>
                </Row>
              </Card>
              
              {/* Equipment Performance Table */}
              <Card
                title={<span><BarChartOutlined /> Equipment Performance</span>}
                className="section-card"
              >
                <Table
                  dataSource={targetPerformance.equipment}
                  columns={[
                    {
                      title: 'Equipment',
                      dataIndex: 'name',
                      key: 'name',
                    },
                    {
                      title: 'Target Utilization',
                      dataIndex: 'targetUtilization',
                      key: 'targetUtilization',
                      render: value => `${value}%`,
                      sorter: (a, b) => a.targetUtilization - b.targetUtilization,
                    },
                    {
                      title: 'Actual Utilization',
                      dataIndex: 'actualUtilization',
                      key: 'actualUtilization',
                      render: value => `${value}%`,
                      sorter: (a, b) => a.actualUtilization - b.actualUtilization,
                    },
                    {
                      title: 'Gap',
                      dataIndex: 'gap',
                      key: 'gap',
                      render: value => {
                        const isPositive = value >= 0;
                        return (
                          <Text style={{ color: isPositive ? '#3f8600' : '#cf1322' }}>
                            {isPositive ? '+' : ''}{value}%
                          </Text>
                        );
                      },
                      sorter: (a, b) => a.gap - b.gap,
                    },
                    {
                      title: 'Status',
                      dataIndex: 'status',
                      key: 'status',
                      render: value => {
                        let color = 'red';
                        let text = 'Below Target';
                        
                        if (value === 'above') {
                          color = 'green';
                          text = 'Above Target';
                        } else if (value === 'close') {
                          color = 'gold';
                          text = 'Near Target';
                        }
                        
                        return <Tag color={color}>{text}</Tag>;
                      },
                      filters: [
                        { text: 'Above Target', value: 'above' },
                        { text: 'Near Target', value: 'close' },
                        { text: 'Below Target', value: 'below' },
                      ],
                      onFilter: (value, record) => record.status === value,
                    }
                  ]}
                  pagination={{ pageSize: 10 }}
                  rowKey="id"
                />
              </Card>
            </TabPane>

            {/* Tab 5: Department Comparisons */}
            <TabPane 
              tab={<span><BankOutlined /> Department Analysis</span>} 
              key="departments"
            >
              <Card 
                title={<span><BankOutlined /> Department Comparisons</span>}
                className="section-card"
                extra={
                  <Button icon={<FileExcelOutlined />} size="small" onClick={() => exportDepartmentData()}>
                    Export
                  </Button>
                }
              >
                <Row gutter={[16, 16]}>
                  {departmentData.map((dept, index) => (
                    <Col xs={24} sm={12} md={8} key={index}>
                      <Card 
                        bordered
                        title={
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>{dept.name}</span>
                            <Badge 
                              count={`${dept.utilizationPercent}%`} 
                              style={{ 
                                backgroundColor: 
                                  dept.utilizationPercent >= 80 ? '#52c41a' : 
                                  dept.utilizationPercent >= 50 ? '#1890ff' : 
                                  dept.utilizationPercent >= 30 ? '#faad14' : '#f5222d'
                              }}
                            />
                          </div>
                        }
                        size="small"
                      >
                        <div style={{ height: 200 }}>
                          <Row gutter={[8, 16]}>
                            <Col span={12}>
                              <Statistic
                                title="Equipment"
                                value={dept.equipmentCount}
                                valueStyle={{ fontSize: '1.2rem' }}
                              />
                            </Col>
                            <Col span={12}>
                              <Statistic
                                title="Reservations"
                                value={dept.eventCount}
                                valueStyle={{ fontSize: '1.2rem' }}
                              />
                            </Col>
                            <Col span={12}>
                              <Statistic
                                title="Hours"
                                value={formatHours(dept.utilizationHours)}
                                valueStyle={{ fontSize: '1.2rem' }}
                              />
                            </Col>
                            <Col span={12}>
                              <Statistic
                                title="Efficiency"
                                value={dept.resourceEfficiency}
                                suffix="/equipment"
                                valueStyle={{ fontSize: '1.2rem' }}
                              />
                            </Col>
                          </Row>
                          
                          {/* Department purpose breakdown */}
                          <div style={{ marginTop: 16 }}>
                            <Text type="secondary">Purpose Breakdown:</Text>
                            <div style={{ display: 'flex', marginTop: 4 }}>
                              <Tooltip title={`Utilization: ${formatHours(dept.utilizationHours)}`}>
                                <div 
                                  style={{ 
                                    flex: dept.utilizationHours || 0.0001, 
                                    height: 8, 
                                    backgroundColor: '#1890ff', 
                                    borderRadius: '4px 0 0 4px',
                                    marginRight: (dept.maintenanceHours > 0 || dept.brokenHours > 0) ? 1 : 0
                                  }}
                                />
                              </Tooltip>
                              <Tooltip title={`Maintenance: ${formatHours(dept.maintenanceHours)}`}>
                                <div 
                                  style={{ 
                                    flex: dept.maintenanceHours || 0.0001, 
                                    height: 8, 
                                    backgroundColor: '#faad14',
                                    marginRight: dept.brokenHours > 0 ? 1 : 0
                                  }}
                                />
                              </Tooltip>
                              <Tooltip title={`Broken: ${formatHours(dept.brokenHours)}`}>
                                <div 
                                  style={{ 
                                    flex: dept.brokenHours || 0.0001, 
                                    height: 8, 
                                    backgroundColor: '#f5222d',
                                    borderRadius: '0 4px 4px 0'
                                  }}
                                />
                              </Tooltip>
                            </div>
                          </div>
                        </div>
                      </Card>
                    </Col>
                  ))}
                </Row>
              </Card>
              
              {/* Department Comparison Table */}
              <Card
                title={<span><BarChartOutlined /> Department Comparison Table</span>}
                className="section-card"
              >
                <Table
                  dataSource={departmentData}
                  columns={departmentColumns}
                  pagination={false}
                  rowKey="id"
                />
              </Card>
            </TabPane>

            {/* Tab 6: Optimization Recommendations */}
            <TabPane 
              tab={<span><BulbOutlined /> Recommendations</span>} 
              key="recommendations"
            >
              <Card 
                title={<span><BulbOutlined /> Resource Optimization Suggestions</span>}
                className="section-card"
              >
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <Text>Overall Efficiency Score</Text>
                      <Tooltip title="Based on utilization, downtime, and ROI metrics">
                        <InfoCircleOutlined style={{ marginLeft: 8 }} />
                      </Tooltip>
                    </div>
                    <div>
                      <Rate 
                        disabled 
                        allowHalf
                        value={efficiencyScore / 20} 
                        style={{ fontSize: 16 }}
                      />
                      <span style={{ marginLeft: 8 }}>{efficiencyScore}%</span>
                    </div>
                  </div>
                  <Progress 
                    percent={efficiencyScore} 
                    strokeColor={{
                      '0%': '#f5222d',
                      '25%': '#faad14',
                      '50%': '#1890ff',
                      '75%': '#52c41a',
                      '100%': '#52c41a',
                    }}
                    status="active"
                  />
                </div>
                
                <Divider style={{ margin: '16px 0' }} />
                
                <List
                  itemLayout="horizontal"
                  dataSource={recommendations}
                  renderItem={item => (
                    <List.Item
                      actions={[
                        <Tag color={
                          item.priority === 'high' ? 'red' : 
                          item.priority === 'medium' ? 'orange' : 'blue'
                        }>
                          {item.priority} priority
                        </Tag>
                      ]}
                    >
                      <List.Item.Meta
                        avatar={
                          item.type === 'warning' ? <WarningOutlined style={{ fontSize: 24, color: '#f5222d' }} /> :
                          item.type === 'suggestion' ? <BulbOutlined style={{ fontSize: 24, color: '#1890ff' }} /> :
                          item.type === 'opportunity' ? <RocketOutlined style={{ fontSize: 24, color: '#52c41a' }} /> :
                          item.type === 'alert' ? <ExclamationOutlined style={{ fontSize: 24, color: '#faad14' }} /> :
                          <InfoCircleOutlined style={{ fontSize: 24 }} />
                        }
                        title={item.title}
                        description={
                          <div>
                            <p>{item.description}</p>
                            <p><Text type="secondary">{item.details}</Text></p>
                            <p>
                              <Text strong>Impact: </Text> 
                              <Text>{item.impact}</Text>
                              {item.savings && (
                                <Text> | <Text strong>Potential Value: </Text> {item.savings}</Text>
                              )}
                            </p>
                          </div>
                        }
                      />
                    </List.Item>
                  )}
                />
              </Card>
            </TabPane>
          </Tabs>
        </div>
      )}
    </div>
  );
}

export default Analytics;
