import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { fetchTenant, processCalendarEvent } from '../services/apiClient';
import { demoTenantEvents, demoTenantResources } from '../data/sample-events';
import { Card, Select, Button, Tag, Spin, Space, Alert, Typography, Divider, Row, Col, Statistic } from 'antd';
import { CalendarOutlined, FilterOutlined, ReloadOutlined, CheckCircleOutlined, ExclamationOutlined, CloseCircleOutlined } from '@ant-design/icons';
import './TenantCalendar.css';

const { Option } = Select;
const { Title } = Typography;

// Helper function defined outside of component to ensure ISO date format
const ensureISODateFormat = (events) => {
  if (!Array.isArray(events)) return [];
  
  return events.map(event => {
    const newEvent = { ...event };
    
    // Check if start is not already in ISO format
    if (event.start && typeof event.start === 'string' && !event.start.includes('T')) {
      try {
        const startDate = new Date(event.start);
        if (!isNaN(startDate.getTime())) {
          newEvent.start = startDate.toISOString();
        }
      } catch (e) {
        console.warn(`Failed to parse start date: ${event.start}`);
      }
    }
    
    // Check if end is not already in ISO format
    if (event.end && typeof event.end === 'string' && !event.end.includes('T')) {
      try {
        const endDate = new Date(event.end);
        if (!isNaN(endDate.getTime())) {
          newEvent.end = endDate.toISOString();
        }
      } catch (e) {
        console.warn(`Failed to parse end date: ${event.end}`);
      }
    }
    
    return newEvent;
  });
};

// Helper to get purpose-based CSS class for events
const getPurposeClass = (purpose) => {
  switch(purpose?.toLowerCase()) {
    case 'maintenance':
      return 'event-maintenance';
    case 'broken':
      return 'event-broken';
    case 'utilization':
    default:
      return 'event-utilization';
  }
};

