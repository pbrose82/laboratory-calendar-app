import React, { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { fetchAllTenants } from '../services/apiClient';
import { laboratoryEvents, laboratoryResources } from '../data/sample-events';

function LaboratoryCalendar() {
  const [tenants, setTenants] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Load tenants for display in the dashboard
    async function loadTenants() {
      setIsLoading(true);
      try {
        const tenantData = await fetchAllTenants();
        setTenants(tenantData);
      } catch (error) {
        console.error('Error loading tenants:', error);
      } finally {
        setIsLoading(false);
      }
    }
    
    loadTenants();
  }, []);

  const handleDateClick = (selectInfo) => {
    const title = prompt('Please enter a new event title:');
    const calendarApi = selectInfo.view.calendar;
    calendarApi.unselect();

    if (title) {
      calendarApi.addEvent({
        title,
        start: selectInfo.startStr,
        end: selectInfo.endStr,
        allDay: selectInfo.allDay
      });
    }
  };

  const handleEventClick = (clickInfo) => {
    const event = clickInfo.event;
    const extendedProps = event.extendedProps;

    alert(`
      Event Details:
      Title: ${event.title}
      Start: ${event.start.toLocaleString()}
      End: ${event.end ? event.end.toLocaleString() : 'N/A'}
      
      Additional Information:
      Equipment: ${extendedProps.equipment || 'N/A'}
      Technician: ${extendedProps.technician || 'N/A'}
      Sample Type: ${extendedProps.sampleType || 'N/A'}
    `);
  };

  return (
    <div className="dashboard-container">
      <div className="content-header">
        <h1>Laboratory Resource Calendar</h1>
        <div className="header-actions">
          <a href="/admin" className="btn btn-primary">
            <i className="fas fa-cog me-2"></i>Manage Tenants
          </a>
        </div>
      </div>
      
      {tenants.length > 0 && (
        <div className="tenant-grid mb-4">
          <h2 className="section-title">Tenant Calendars</h2>
          <div className="row">
            {tenants.map(tenant => (
              <div className="col-md-4 mb-3" key={tenant.id}>
                <div className="tenant-card">
                  <h3 className="tenant-card-title">{tenant.name}</h3>
                  <p className="tenant-id">ID: {tenant.id}</p>
                  <p className="tenant-events">
                    {tenant.events?.length || 0} Events
                  </p>
                  <a href={`/${tenant.id}`} className="btn btn-sm btn-outline-primary">
                    View Calendar
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <div className="laboratory-calendar">
        <h2 className="section-title">Main Calendar</h2>
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
          dateClick={handleDateClick}
          eventClick={handleEventClick}
          events={laboratoryEvents}
          resources={laboratoryResources}
          height="auto"
        />
      </div>
    </div>
  );
}

export default LaboratoryCalendar;
