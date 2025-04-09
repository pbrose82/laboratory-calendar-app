import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { fetchTenant, processCalendarEvent } from '../services/apiClient';
import { demoTenantEvents, demoTenantResources } from '../data/sample-events';
import './TenantCalendar.css';

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

function TenantCalendar() {
  const { tenantId } = useParams();
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tenantName, setTenantName] = useState('');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [showWeekends, setShowWeekends] = useState(true);

  useEffect(() => {
    // Check if admin is authenticated
    const adminAuth = sessionStorage.getItem('adminAuthenticated');
    setIsAdminAuthenticated(adminAuth === 'true');
    
    async function loadTenantData() {
      try {
        setLoading(true);
        
        // Special handling for demo tenant
        if (tenantId === 'demo-tenant') {
          // For demo tenant, check if we have saved data in localStorage
          const savedDemoData = localStorage.getItem('demo-tenant-events');
          if (savedDemoData) {
            setEvents(JSON.parse(savedDemoData));
          } else {
            setEvents(demoTenantEvents);
            // Save initial demo data to localStorage
            localStorage.setItem('demo-tenant-events', JSON.stringify(demoTenantEvents));
          }
          setResources(demoTenantResources);
          setTenantName('Demo Tenant');
          setLoading(false);
          return;
        }
        
        // Special handling for Product CASE UAT tenant
        if (tenantId === 'productcaseelnlims4uat' || tenantId === 'productcaseelnandlims') {
          setTenantName('Product CASE UAT');
        }
        
        // Normal tenant handling from API
        const tenantData = await fetchTenant(tenantId);
        
        if (tenantData) {
          console.log('Loaded tenant data:', tenantData);
          
          // Process events to ensure ISO date format
          const formattedEvents = ensureISODateFormat(tenantData.events || []);
          console.log('Events after date format validation:', formattedEvents);
          setEvents(formattedEvents);
          
          setResources(tenantData.resources || []);
          if (!tenantName) {
            setTenantName(tenantData.name || tenantId);
          }
        } else {
          setError(`Tenant "${tenantId}" not found`);
        }
      } catch (err) {
        console.error('Failed to load tenant data:', err);
        setError(`Error loading tenant data: ${err.message}`);
      } finally {
        setLoading(false);
      }
    }

    if (tenantId) {
      loadTenantData();
    }
}, [tenantId, tenantName]);

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
        resourceId: resources.length > 0 ? resources[0].id : undefined
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
      // First check if it's directly in event object or in _def object
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
    
    // Show the alert with all details
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

  // Reload data from server
  const handleReloadData = async () => {
    try {
      setLoading(true);
      const tenantData = await fetchTenant(tenantId);
      
      if (tenantData) {
        const formattedEvents = ensureISODateFormat(tenantData.events || []);
        setEvents(formattedEvents);
        setResources(tenantData.resources || []);
        if (!tenantName) {
          setTenantName(tenantData.name || tenantId);
        }
      }
    } catch (error) {
      console.error('Error reloading data:', error);
      alert(`Error reloading data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard-container">
      <div className="content-header">
        <h1>{getDisplayName()}</h1>
        <div className="header-actions">
          {/* Weekend toggle button */}
          <button 
            className={`btn ${showWeekends ? 'btn-outline-primary' : 'btn-primary'}`}
            onClick={toggleWeekends}
          >
            <i className="fas fa-calendar-week me-1"></i>
            {showWeekends ? "Hide Weekends" : "Show Weekends"}
          </button>
          
          {/* Reload data button */}
          <button 
            className="btn btn-outline-secondary ms-2"
            onClick={handleReloadData}
            title="Reload data from server"
          >
            <i className="fas fa-sync-alt me-1"></i>
            Reload
          </button>
          
          {/* Back button */}
          <button 
            className="btn btn-outline-secondary ms-2"
            onClick={() => navigate('/')}
          >
            <i className="fas fa-arrow-left me-1"></i>
            Back
          </button>
          
          {/* Admin button if authenticated */}
          {isAdminAuthenticated && (
            <button 
              className="btn btn-outline-primary ms-2"
              onClick={() => navigate('/admin')}
            >
              <i className="fas fa-cog me-1"></i>
              Admin
            </button>
          )}
        </div>
      </div>
      
      {loading ? (
        <div className="laboratory-calendar loading-container">
          <div>Loading tenant calendar...</div>
        </div>
      ) : error ? (
        <div className="laboratory-calendar">
          <div className="error-message">
            <h3>Error</h3>
            <p>{error}</p>
            <button className="btn btn-primary mt-3" onClick={() => navigate('/')}>
              Return to Main Calendar
            </button>
          </div>
        </div>
      ) : (
        <div className="laboratory-calendar">
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
            events={events}
            resources={resources}
            height="auto"
            slotMinTime="06:00:00" // Start calendar at 6am
            allDaySlot={true}
            allDayText="all-day"
            weekends={showWeekends} // Control weekends visibility
            
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
                'recordId', 'sampleType', 'reminders'
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
              
              return transformedEvent;
            }}
          />
        </div>
      )}
    </div>
  );
}

export default TenantCalendar;