function TenantCalendar() {
  const { tenantId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tenantName, setTenantName] = useState('');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [showWeekends, setShowWeekends] = useState(true);
  
  // Filter states
  const [equipmentFilter, setEquipmentFilter] = useState('all');
  const [technicianFilter, setTechnicianFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [purposeFilter, setPurposeFilter] = useState('all'); // New filter for purpose
  
  // Track unique values for filters
  const [uniqueEquipment, setUniqueEquipment] = useState([]);
  const [uniqueTechnicians, setUniqueTechnicians] = useState([]);
  
  // Reference to track if component is mounted
  const isMounted = useRef(true);
  
  // Get resource filter from URL query params if present
  const searchParams = new URLSearchParams(location.search);
  const resourceFilter = searchParams.get('resourceId');

  // Function to load tenant data - now handles both initial load and background refresh
  const handleReloadData = async (isInitialLoad = false) => {
    try {
      if (isInitialLoad) {
        setLoading(true);
      }
      
      // Special handling for demo tenant
      if (tenantId === 'demo-tenant') {
        // For demo tenant, check if we have saved data in localStorage
        const savedDemoData = localStorage.getItem('demo-tenant-events');
        if (savedDemoData) {
          const parsedEvents = JSON.parse(savedDemoData);
          // Add sample purpose and cost data if not present
          const enhancedEvents = parsedEvents.map(event => ({
            ...event,
            purpose: event.purpose || ['Utilization', 'Maintenance', 'Broken'][Math.floor(Math.random() * 3)],
            cost: event.cost || Math.floor(Math.random() * 1000)
          }));
          
          setEvents(enhancedEvents);
          updateFilterOptions(enhancedEvents);
          applyFilters(enhancedEvents);
          
          // Save back the enhanced data
          localStorage.setItem('demo-tenant-events', JSON.stringify(enhancedEvents));
        } else {
          // Add purpose and cost to demo events
          const enhancedDemoEvents = demoTenantEvents.map(event => ({
            ...event,
            purpose: ['Utilization', 'Maintenance', 'Broken'][Math.floor(Math.random() * 3)],
            cost: Math.floor(Math.random() * 1000)
          }));
          
          setEvents(enhancedDemoEvents);
          updateFilterOptions(enhancedDemoEvents);
          applyFilters(enhancedDemoEvents);
          
          // Save initial demo data to localStorage
          localStorage.setItem('demo-tenant-events', JSON.stringify(enhancedDemoEvents));
        }
        setResources(demoTenantResources);
        setTenantName('Demo Tenant');
        if (isInitialLoad) {
          setLoading(false);
        }
        return;
      }
      
      // Special handling for Product CASE UAT tenant
      if (tenantId === 'productcaseelnlims4uat' || tenantId === 'productcaseelnandlims') {
        setTenantName('Product CASE UAT');
      }
      
      // Normal tenant handling from API
      const tenantData = await fetchTenant(tenantId);
      
      if (tenantData && isMounted.current) {
        // Process events to ensure ISO date format
        const formattedEvents = ensureISODateFormat(tenantData.events || []);
        setEvents(formattedEvents);
        
        // Update filter options and apply filters
        updateFilterOptions(formattedEvents);
        applyFilters(formattedEvents);
        
        setResources(tenantData.resources || []);
        if (!tenantName) {
          setTenantName(tenantData.name || tenantId);
        }
        
        if (process.env.NODE_ENV === 'development') {
          console.log('Calendar data refreshed at', new Date().toLocaleTimeString());
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

  // Extract unique values for filter dropdowns
  const updateFilterOptions = (eventsData) => {
    // Extract unique equipment names
    const equipmentSet = new Set();
    eventsData.forEach(event => {
      if (event.equipment) {
        equipmentSet.add(event.equipment);
      } else if (event.extendedProps && event.extendedProps.equipment) {
        equipmentSet.add(event.extendedProps.equipment);
      }
    });
    
    // Extract unique technician names
    const technicianSet = new Set();
    eventsData.forEach(event => {
      if (event.technician) {
        technicianSet.add(event.technician);
      } else if (event.extendedProps && event.extendedProps.technician) {
        technicianSet.add(event.extendedProps.technician);
      }
    });
    
    setUniqueEquipment(Array.from(equipmentSet).sort());
    setUniqueTechnicians(Array.from(technicianSet).sort());
  };

  // Apply filters to the events
  const applyFilters = (eventsData) => {
    let filtered = [...eventsData];
    
    // Apply equipment filter
    if (equipmentFilter !== 'all') {
      filtered = filtered.filter(event => {
        const equipment = event.equipment || (event.extendedProps && event.extendedProps.equipment);
        return equipment === equipmentFilter;
      });
    }
    
    // Apply technician filter
    if (technicianFilter !== 'all') {
      filtered = filtered.filter(event => {
        const technician = event.technician || (event.extendedProps && event.extendedProps.technician);
        return technician === technicianFilter;
      });
    }
    
    // Apply purpose filter (new)
    if (purposeFilter !== 'all') {
      filtered = filtered.filter(event => {
        const purpose = event.purpose || 
                       (event.extendedProps && event.extendedProps.purpose) || 
                       'Utilization'; // Default if not specified
        return purpose === purposeFilter;
      });
    }
    
    // Apply status filter - based on date
    if (statusFilter !== 'all') {
      const now = new Date();
      
      filtered = filtered.filter(event => {
        try {
          const startDate = new Date(event.start);
          const endDate = new Date(event.end);
          
          if (statusFilter === 'upcoming') {
            return startDate > now;
          } else if (statusFilter === 'ongoing') {
            return startDate <= now && endDate >= now;
          } else if (statusFilter === 'completed') {
            return endDate < now;
          }
          return true;
        } catch (e) {
          console.warn('Error parsing event dates for status filter:', e);
          return true;
        }
      });
    }
    
    setFilteredEvents(filtered);
  };

  // Handle filter changes
  const handleEquipmentFilterChange = (value) => {
    setEquipmentFilter(value);
  };
  
  const handleTechnicianFilterChange = (value) => {
    setTechnicianFilter(value);
  };
  
  const handleStatusFilterChange = (value) => {
    setStatusFilter(value);
  };
  
  const handlePurposeFilterChange = (value) => {
    setPurposeFilter(value);
  };
  
  // Reset all filters
  const resetFilters = () => {
    setEquipmentFilter('all');
    setTechnicianFilter('all');
    setStatusFilter('all');
    setPurposeFilter('all');
  };

  // Initial data load and auth check
  useEffect(() => {
    // Check if admin is authenticated
    const adminAuth = sessionStorage.getItem('adminAuthenticated');
    setIsAdminAuthenticated(adminAuth === 'true');
    
    if (tenantId) {
      handleReloadData(true);
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
        handleReloadData(false);
      }
    }, 30000);
    
    // Clean up interval on component unmount
    return () => {
      clearInterval(refreshInterval);
    };
  }, [tenantId]);
  
  // Update filtered events when filters or events change
  useEffect(() => {
    applyFilters(events);
  }, [equipmentFilter, technicianFilter, statusFilter, purposeFilter, events]);

  const handleDateSelect = async (selectInfo) => {
    const title = prompt('Please enter a new event title:');
    if (!title) return; // User canceled or provided empty title
    
    const calendarApi = selectInfo.view.calendar;
    calendarApi.unselect(); // Clear date selection
    
    try {
      // Create new event object
      const newEvent = {
        id: Date.now().toString(),
        title,
        start: selectInfo.startStr,
        end: selectInfo.endStr,
        allDay: selectInfo.allDay,
        resourceId: resources.length > 0 ? resources[0].id : undefined,
        purpose: 'Utilization', // Default purpose for new events
        cost: 0 // Default cost for new events
      };
      
      // For demo tenant, handle with localStorage
      if (tenantId === 'demo-tenant') {
        const updatedEvents = [...events, newEvent];
        setEvents(updatedEvents);
        calendarApi.addEvent(newEvent);
        
        // Save to localStorage
        localStorage.setItem('demo-tenant-events', JSON.stringify(updatedEvents));
        return;
      }
      
      // Process through API to save to backend
      const savedEvent = await processCalendarEvent(tenantId, newEvent, 'create');
      console.log('Event created successfully:', savedEvent);
      
      // Add to calendar
      calendarApi.addEvent(savedEvent);
      
      // Update local state
      setEvents(prevEvents => [...prevEvents, savedEvent]);
    } catch (error) {
      console.error('Error creating event:', error);
      alert(`Error creating event: ${error.message}`);
    }
  };

  const handleEventClick = (clickInfo) => {
    const event = clickInfo.event;
    
    // Log the full event data for debugging
    console.log('Clicked event full data:', event);
    
    // Find the resource title if a resourceId is assigned
    const resourceTitle = resources.find(r => r.id === event.resourceId)?.title || 'None';

    // Build a comprehensive details message with all available properties
    let detailsMessage = `
Event Details:
Title: ${event.title}
Start: ${event.start.toLocaleString()}
End: ${event.end ? event.end.toLocaleString() : 'N/A'}
`;
    
    // Add all properties that might exist
    // First check top-level props, then check extendedProps
    const checkAndAddProp = (propName, label) => {
      // First check if it's directly in event object
      if (event[propName] !== undefined) {
        detailsMessage += `\n${label}: ${event[propName]}`;
      } 
      // Then check if it's in extendedProps
      else if (event.extendedProps && event.extendedProps[propName] !== undefined) {
        detailsMessage += `\n${label}: ${event.extendedProps[propName]}`;
      }
    };
    
    // Check all possible properties
    checkAndAddProp('location', 'Location');
    checkAndAddProp('equipment', 'Equipment');
    if (event.resourceId) {
      detailsMessage += `\nResource: ${resourceTitle} (ID: ${event.resourceId})`;
    }
    checkAndAddProp('technician', 'Technician');
    checkAndAddProp('sampleType', 'Sample Type');
    checkAndAddProp('notes', 'Notes');
    checkAndAddProp('recordId', 'Record ID');
    
    // Add new properties
    checkAndAddProp('purpose', 'Purpose');
    checkAndAddProp('cost', 'Cost');
    
    // Check if there's an event link and handle it
    const eventLink = event.extendedProps?.eventLink || event.eventLink;
    if (eventLink) {
      // Extract link from the eventLink text if it contains a URL
      const linkMatch = eventLink.match(/(https:\/\/[^\s]+)/);
      if (linkMatch && linkMatch[0]) {
        const url = linkMatch[0];
        // Add the link info to the details message
        detailsMessage += `\n\nAlchemy Record: ${url}`;
        
        // Ask if the user wants to open the link
        if (window.confirm(`${detailsMessage}\n\nDo you want to open the Alchemy record?`)) {
          window.open(url, '_blank');
          return; // Return early since we already showed the confirm dialog
        }
      } else {
        // If no URL could be extracted, just display the eventLink text
        detailsMessage += `\n\nEvent Link: ${eventLink}`;
      }
    }
    
    // Show the alert with all details (only if we didn't already show a confirm dialog)
    alert(detailsMessage);
  };
  
  const handleEventDrop = async (eventDropInfo) => {
    try {
      const { event } = eventDropInfo;
      
      // Get updated event data
      const updatedEvent = {
        id: event.id,
        start: event.startStr,
        end: event.endStr
      };
      
      // For demo tenant, handle with localStorage
      if (tenantId === 'demo-tenant') {
        const updatedEvents = events.map(e => 
          e.id === updatedEvent.id ? {...e, ...updatedEvent} : e
        );
        setEvents(updatedEvents);
        
        // Save to localStorage
        localStorage.setItem('demo-tenant-events', JSON.stringify(updatedEvents));
        return;
      }
      
      // Update on server
      await processCalendarEvent(tenantId, updatedEvent, 'update');
      console.log('Event updated successfully');
    } catch (error) {
      console.error('Error updating event:', error);
      alert(`Error updating event: ${error.message}`);
      eventDropInfo.revert();
    }
  };

  // Handle event deletion
  const handleEventRemove = async (removeInfo) => {
    const { event } = removeInfo;
    
    if (window.confirm(`Are you sure you want to delete the event '${event.title}'?`)) {
      try {
        // For demo tenant, handle with localStorage
        if (tenantId === 'demo-tenant') {
          const updatedEvents = events.filter(e => e.id !== event.id);
          setEvents(updatedEvents);
          
          // Save to localStorage
          localStorage.setItem('demo-tenant-events', JSON.stringify(updatedEvents));
          return;
        }
        
        // Delete on server
        await processCalendarEvent(tenantId, { id: event.id }, 'delete');
        console.log('Event deleted successfully');
      } catch (error) {
        console.error('Error deleting event:', error);
        alert(`Error deleting event: ${error.message}`);
        removeInfo.revert();
      }
    } else {
      removeInfo.revert();
    }
  };

  // Toggle function for showing/hiding weekends
  const toggleWeekends = () => {
    setShowWeekends(!showWeekends);
  };

  // Get display name for the tenant
  const getDisplayName = () => {
    if (tenantId === 'demo-tenant') {
      return 'Demo Tenant';
    } else if (tenantId === 'productcaseelnlims4uat' || tenantId === 'productcaseelnandlims') {
      return 'Product CASE UAT';
    } else {
      return tenantName || tenantId;
    }
  };

  // Generate status counts for statistics
  const getStatusCounts = () => {
    const now = new Date();
    const counts = {
      upcoming: 0,
      ongoing: 0,
      completed: 0
    };
    
    events.forEach(event => {
      try {
        const startDate = new Date(event.start);
        const endDate = new Date(event.end);
        
        if (startDate > now) {
          counts.upcoming++;
        } else if (startDate <= now && endDate >= now) {
          counts.ongoing++;
        } else if (endDate < now) {
          counts.completed++;
        }
      } catch (e) {
        console.warn('Error parsing event dates for counts:', e);
      }
    });
    
    return counts;
  };
  
  // Generate purpose counts for statistics
  const getPurposeCounts = () => {
    const counts = {
      utilization: 0,
      maintenance: 0,
      broken: 0
    };
    
    events.forEach(event => {
      const purpose = event.purpose || 
                     (event.extendedProps && event.extendedProps.purpose) || 
                     'Utilization';
      
      switch (purpose) {
        case 'Maintenance':
          counts.maintenance++;
          break;
        case 'Broken':
          counts.broken++;
          break;
        case 'Utilization':
        default:
          counts.utilization++;
          break;
      }
    });
    
    return counts;
  };
  
  const statusCounts = getStatusCounts();
  const purposeCounts = getPurposeCounts();

  return (
    <div className="tenant-calendar-container">
      <Card className="header-card">
        <div className="header-content">
          <Title level={3}>{getDisplayName()}</Title>
          <div className="header-actions">
            {isAdminAuthenticated && (
              <Button
                type="default"
                icon={<CalendarOutlined />}
                onClick={() => navigate('/admin')}
              >
                Admin Panel
              </Button>
            )}
            <Button
              type="primary"
              icon={<CalendarOutlined />}
              onClick={() => navigate(`/${tenantId}/analytics`)}
            >
              View Analytics
            </Button>
          </div>
        </div>
      </Card>

      {loading ? (
        <Card>
          <div className="loading-container">
            <Spin size="large" tip="Loading calendar data..." />
          </div>
        </Card>
      ) : error ? (
        <Card>
          <Alert
            message="Error Loading Calendar"
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
          {/* Statistics Cards */}
          <Row gutter={16} className="stats-row">
            <Col xs={24} sm={8}>
              <Card className="stat-card">
                <Statistic
                  title="Total Reservations"
                  value={events.length}
                  prefix={<CalendarOutlined />}
                />
                <div className="stat-breakdown">
                  <span>Upcoming: {statusCounts.upcoming}</span>
                  <span>Ongoing: {statusCounts.ongoing}</span>
                  <span>Completed: {statusCounts.completed}</span>
                </div>
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card className="stat-card">
                <Statistic
                  title="Equipment"
                  value={uniqueEquipment.length}
                  suffix={`types / ${resources.length} total`}
                />
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card className="stat-card">
                <Statistic
                  title="Purpose Breakdown"
                  value={purposeCounts.utilization}
                  suffix={`/ ${events.length}`}
                />
                <div className="purpose-legend">
                  <Tag color="blue" icon={<CheckCircleOutlined />}>Utilization: {purposeCounts.utilization}</Tag>
                  <Tag color="gold" icon={<ExclamationOutlined />}>Maintenance: {purposeCounts.maintenance}</Tag>
                  <Tag color="red" icon={<CloseCircleOutlined />}>Broken: {purposeCounts.broken}</Tag>
                </div>
              </Card>
            </Col>
          </Row>

          {/* Filter Panel */}
          <Card className="filter-card">
            <Space direction="vertical" style={{ width: '100%' }}>
              <div className="filter-row">
                <div className="filter-item">
                  <label>Equipment:</label>
                  <Select
                    value={equipmentFilter}
                    onChange={handleEquipmentFilterChange}
                    style={{ width: 200 }}
                  >
                    <Option value="all">All Equipment</Option>
                    {uniqueEquipment.map(item => (
                      <Option key={item} value={item}>{item}</Option>
                    ))}
                  </Select>
                </div>
                
                <div className="filter-item">
                  <label>Technician:</label>
                  <Select
                    value={technicianFilter}
                    onChange={handleTechnicianFilterChange}
                    style={{ width: 200 }}
                  >
                    <Option value="all">All Technicians</Option>
                    {uniqueTechnicians.map(item => (
                      <Option key={item} value={item}>{item}</Option>
                    ))}
                  </Select>
                </div>
                
                <div className="filter-item">
                  <label>Purpose:</label>
                  <Select
                    value={purposeFilter}
                    onChange={handlePurposeFilterChange}
                    style={{ width: 150 }}
                  >
                    <Option value="all">All Purposes</Option>
                    <Option value="Utilization">Utilization</Option>
                    <Option value="Maintenance">Maintenance</Option>
                    <Option value="Broken">Broken</Option>
                  </Select>
                </div>
                
                <div className="filter-item">
                  <label>Status:</label>
                  <Select
                    value={statusFilter}
                    onChange={handleStatusFilterChange}
                    style={{ width: 150 }}
                  >
                    <Option value="all">All Status</Option>
                    <Option value="upcoming">Upcoming</Option>
                    <Option value="ongoing">Ongoing</Option>
                    <Option value="completed">Completed</Option>
                  </Select>
                </div>
              </div>
              
              <div className="filter-actions">
                <Space>
                  <Button 
                    icon={<ReloadOutlined />} 
                    onClick={resetFilters}
                  >
                    Reset Filters
                  </Button>
                  
                  <Button 
                    type={showWeekends ? "default" : "primary"}
                    icon={<CalendarOutlined />}
                    onClick={toggleWeekends}
                  >
                    {showWeekends ? "Hide Weekends" : "Show Weekends"}
                  </Button>
                </Space>
              </div>
              
              {/* Filter summary */}
              {(equipmentFilter !== 'all' || technicianFilter !== 'all' || purposeFilter !== 'all' || statusFilter !== 'all') && (
                <Alert
                  message={
                    <span>
                      Showing {filteredEvents.length} of {events.length} events
                      {equipmentFilter !== 'all' && <Tag className="filter-tag">Equipment: {equipmentFilter}</Tag>}
                      {technicianFilter !== 'all' && <Tag className="filter-tag">Technician: {technicianFilter}</Tag>}
                      {purposeFilter !== 'all' && <Tag className="filter-tag">Purpose: {purposeFilter}</Tag>}
                      {statusFilter !== 'all' && <Tag className="filter-tag">Status: {statusFilter}</Tag>}
                    </span>
                  }
                  type="info"
                  showIcon
                />
              )}
              
              {/* Purpose Legend */}
              <div className="purpose-legend">
                <span>Event Types:</span>
                <Tag color="blue" icon={<CheckCircleOutlined />}>Utilization</Tag>
                <Tag color="gold" icon={<ExclamationOutlined />}>Maintenance</Tag>
                <Tag color="red" icon={<CloseCircleOutlined />}>Broken</Tag>
              </div>
            </Space>
          </Card>

          {/* Calendar */}
          <Card className="calendar-card">
            <FullCalendar
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView="timeGridWeek"
              headerToolbar={{
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,timeGridDay'
              }}
              editable={true}
              selectable={true}
              selectMirror={true}
              dayMaxEvents={true}
              select={handleDateSelect}
              eventClick={handleEventClick}
              eventDrop={handleEventDrop}
              eventRemove={handleEventRemove}
              events={filteredEvents}
              resources={resources}
              height="auto"
              slotMinTime="06:00:00" // Start calendar at 6am
              allDaySlot={true}
              allDayText="all-day"
              weekends={showWeekends} // Control weekends visibility
              
              // Filter by resource if resourceId is provided in URL
              resourceId={resourceFilter}
              
              // Add this eventDataTransform function to handle both top-level and nested properties
              eventDataTransform={(event) => {
                // For handling the transition from nested to top-level properties
                // This ensures both formats work
                const transformedEvent = { ...event };
                
                // Initialize extendedProps if it doesn't exist
                if (!transformedEvent.extendedProps) {
                  transformedEvent.extendedProps = {};
                }
                
                // List of properties that might be at top level or in extendedProps
                const propsToCheck = [
                  'location', 'equipment', 'technician', 'notes', 
                  'recordId', 'sampleType', 'reminders', 'eventLink',
                  'purpose', 'cost' // Add new fields
                ];
                
                // Ensure all properties are accessible in both places
                // This allows the event handler to check both locations
                propsToCheck.forEach(prop => {
                  // Move top-level props to extendedProps for backward compatibility
                  if (transformedEvent[prop] !== undefined && 
                      transformedEvent.extendedProps[prop] === undefined) {
                    transformedEvent.extendedProps[prop] = transformedEvent[prop];
                  }
                  
                  // Also copy from extendedProps to top level for forward compatibility
                  if (transformedEvent.extendedProps[prop] !== undefined && 
                      transformedEvent[prop] === undefined) {
                    transformedEvent[prop] = transformedEvent.extendedProps[prop];
                  }
                });
                
                // Add purpose-based CSS class
                const purpose = transformedEvent.purpose || transformedEvent.extendedProps.purpose || 'Utilization';
                transformedEvent.className = getPurposeClass(purpose);
                
                return transformedEvent;
              }}
              
              // Add cost badge to events
              eventDidMount={(info) => {
                if (info.event.extendedProps.cost) {
                  const costValue = info.event.extendedProps.cost;
                  const title = info.el.querySelector('.fc-event-title');
                  if (title) {
                    const costBadge = document.createElement('span');
                    costBadge.className = 'cost-badge';
                    costBadge.innerText = `$${costValue}`;
                    title.appendChild(costBadge);
                  }
                }
              }}
            />
          </Card>
        </>
      )}
    </div>
  );
}

export default TenantCalendar;
