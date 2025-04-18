import React, { useState, useEffect, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';

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

function TenantCalendar({ tenantId }) {
  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tenantName, setTenantName] = useState('');
  
  // Filter states
  const [equipmentFilter, setEquipmentFilter] = useState('all');
  const [technicianFilter, setTechnicianFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [purposeFilter, setPurposeFilter] = useState('all');
  const [showWeekends, setShowWeekends] = useState(true);
  
  // Track unique values for filters
  const [uniqueEquipment, setUniqueEquipment] = useState([]);
  const [uniqueTechnicians, setUniqueTechnicians] = useState([]);
  
  // Reference to track if component is mounted
  const isMounted = useRef(true);
  
  // Function to load tenant data - handles both initial load and background refresh
  const handleReloadData = async (isInitialLoad = false) => {
    try {
      if (isInitialLoad) {
        setLoading(true);
      }
      
      // This is where you would fetch your actual data from your API
      // For now, we'll use sample data for demonstration
      setTimeout(() => {
        const sampleEvents = [
          {
            id: '1',
            title: 'HPLC Analysis',
            start: new Date(2025, 3, 15, 9, 0),
            end: new Date(2025, 3, 15, 12, 0),
            resourceId: 'equipment-1',
            equipment: 'HPLC Agilent 1260',
            technician: 'John Smith',
            purpose: 'Utilization',
            cost: 350
          },
          {
            id: '2',
            title: 'Mass Spec Maintenance',
            start: new Date(2025, 3, 16, 13, 0),
            end: new Date(2025, 3, 16, 16, 0),
            resourceId: 'equipment-2',
            equipment: 'Mass Spec AB Sciex',
            technician: 'Maria Johnson',
            purpose: 'Maintenance',
            cost: 650
          },
          {
            id: '3',
            title: 'NMR Repair',
            start: new Date(2025, 3, 17, 10, 0),
            end: new Date(2025, 3, 17, 15, 0),
            resourceId: 'equipment-3',
            equipment: 'NMR Bruker 400MHz',
            technician: 'David Williams',
            purpose: 'Broken',
            cost: 1250
          }
        ];
        
        const sampleResources = [
          { id: 'equipment-1', title: 'HPLC Agilent 1260' },
          { id: 'equipment-2', title: 'Mass Spec AB Sciex' },
          { id: 'equipment-3', title: 'NMR Bruker 400MHz' },
          { id: 'equipment-4', title: 'PCR Thermal Cycler' },
          { id: 'equipment-5', title: 'Microplate Reader' }
        ];
        
        setEvents(sampleEvents);
        setResources(sampleResources);
        setTenantName('Laboratory Equipment');
        
        // Update filter options and apply filters
        updateFilterOptions(sampleEvents);
        applyFilters(sampleEvents);
        
        if (isInitialLoad) {
          setLoading(false);
        }
      }, 1000);
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
  const handleEquipmentFilterChange = (e) => {
    setEquipmentFilter(e.target.value);
  };
  
  const handleTechnicianFilterChange = (e) => {
    setTechnicianFilter(e.target.value);
  };
  
  const handleStatusFilterChange = (e) => {
    setStatusFilter(e.target.value);
  };
  
  const handlePurposeFilterChange = (e) => {
    setPurposeFilter(e.target.value);
  };
  
  // Reset all filters
  const resetFilters = () => {
    setEquipmentFilter('all');
    setTechnicianFilter('all');
    setStatusFilter('all');
    setPurposeFilter('all');
  };

  // Initial data load
  useEffect(() => {
    handleReloadData(true);
    
    // Cleanup function
    return () => {
      isMounted.current = false;
    };
  }, []);
  
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
  }, []);
  
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
      
      // Add to calendar
      calendarApi.addEvent(newEvent);
      
      // Update local state
      setEvents(prevEvents => [...prevEvents, newEvent]);
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
    const resourceTitle = resources.find(r => r.id === event.extendedProps.resourceId)?.title || 'None';

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
    if (event.extendedProps.resourceId) {
      detailsMessage += `\nResource: ${resourceTitle} (ID: ${event.extendedProps.resourceId})`;
    }
    checkAndAddProp('technician', 'Technician');
    checkAndAddProp('purpose', 'Purpose');
    checkAndAddProp('cost', 'Cost');
    checkAndAddProp('notes', 'Notes');
    
    // Show the alert with all details
    alert(detailsMessage);
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
          <button 
            className="btn btn-outline-primary"
            onClick={() => console.log('Navigate to analytics')}
          >
            <i className="fas fa-chart-bar me-1"></i>
            Analytics
          </button>
        </div>
      </div>

      {/* Filter Controls */}
      {!loading && !error && (
        <div className="calendar-filters">
          <div className="filter-row">
            <div className="filter-group">
              <label htmlFor="equipmentFilter">Equipment:</label>
              <select 
                id="equipmentFilter" 
                value={equipmentFilter} 
                onChange={handleEquipmentFilterChange}
                className="filter-select"
              >
                <option value="all">All Equipment</option>
                {uniqueEquipment.map(item => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </div>
            
            <div className="filter-group">
              <label htmlFor="technicianFilter">Technician:</label>
              <select 
                id="technicianFilter" 
                value={technicianFilter} 
                onChange={handleTechnicianFilterChange}
                className="filter-select"
              >
                <option value="all">All Technicians</option>
                {uniqueTechnicians.map(item => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </div>
            
            <div className="filter-group">
              <label htmlFor="purposeFilter">Purpose:</label>
              <select 
                id="purposeFilter" 
                value={purposeFilter} 
                onChange={handlePurposeFilterChange}
                className="filter-select"
              >
                <option value="all">All Purposes</option>
                <option value="Utilization">Utilization</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Broken">Broken</option>
              </select>
            </div>
            
            <div className="filter-group">
              <label htmlFor="statusFilter">Status:</label>
              <select 
                id="statusFilter" 
                value={statusFilter} 
                onChange={handleStatusFilterChange}
                className="filter-select"
              >
                <option value="all">All Status</option>
                <option value="upcoming">Upcoming</option>
                <option value="ongoing">Ongoing</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>
          
          <div className="filter-actions">
            <button 
              className="btn btn-sm btn-outline-secondary"
              onClick={resetFilters}
            >
              <i className="fas fa-undo me-1"></i>
              Reset Filters
            </button>
            
            <button 
              className={`btn btn-sm ${showWeekends ? 'btn-outline-primary' : 'btn-primary'}`}
              onClick={toggleWeekends}
            >
              <i className="fas fa-calendar-week me-1"></i>
              {showWeekends ? "Hide Weekends" : "Show Weekends"}
            </button>
          </div>
          
          {/* Filter summary */}
          <div className="filter-summary">
            Showing {filteredEvents.length} of {events.length} events
            {equipmentFilter !== 'all' && ` • Equipment: ${equipmentFilter}`}
            {technicianFilter !== 'all' && ` • Technician: ${technicianFilter}`}
            {purposeFilter !== 'all' && ` • Purpose: ${purposeFilter}`}
            {statusFilter !== 'all' && ` • Status: ${statusFilter}`}
          </div>
        </div>
      )}
      
      {/* Purpose Legend */}
      {!loading && !error && (
        <div className="filter-key mb-4">
          <div className="key-item">
            <span className="key-color utilization"></span>
            <span>Utilization</span>
          </div>
          <div className="key-item">
            <span className="key-color maintenance"></span>
            <span>Maintenance</span>
          </div>
          <div className="key-item">
            <span className="key-color broken"></span>
            <span>Broken</span>
          </div>
        </div>
      )}
      
      {loading ? (
        <div className="laboratory-calendar loading-container">
          <div>Loading calendar...</div>
        </div>
      ) : error ? (
        <div className="laboratory-calendar">
          <div className="error-message">
            <h3>Error</h3>
            <p>{error}</p>
            <button className="btn btn-primary mt-3" onClick={() => console.log('Return to main')}>
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
            events={filteredEvents}
            resources={resources}
            height="auto"
            slotMinTime="06:00:00" // Start calendar at 6am
            allDaySlot={true}
            allDayText="all-day"
            weekends={showWeekends} // Control weekends visibility
            
            // Add this eventDataTransform function to handle both top-level and nested properties
            eventDidMount={(info) => {
              // Get the purpose from the event
              const purpose = info.event.extendedProps.purpose || 'Utilization';
              
              // Add the appropriate class based on purpose
              const purposeClass = getPurposeClass(purpose);
              info.el.classList.add(purposeClass);
              
              // Add cost badge if available
              if (info.event.extendedProps.cost) {
                const title = info.el.querySelector('.fc-event-title');
                if (title) {
                  const costBadge = document.createElement('span');
                  costBadge.className = 'cost-badge';
                  costBadge.innerText = `$${info.event.extendedProps.cost}`;
                  title.appendChild(costBadge);
                }
              }
            }}
          />
        </div>
      )}
    </div>
  );
}

export default TenantCalendar;
