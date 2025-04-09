import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { fetchAllTenants } from '../services/apiClient';
import './TenantSidebar.css';

function TenantSidebar() {
  const [tenants, setTenants] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const loadTenants = async () => {
      try {
        setIsLoading(true);
        const tenantData = await fetchAllTenants();
        setTenants(tenantData);
      } catch (error) {
        console.error('Error loading tenants for sidebar:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadTenants();
  }, []);

  const toggleSidebar = () => {
    setIsExpanded(!isExpanded);
  };

  // Check if the current path is for a specific tenant
  const isTenantPath = (tenantId) => {
    return location.pathname === `/${tenantId}`;
  };

  return (
    <div className={`tenant-sidebar ${isExpanded ? 'expanded' : 'collapsed'}`}>
      <div className="sidebar-header">
        <h3>Tenant Calendars</h3>
        <button className="toggle-btn" onClick={toggleSidebar}>
          <i className={`fas fa-angle-${isExpanded ? 'left' : 'right'}`}></i>
        </button>
      </div>

      <div className="sidebar-content">
        {isLoading ? (
          <div className="sidebar-loading">Loading...</div>
        ) : tenants.length === 0 ? (
          <div className="sidebar-empty">
            <p>No tenants available</p>
            <Link to="/admin" className="sidebar-admin-link">
              Create Tenant
            </Link>
          </div>
        ) : (
          <ul className="tenant-list">
            {tenants.map((tenant) => (
              <li key={tenant.id} className={isTenantPath(tenant.id) ? 'active' : ''}>
                <Link to={`/${tenant.id}`}>
                  <i className="fas fa-calendar-alt"></i>
                  <span className="tenant-name">{tenant.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="sidebar-footer">
        <Link to="/admin" className="admin-link">
          <i className="fas fa-cog"></i>
          <span>Manage Tenants</span>
        </Link>
      </div>
    </div>
  );
}

export default TenantSidebar;
