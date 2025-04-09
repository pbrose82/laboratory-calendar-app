import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import TenantSidebar from './TenantSidebar';
import './AppLayout.css';

function AppLayout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Determine if current path is a tenant path (not admin, not home)
  const isTenantPath = location.pathname !== '/' && 
                      location.pathname !== '/admin' && 
                      !location.pathname.startsWith('/api/');
                      
  // Extract tenant ID from path if on tenant path
  const tenantId = isTenantPath ? location.pathname.substring(1) : null;

  return (
    <div className="app-container">
      {/* Left Navigation */}
      <aside className="left-nav">
        <div className="nav-header">
          <img src="/logo.png" alt="Lab Calendar" className="nav-logo" />
        </div>
        
        <nav className="nav-menu">
          <ul>
            <li className={location.pathname === '/' ? 'active' : ''}>
              <Link to="/">
                <i className="fas fa-home"></i>
                <span>Home</span>
              </Link>
            </li>
            <li className={location.pathname === '/admin' ? 'active' : ''}>
              <Link to="/admin">
                <i className="fas fa-cogs"></i>
                <span>Admin</span>
              </Link>
            </li>
            
            {/* Divider */}
            <li className="nav-divider">
              <span>Tenant Calendars</span>
            </li>
            
            {/* Dynamic tenant links would be populated here */}
            {/* For now, show the current tenant if on a tenant page */}
            {isTenantPath && (
              <li className="active tenant-nav-item">
                <Link to={`/${tenantId}`}>
                  <i className="fas fa-calendar"></i>
                  <span>{tenantId}</span>
                </Link>
              </li>
            )}
          </ul>
        </nav>
        
        <div className="nav-footer">
          <button 
            className="help-button"
            onClick={() => navigate('/admin')}
          >
            <i className="fas fa-question-circle"></i>
            <span>Help</span>
          </button>
        </div>
      </aside>
      
      {/* Main Content */}
      <main className="main-content">
        <div className="content-wrapper">
          {children}
        </div>
      </main>
    </div>
  );
}

export default AppLayout;
