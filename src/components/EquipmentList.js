import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Card, Table, Button, Space, Tag, Badge, Select, Typography, 
  Progress, Spin, Alert, Row, Col, Statistic, Divider
} from 'antd';
import { 
  CalendarOutlined, FilterOutlined, ReloadOutlined, 
  CheckCircleOutlined, ExclamationOutlined, CloseCircleOutlined
} from '@ant-design/icons';
import { fetchTenant } from '../services/apiClient';
import './ResourceViews.css';

const { Option } = Select;
const { Title, Text } = Typography;

function EquipmentList() {
  const { tenantId } = useParams();
  const navigate = useNavigate();
  const [resources, setResources] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tenantName, setTenantName] = useState('');
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [purposeFilter, setPurposeFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  
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
        // Get resources from API 
        let resourcesList = [...(tenantData.resources || [])];
        
        // Add example Extruder equipment with maintenance status if not present
        if (!resourcesList.some(r => r.title === 'Extruder')) {
          resourcesList.push({
            id: 'extruder-123',
            title: 'Extruder',
            maintenanceStatus: 'due', 
            lastMaintenance: '2024-12-15',
            nextMaintenance: '2025-04-15',
            maintenanceInterval: '90 days'
          });
        }
        
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

  // Get current equipment purpose and status
  const getResourceInfo = (resourceId) => {
    const resource = resources.find(r => r.id === resourceId);
    const now = new Date();
    
    // Get the most recent events for this resource
    const resourceEvents = events.filter(event => 
      event.resourceId === resourceId || 
      event.equipment === resource?.title
    ).sort((a, b) => new Date(b.start) - new Date(a.start));
    
    // Check for active (current) events
    const activeEvent = resourceEvents.find(event => {
      try {
        const eventStart = new Date(event.start);
        const eventEnd = new Date(event.end);
        return eventStart <= now && eventEnd >= now;
      } catch (e) {
        return false;
      }
    });
    
    // Purpose hierarchy: active event purpose > most recent event purpose > default "Available"
    let purpose = "Available";
    let status = "available";
    
    if (activeEvent) {
      purpose = activeEvent.purpose || "Utilization";
      
      // Set status based on purpose
      if (purpose === "Maintenance") {
        status = "maintenance";
      } else if (purpose === "Broken") {
        status = "broken";
      } else {
        status = "in-use"; // For Utilization
      }
    } else if (resourceEvents.length > 0) {
      // Check the most recent event's purpose if no active event
      const lastPurpose = resourceEvents[0].purpose;
      
      // If the last event was for broken equipment and there's no new event,
      // equipment is likely still broken
      if (lastPurpose === "Broken") {
        purpose = "Broken";
        status = "broken";
      }
    }
    
    // Check if maintenance is due (from resource metadata)
    if (status === "available" && resource?.maintenanceStatus === 'due') {
      status = "maintenance-due";
      // Don't change purpose here, as maintenance is planned but not yet happening
    }
    
    // Check if maintenance is overdue
    if (resource?.maintenanceStatus === 'overdue') {
      status = "maintenance-overdue";
      // Don't change purpose here, as maintenance is planned but not yet happening
    }
    
    return { purpose, status };
  };

  // Get next reservation for a resource
  const getNextReservation = (resourceId) => {
    const now = new Date();
    
    const futureEvents = events
      .filter(event => {
        try {
          const eventStart = new Date(event.start);
          return (
            (event.resourceId === resourceId || 
             event.equipment === resources.find(r => r.id === resourceId)?.title) &&
            eventStart > now
          );
        } catch (e) {
          return false;
        }
      })
      .sort((a, b) => {
        try {
          return new Date(a.start) - new Date(b.start);
        } catch (e) {
          return 0;
        }
      });
    
    return futureEvents.length > 0 ? futureEvents[0] : null;
  };

  // Count reservations for a resource
  const countReservations = (resourceId) => {
    return events.filter(event => {
      try {
        return event.resourceId === resourceId || 
               event.equipment === resources.find(r => r.id === resourceId)?.title;
      } catch (e) {
        return false;
      }
    }).length;
  };

  // Count reservations by purpose for a resource
  const countPurposeReservations = (resourceId) => {
    const resourceEvents = events.filter(event => {
      try {
        return event.resourceId === resourceId || 
               event.equipment === resources.find(r => r.id === resourceId)?.title;
      } catch (e) {
        return false;
      }
    });
    
    return {
      total: resourceEvents.length,
      utilization: resourceEvents.filter(e => !e.purpose || e.purpose === 'Utilization').length,
      maintenance: resourceEvents.filter(e => e.purpose === 'Maintenance').length,
      broken: resourceEvents.filter(e => e.purpose === 'Broken').length
    };
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'N/A';
      
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        hour12: true
      }).format(date);
    } catch (e) {
      return 'N/A';
    }
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

  // Handle view equipment schedule
  const handleViewSchedule = (resourceId) => {
    navigate(`/${tenantId}?resourceId=${resourceId}`);
  };

  // Filter and sort resources
  const getFilteredResources = () => {
    let filteredList = [...resources];
    
    // Apply status filter
    if (statusFilter !== 'all') {
      filteredList = filteredList.filter(resource => {
        const { status } = getResourceInfo(resource.id);
        
        if (statusFilter === 'maintenance') {
          return status === 'maintenance-due' || status === 'maintenance-overdue' || status === 'maintenance';
        }
        
        return status === statusFilter;
      });
    }
    
    // Apply purpose filter
    if (purposeFilter !== 'all') {
      filteredList = filteredList.filter(resource => {
        const { purpose } = getResourceInfo(resource.id);
        return purpose === purposeFilter;
      });
    }
    
    // Sort resources
    return filteredList.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return (a.title || '').localeCompare(b.title || '');
        case 'status': {
          const statusA = getResourceInfo(a.id).status;
          const statusB = getResourceInfo(b.id).status;
          // Status priority order
          const statusOrder = { 
            'broken': 0,
            'maintenance-overdue': 1, 
            'maintenance': 2,
            'maintenance-due': 3, 
            'in-use': 4, 
            'available': 5 
          };
          return (statusOrder[statusA] || 6) - (statusOrder[statusB] || 6);
        }
        case 'purpose': {
          const purposeA = getResourceInfo(a.id).purpose;
          const purposeB = getResourceInfo(b.id).purpose;
          // Purpose priority order
          const purposeOrder = {
            'Broken': 0,
            'Maintenance': 1,
            'Utilization': 2,
            'Available': 3
          };
          return (purposeOrder[purposeA] || 4) - (purposeOrder[purposeB] || 4);
        }
        case 'reservations':
          return countReservations(b.id) - countReservations(a.id);
        case 'maintenance': {
          const daysA = a.nextMaintenance ? getDaysUntilMaintenance(a.nextMaintenance) : 9999;
          const daysB = b.nextMaintenance ? getDaysUntilMaintenance(b.nextMaintenance) : 9999;
          return (daysA || 9999) - (daysB || 9999);
        }
        default:
          return 0;
      }
    });
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

  // Get status badge
  const getStatusBadge = (status) => {
    switch (status) {
      case 'available':
        return <Badge status="success" text="Available" />;
      case 'in-use':
        return <Badge status="processing" text="In Use" />;
      case 'broken':
        return <Badge status="error" text="Broken" />;
      case 'maintenance':
        return <Badge status="warning" text="In Maintenance" />;
      case 'maintenance-due':
        return <Badge status="warning" text="Maintenance Due" />;
      case 'maintenance-overdue':
        return <Badge status="error" text="Maintenance Overdue" />;
      default:
        return <Badge status="default" text="Unknown" />;
    }
  };

  // Get purpose tag
  const getPurposeTag = (purpose) => {
    switch (purpose) {
      case 'Available':
        return <Tag color="green" icon={<CheckCircleOutlined />}>{purpose}</Tag>;
      case 'Utilization':
        return <Tag color="blue" icon={<CalendarOutlined />}>{purpose}</Tag>;
      case 'Maintenance':
        return <Tag color="gold" icon={<ExclamationOutlined />}>{purpose}</Tag>;
      case 'Broken':
        return <Tag color="red" icon={<CloseCircleOutlined />}>{purpose}</Tag>;
      default:
        return <Tag>{purpose}</Tag>;
    }
  };

  // Format maintenance info
  const getMaintenanceInfo = (resource) => {
    if (!resource.nextMaintenance) return null;
    
    const daysUntil = getDaysUntilMaintenance(resource.nextMaintenance);
    
    if (daysUntil === null) return null;
    
    if (daysUntil <= 0) {
      return <Text type="danger">{Math.abs(daysUntil)} days overdue</Text>;
    } else if (daysUntil <= 7) {
      return <Text type="warning">Due in {daysUntil} days</Text>;
    } else {
      return <Text type="secondary">Due in {daysUntil} days</Text>;
    }
  };

  // Status count statistics
  const statusCounts = {
    available: resources.filter(r => getResourceInfo(r.id).status === 'available').length,
    inUse: resources.filter(r => getResourceInfo(r.id).status === 'in-use').length,
    maintenance: resources.filter(r => 
      ['maintenance', 'maintenance-due', 'maintenance-overdue'].includes(getResourceInfo(r.id).status)
    ).length,
    broken: resources.filter(r => getResourceInfo(r.id).status === 'broken').length
  };

  // Equipment table columns
  const columns = [
    {
      title: 'Equipment',
      dataIndex: 'title',
      key: 'name',
      sorter: (a, b) => a.title.localeCompare(b.title),
      render: (text) => <Text strong>{text}</Text>,
    },
    {
      title: 'Status',
      key: 'status',
      render: (_, record) => {
        const { status } = getResourceInfo(record.id);
        const maintenanceInfo = ['maintenance-due', 'maintenance-overdue'].includes(status) ? 
          getMaintenanceInfo(record) : null;
        
        return (
          <Space direction="vertical" size={0}>
            {getStatusBadge(status)}
            {maintenanceInfo}
          </Space>
        );
      },
      sorter: (a, b) => {
        const statusA = getResourceInfo(a.id).status;
        const statusB = getResourceInfo(b.id).status;
        const statusOrder = { 
          'broken': 0,
          'maintenance-overdue': 1, 
          'maintenance': 2,
          'maintenance-due': 3, 
          'in-use': 4, 
          'available': 5 
        };
        return (statusOrder[statusA] || 6) - (statusOrder[statusB] || 6);
      },
    },
    {
      title: 'Purpose',
      key: 'purpose',
      render: (_, record) => {
        const { purpose } = getResourceInfo(record.id);
        return getPurposeTag(purpose);
      },
      sorter: (a, b) => {
        const purposeA = getResourceInfo(a.id).purpose;
        const purposeB = getResourceInfo(b.id).purpose;
        const purposeOrder = {
          'Broken': 0,
          'Maintenance': 1,
          'Utilization': 2,
          'Available': 3
        };
        return (purposeOrder[purposeA] || 4) - (purposeOrder[purposeB] || 4);
      },
    },
    {
      title: 'Reservation Stats',
      key: 'stats',
      render: (_, record) => {
        const purposeCounts = countPurposeReservations(record.id);
        const totalCount = purposeCounts.total;
        
        if (totalCount === 0) {
          return <Text type="secondary">No reservations</Text>;
        }
        
        return (
          <Space direction="vertical" size={2} style={{ width: '100%' }}>
            <div className="purpose-mini-chart">
              <div className="mini-bar utilization" style={{ 
                width: `${totalCount ? (purposeCounts.utilization / totalCount) * 100 : 0}%` 
              }}></div>
              <div className="mini-bar maintenance" style={{ 
                width: `${totalCount ? (purposeCounts.maintenance / totalCount) * 100 : 0}%` 
              }}></div>
              <div className="mini-bar broken" style={{ 
                width: `${totalCount ? (purposeCounts.broken / totalCount) * 100 : 0}%` 
              }}></div>
            </div>
            <Space size={4}>
              <Tag color="blue">{purposeCounts.utilization} U</Tag>
              <Tag color="gold">{purposeCounts.maintenance} M</Tag>
              <Tag color="red">{purposeCounts.broken} B</Tag>
              <span style={{ marginLeft: 4 }}>{totalCount} total</span>
            </Space>
          </Space>
        );
      },
    },
    {
      title: 'Next Event',
      key: 'nextEvent',
      render: (_, record) => {
        const status = getResourceInfo(record.id).status;
        const nextReservation = getNextReservation(record.id);
        
        if (status === 'maintenance-due' && record.nextMaintenance) {
          return (
            <div className="next-event maintenance">
              <Space>
                <ExclamationOutlined style={{ color: '#faad14' }} />
                <div>
                  <div>Scheduled Maintenance</div>
                  <div>{new Date(record.nextMaintenance).toLocaleDateString()}</div>
                </div>
              </Space>
            </div>
          );
        } else if (nextReservation) {
          const purpose = nextReservation.purpose || 'Utilization';
          const icon = purpose === 'Maintenance' ? <ExclamationOutlined style={{ color: '#faad14' }} /> : 
                       purpose === 'Broken' ? <CloseCircleOutlined style={{ color: '#f5222d' }} /> : 
                       <CalendarOutlined style={{ color: '#1890ff' }} />;
          
          return (
            <div className="next-event">
              <Space>
                {icon}
                <div>
                  <div>{nextReservation.title}</div>
                  <div className="event-date">{formatDate(nextReservation.start)}</div>
                </div>
              </Space>
            </div>
          );
        } else {
          return <Text type="secondary">No upcoming events</Text>;
        }
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Button 
          type="primary"
          size="small"
          icon={<CalendarOutlined />}
          onClick={() => handleViewSchedule(record.id)}
        >
          Schedule
        </Button>
      ),
    },
  ];

  return (
    <div className="dashboard-container">
      <Card className="header-card">
        <div className="header-content">
          <Title level={3}>{getDisplayName()} - Equipment List</Title>
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
            <Spin size="large" tip="Loading equipment data..." />
          </div>
        </Card>
      ) : error ? (
        <Card>
          <Alert
            message="Error Loading Equipment"
            description={error}
            type="error"
            showIcon
          />
        </Card>
      ) : (
        <>
          <Card className="stats-card">
            <Row gutter={16}>
              <Col xs={24} sm={12} md={6}>
                <Statistic 
                  title="Available" 
                  value={statusCounts.available}
                  valueStyle={{ color: '#52c41a' }}
                  prefix={<CheckCircleOutlined />}
                />
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Statistic 
                  title="In Use" 
                  value={statusCounts.inUse}
                  valueStyle={{ color: '#1890ff' }}
                  prefix={<CalendarOutlined />}
                />
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Statistic 
                  title="Maintenance" 
                  value={statusCounts.maintenance}
                  valueStyle={{ color: '#faad14' }}
                  prefix={<ExclamationOutlined />}
                />
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Statistic 
                  title="Broken" 
                  value={statusCounts.broken}
                  valueStyle={{ color: '#f5222d' }}
                  prefix={<CloseCircleOutlined />}
                />
              </Col>
            </Row>
          </Card>
        
          <Card className="filter-card">
            <Space direction="vertical" style={{ width: '100%' }}>
              <div className="filter-row">
                <div className="filter-item">
                  <Text strong>Filter by Status</Text>
                  <Select
                    style={{ width: 180 }}
                    value={statusFilter}
                    onChange={(value) => setStatusFilter(value)}
                  >
                    <Option value="all">All Statuses</Option>
                    <Option value="available">Available Now</Option>
                    <Option value="in-use">In Use Now</Option>
                    <Option value="broken">Broken</Option>
                    <Option value="maintenance">Maintenance</Option>
                  </Select>
                </div>
                
                <div className="filter-item">
                  <Text strong>Filter by Purpose</Text>
                  <Select
                    style={{ width: 180 }}
                    value={purposeFilter}
                    onChange={(value) => setPurposeFilter(value)}
                  >
                    <Option value="all">All Purposes</Option>
                    <Option value="Available">Available</Option>
                    <Option value="Utilization">Utilization</Option>
                    <Option value="Maintenance">Maintenance</Option>
                    <Option value="Broken">Broken</Option>
                  </Select>
                </div>
                
                <div className="filter-item">
                  <Text strong>Sort By</Text>
                  <Select
                    style={{ width: 180 }}
                    value={sortBy}
                    onChange={(value) => setSortBy(value)}
                  >
                    <Option value="name">Name</Option>
                    <Option value="status">Current Status</Option>
                    <Option value="purpose">Purpose</Option>
                    <Option value="reservations">Total Reservations</Option>
                    <Option value="maintenance">Maintenance Due Date</Option>
                  </Select>
                </div>
                
                <div className="filter-actions">
                  <Button
                    icon={<ReloadOutlined />}
                    onClick={() => {
                      setStatusFilter('all');
                      setPurposeFilter('all');
                      setSortBy('name');
                    }}
                  >
                    Reset Filters
                  </Button>
                </div>
              </div>
              
              {(statusFilter !== 'all' || purposeFilter !== 'all') && (
                <Alert
                  message={
                    <span>
                      Showing {getFilteredResources().length} of {resources.length} equipment
                      {statusFilter !== 'all' && <Tag className="filter-tag">Status: {statusFilter}</Tag>}
                      {purposeFilter !== 'all' && <Tag className="filter-tag">Purpose: {purposeFilter}</Tag>}
                    </span>
                  }
                  type="info"
                  showIcon
                />
              )}
            </Space>
          </Card>
          
          <Card>
            <Table
              columns={columns}
              dataSource={getFilteredResources()}
              rowKey="id"
              pagination={{ pageSize: 10 }}
              rowClassName={(record) => {
                const { status } = getResourceInfo(record.id);
                return `equipment-row ${status}`;
              }}
              locale={{
                emptyText: resources.length === 0 ? 
                  'No equipment found. Equipment will appear here when added to calendar events.' : 
                  'No equipment found matching the selected filters'
              }}
            />
          </Card>
          
          <Card className="legend-card">
            <Space size="large">
              <Badge status="success" text="Available" />
              <Badge status="processing" text="In Use" />
              <Badge status="warning" text="Maintenance" />
              <Badge status="error" text="Broken" />
            </Space>
          </Card>
        </>
      )}
    </div>
  );
}

export default EquipmentList;
