import React, { useState, useEffect } from 'react';
import { Calendar, Badge, Select, Button, Tag, Spin, Card, Statistic, Row, Col, Tooltip, Alert } from 'antd';
import { CheckCircleOutlined, ExclamationCircleOutlined, CloseCircleOutlined, CalendarOutlined, FilterOutlined, ReloadOutlined } from '@/components/ui/alert';

const { Option } = Select;

// Custom Event Component
const EventItem = ({ event }) => {
  const getPurposeColor = (purpose) => {
    switch (purpose?.toLowerCase()) {
      case 'maintenance': return '#FBBC05';
      case 'broken': return '#EA4335';
      default: return '#4285F4';
    }
  };

  return (
    <Tooltip title={`${event.title} - ${event.equipment || 'No equipment'} (${event.cost ? `$${event.cost}` : 'No cost'})`}>
      <div className="event-item" style={{ 
        backgroundColor: getPurposeColor(event.purpose),
        padding: '2px 6px',
        borderRadius: '3px',
        margin: '2px 0',
        color: event.purpose?.toLowerCase() === 'maintenance' ? '#333' : '#fff',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        fontSize: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <span>{event.title}</span>
        {event.cost && <span className="cost-badge" style={{ 
          fontSize: '10px', 
          background: 'rgba(0,0,0,0.15)', 
          padding: '0 3px', 
          borderRadius: '2px',
          marginLeft: '4px'
        }}>${event.cost}</span>}
      </div>
    </Tooltip>
  );
};

function EnhancedCalendar() {
  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [equipmentFilter, setEquipmentFilter] = useState('all');
  const [technicianFilter, setTechnicianFilter] = useState('all');
  const [purposeFilter, setPurposeFilter] = useState('all');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [uniqueEquipment, setUniqueEquipment] = useState([]);
  const [uniqueTechnicians, setUniqueTechnicians] = useState([]);
  const [showWeekends, setShowWeekends] = useState(true);
  const [viewMode, setViewMode] = useState('month');

  // Sample data for the calendar
  const sampleEvents = [
    {
      id: '1',
      title: 'HPLC Analysis',
      start: new Date(2025, 3, 15, 9, 0),
      end: new Date(2025, 3, 15, 12, 0),
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
      equipment: 'NMR Bruker 400MHz',
      technician: 'David Williams',
      purpose: 'Broken',
      cost: 1250
    },
    {
      id: '4',
      title: 'PCR Analysis',
      start: new Date(2025, 3, 18, 9, 0),
      end: new Date(2025, 3, 18, 11, 0),
      equipment: 'PCR Thermal Cycler',
      technician: 'John Smith',
      purpose: 'Utilization',
      cost: 280
    },
    {
      id: '5',
      title: 'Microplate Reading',
      start: new Date(2025, 3, 19, 14, 0),
      end: new Date(2025, 3, 19, 16, 0),
      equipment: 'Microplate Reader',
      technician: 'Lisa Brown',
      purpose: 'Utilization',
      cost: 190
    },
    {
      id: '6',
      title: 'HPLC Calibration',
      start: new Date(2025, 3, 20, 10, 0),
      end: new Date(2025, 3, 20, 12, 0),
      equipment: 'HPLC Agilent 1260',
      technician: 'Maria Johnson',
      purpose: 'Maintenance',
      cost: 420
    },
    {
      id: '7',
      title: 'Mass Spec Analysis',
      start: new Date(2025, 3, 21, 13, 0),
      end: new Date(2025, 3, 21, 17, 0),
      equipment: 'Mass Spec AB Sciex',
      technician: 'John Smith',
      purpose: 'Utilization',
      cost: 780
    }
  ];

  // Load data on component mount
  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setEvents(sampleEvents);
      setFilteredEvents(sampleEvents);
      updateFilterOptions(sampleEvents);
      setLoading(false);
    }, 1000);
  }, []);

  // Update filter options based on events
  const updateFilterOptions = (eventsData) => {
    const equipmentSet = new Set();
    const technicianSet = new Set();
    
    eventsData.forEach(event => {
      if (event.equipment) equipmentSet.add(event.equipment);
      if (event.technician) technicianSet.add(event.technician);
    });
    
    setUniqueEquipment(Array.from(equipmentSet).sort());
    setUniqueTechnicians(Array.from(technicianSet).sort());
  };

  // Apply filters to events
  useEffect(() => {
    let filtered = [...events];
    
    if (equipmentFilter !== 'all') {
      filtered = filtered.filter(event => event.equipment === equipmentFilter);
    }
    
    if (technicianFilter !== 'all') {
      filtered = filtered.filter(event => event.technician === technicianFilter);
    }
    
    if (purposeFilter !== 'all') {
      filtered = filtered.filter(event => event.purpose === purposeFilter);
    }
    
    setFilteredEvents(filtered);
  }, [equipmentFilter, technicianFilter, purposeFilter, events]);

  // Reset all filters
  const resetFilters = () => {
    setEquipmentFilter('all');
    setTechnicianFilter('all');
    setPurposeFilter('all');
  };

  // Get events for a specific date
  const getEventsForDate = (date) => {
    return filteredEvents.filter(event => {
      const eventDate = new Date(event.start);
      return eventDate.getDate() === date.getDate() &&
             eventDate.getMonth() === date.getMonth() &&
             eventDate.getFullYear() === date.getFullYear();
    });
  };

  // Calendar cell renderer
  const dateCellRender = (value) => {
    const eventsForDay = getEventsForDate(value.toDate());
    
    return (
      <div className="events">
        {eventsForDay.slice(0, 3).map(event => (
          <EventItem key={event.id} event={event} />
        ))}
        {eventsForDay.length > 3 && (
          <div style={{ fontSize: '11px', textAlign: 'center', color: '#666', marginTop: '2px' }}>
            +{eventsForDay.length - 3} more
          </div>
        )}
      </div>
    );
  };

  // Get purpose label for display
  const getPurposeLabel = (purpose) => {
    switch (purpose) {
      case 'Maintenance':
        return <Tag color="gold" icon={<ExclamationCircleOutlined />}>Maintenance</Tag>;
      case 'Broken':
        return <Tag color="error" icon={<CloseCircleOutlined />}>Broken</Tag>;
      default:
        return <Tag color="blue" icon={<CheckCircleOutlined />}>Utilization</Tag>;
    }
  };

  return (
    <div className="calendar-container bg-gray-50 min-h-screen pb-8">
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <h1 className="text-2xl font-bold text-gray-900">Lab Equipment Calendar</h1>
            <div className="flex space-x-3">
              <Button 
                type="primary"
                icon={<CalendarOutlined />}
                onClick={() => console.log('Switch to Analytics')}
              >
                View Analytics
              </Button>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Spin size="large" tip="Loading calendar data..." />
        </div>
      ) : error ? (
        <div className="max-w-3xl mx-auto mt-8">
          <Alert
            message="Error"
            description={error}
            type="error"
            showIcon
          />
        </div>
      ) : (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
          {/* Summary Stats */}
          <Row gutter={16} className="mb-6">
            <Col span={6}>
              <Card>
                <Statistic
                  title="Total Reservations"
                  value={filteredEvents.length}
                  prefix={<CalendarOutlined />}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="Utilization"
                  value={filteredEvents.filter(e => e.purpose === 'Utilization').length}
                  suffix={`/${filteredEvents.length}`}
                  valueStyle={{ color: '#4285F4' }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="Maintenance"
                  value={filteredEvents.filter(e => e.purpose === 'Maintenance').length}
                  suffix={`/${filteredEvents.length}`}
                  valueStyle={{ color: '#FBBC05' }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="Broken/Repair"
                  value={filteredEvents.filter(e => e.purpose === 'Broken').length}
                  suffix={`/${filteredEvents.length}`}
                  valueStyle={{ color: '#EA4335' }}
                />
              </Card>
            </Col>
          </Row>

          {/* Filters Row */}
          <Card className="mb-6">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center">
                <span className="mr-2 text-gray-600">Equipment:</span>
                <Select
                  value={equipmentFilter}
                  onChange={value => setEquipmentFilter(value)}
                  style={{ width: 180 }}
                >
                  <Option value="all">All Equipment</Option>
                  {uniqueEquipment.map(item => (
                    <Option key={item} value={item}>{item}</Option>
                  ))}
                </Select>
              </div>
              
              <div className="flex items-center">
                <span className="mr-2 text-gray-600">Technician:</span>
                <Select
                  value={technicianFilter}
                  onChange={value => setTechnicianFilter(value)}
                  style={{ width: 180 }}
                >
                  <Option value="all">All Technicians</Option>
                  {uniqueTechnicians.map(item => (
                    <Option key={item} value={item}>{item}</Option>
                  ))}
                </Select>
              </div>
              
              <div className="flex items-center">
                <span className="mr-2 text-gray-600">Purpose:</span>
                <Select
                  value={purposeFilter}
                  onChange={value => setPurposeFilter(value)}
                  style={{ width: 150 }}
                >
                  <Option value="all">All Purposes</Option>
                  <Option value="Utilization">Utilization</Option>
                  <Option value="Maintenance">Maintenance</Option>
                  <Option value="Broken">Broken</Option>
                </Select>
              </div>
              
              <div className="ml-auto flex space-x-2">
                <Button 
                  icon={<ReloadOutlined />} 
                  onClick={resetFilters}
                >
                  Reset Filters
                </Button>
                <Button 
                  icon={<FilterOutlined />}
                  type={showWeekends ? "default" : "primary"}
                  onClick={() => setShowWeekends(!showWeekends)}
                >
                  {showWeekends ? "Hide Weekends" : "Show Weekends"}
                </Button>
              </div>
            </div>
            
            {/* Filter summary */}
            {(equipmentFilter !== 'all' || technicianFilter !== 'all' || purposeFilter !== 'all') && (
              <div className="mt-3 text-sm text-gray-500">
                Showing {filteredEvents.length} of {events.length} events
                {equipmentFilter !== 'all' && ` • Equipment: ${equipmentFilter}`}
                {technicianFilter !== 'all' && ` • Technician: ${technicianFilter}`}
                {purposeFilter !== 'all' && ` • Purpose: ${purposeFilter}`}
              </div>
            )}
          </Card>

          {/* Calendar Legend */}
          <div className="mb-4 flex items-center space-x-4">
            <div className="text-gray-700 font-medium">Event Types:</div>
            {getPurposeLabel('Utilization')}
            {getPurposeLabel('Maintenance')}
            {getPurposeLabel('Broken')}
          </div>

          {/* Main Calendar */}
          <Card>
            <Calendar 
              dateCellRender={dateCellRender}
              value={currentDate}
              onChange={date => setCurrentDate(date.toDate())}
              onSelect={date => setSelectedDate(date.toDate())}
            />
          </Card>

          {/* Selected Day Detail View */}
          {selectedDate && (
            <Card className="mt-6" title={`Events for ${selectedDate.toDateString()}`}>
              {getEventsForDate(selectedDate).length > 0 ? (
                <div className="space-y-4">
                  {getEventsForDate(selectedDate).map(event => (
                    <div key={event.id} className="border-l-4 pl-4 py-2" style={{ borderColor: event.purpose === 'Maintenance' ? '#FBBC05' : event.purpose === 'Broken' ? '#EA4335' : '#4285F4' }}>
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-lg font-medium">{event.title}</h3>
                          <p className="text-gray-500">
                            {new Date(event.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - 
                            {new Date(event.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <div>
                          {getPurposeLabel(event.purpose)}
                        </div>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                        <div><span className="text-gray-500">Equipment:</span> {event.equipment}</div>
                        <div><span className="text-gray-500">Technician:</span> {event.technician}</div>
                        <div><span className="text-gray-500">Cost:</span> ${event.cost}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No events scheduled for this day
                </div>
              )}
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

export default EnhancedCalendar;
