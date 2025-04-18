import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Card, Button, Select, Typography, Input, Space, 
  Spin, Alert, Badge, Tag, Tooltip, Empty, Divider
} from 'antd';
import { 
  CalendarOutlined, LeftOutlined, RightOutlined,
  SearchOutlined, ReloadOutlined, FilterOutlined
} from '@ant-design/icons';
import { fetchTenant } from '../services/apiClient';
import './ResourceViews.css';
const { Option } = Select;
const { Title, Text } = Typography;
const { Search } = Input;
function GanttChart() {
  const { tenantId } = useParams();
  const navigate = useNavigate();
  const [resources, setResources] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tenantName, setTenantName] = useState('');
  const [viewType, setViewType] = useState('week'); // 'day' or 'week'
  const [startDate, setStartDate] = useState(getDefaultStartDate());
  const [showWeekends, setShowWeekends] = useState(true);
  const [selectedResource, setSelectedResource] = useState('all');
  const [searchText, setSearchText] = useState('');
  
  // Reference to track if component is mounted
  const isMounted = useRef(true);
  
  // Track last refresh time for display purposes
  const [lastRefreshTime, setLastRefreshTime] = useState(null);

  // Get default start date (beginning of current week)
  function getDefaultStartDate() {
    const date = new Date();
    date.setDate(date.getDate() - date.getDay()); // Start from Sunday
    date.setHours(0, 0, 0, 0);
    return date;
  }

  // Function to load tenant data - background refresh
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
        // Only update state if component is still mounted
        setResources(tenantData.resources || []);
        setEvents(tenantData.events || []);
        
        if (!tenantName) {
          setTenantName(tenantData.name || tenantId);
        }
        
        // Update last refresh time
        setLastRefreshTime(new Date());
        
        // Log refresh without cluttering console too much
        if (process.env.NODE_ENV === 'development') {
          console.log('Data refreshed at', new Date().toLocaleTimeString());
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
    
    // Cleanup function to set mounted state to false when unmounting
    return () => {
      isMounted.current = false;
    };
  }, [tenantId]);
  
  // Set up automatic background refresh
  useEffect(() => {
    // Refresh data every 30 seconds in the background
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

  // Filter resources based on selection
  const getFilteredResources = () => {
    if (selectedResource === 'all') {
      return resources;
    }
    return resources.filter(r => r.id === selectedResource);
  };

  // Filter events based on search and resource
  const getFilteredEvents = () => {
    return events.filter(event => {
      // Filter by resource
      const matchesResource = selectedResource === 'all' || 
                             event.resourceId === selectedResource ||
                             event.equipment === resources.find(r => r.id === selectedResource)?.title;
      
      // Filter by search text
      const matchesSearch = !searchText || 
                           (event.title && event.title.toLowerCase().includes(searchText.toLowerCase())) ||
                           (event.technician && event.technician.toLowerCase().includes(searchText.toLowerCase())) ||
                           (event.equipment && event.equipment.toLowerCase().includes(searchText.toLowerCase())) ||
                           (event.notes && event.notes.toLowerCase().includes(searchText.toLowerCase()));
      
      return matchesResource && matchesSearch;
    });
  };

  // Calculate days array for the gantt chart
  const getDays = () => {
    const days = [];
    let currentDate = new Date(startDate);
    
    if (viewType === 'day') {
      // For day view, return hours
      for (let hour = 6; hour < 20; hour++) { // 6 AM to 8 PM
        const hourDate = new Date(currentDate);
        hourDate.setHours(hour, 0, 0, 0);
        days.push({
          date: hourDate,
          label: `${hour % 12 === 0 ? 12 : hour % 12}${hour < 12 ? 'am' : 'pm'}`
        });
      }
    } else {
      // For week view, return days
      let endDate;
      if (viewType === 'week') {
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 7);
      }
      
      while (currentDate < endDate) {
        if (showWeekends || (currentDate.getDay() !== 0 && currentDate.getDay() !== 6)) {
          days.push({
            date: new Date(currentDate),
            label: formatDate(currentDate)
          });
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }
    
    return days;
  };

  // Format date for display
  const formatDate = (date) => {
    const dayName = new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(date);
    const monthDay = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date);
    return `${dayName} ${monthDay}`;
  };

  // Get display position of an event
  const getEventPosition = (event, days) => {
    if (!event.start || !event.end) return null;
    
    let eventStart = new Date(event.start);
    let eventEnd = new Date(event.end);
    
    if (viewType === 'day') {
      // Only show events for the selected day
      if (eventStart.getDate() !== startDate.getDate() || 
          eventStart.getMonth() !== startDate.getMonth() || 
          eventStart.getFullYear() !== startDate.getFullYear()) {
        return null;
      }
      
      const dayStart = 6; // 6am
      const dayEnd = 20; // 8pm
      const totalHours = dayEnd - dayStart;
      
      // Get hour with decimal for minutes
      const startHour = eventStart.getHours() + (eventStart.getMinutes() / 60);
      const endHour = eventEnd.getHours() + (eventEnd.getMinutes() / 60);
      
      // If event is outside visible hours, adjust or skip
      if (endHour <= dayStart || startHour >= dayEnd) return null;
      
      const adjustedStart = Math.max(startHour, dayStart);
      const adjustedEnd = Math.min(endHour, dayEnd);
      
      const left = ((adjustedStart - dayStart) / totalHours) * 100;
      const width = ((adjustedEnd - adjustedStart) / totalHours) * 100;
      
      return {
        left: `${left}%`,
        width: `${Math.max(width, 2)}%` // Ensure minimum width for visibility
      };
    } else {
      // Week view
      const firstDay = days[0].date;
      const lastDay = days[days.length - 1].date;
      lastDay.setHours(23, 59, 59, 999); // End of the last day
      
      // Skip events outside the range
      if (eventEnd < firstDay || eventStart > lastDay) return null;
      
      // Adjust events that extend beyond the range
      if (eventStart < firstDay) eventStart = new Date(firstDay);
      if (eventEnd > lastDay) eventEnd = new Date(lastDay);
      
      // Calculate position as percentage of total range
      const totalRange = lastDay - firstDay;
      const eventStartOffset = eventStart - firstDay;
      const eventDuration = eventEnd - eventStart;
      
      const left = (eventStartOffset / totalRange) * 100;
      const width = (eventDuration / totalRange) * 100;
      
      return {
        left: `${left}%`,
        width: `${Math.max(width, 0.5)}%` // Ensure minimum width for visibility
      };
    }
  };

  // Move time range (previous/next)
  const moveTimeRange = (direction) => {
    const newStartDate = new Date(startDate);
    
    if (direction === 'prev') {
      if (viewType === 'day') {
        newStartDate.setDate(newStartDate.getDate() - 1);
      } else if (viewType === 'week') {
        newStartDate.setDate(newStartDate.getDate() - 7);
      }
    } else {
      if (viewType === 'day') {
        newStartDate.setDate(newStartDate.getDate() + 1);
      } else if (viewType === 'week') {
        newStartDate.setDate(newStartDate.getDate() + 7);
      }
    }
    
    setStartDate(newStartDate);
  };

  // Reset to today
  const goToToday = () => {
    if (viewType === 'day') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      setStartDate(today);
    } else {
      setStartDate(getDefaultStartDate());
    }
  };

  // Get formatted title for the current view
  const getViewTitle = () => {
    if (viewType === 'day') {
      return new Intl.DateTimeFormat('en-US', { 
        weekday: 'long',
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }).format(startDate);
    } else if (viewType === 'week') {
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      
      const startMonth = new Intl.DateTimeFormat('en-US', { month: 'short' }).format(startDate);
      const endMonth = new Intl.DateTimeFormat('en-US', { month: 'short' }).format(endDate);
      
      return `${startMonth} ${startDate.getDate()} - ${endMonth} ${endDate.getDate()}, ${startDate.getFullYear()}`;
    }
  };

  // Get event tooltip content
  const getEventTooltip = (event) => {
    const start = new Date(event.start);
    const end = new Date(event.end);
    
    return `${event.title}
Start: ${start.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
End: ${end.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
${event.technician ? `Technician: ${event.technician}` : ''}
${event.sampleType ? `Sample Type: ${event.sampleType}` : ''}
${event.notes ? `Notes: ${event.notes}` : ''}`;
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

  // Handle view change
  const handleViewChange = (newView) => {
    setViewType(newView);
    // Reset start date to today when changing views
    if (newView === 'day') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      setStartDate(today);
    } else {
      setStartDate(getDefaultStartDate());
    }
  };

  // Get the days/hours for the current view
  const days = getDays();
  
  // Get filtered resources and events
  const filteredResources = getFilteredResources();
  const filteredEvents = getFilteredEvents();

  // Handle manual refresh
  const handleManualRefresh = () => {
    loadTenantData(true);
  };

  return (
    <div className="dashboard-container">
      <Card 
        title={
          <Space>
            <Title level={4} style={{ margin: 0 }}>{getDisplayName()} - Gantt Chart</Title>
          </Space>
        }
        extra={
          <Button 
            type="primary" 
            icon={<CalendarOutlined />}
            onClick={() => navigate(`/${tenantId}`)}
          >
            Calendar View
          </Button>
        }
        style={{ width: '100%' }}
      >
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
            <Spin size="large" tip="Loading gantt chart data..." />
          </div>
        ) : error ? (
          <Alert
            message="Error"
            description={
              <>
                <p>{error}</p>
                <Button type="primary" onClick={() => navigate('/')}>
                  Return to Main Dashboard
                </Button>
              </>
            }
            type="error"
            showIcon
          />
        ) : (
          <div className="gantt-chart">
            <Card
              size="small"
              style={{ marginBottom: '16px' }}
              bodyStyle={{ padding: '12px' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
                <Space>
                  <Button 
                    icon={<LeftOutlined />}
                    onClick={() => moveTimeRange('prev')}
                  />
                  
                  <Select 
                    value={viewType}
                    onChange={handleViewChange}
                    style={{ width: '100px' }}
                  >
                    <Option value="day">Day</Option>
                    <Option value="week">Week</Option>
                  </Select>
                  
                  <Button 
                    icon={<RightOutlined />}
                    onClick={() => moveTimeRange('next')}
                  />
                  
                  <Button 
                    onClick={goToToday}
                  >
                    Today
                  </Button>
                  
                  <Text strong style={{ marginLeft: '8px' }}>{getViewTitle()}</Text>
                </Space>
                
                <Space style={{ marginTop: '8px' }}>
                  <Select 
                    placeholder="Select Equipment"
                    value={selectedResource}
                    onChange={setSelectedResource}
                    style={{ width: '200px' }}
                  >
                    <Option value="all">All Equipment</Option>
                    {resources.map((resource) => (
                      <Option key={resource.id} value={resource.id}>
                        {resource.title || resource.name}
                      </Option>
                    ))}
                  </Select>
                  
                  <Search
                    placeholder="Search events..."
                    allowClear
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    style={{ width: '200px' }}
                  />
                  
                  {viewType === 'week' && (
                    <Button 
                      type={showWeekends ? "primary" : "default"}
                      onClick={() => setShowWeekends(!showWeekends)}
                    >
                      {showWeekends ? "Hide Weekends" : "Show Weekends"}
                    </Button>
                  )}
                  
                  <Tooltip title="Refresh Data">
                    <Button 
                      icon={<ReloadOutlined />} 
                      onClick={handleManualRefresh}
                    />
                  </Tooltip>
                </Space>
              </div>
            </Card>
            
            {filteredResources.length === 0 ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="No equipment found. Equipment will appear here when added to calendar events."
                style={{ margin: '40px 0' }}
              />
            ) : (
              <div className="gantt-container" style={{ border: '1px solid #f0f0f0', borderRadius: '4px' }}>
                {/* Header row with day/hour columns */}
                <div className="gantt-row gantt-header-row" style={{ backgroundColor: '#f5f5f5', padding: '8px 0' }}>
                  <div className="gantt-label" style={{ width: '150px', padding: '0 12px', fontWeight: 'bold' }}></div>
                  <div className="gantt-timeline" style={{ flex: 1, position: 'relative' }}>
                    <div className="gantt-days" style={{ display: 'flex' }}>
                      {days.map((day, index) => (
                        <div 
                          className={`gantt-day ${
                            new Date().toDateString() === day.date.toDateString() ? 'today' : ''
                          }`} 
                          key={index}
                          style={{ 
                            flex: 1, 
                            textAlign: 'center',
                            backgroundColor: new Date().toDateString() === day.date.toDateString() ? '#e6f7ff' : 'transparent',
                            fontWeight: 'bold',
                            padding: '4px 0'
                          }}
                        >
                          {day.label}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                
                {/* Resource rows */}
                {filteredResources.map(resource => (
                  <div 
                    className="gantt-row" 
                    key={resource.id}
                    style={{ 
                      display: 'flex', 
                      borderTop: '1px solid #f0f0f0',
                      minHeight: '50px'
                    }}
                  >
                    <div 
                      className="gantt-label"
                      style={{ 
                        width: '150px', 
                        padding: '12px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        backgroundColor: '#fafafa'
                      }}
                      onClick={() => navigate(`/${tenantId}?resourceId=${resource.id}`)}
                    >
                      <Tooltip title="Click to view calendar for this equipment">
                        {resource.title || resource.name}
                      </Tooltip>
                    </div>
                    <div 
                      className="gantt-timeline"
                      style={{ 
                        flex: 1, 
                        position: 'relative',
                        minHeight: '50px'
                      }}
                    >
                      <div 
                        className="gantt-days"
                        style={{ 
                          display: 'flex',
                          height: '100%',
                          position: 'absolute',
                          width: '100%'
                        }}
                      >
                        {days.map((day, index) => (
                          <div 
                            className="gantt-day" 
                            key={index}
                            style={{ 
                              flex: 1, 
                              borderLeft: index > 0 ? '1px dashed #eee' : 'none',
                              height: '100%'
                            }}
                          ></div>
                        ))}
                      </div>
                      
                      {/* Current time indicator for day view */}
                      {viewType === 'day' && 
                        new Date().toDateString() === startDate.toDateString() && (
                        <div 
                          className="current-time-indicator" 
                          style={{
                            position: 'absolute',
                            top: 0,
                            bottom: 0,
                            width: '2px',
                            backgroundColor: '#f5222d',
                            left: `${((new Date().getHours() + (new Date().getMinutes() / 60) - 6) / 14) * 100}%`,
                            zIndex: 10
                          }}
                        ></div>
                      )}
                      
                      {/* Event bars */}
                      {filteredEvents
                        .filter(event => 
                          event.resourceId === resource.id || 
                          event.equipment === resource.title
                        )
                        .map((event, eventIndex) => {
                          const position = getEventPosition(event, days);
                          if (!position) return null;
                          
                          // Extract ER number if present
                          const erMatch = event.title.match(/ER\d+/);
                          const shortTitle = erMatch ? erMatch[0] : 
                                          event.title.length > 10 ? 
                                          `${event.title.substring(0, 10)}...` : 
                                          event.title;
                          
                          return (
                            <Tooltip 
                              title={getEventTooltip(event)}
                              key={eventIndex}
                            >
                              <div 
                                className="gantt-bar"
                                style={{
                                  position: 'absolute',
                                  top: '8px',
                                  height: 'calc(100% - 16px)',
                                  backgroundColor: '#1890ff',
                                  borderRadius: '3px',
                                  color: 'white',
                                  padding: '2px 6px',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  fontSize: '12px',
                                  cursor: 'pointer',
                                  ...position
                                }}
                                onClick={() => {
                                  // Show detailed event info using Ant Design modal
                                  // For simplicity, using alert here like the original
                                  alert(getEventTooltip(event));
                                }}
                              >
                                {shortTitle}
                              </div>
                            </Tooltip>
                          );
                        })}
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              marginTop: '16px',
              padding: '8px',
              backgroundColor: '#fafafa',
              borderRadius: '4px'
            }}>
              <Space>
                <Badge color="#1890ff" text="Equipment Reservation" />
              </Space>
              
              <Space>
                <Tag color="blue">{filteredEvents.length} events</Tag>
                <Tag color="green">{filteredResources.length} equipment</Tag>
                {lastRefreshTime && (
                  <Text type="secondary">
                    Last refreshed: {lastRefreshTime.toLocaleTimeString()}
                  </Text>
                )}
              </Space>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

export default GanttChart;
