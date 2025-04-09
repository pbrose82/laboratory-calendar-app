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

// Data persistence for Render (file-based since we don't have a DB)
const DATA_FILE = path.join(__dirname, 'tenant-data.json');

// Initialize tenant data
let tenants = {};

// Load tenant data from file if it exists
try {
  if (fs.existsSync(DATA_FILE)) {
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    tenants = JSON.parse(data);
    console.log(`Loaded ${Object.keys(tenants).length} tenants from data file`);
  }
} catch (error) {
  console.error('Error loading tenant data:', error);
}

// Function to save tenant data to file
const saveTenantData = () => {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(tenants, null, 2));
  } catch (error) {
    console.error('Error saving tenant data:', error);
  }
};

// Serve static files from the React app build directory
app.use(express.static(path.join(__dirname, 'build')));

/**
 * API endpoint to handle Alchemy updates for tenant calendars
 */
app.post('/api/alchemy-update', (req, res) => {
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
    
    // Check if tenant exists
    if (!tenants[tenantId]) {
      return res.status(404).json({ error: `Tenant "${tenantId}" not found` });
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
    
    // Save tenant data after modification
    saveTenantData();
    
    console.log(`Processed ${action} for tenant ${tenantId}`);
    return res.json({ success: true, data: result });
    
  } catch (error) {
    console.error('Error handling Alchemy update:', error);
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
    
    return res.status(201).json({ success: true, data: tenants[tenantId] });
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
    
    return res.json({ success: true, message: `Tenant "${tenantId}" deleted successfully` });
  } catch (error) {
    console.error('Error deleting tenant:', error);
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
});
