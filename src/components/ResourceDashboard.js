// Update for ResourceDashboard.js - Remove Back button

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchTenant } from '../services/apiClient';
import './ResourceViews.css';

function ResourceDashboard() {
  const { tenantId } = useParams();
  const navigate = useNavigate();
  const [resources, setResources] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tenantName, setTenantName] = useState('');
  
  // Reference to track if component is mounted
  const isMounted = useRef(true);

  // Function to load tenant data - handles both initial load and background refresh
  const loadTenantData = async (isInitialLoad = false) => {
    try {
      if (isInitialLoad) {
        setLoading(true);
      }
      
      // Special handling for tenant name
      if (tenantId === 'productcaseelnlims4uat' || tenantId === 'productcaseelnandlims') {
        setTenantName('Product CASE UAT');
      }
      
      // Normal tenant handling from API
      const tenantData = await fetchTenant(tenantId);
      
      if (tenantData && isMounted.current) {
        setResources(tenantData.resources || []);
        setEvents(tenantData.events || []);
        
        if (!tenantName) {
          setTenantName(tenantData.name || tenantId);
        }
        
        if (process.env.NODE_ENV === 'development') {
          console.log('Resource dashboard data refreshed at', new Date().toLocaleTimeString());
        }
      }
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

  // Initial data load
  useEffect(() => {
    if (tenantId) {
      loadTenantData(true);
    }
    
    // Cleanup function
    return () => {
      isMounted.current = false;
    };
  }, [tenantId]);
  
  // Set up automatic background refresh
  useEffect(() => {
    // Refresh data every 30 seconds
    const refreshInterval = setInterval(() => {
      if (isMounted.current) {
        loadTenantData(false);
      }
    }, 30000);
    
    // Clean up interval on component unmount
    return () => {
      clearInterval(refreshInterval);
    };
  }, [tenantId]);

  // Calculate resource utilization
  const calculateUtilization = (resourceId) => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);
    
    const resourceEvents = events.filter(event => 
      event.resourceId === resourceId || 
      event.equipment === resources.find(r => r.id === resourceId)?.title
    );
    
    const eventsThisWeek = resourceEvents.filter(event => {
      const eventStart = new Date(event.start);
      return eventStart >= startOfWeek && eventStart < endOfWeek;
    });
    
    return {
      total: resourceEvents.length,
      thisWeek: eventsThisWeek.length,
      utilization: resourceEvents.length > 0 ? 
        Math.round((eventsThisWeek.length / 5) * 100) : 0 // Assuming 5 workdays per week
    };
  };

  // Get current equipment status
  const getResourceStatus = (resourceId) => {
    const now = new Date();
    
    const currentEvent = events.find(event => {
      const eventStart = new Date(event.start);
      const eventEnd = new Date(event.end);
      return (
        (event.resourceId === resourceId || 
         event.equipment === resources.find(r => r.id === resourceId)?.title) &&
        eventStart <= now && eventEnd >= now
      );
    });
    
    return currentEvent ? 'in-use' : 'available';
  };

  // Handle navigation to equipment calendar
  const handleViewEquipmentCalendar = (resourceId) => {
    navigate(`/${tenantId}?resourceId=${resourceId}`);
  };

  // Format display name for tenant
  const getDisplayName = () => {
    if (tenantId === 'demo-tenant') {
      return 'Demo Tenant';
    } else if (tenantId === 'productcaseelnlims4uat' || tenantId === 'productcaseelnandlims') {
      return 'Product CASE UAT';
    } else {
      return tenantName || tenantId;
    }
  };

  return (
    <div className="dashboard-container">
      <div className="content-header">
        <h1>{getDisplayName()} - Resource Dashboard</h1>
        <div className="header-actions">
          <button 
            className="btn btn-outline-primary"
            onClick={() => navigate(`/${tenantId}`)}
          >
            <i className="fas fa-calendar-alt me-1"></i>
            Calendar View
          </button>
        </div>
      </div>
      
      {loading ? (
        <div className="loading-container">
          <div>Loading resource data...</div>
        </div>
      ) : error ? (
        <div className="error-message">
          <h3>Error</h3>
          <p>{error}</p>
        </div>
      ) : (
        <div className="resource-dashboard">
          {/* Rest of your component remains the same */}
        </div>
      )}
    </div>
  );
}

export default ResourceDashboard;

// Similar updates for other components (EquipmentList, TechnicianSchedule, Analytics, GanttChart)
// In each component:
// 1. Remove the Back/Home button that navigates to '/'
// 2. In error message sections, remove Return to Main Dashboard buttons
// 3. Keep the direct Calendar View buttons

// Example for error section in all components:
/*
{error ? (
  <div className="error-message">
    <h3>Error</h3>
    <p>{error}</p>
  </div>
) : (
  // component content
)}
*/
