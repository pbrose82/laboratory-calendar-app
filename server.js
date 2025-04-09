// server.js - Optimized for Render deployment
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const cors = require('cors');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Add request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url} - IP: ${req.ip}`);
  next();
});

// Data persistence configuration specifically for Render
// This directory should be mounted as a persistent volume in Render
const RENDER_DISK_DIR = process.env.RENDER_DISK_DIR || '/opt/render/project/src/data';
const DATA_FILE = path.join(RENDER_DISK_DIR, 'tenant-data.json');

// Ensure data directory exists
try {
  if (!fs.existsSync(RENDER_DISK_DIR)) {
    fs.mkdirSync(RENDER_DISK_DIR, { recursive: true });
    console.log(`Created persistent data directory at ${RENDER_DISK_DIR}`);
  }
} catch (error) {
  console.error('Error creating data directory:', error);
}

// Initialize tenant data
let tenants = {};

// Load tenant data from disk
const loadTenantData = () => {
  try {
    console.log(`Loading tenant data from ${DATA_FILE}`);
    
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, 'utf8');
      tenants = JSON.parse(data);
      console.log(`Loaded ${Object.keys(tenants).length} tenants from disk`);
    } else {
      // Initialize with empty data
      tenants = {};
      console.log('No existing data file found, starting with empty tenant data');
      // Save the initial empty data
      saveTenantData();
    }
  } catch (error) {
    console.error('Error loading tenant data:', error);
    // If there was an error loading, initialize with empty data
    tenants = {};
  }
};

// Function to save tenant data to disk
const saveTenantData = () => {
  try {
    // Ensure directory exists
    if (!fs.existsSync(RENDER_DISK_DIR)) {
      fs.mkdirSync(RENDER_DISK_DIR, { recursive: true });
    }
    
    fs.writeFileSync(DATA_FILE, JSON.stringify(tenants, null, 2));
    console.log(`Saved tenant data to ${DATA_FILE}`);
    return true;
  } catch (error) {
    console.error('Error saving tenant data:', error);
    return false;
  }
};

// Function to find an event by ER number in the title
const findEventByERNumber = (tenantId, title) => {
  if (!tenants[tenantId] || !tenants[tenantId].events) {
    return null;
  }
  
  // Extract ER number from the title (assuming format like "ER02 - Something")
  const erMatch = title.match(/^(ER\d+)/i);
  if (!erMatch) {
    return null; // No ER number found in the title
  }
  
  const erNumber = erMatch[1].toUpperCase(); // Normalize to uppercase
  
  // Find any event with the same ER number prefix
  return tenants[tenantId].events.find(event => {
    const eventERMatch = event.title.match(/^(ER\d+)/i);
    return eventERMatch && eventERMatch[1].toUpperCase() === erNumber;
  });
};

// Load data at startup
loadTenantData();

// Serve static files from the React app build directory
app.use(express.static(path.join(__dirname, 'build')));

/**
 * Enhanced API endpoint to handle multiple formats of calendar events
 * - Supports ER number based updates
 * - Doesn't require action field
 */
app.post('/api/calendar-events', (req, res) => {
  try {
    // Log the incoming request for debugging
    console.log('Calendar event request received:');
    console.log('Headers:', JSON.stringify(req.headers));
    console.log('Body:', JSON.stringify(req.body));
    
    const body = req.body;
    
    // Check if we have the hybrid format from Alchemy (title, tenantId directly at root)
    // Note: We no longer require action: "create"
    if (body.title && body.tenantId && body.start && body.end) {
      console.log('Detected hybrid format from Alchemy');
      const tenantId = body.tenantId;
      
      // Check if an event with this ER number already exists
      const existingEvent = findEventByERNumber(tenantId, body.title);
      let isUpdate = false;
      
      // Create the event data with all properties
      const eventData = {
        id: existingEvent ? existingEvent.id : Date.now().toString(),
        title: body.title,
        start: body.start,
        end: body.end,
        allDay: body.allDay || false,
        location: body.location,
        equipment: body.equipment,
        technician: body.technician,
        notes: body.notes,
        recordId: body.recordId,
        sampleType: body.sampleType,
        reminders: body.reminders
      };
      
      // Convert dates to ISO format for FullCalendar compatibility
      try {
        // Parse the date strings from Alchemy format to ISO format
        const startDate = new Date(body.start);
        const endDate = new Date(body.end);
        
        // Make sure the dates are valid before using them
        if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
          eventData.start = startDate.toISOString();
          eventData.end = endDate.toISOString();
          
          // Log the date conversion for debugging
          console.log('Converted dates to ISO format:');
          console.log('Original start:', body.start, 'ISO start:', eventData.start);
          console.log('Original end:', body.end, 'ISO end:', eventData.end);
        } else {
          console.warn('Could not parse dates from Alchemy format, using as-is');
        }
      } catch (dateError) {
        console.error('Error converting dates to ISO format:', dateError);
        // Continue with original format if conversion fails
      }
      
      // If equipment is specified, try to match it with a resource
      if (body.equipment) {
        // Find the matching resource based on equipment name
        const resources = tenants[tenantId]?.resources || [];
        const matchingResource = resources.find(r => r.title === body.equipment);
        
        if (matchingResource) {
          eventData.resourceId = matchingResource.id;
          console.log(`Matched equipment "${body.equipment}" to resource ID "${matchingResource.id}"`);
        } else {
          console.log(`No matching resource found for equipment "${body.equipment}"`);
        }
      }
      
      // Log the complete event data
      console.log('Complete event data:', JSON.stringify(eventData, null, 2));
      
      // Check if this is an update or a new event
      if (existingEvent) {
        isUpdate = true;
        console.log(`Found existing event with ER number. Updating event ID: ${existingEvent.id}`);
        
        // Find the index of the existing event
        const eventIndex = tenants[tenantId].events.findIndex(e => e.id === existingEvent.id);
        
        // Update the existing event
        if (eventIndex !== -1) {
          tenants[tenantId].events[eventIndex] = eventData;
        } else {
          // Fallback if the event somehow doesn't exist anymore
          isUpdate = false;
          tenants[tenantId].events.push(eventData);
        }
      } else {
        // This is a new event
        console.log('No existing event found with this ER number. Creating new event.');
        
        // Create tenant if needed
        if (!tenants[tenantId]) {
          console.log(`Creating new tenant: ${tenantId}`);
          tenants[tenantId] = {
            id: tenantId,
            name: tenantId,
            createdAt: new Date().toISOString(),
            events: [],
            resources: [
              { id: 'equipment-1', title: 'HPLC Machine' },
              { id: 'equipment-2', title: 'Mass Spectrometer' },
              { id: 'equipment-3', title: 'PCR Machine' }
            ]
          };
        }
        
        // Initialize events array if it doesn't exist
        if (!tenants[tenantId].events) {
          tenants[tenantId].events = [];
        }
        
        // Add the new event
        tenants[tenantId].events.push(eventData);
      }
      
      // Save tenant data after modification
      const saveSuccess = saveTenantData();
      
      console.log(`Processed ${isUpdate ? 'update' : 'creation'} for tenant ${tenantId}, save success: ${saveSuccess}`);
      return res.json({ 
        success: true, 
        data: eventData,
        message: isUpdate ? "Event updated from hybrid format" : "Event created from hybrid format"
      });
    } 
    // Check if this is the legacy Google Calendar format (has calendarId, summary)
    else if (body.calendarId && body.summary) {
      console.log('Received legacy Google Calendar format request');
      
      // Extract tenant ID from the description or use a default
      const tenantId = body.tenantId || 'default-tenant';
      
      // Check if an event with this ER number already exists
      const existingEvent = findEventByERNumber(tenantId, body.summary);
      let isUpdate = false;
      
      // Transform to our internal format
      const eventData = {
        id: existingEvent ? existingEvent.id : Date.now().toString(),
        title: body.summary,
        start: body.StartUse,  // Use the original field names
        end: body.EndUse,
        allDay: body.allDay || false,
        resourceId: body.resourceId || 'equipment-1',
        location: body.location,
        equipment: body.equipment,
        technician: body.technician,
        notes: body.description,
        recordId: body.recordId,
        sampleType: body.sampleType,
        reminders: body.reminders
      };
      
      // Convert dates to ISO format for FullCalendar compatibility
      try {
        const startDate = new Date(body.StartUse);
        const endDate = new Date(body.EndUse);
        
        if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
          eventData.start = startDate.toISOString();
          eventData.end = endDate.toISOString();
        }
      } catch (dateError) {
        console.error('Error converting legacy dates to ISO format:', dateError);
      }
      
      // Check if tenant exists, create if it doesn't
      if (!tenants[tenantId]) {
        tenants[tenantId] = {
          id: tenantId,
          name: tenantId,
          createdAt: new Date().toISOString(),
          events: [],
          resources: [
            { id: 'equipment-1', title: 'HPLC Machine' },
            { id: 'equipment-2', title: 'Mass Spectrometer' },
            { id: 'equipment-3', title: 'PCR Machine' }
          ]
        };
      }
      
      // Initialize events array if it doesn't exist
      if (!tenants[tenantId].events) {
        tenants[tenantId].events = [];
      }
      
      // Check if this is an update or a new event
      if (existingEvent) {
        isUpdate = true;
        console.log(`Found existing event with ER number. Updating event ID: ${existingEvent.id}`);
        
        // Find the index of the existing event
        const eventIndex = tenants[tenantId].events.findIndex(e => e.id === existingEvent.id);
        
        // Update the existing event
        if (eventIndex !== -1) {
          tenants[tenantId].events[eventIndex] = eventData;
        } else {
          // Fallback if the event somehow doesn't exist anymore
          isUpdate = false;
          tenants[tenantId].events.push(eventData);
        }
      } else {
        // Add as a new event
        tenants[tenantId].events.push(eventData);
      }
      
      // Save tenant data after modification
      saveTenantData();
      
      console.log(`Processed ${isUpdate ? 'update' : 'creation'} for tenant ${tenantId}`);
      return res.json({ 
        success: true, 
        data: eventData,
        message: isUpdate ? "Event updated from legacy format" : "Event created from legacy format"
      });
    } 
    // Standard API format
    else if (body.tenantId && body.action && body.eventData) {
      console.log('Received standard API format request');
      const { tenantId, eventData, action } = body;
      
      // Validate required fields
      if (!tenantId) {
        return res.status(400).json({ error: 'Tenant ID is required' });
      }
      
      if (!eventData) {
        return res.status(400).json({ error: 'Event data is required' });
      }
      
      if (!action) {
        return res.status(400).json({ error: 'Action is required' });
      }
      
      // Check if tenant exists, create if it doesn't
      if (!tenants[tenantId]) {
        tenants[tenantId] = {
          id: tenantId,
          name: tenantId,
          createdAt: new Date().toISOString(),
          events: [],
          resources: [
            { id: 'equipment-1', title: 'HPLC Machine' },
            { id: 'equipment-2', title: 'Mass Spectrometer' },
            { id: 'equipment-3', title: 'PCR Machine' }
          ]
        };
      }
      
      // Initialize events array if it doesn't exist
      if (!tenants[tenantId].events) {
        tenants[tenantId].events = [];
      }
      
      let result;
      
      switch (action) {
        case 'create':
          // Check for existing event with same ER number if title is provided
          let existingEventId = null;
          if (eventData.title) {
            const existingEvent = findEventByERNumber(tenantId, eventData.title);
            if (existingEvent) {
              existingEventId = existingEvent.id;
              console.log(`Found existing event with ER number. Using ID: ${existingEventId}`);
            }
          }
          
          // Generate ID if none exists
          if (!eventData.id && !existingEventId) {
            eventData.id = Date.now().toString();
          } else if (existingEventId) {
            eventData.id = existingEventId;
          }
          
          // Convert dates to ISO format
          try {
            if (eventData.start && typeof eventData.start === 'string') {
              const startDate = new Date(eventData.start);
              if (!isNaN(startDate.getTime())) {
                eventData.start = startDate.toISOString();
              }
            }
            
            if (eventData.end && typeof eventData.end === 'string') {
              const endDate = new Date(eventData.end);
              if (!isNaN(endDate.getTime())) {
                eventData.end = endDate.toISOString();
              }
            }
          } catch (dateError) {
            console.error('Error converting dates in standard format:', dateError);
          }
          
          // If this is an update (existing event found), update it
          if (existingEventId) {
            const eventIndex = tenants[tenantId].events.findIndex(e => e.id === existingEventId);
            if (eventIndex !== -1) {
              tenants[tenantId].events[eventIndex] = {
                ...tenants[tenantId].events[eventIndex],
                ...eventData
              };
              result = tenants[tenantId].events[eventIndex];
            } else {
              // If event not found despite having ID, just add it
              tenants[tenantId].events.push(eventData);
              result = eventData;
            }
          } else {
            // Add as new event
            tenants[tenantId].events.push(eventData);
            result = eventData;
          }
          break;
          
        case 'update':
          // First try to update by ID
          if (eventData.id) {
            const eventIndex = tenants[tenantId].events.findIndex(event => event.id === eventData.id);
            
            if (eventIndex === -1) {
              return res.status(404).json({ error: `Event "${eventData.id}" not found for tenant "${tenantId}"` });
            }
            
            // Convert dates to ISO format if provided
            try {
              if (eventData.start && typeof eventData.start === 'string') {
                const startDate = new Date(eventData.start);
                if (!isNaN(startDate.getTime())) {
                  eventData.start = startDate.toISOString();
                }
              }
              
              if (eventData.end && typeof eventData.end === 'string') {
                const endDate = new Date(eventData.end);
                if (!isNaN(endDate.getTime())) {
                  eventData.end = endDate.toISOString();
                }
              }
            } catch (dateError) {
              console.error('Error converting dates in update:', dateError);
            }
            
            tenants[tenantId].events[eventIndex] = {
              ...tenants[tenantId].events[eventIndex],
              ...eventData
            };
            
            result = tenants[tenantId].events[eventIndex];
          }
          // If no ID but has title, try to update by ER number
          else if (eventData.title) {
            const existingEvent = findEventByERNumber(tenantId, eventData.title);
            
            if (!existingEvent) {
              return res.status(404).json({ error: `No event with ER number found in title "${eventData.title}" for tenant "${tenantId}"` });
            }
            
            const eventIndex = tenants[tenantId].events.findIndex(e => e.id === existingEvent.id);
            
            if (eventIndex === -1) {
              return res.status(404).json({ error: `Event "${existingEvent.id}" not found for tenant "${tenantId}"` });
            }
            
            // Convert dates to ISO format if provided
            try {
              if (eventData.start && typeof eventData.start === 'string') {
                const startDate = new Date(eventData.start);
                if (!isNaN(startDate.getTime())) {
                  eventData.start = startDate.toISOString();
                }
              }
              
              if (eventData.end && typeof eventData.end === 'string') {
                const endDate = new Date(eventData.end);
                if (!isNaN(endDate.getTime())) {
                  eventData.end = endDate.toISOString();
                }
              }
            } catch (dateError) {
              console.error('Error converting dates in update by ER number:', dateError);
            }
            
            tenants[tenantId].events[eventIndex] = {
              ...tenants[tenantId].events[eventIndex],
              ...eventData
            };
            
            result = tenants[tenantId].events[eventIndex];
          } else {
            return res.status(400).json({ error: 'Either event ID or title with ER number is required for update operation' });
          }
          break;
          
        case 'delete':
          if (eventData.id) {
            // Delete by ID
            const initialLength = tenants[tenantId].events.length;
            tenants[tenantId].events = tenants[tenantId].events.filter(event => event.id !== eventData.id);
            
            if (tenants[tenantId].events.length === initialLength) {
              return res.status(404).json({ error: `Event "${eventData.id}" not found for tenant "${tenantId}"` });
            }
            
            result = { id: eventData.id, deleted: true };
          } else if (eventData.title) {
            // Delete by ER number
            const existingEvent = findEventByERNumber(tenantId, eventData.title);
            
            if (!existingEvent) {
              return res.status(404).json({ error: `No event with ER number found in title "${eventData.title}" for tenant "${tenantId}"` });
            }
            
            const initialLength = tenants[tenantId].events.length;
            tenants[tenantId].events = tenants[tenantId].events.filter(event => event.id !== existingEvent.id);
            
            if (tenants[tenantId].events.length === initialLength) {
              return res.status(404).json({ error: `Event "${existingEvent.id}" not found for tenant "${tenantId}"` });
            }
            
            result = { id: existingEvent.id, deleted: true };
          } else {
            return res.status(400).json({ error: 'Either event ID or title with ER number is required for delete operation' });
          }
          break;
          
        default:
          return res.status(400).json({ error: `Invalid action: ${action}` });
      }
      
      // Save tenant data after modification
      const saveSuccess = saveTenantData();
      
      console.log(`Processed ${action} for tenant ${tenantId}, save success: ${saveSuccess}`);
      return res.json({ 
        success: true, 
        data: result,
        message: `Event ${action}d successfully`
      });
    }
    else {
      console.log('Invalid request format received:', body);
      return res.status(400).json({ 
        error: 'Invalid request format',
        received: body,
        expectedFormats: [
          "Standard API format: {tenantId, action, eventData}",
          "Hybrid format: {title, tenantId, start, end}",
          "Legacy format: {calendarId, summary, StartUse, EndUse}"
        ]
      });
    }
  } catch (error) {
    console.error('Error handling calendar event:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * API endpoint to register a new tenant
 */
app.post('/api/tenants', (req, res) => {
  try {
    const { tenantId, tenantName } = req.body;
    
    if (!tenantId || !tenantName) {
      return res.status(400).json({ error: 'Both tenant ID and name are required' });
    }
    
    if (tenants[tenantId]) {
      return res.status(409).json({ error: `Tenant "${tenantId}" already exists` });
    }
    
    tenants[tenantId] = {
      id: tenantId,
      name: tenantName,
      createdAt: new Date().toISOString(),
      events: [],
      resources: [
        { id: 'equipment-1', title: 'HPLC Machine' },
        { id: 'equipment-2', title: 'Mass Spectrometer' },
        { id: 'equipment-3', title: 'PCR Machine' }
      ]
    };
    
    // Save tenant data after creating a new tenant
    saveTenantData();
    
    return res.status(201).json({ 
      success: true, 
      data: tenants[tenantId]
    });
  } catch (error) {
    console.error('Error creating tenant:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * API endpoint to get tenant data
 */
app.get('/api/tenants/:tenantId', (req, res) => {
  try {
    const { tenantId } = req.params;
    
    if (!tenants[tenantId]) {
      return res.status(404).json({ error: `Tenant "${tenantId}" not found` });
    }
    
    return res.json({ success: true, data: tenants[tenantId] });
  } catch (error) {
    console.error('Error getting tenant:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * API endpoint to list all tenants
 */
app.get('/api/tenants', (req, res) => {
  try {
    const tenantList = Object.values(tenants);
    return res.json({ success: true, data: tenantList });
  } catch (error) {
    console.error('Error listing tenants:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * API endpoint to delete a tenant
 */
app.delete('/api/tenants/:tenantId', (req, res) => {
  try {
    const { tenantId } = req.params;
    
    if (!tenants[tenantId]) {
      return res.status(404).json({ error: `Tenant "${tenantId}" not found` });
    }
    
    delete tenants[tenantId];
    
    // Save tenant data after deleting a tenant
    saveTenantData();
    
    return res.json({ 
      success: true, 
      message: `Tenant "${tenantId}" deleted successfully`
    });
  } catch (error) {
    console.error('Error deleting tenant:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * API endpoint to list calendar events for a tenant
 */
app.get('/api/calendar-events', (req, res) => {
  try {
    const { tenantId, startDate, endDate, resourceId } = req.query;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }
    
    if (!tenants[tenantId]) {
      return res.status(404).json({ error: `Tenant "${tenantId}" not found` });
    }
    
    let events = tenants[tenantId].events || [];
    
    // Apply filters if provided
    if (startDate || endDate || resourceId) {
      events = events.filter(event => {
        let match = true;
        
        if (startDate) {
          const eventEnd = new Date(event.end);
          const filterStart = new Date(startDate);
          if (eventEnd < filterStart) match = false;
        }
        
        if (endDate) {
          const eventStart = new Date(event.start);
          const filterEnd = new Date(endDate);
          filterEnd.setHours(23, 59, 59, 999); // End of day
          if (eventStart > filterEnd) match = false;
        }
        
        if (resourceId && event.resourceId !== resourceId) {
          match = false;
        }
        
        return match;
      });
    }
    
    return res.json({ 
      success: true, 
      data: events,
      count: events.length
    });
  } catch (error) {
    console.error('Error listing calendar events:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * API endpoint to get a specific calendar event
 */
app.get('/api/calendar-events/:eventId', (req, res) => {
  try {
    const { eventId } = req.params;
    const { tenantId } = req.query;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }
    
    if (!tenants[tenantId]) {
      return res.status(404).json({ error: `Tenant "${tenantId}" not found` });
    }
    
    const event = tenants[tenantId].events?.find(e => e.id === eventId);
    
    if (!event) {
      return res.status(404).json({ error: `Event "${eventId}" not found for tenant "${tenantId}"` });
    }
    
    return res.json({ 
      success: true, 
      data: event
    });
  } catch (error) {
    console.error('Error getting calendar event:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * API endpoint to update a specific calendar event
 */
app.put('/api/calendar-events/:eventId', (req, res) => {
  try {
    const { eventId } = req.params;
    const { tenantId, ...updateData } = req.body;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }
    
    if (!tenants[tenantId]) {
      return res.status(404).json({ error: `Tenant "${tenantId}" not found` });
    }
    
    const eventIndex = tenants[tenantId].events?.findIndex(e => e.id === eventId);
    
    if (eventIndex === -1) {
      return res.status(404).json({ error: `Event "${eventId}" not found for tenant "${tenantId}"` });
    }
    
    // Convert dates to ISO format if provided
    try {
      if (updateData.start && typeof updateData.start === 'string') {
        const startDate = new Date(updateData.start);
        if (!isNaN(startDate.getTime())) {
          updateData.start = startDate.toISOString();
        }
      }
      
      if (updateData.end && typeof updateData.end === 'string') {
        const endDate = new Date(updateData.end);
        if (!isNaN(endDate.getTime())) {
          updateData.end = endDate.toISOString();
        }
      }
    } catch (dateError) {
      console.error('Error converting dates in PUT update:', dateError);
    }
    
    tenants[tenantId].events[eventIndex] = {
      ...tenants[tenantId].events[eventIndex],
      ...updateData
    };
    
    // Save tenant data after modification
    saveTenantData();
    
    return res.json({ 
      success: true, 
      data: tenants[tenantId].events[eventIndex],
      message: "Event updated successfully"
    });
  } catch (error) {
    console.error('Error updating calendar event:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * API endpoint to delete a specific calendar event
 */
app.delete('/api/calendar-events/:eventId', (req, res) => {
  try {
    const { eventId } = req.params;
    const { tenantId } = req.query;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }
    
    if (!tenants[tenantId]) {
      return res.status(404).json({ error: `Tenant "${tenantId}" not found` });
    }
    
    const initialLength = tenants[tenantId].events?.length || 0;
    tenants[tenantId].events = tenants[tenantId].events?.filter(e => e.id !== eventId) || [];
    
    if (tenants[tenantId].events.length === initialLength) {
      return res.status(404).json({ error: `Event "${eventId}" not found for tenant "${tenantId}"` });
    }
    
    // Save tenant data after modification
    saveTenantData();
    
    return res.json({ 
      success: true, 
      data: { id: eventId, deleted: true },
      message: "Event deleted successfully"
    });
  } catch (error) {
    console.error('Error deleting calendar event:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * The "catchall" handler: for any request that doesn't
 * match one above, send back the index.html file.
 * This is essential for client-side routing with React Router.
 */
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

/**
 * Start the server
 */
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Using ${RENDER_DISK_DIR} for data storage`);
});
