import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Card, Row, Col, Button, Spin, Alert, Progress, Statistic,
  Divider, Badge, Tag, Typography, Space, Empty
} from 'antd';
import { 
  CalendarOutlined, ToolOutlined, CheckCircleOutlined,
  CloseCircleOutlined, ExclamationOutlined, DashboardOutlined,
  BarChartOutlined, PlayCircleOutlined
} from '@ant-design/icons';
import { fetchTenant } from '../services/apiClient';
import './ResourceViews.css';

const { Title, Text } = Typography;

function ResourceDashboard() {
  const { tenantId } = useParams();
  const navigate = useNavigate();
  const [resources, setResources] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tenantName, setTenantName] = useState('');
  
  // Reference to track if component is mounted
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
        // Get resources from API 
        let resourcesList = [...(tenantData.resources || [])];
        
        setResources(tenantData.resources || []);
        
        setResources(resourcesList);
        setEvents(tenantData.events || []);
        
        if (!tenantName) {
          setTenantName(tenantData.name || tenantId);
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

  // Calculate resource utilization
  const calculateUtilization = (resourceId) => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);
    
    const resourceEvents = events.filter(event => 
      event.resourceId === resourceId || 
      event.equipment === resources.find(r => r.id === resourceId)?.title
    );
    
    const eventsThisWeek = resourceEvents.filter(event => {
      try {
        const eventStart = new Date(event.start);
        return eventStart >= startOfWeek && eventStart < endOfWeek;
      } catch (e) {
        return false;
      }
    });
    
    // Calculate event counts by purpose
    const utilizationEvents = resourceEvents.filter(event => 
      (event.purpose || 'Utilization') === 'Utilization');
    const maintenanceEvents = resourceEvents.filter(event => 
      event.purpose === 'Maintenance');
    const brokenEvents = resourceEvents.filter(event => 
      event.purpose === 'Broken');
    
    return {
      total: resourceEvents.length,
      thisWeek: eventsThisWeek.length,
      utilization: eventsThisWeek.length > 0 ? 
        Math.round((eventsThisWeek.length / 5) * 100) : 0, // Assuming 5 workdays per week
      utilizationEvents: utilizationEvents.length,
      maintenanceEvents: maintenanceEvents.length,
      brokenEvents: brokenEvents.length,
      totalCost: resourceEvents.reduce((sum, event) => sum + (Number(event.cost) || 0), 0)
    };
  };

  // Get current equipment status
  const getResourceStatus = (resourceId) => {
    const resource = resources.find(r => r.id === resourceId);
    
    // First check purpose from recent events
    const recentEvents = events
      .filter(event => 
        event.resourceId === resourceId || 
        event.equipment === resource?.title
      )
      .sort((a, b) => new Date(b.start) - new Date(a.start)); // Most recent first
    
    // If we have a recent "Broken" event, the equipment is broken
    if (recentEvents.some(event => event.purpose === 'Broken')) {
      return 'broken';
    }
    
    // Check if there's an active maintenance event
    const now = new Date();
    const currentEvent = events.find(event => {
      try {
        const eventStart = new Date(event.start);
        const eventEnd = new Date(event.end);
        return (
          (event.resourceId === resourceId || 
           event.equipment === resource?.title) &&
          eventStart <= now && eventEnd >= now && 
          event.purpose === 'Maintenance'
        );
      } catch (e) {
        return false;
      }
    });
    
    if (currentEvent) {
      return 'maintenance';
    }
    
    // Check if equipment is marked for maintenance
    if (resource?.maintenanceStatus === 'overdue') {
      return 'maintenance-overdue';
    } else if (resource?.maintenanceStatus === 'due') {
      return 'maintenance-due';
    }
    
    // Otherwise check if it's in use
    const inUseEvent = events.find(event => {
      try {
        const eventStart = new Date(event.start);
        const eventEnd = new Date(event.end);
        return (
          (event.resourceId === resourceId || 
           event.equipment === resource?.title) &&
          eventStart <= now && eventEnd >= now
        );
      } catch (e) {
        return false;
      }
    });
    
    return inUseEvent ? 'in-use' : 'available';
  };

  // Get days until maintenance
  const getDaysUntilMaintenance = (nextMaintenanceDate) => {
    if (!nextMaintenanceDate) return null;
    
    try {
      const today = new Date();
      const nextDate = new Date(nextMaintenanceDate);
      
      // Calculate difference in days
      const diffTime = nextDate - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      return diffDays;
    } catch (e) {
      return null;
    }
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

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Get status badge
  const getStatusBadge = (status) => {
    switch (status) {
      case 'available':
        return <Badge status="success" text="Available" />;
      case 'in-use':
        return <Badge status="processing" text="In Use" />;
      case 'broken':
        return <Badge status="error" text="Out of Service" />;
      case 'maintenance':
        return <Badge status="warning" text="Under Maintenance" />;
      case 'maintenance-due':
        return <Badge status="warning" text="Maintenance Due" />;
      case 'maintenance-overdue':
        return <Badge status="error" text="Maintenance Overdue" />;
      default:
        return <Badge status="default" text="Unknown" />;
    }
  };

  // Get status icon
  const getStatusIcon = (status) => {
    switch (status) {
      case 'available':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'in-use':
        return <PlayCircleOutlined style={{ color: '#1890ff' }} />;
      case 'broken':
        return <CloseCircleOutlined style={{ color: '#f5222d' }} />;
      case 'maintenance':
      case 'maintenance-due':
      case 'maintenance-overdue':
        return <ToolOutlined style={{ color: '#faad14' }} />;
      default:
        return <ExclamationOutlined style={{ color: '#d9d9d9' }} />;
    }
  };

  return (
    <div className="dashboard-container">
      <Card className="header-card">
        <div className="header-content">
          <Title level={3}>{getDisplayName()} - Resource Dashboard</Title>
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
            <Spin size="large" tip="Loading resource data..." />
          </div>
        </Card>
      ) : error ? (
        <Card>
          <Alert
            message="Error Loading Dashboard"
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
        <div className="resource-dashboard">
          <Row gutter={16} className="stats-row">
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title="Total Equipment"
                  value={resources.length}
                  prefix={<DashboardOutlined />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title="Total Reservations"
                  value={events.length}
                  prefix={<CalendarOutlined />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title="Available Now"
                  value={resources.filter(r => getResourceStatus(r.id) === 'available').length}
                  prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
                  suffix={`/ ${resources.length}`}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title="Out of Service"
                  value={resources.filter(r => 
                    ['broken', 'maintenance', 'maintenance-due', 'maintenance-overdue']
                      .includes(getResourceStatus(r.id))
                  ).length}
                  prefix={<ExclamationOutlined style={{ color: '#f5222d' }} />}
                  suffix={`/ ${resources.length}`}
                />
              </Card>
            </Col>
          </Row>
          
          <Card title="Status Legend">
            <div className="status-legend">
              <Space size="large">
                <Badge status="success" text="Available" />
                <Badge status="processing" text="In Use" />
                <Badge status="warning" text="Maintenance" />
                <Badge status="error" text="Out of Service" />
              </Space>
            </div>
          </Card>
          
          <Card title="Equipment Status" className="equipment-status-card">
            {resources.length === 0 ? (
              <Empty
                description="No equipment found. Equipment will appear here when added to calendar events."
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            ) : (
              <Row gutter={[16, 16]}>
                {resources.map(resource => {
                  const utilization = calculateUtilization(resource.id);
                  const status = getResourceStatus(resource.id);
                  
                  return (
                    <Col xs={24} sm={12} md={8} lg={6} key={resource.id}>
                      <Card 
                        className={`resource-card status-${status}`}
                        actions={[
                          <Button 
                            type="primary"
                            icon={<CalendarOutlined />}
                            onClick={() => handleViewEquipmentCalendar(resource.id)}
                          >
                            View Schedule
                          </Button>
                        ]}
                      >
                        <div className="resource-card-header">
                          <Title level={4}>{resource.title}</Title>
                          {getStatusBadge(status)}
                        </div>
                        
                        <Divider />
                        
                        <div className="resource-purpose-breakdown">
                          <Text strong>Event Breakdown</Text>
                          <div className="purpose-progress-container">
                            <div className="purpose-progress">
                              <div className="progress-segment utilization" 
                                style={{width: `${utilization.total ? (utilization.utilizationEvents / utilization.total) * 100 : 0}%`}}>
                              </div>
                              <div className="progress-segment maintenance"
                                style={{width: `${utilization.total ? (utilization.maintenanceEvents / utilization.total) * 100 : 0}%`}}>
                              </div>
                              <div className="progress-segment broken"
                                style={{width: `${utilization.total ? (utilization.brokenEvents / utilization.total) * 100 : 0}%`}}>
                              </div>
                            </div>
                            <div className="purpose-counts">
                              <Tag color="blue">{utilization.utilizationEvents} Utilization</Tag>
                              <Tag color="gold">{utilization.maintenanceEvents} Maintenance</Tag>
                              <Tag color="red">{utilization.brokenEvents} Broken</Tag>
                            </div>
                          </div>
                        </div>
                        
                        <div className="resource-utilization">
                          <Text strong>Weekly Utilization</Text>
                          <Progress percent={utilization.utilization} />
                        </div>
                        
                        <div className="resource-stats">
                          <Statistic 
                            title="Weekly Bookings" 
                            value={utilization.thisWeek}
                            valueStyle={{ fontSize: '20px' }}
                          />
                          <Statistic 
                            title="Total Cost" 
                            value={formatCurrency(utilization.totalCost)}
                            valueStyle={{ fontSize: '20px' }}
                          />
                        </div>
                      </Card>
                    </Col>
                  );
                })}
              </Row>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}

export default ResourceDashboard;
