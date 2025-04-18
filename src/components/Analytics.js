import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Card, Row, Col, Select, Button, Typography, Spin, Alert, 
  Table, Statistic, Tag, Space, Divider, Progress
} from 'antd';
import {
  BarChartOutlined, PieChartOutlined, CalendarOutlined, DollarOutlined,
  CheckCircleOutlined, ExclamationOutlined, CloseCircleOutlined
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

  // Calculate data for analytics
  const metrics = calculateMetrics();
  const equipmentUtilization = calculateEquipmentUtilization();
  const topTechnicians = getTopTechnicians();
  const monthlyEventCounts = getMonthlyEventCounts();
  const purposeBreakdown = calculatePurposeBreakdown();
  const costMetrics = calculateCostMetrics();

  // Table columns for Equipment Utilization
  const equipmentColumns = [
    {
      title: 'Equipment',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: 'Total Events',
      dataIndex: 'count',
      key: 'count',
      sorter: (a, b) => a.count - b.count,
    },
    {
      title: 'Utilization %',
      key: 'utilization',
      render: (_, record) => (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Progress 
            percent={record.utilization} 
            size="small" 
            style={{ width: 120, marginRight: 12 }}
          />
          <span>{record.utilization}%</span>
        </div>
      ),
      sorter: (a, b) => a.utilization - b.utilization,
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
    {
      title: 'Purpose Breakdown',
      key: 'purposeBreakdown',
      render: (_, record) => {
        const total = record.count || 1; // Avoid division by zero
        return (
          <div>
            <div className="purpose-mini-chart">
              <div className="mini-bar utilization" style={{ width: `${(record.utilizationCount / total) * 100}%` }}></div>
              <div className="mini-bar maintenance" style={{ width: `${(record.maintenanceCount / total) * 100}%` }}></div>
              <div className="mini-bar broken" style={{ width: `${(record.brokenCount / total) * 100}%` }}></div>
            </div>
            <div className="purpose-mini-legend">
              U: {record.utilizationCount} | M: {record.maintenanceCount} | B: {record.brokenCount}
            </div>
          </div>
        );
      },
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

  return (
    <div className="analytics-container">
      <Card className="header-card">
        <div className="header-content">
          <Title level={3}>{getDisplayName()} - Analytics & Reports</Title>
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
              <Text strong>Time Range:</Text>
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
          
          <Row gutter={16} className="stats-row">
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title="Total Reservations"
                  value={metrics.totalEvents}
                  prefix={<BarChartOutlined />}
                  suffix={<Text type="secondary" style={{ fontSize: '14px' }}>in period</Text>}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title="Reservations Per Day"
                  value={metrics.eventsPerDay}
                  precision={1}
                  prefix={<CalendarOutlined />}
                  suffix={<Text type="secondary" style={{ fontSize: '14px' }}>avg</Text>}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title="Utilization Rate"
                  value={metrics.utilizationRate}
                  prefix={<PieChartOutlined />}
                  suffix="%"
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
          </Row>
          
          {/* Cost Summary Section */}
          <Card title="Cost Summary" className="section-card">
            <Row gutter={16}>
              <Col xs={24} sm={12} md={6}>
                <Card bordered={false}>
                  <Statistic
                    title="Total Cost"
                    value={costMetrics.totalCost}
                    precision={0}
                    prefix={<DollarOutlined />}
                    formatter={(value) => formatCurrency(value)}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Card bordered={false}>
                  <Statistic
                    title="Average Cost"
                    value={costMetrics.avgCost}
                    precision={0}
                    prefix={<DollarOutlined />}
                    formatter={(value) => formatCurrency(value)}
                    suffix={<Text type="secondary" style={{ fontSize: '14px' }}>per event</Text>}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Card bordered={false}>
                  <Statistic
                    title="Utilization Cost"
                    value={costMetrics.utilizationCost}
                    precision={0}
                    prefix={<DollarOutlined />}
                    formatter={(value) => formatCurrency(value)}
                    suffix={<Text type="secondary" style={{ fontSize: '14px' }}>{purposeBreakdown.utilization} events</Text>}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Card bordered={false}>
                  <Statistic
                    title="Maintenance Cost"
                    value={costMetrics.maintenanceCost}
                    precision={0}
                    prefix={<DollarOutlined />}
                    formatter={(value) => formatCurrency(value)}
                    suffix={<Text type="secondary" style={{ fontSize: '14px' }}>{purposeBreakdown.maintenance} events</Text>}
                  />
                </Card>
              </Col>
            </Row>
          </Card>
          
          {/* Purpose Breakdown Section */}
          <Card title="Purpose Breakdown" className="section-card">
            <div className="purpose-breakdown-container">
              <div className="purpose-bars">
                <div className="purpose-bar">
                  <Text strong>Utilization</Text>
                  <Progress 
                    percent={purposeBreakdown.utilizationPercent} 
                    strokeColor="#1890ff"
                    format={(percent) => `${percent}%`}
                  />
                  <Text>{purposeBreakdown.utilization} events</Text>
                </div>
                
                <div className="purpose-bar">
                  <Text strong>Maintenance</Text>
                  <Progress 
                    percent={purposeBreakdown.maintenancePercent} 
                    strokeColor="#faad14"
                    format={(percent) => `${percent}%`}
                  />
                  <Text>{purposeBreakdown.maintenance} events</Text>
                </div>
                
                <div className="purpose-bar">
                  <Text strong>Broken</Text>
                  <Progress 
                    percent={purposeBreakdown.brokenPercent} 
                    strokeColor="#f5222d"
                    format={(percent) => `${percent}%`}
                  />
                  <Text>{purposeBreakdown.broken} events</Text>
                </div>
              </div>
              
              <div className="downtime-stat">
                <Card bordered={false}>
                  <Statistic
                    title="Downtime Ratio"
                    value={metrics.downtimeRatio}
                    suffix="%"
                    valueStyle={{ color: metrics.downtimeRatio > 25 ? '#f5222d' : '#3f8600' }}
                  />
                  <Text type="secondary">maintenance + broken events</Text>
                </Card>
              </div>
            </div>
          </Card>
          
          {/* Equipment Utilization Table */}
          <Card title="Equipment Utilization & Costs" className="section-card">
            <Table 
              dataSource={equipmentUtilization} 
              columns={equipmentColumns}
              rowKey="id"
              pagination={{ pageSize: 5 }}
              locale={{
                emptyText: (
                  <div style={{ padding: '20px 0' }}>
                    <Text type="secondary">No equipment utilization data available</Text>
                  </div>
                )
              }}
            />
          </Card>
          
          {/* Top Technicians Section */}
          <Card title="Top Technicians" className="section-card">
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
          <Card title="Monthly Trends" className="section-card">
            <Table 
              dataSource={monthlyEventCounts} 
              columns={monthlyColumns}
              rowKey={(record) => `${record.month}-${record.year}`}
              pagination={false}
            />
          </Card>
          
          {/* Recent Reservations Section */}
          <Card title="Recent Reservations" className="section-card">
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
