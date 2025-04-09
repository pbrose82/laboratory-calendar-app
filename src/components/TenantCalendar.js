import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { fetchTenant, processAlchemyEvent } from '../services/apiClient';
import { demoTenantEvents, demoTenantResources } from '../data/sample-events';
import './TenantCalendar.css';

function TenantCalendar() {
  const { tenantId } = useParams();
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tenantName, setTenantName] = useState('');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [showWeekends, setShowWeekends] = useState(true); // State for weekend toggle

  useEffect(() => {
    // Check if admin is authenticated
    const adminAuth = sessionStorage.getItem('adminAuthenticated');
    setIsAdminAuthenticated(adminAuth === 'true');
    
    async function loadTenantData() {
      try {
        // Special handling for demo tenant
        if (tenantId === 'demo-tenant') {
          setEvents(demoTenantEvents);
          setResources(demoTenantResources);
          setTenantName('Demo Tenant');
          setLoading(false);
          return;
        }
        
        // Special handling for our Product CASE UAT tenant
        if (tenantId === 'productcaseelnandlims') {
          setTenantName('Product CASE UAT Calendar');
          // We'll still load events from API if available
        }
        
        // Normal tenant handling from API
        setLoading(true);
        const tenantData = await fetchTenant(tenantId);
        
        if (tenantData) {
          setEvents(tenantData.events || []);
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
      
      // For demo tenant, just add to state
      if (tenantId === 'demo-tenant') {
        setEvents(prevEvents => [...prevEvents, newEvent]);
        calendarApi.addEvent(newEvent);
        return;
      }
      
      // Process through API to save to backend
      const savedEvent = await processAlchemyEvent(tenantId, newEvent, 'create');
      
      // Add to calendar
      calendarApi.addEvent(savedEvent);
      
      // Update local state
      setEvents(prevEvents => [...prevEvents, savedEvent]);
    } catch (error) {
      alert(`Error creating event: ${error.message}`);
    }
  };

  const handleEventClick = (clickInfo) => {
    const event = clickInfo.event;
    const extendedProps = event.extendedProps || {};
    
    // Find the resource title if a resourceId is assigned
    const resourceTitle = resources.find(r => r.id === extendedProps.resourceId)?.title || 'None';

    alert(`
      Event Details:
      Title: ${event.title}
      Start: ${event.start.toLocaleString()}
      End: ${event.end ? event.end.toLocaleString() : 'N/A'}
      
      Additional Information:
      Equipment: ${resourceTitle}
      Technician: ${extendedProps.technician || 'N/A'}
      Sample Type: ${extendedProps.sampleType || 'N/A'}
    `);
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
      
      // For demo tenant, just update local state
      if (tenantId === 'demo-tenant') {
        const updatedEvents = events.map(e => 
          e.id === updatedEvent.id ? {...e, ...updatedEvent} : e
        );
        setEvents(updatedEvents);
        return;
      }
      
      // Update on server
      await processAlchemyEvent(tenantId, updatedEvent, 'update');
    } catch (error) {
      alert(`Error updating event: ${error.message}`);
      eventDropInfo.revert();
    }
  };

  // Toggle function for showing/hiding weekends
  const toggleWeekends = () => {
    setShowWeekends(!showWeekends);
  };

  return (
    <div className="dashboard-container">
      <div className="content-header">
        <h1>{tenantName}</h1>
        <div className="header-actions">
          {/* Weekend toggle button */}
          <button 
            className={`btn btn-sm ${showWeekends ? 'btn-outline-primary' : 'btn-primary'} me-2`}
            onClick={toggleWeekends}
            title={showWeekends ? "Hide weekends" : "Show weekends"}
          >
            <i className="fas fa-calendar-week me-1"></i>
            {showWeekends ? "Hide Weekends" : "Show Weekends"}
          </button>
          
          <button 
            className="btn btn-sm btn-outline-secondary me-2"
            onClick={() => navigate('/')}
          >
            <i className="fas fa-arrow-left me-1"></i>Back
          </button>
          
          {/* Show Admin button if user is authenticated */}
          {isAdminAuthenticated && (
            <button 
              className="btn btn-sm btn-outline-primary"
              onClick={() => navigate('/admin')}
            >
              <i className="fas fa-cog me-1"></i>Admin
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
            events={events}
            resources={resources}
            height="auto"
            slotMinTime="06:00:00" // Start calendar at 6am
            allDaySlot={true}
            allDayText="all-day"
            weekends={showWeekends} // Control weekends visibility
          />
        </div>
      )}
    </div>
  );
}

export default TenantCalendar;
