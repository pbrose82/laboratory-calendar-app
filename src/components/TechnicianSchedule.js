import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Card, Select, Button, Typography, Spin, Alert, 
  Avatar, Timeline, Tag, Empty, Space, Divider
} from 'antd';
import { 
  CalendarOutlined, EnvironmentOutlined, ExperimentOutlined,
  UserOutlined, ClockCircleOutlined, TagOutlined
} from '@ant-design/icons';
import { fetchTenant } from '../services/apiClient';
import { fetchTenantWithDemo } from '../services/demoTenantHelper';
import './ResourceViews.css';

const { Option } = Select;
const { Title, Text } = Typography;

function TechnicianSchedule() {
  const { tenantId } = useParams();
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tenantName, setTenantName] = useState('');
  const [technicians, setTechnicians] = useState([]);
  const [selectedTechnician, setSelectedTechnician] = useState('all');
  
  // Ref to track if component is mounted
  const isMounted = useRef(true);
  
  // Load tenant data function - handles both initial load and background refresh
  const loadTenantData = async (isInitialLoad = false) => {
    try {
      if (isInitialLoad) {
        setLoading(true);
      }
      
      // Special handling for tenant name
      if (tenantId === 'productcaseelnlims4uat' || tenantId === 'productcaseelnandlims') {
        setTenantName('Product CASE UAT');
      }
      
      // Use enhanced fetch function that handles demo tenant
      const tenantData = await fetchTenantWithDemo(tenantId, fetchTenant);
      
      if (tenantData && isMounted.current) {
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
        
        if (process.env.NODE_ENV === 'development') {
          console.log('Extracted technicians from events:', uniqueTechnicians);
        }
        
        // Only use default technicians if none found in events
        if (uniqueTechnicians.length === 0) {
          // Don't use fake names anymore since they're not in events
          setTechnicians([]);
        } else {
          setTechnicians(uniqueTechnicians);
          
          // Auto-select the first technician if one exists and none is selected
          if (selectedTechnician === 'all' && uniqueTechnicians.length > 0) {
            setSelectedTechnician(uniqueTechnicians[0]);
          }
        }
        
        if (!tenantName) {
          setTenantName(tenantData.name || tenantId);
        }
        
        if (process.env.NODE_ENV === 'development') {
          console.log('Technician schedule data refreshed at', new Date().toLocaleTimeString());
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
  
  // Load data initially
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

  // Get technician's events
  const getTechnicianEvents = (technicianName) => {
    // If 'all' is selected, return events for any technician
    if (technicianName === 'all') {
      return events
        .filter(event => event.technician)
        .sort((a, b) => new Date(a.start) - new Date(b.start));
    }
    
    // Otherwise filter events by the specific technician and sort chronologically
    return events
      .filter(event => event.technician === technicianName)
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
    // Check if name is a string and not empty before using charAt
    if (typeof name === 'string' && name.trim().length > 0) {
      return name.charAt(0).toUpperCase();
    }
    return '?';
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

  // Get purpose tag
  const getPurposeTag = (purpose) => {
    if (!purpose) return null;
    
    switch (purpose.toLowerCase()) {
      case 'utilization':
        return <Tag color="blue">Utilization</Tag>;
      case 'maintenance':
        return <Tag color="gold">Maintenance</Tag>;
      case 'broken':
        return <Tag color="red">Broken</Tag>;
      default:
        return <Tag>{purpose}</Tag>;
    }
  };

  // Get events for selected technician
  const filteredEvents = getTechnicianEvents(selectedTechnician);

  // Get color dot for timeline based on event purpose
  const getTimelineColor = (purpose) => {
    if (!purpose) return 'blue'; // default
    
    switch (purpose.toLowerCase()) {
      case 'utilization':
        return 'blue';
      case 'maintenance':
        return 'gold';
      case 'broken':
        return 'red';
      default:
        return 'blue';
    }
  };

  return (
    <div className="dashboard-container">
      <Card className="header-card">
        <div className="header-content">
          <Title level={3}>{getDisplayName()} - Technician Schedule</Title>
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
            <Spin size="large" tip="Loading technician data..." />
          </div>
        </Card>
      ) : error ? (
        <Card>
          <Alert
            message="Error Loading Technician Data"
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
          <Card>
            <div className="technician-selector">
              <Space direction="vertical" style={{ width: '100%' }}>
                <Text strong>Select Technician</Text>
                <Select 
                  value={selectedTechnician}
                  onChange={(value) => setSelectedTechnician(value)}
                  style={{ width: 250 }}
                >
                  <Option value="all">All Technicians</Option>
                  {technicians.map((tech, index) => (
                    <Option key={index} value={tech}>{tech}</Option>
                  ))}
                </Select>
              </Space>
            </div>
          </Card>
          
          {selectedTechnician !== 'all' && (
            <Card>
              <div className="technician-profile">
                <Space size="large" align="center">
                  <Avatar 
                    size={64} 
                    style={{ 
                      backgroundColor: '#1890ff', 
                      fontSize: '24px',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center'
                    }}
                  >
                    {getInitial(selectedTechnician)}
                  </Avatar>
                  <div>
                    <Title level={4} style={{ margin: 0 }}>{selectedTechnician}</Title>
                    <Text type="secondary">Laboratory Technician</Text>
                    <div style={{ marginTop: 8 }}>
                      <Space>
                        <Tag icon={<CalendarOutlined />} color="blue">
                          {filteredEvents.length} Assignment{filteredEvents.length !== 1 ? 's' : ''}
                        </Tag>
                      </Space>
                    </div>
                  </div>
                </Space>
              </div>
            </Card>
          )}
          
          <Card 
            title={
              <Title level={4} style={{ margin: 0 }}>
                Scheduled Assignments
              </Title>
            }
            className="schedule-card"
          >
            {technicians.length === 0 ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="No technicians found in any events. Try adding technician information to your calendar events."
              />
            ) : filteredEvents.length === 0 ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={`No scheduled assignments found for ${selectedTechnician === 'all' ? 'technicians' : selectedTechnician}`}
              />
            ) : (
              <Timeline mode="left">
                {filteredEvents.map((event, index) => (
                  <Timeline.Item 
                    key={index} 
                    color={getTimelineColor(event.purpose)}
                    label={
                      <div className="timeline-date">
                        <div>{new Date(event.start).toLocaleDateString()}</div>
                        <div>{formatTimeRange(event.start, event.end)}</div>
                      </div>
                    }
                  >
                    <Card 
                      className="timeline-event-card"
                      size="small"
                      title={
                        <Space>
                          <span>{event.title}</span>
                          {getPurposeTag(event.purpose)}
                        </Space>
                      }
                      style={{ 
                        borderLeft: `3px solid ${
                          event.purpose === 'Maintenance' ? '#faad14' : 
                          event.purpose === 'Broken' ? '#f5222d' : 
                          '#1890ff'
                        }` 
                      }}
                    >
                      <Space direction="vertical" size={2} style={{ width: '100%' }}>
                        {selectedTechnician === 'all' && (
                          <div>
                            <UserOutlined style={{ marginRight: 8 }} />
                            <Text strong>{event.technician}</Text>
                          </div>
                        )}
                        
                        {event.equipment && (
                          <div>
                            <ExperimentOutlined style={{ marginRight: 8 }} />
                            <Text>{event.equipment}</Text>
                          </div>
                        )}
                        
                        {event.location && (
                          <div>
                            <EnvironmentOutlined style={{ marginRight: 8 }} />
                            <Text>{event.location}</Text>
                          </div>
                        )}
                        
                        {event.notes && (
                          <div className="event-notes">
                            <Text type="secondary">{event.notes}</Text>
                          </div>
                        )}
                      </Space>
                    </Card>
                  </Timeline.Item>
                ))}
              </Timeline>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

export default TechnicianSchedule;
