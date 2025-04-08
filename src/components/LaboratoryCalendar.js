import React, { useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { laboratoryEvents, laboratoryResources } from '../data/sample-events';

function LaboratoryCalendar() {
  const [events, setEvents] = useState(laboratoryEvents);

  // Handle date click to add new event
  const handleDateClick = (selectInfo) => {
    const title = prompt('Please enter a new event title:');
    const calendarApi = selectInfo.view.calendar;
    calendarApi.unselect(); // clear date selection

    if (title) {
      calendarApi.addEvent({
        title,
        start: selectInfo.startStr,
        end: selectInfo.endStr,
        allDay: selectInfo.allDay
      });
    }
  };

  // Handle event click to show details
  const handleEventClick = (clickInfo) => {
    const event = clickInfo.event;
    const extendedProps = event.extendedProps;

    // Custom modal or alert with event details
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
        dateClick={handleDateClick}
        eventClick={handleEventClick}
        events={events}
        resources={laboratoryResources}
      />
    </div>
  );
}

export default LaboratoryCalendar;