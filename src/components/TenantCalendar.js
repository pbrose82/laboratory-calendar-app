import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { fetchTenant, processAlchemyEvent } from '../services/apiClient';

function TenantCalendar() {
  const { tenantId } = useParams();
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tenantName, setTenantName] = useState('');

  useEffect(() => {
    async function loadTenantData() {
      try {
        setLoading(true);
        const tenantData = await fetchTenant(tenantId);
        
        if (tenantData) {
          setEvents(tenantData.events || []);
          setResources(tenantData.resources || []);
          setTenantName(tenantData.name || tenantId);
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
  }, [tenantId]);

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
    const extendedProps = event.extendedProps;
    
    // Find the resource title if a resourceId is assigned
    const resourceTitle = resources.find(r => r.id === event.extendedProps.resourceId)?.title || 'None';

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
      
      // Update on server
      await processAlchemyEvent(tenantId, updatedEvent, 'update');
    } catch (error) {
      alert(`Error updating event: ${error.message}`);
      eventDropInfo.revert();
    }
  };

  if (loading) {
    return (
      <div className="laboratory-calendar loading-container">
        <div>Loading tenant calendar...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="laboratory-calendar">
        <div className="error-message">
          <h3>Error</h3>
          <p>{error}</p>
          <button className="btn btn-primary mt-3" onClick={() => navigate('/')}>
            Return to Main Calendar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="laboratory-calendar">
      <div className="tenant-header">
        <h2 className="tenant-title">Calendar for {tenantName}</h2>
        <div className="tenant-actions">
          <button 
            className="btn btn-sm btn-outline-secondary"
            onClick={() => navigate('/')}
          >
            Back to Main Calendar
          </button>
          
          {/* Admin link */}
          <button 
            className="btn btn-sm btn-outline-primary ms-2"
            onClick={() => navigate('/admin')}
          >
            Admin
          </button>
        </div>
      </div>
      
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
      />
    </div>
  );
}

export default TenantCalendar;
