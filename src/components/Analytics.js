import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Card, Row, Col, Select, Button, Typography, Spin, Alert, 
  Table, Statistic, Tag, Space, Divider, Progress, Dropdown, Menu
} from 'antd';
import {
  BarChartOutlined, PieChartOutlined, CalendarOutlined, DollarOutlined,
  CheckCircleOutlined, ExclamationOutlined, CloseCircleOutlined,
  DownloadOutlined, FileExcelOutlined, FilePdfOutlined, ClockCircleOutlined
} from '@ant-design/icons';
import { fetchTenant } from '../services/apiClient';
import './Analytics.css';

const { Option } = Select;
const { Title, Text } = Typography;

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
    switch (timeRange) {
      case '7days': return 7 * 24;
      case '30days': return 30 * 24;
      case '90days': return 90 * 24;
      case '12months': return 365 * 24;
      default: return 30 * 24;
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
        brokenCount: 0
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

  // Export full analytics report to CSV
  const exportFullReport = () => {
    // Create a zip file with all reports
    // For simplicity, we'll just export all data separately
    exportEquipmentCSV();
    setTimeout(() => exportTechnicianCSV(), 500);
    setTimeout(() => exportMonthlyCSV(), 1000);
    setTimeout(() => exportEventsCSV(), 1500);
  };

  // Data for charts and tables
  const metrics = calculateMetrics();
  const equipmentUtilization = calculateEquipmentUtilization();
  const topTechnicians = getTopTechnicians();
  const monthlyEventCounts = getMonthlyEventCounts();
  const purposeBreakdown = calculatePurposeBreakdown();
  const costMetrics = calculateCostMetrics();
  const totalHours = calculateTotalHours();

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

  // Calculate data for the Instrument bar chart
  const equipmentBarChartData = equipmentUtilization.slice(0, 10).map(item => ({
    name: item.name,
    utilization: item.utilizationHours,
    maintenance: item.maintenanceHours,
    broken: item.brokenHours,
    idle: item.idleHours
  }));

  // Calculate data for the Up vs Down bar chart
  const uptimeDowntimeData = [
    { name: 'Uptime', hours: totalHours.utilizationHours + totalHours.idleHours, percent: totalHours.uptimePercent },
    { name: 'Downtime', hours: totalHours.maintenanceHours + totalHours.brokenHours, percent: totalHours.downtimePercent },
  ];

  // Export dropdown menu
  const exportMenu = (
    <Menu>
      <Menu.Item key="csv-equipment" onClick={exportEquipmentCSV}>
        <FileExcelOutlined /> Equipment Utilization Data
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
          <Card className="filter-card">
            <div className="date-range-picker">
              <Text strong>Report Time Period:</Text>
              <Select 
                value={timeRange}
                onChange={(value) => setTimeRange(value)}
                style={{ width: 150 }}
              >
                <Option value="7days">Last 7 Days</Option>
                <Option value="30days">Last 30 Days</Option>
                <Option value="90days">Last 90 Days</Option>
                <Option value="12months">Last 12 Months</Option>
              </Select>
            </div>
          </Card>
          
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
          
          {/* Time Distribution Section */}
          <Card 
            title="Equipment Time Distribution" 
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
          
          {/* Equipment Utilization Table */}
          <Card 
            title="Equipment Utilization Report" 
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
            title="Instrument Utilization Chart" 
            className="section-card"
          >
            <div className="instrument-bar-chart">
              {equipmentBarChartData.map((item, index) => (
                <div key={index} className="equipment-bar-container">
                  <div className="equipment-name">{item.name}</div>
                  <div className="equipment-bar">
                    <div 
                      className="bar-segment utilization" 
                      style={{ width: `${(item.utilization / (item.utilization + item.maintenance + item.broken + item.idle)) * 100}%` }}
                      title={`Utilization: ${formatHours(item.utilization)}`}
                    ></div>
                    <div 
                      className="bar-segment maintenance" 
                      style={{ width: `${(item.maintenance / (item.utilization + item.maintenance + item.broken + item.idle)) * 100}%` }}
                      title={`Maintenance: ${formatHours(item.maintenance)}`}
                    ></div>
                    <div 
                      className="bar-segment broken" 
                      style={{ width: `${(item.broken / (item.utilization + item.maintenance + item.broken + item.idle)) * 100}%` }}
                      title={`Broken: ${formatHours(item.broken)}`}
                    ></div>
                    <div 
                      className="bar-segment idle" 
                      style={{ width: `${(item.idle / (item.utilization + item.maintenance + item.broken + item.idle)) * 100}%` }}
                      title={`Idle: ${formatHours(item.idle)}`}
                    ></div>
                  </div>
                  <div className="equipment-hours">
                    {formatHours(item.utilization + item.maintenance + item.broken + item.idle)}
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
            title="Top Technicians" 
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
            title="Monthly Trends" 
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
          
          {/* Recent Reservations Section */}
          <Card 
            title="Recent Reservations" 
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
        </div>
      )}
    </div>
  );
}

export default Analytics;
