// server.js - Optimized for Render disk persistence
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

// Load data at startup
loadTenantData();

// Serve static files from the React app build directory
app.use(express.static(path.join(__dirname, 'build')));

/**
 * API endpoint to handle calendar events for tenants
 */
app.post('/api/calendar-events', (req, res) => {
  try {
    const { tenantId, eventData, action } = req.body;
    
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
        name: getDisplayName(tenantId),
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
        // Generate ID if none exists
        if (!eventData.id) {
          eventData.id = Date.now().toString();
        }
        
        tenants[tenantId].events.push(eventData);
        result = eventData;
        break;
        
      case 'update':
        if (!eventData.id) {
          return res.status(400).json({ error: 'Event ID is required for update operation' });
        }
        
        const eventIndex = tenants[tenantId].events.findIndex(event => event.id === eventData.id);
        
        if (eventIndex === -1) {
          return res.status(404).json({ error: `Event "${eventData.id}" not found for tenant "${tenantId}"` });
        }
        
        tenants[tenantId].events[eventIndex] = {
          ...tenants[tenantId].events[eventIndex],
          ...eventData
        };
        
        result = tenants[tenantId].events[eventIndex];
        break;
        
      case 'delete':
        if (!eventData.id) {
          return res.status(400).json({ error: 'Event ID is required for delete operation' });
        }
        
        const initialLength = tenants[tenantId].events.length;
        tenants[tenantId].events = tenants[tenantId].events.filter(event => event.id !== eventData.id);
        
        if (tenants[tenantId].events.length === initialLength) {
          return res.status(404).json({ error: `Event "${eventData.id}" not found for tenant "${tenantId}"` });
        }
        
        result = { id: eventData.id, deleted: true };
        break;
        
      default:
        return res.status(400).json({ error: `Invalid action: ${action}` });
    }
    
    // Save tenant data after modification to persistent disk
    const saveSuccess = saveTenantData();
    
    console.log(`Processed ${action} for tenant ${tenantId}`);
    return res.json({ 
      success: true, 
      data: result
    });
    
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

// Helper function to get display name for a tenant ID
function getDisplayName(tenantId) {
  if (tenantId === 'demo-tenant') {
    return 'Demo Tenant';
  } else if (tenantId === 'productcaseelnlims4uat' || tenantId === 'productcaseelnandlims') {
    return 'Product CASE UAT';
  } else {
    return tenantId;
  }
}

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
