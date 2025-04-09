import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import './AppLayout.css';

function AppLayout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [isAdminExpanded, setIsAdminExpanded] = useState(false);

  // Extract tenant ID from path if on tenant path
  const tenantId = location.pathname.startsWith('/') && location.pathname.length > 1 ? 
                  location.pathname.substring(1) : null;

  const toggleAdminSection = () => {
    setIsAdminExpanded(!isAdminExpanded);
  };

  return (
    <div className="app-container">
      {/* Left Navigation */}
      <aside className="left-nav">
        <div className="nav-header">
          <div className="nav-header-title">
            <i className="fas fa-flask"></i>
            <span>Laboratory Calendar</span>
          </div>
          <button className="nav-dropdown-btn">
            <i className="fas fa-chevron-down"></i>
          </button>
        </div>
        
        <div className="search-container">
          <div className="search-input">
            <i className="fas fa-search search-icon"></i>
            <input type="text" placeholder="Search Laboratory Calendar" />
          </div>
        </div>
        
        <div className="new-btn-container">
          <button className="new-btn">
            <i className="fas fa-plus"></i>
            <span>New</span>
          </button>
        </div>

        <nav className="nav-menu">
          <ul>
            <li className={location.pathname === '/' ? 'active' : ''}>
              <Link to="/">
                <i className="fas fa-th-large"></i>
                <span>Dashboard</span>
              </Link>
            </li>
            <li>
              <Link to="/">
                <i className="fas fa-tasks"></i>
                <span>My Assignments</span>
              </Link>
            </li>
            
            {/* Only show the current tenant in navigation if directly accessing via URL */}
            {tenantId && location.pathname !== '/admin' && location.pathname !== '/admin-login' && (
              <>
                <div className="nav-divider"></div>
                <li className="active tenant-nav-item">
                  <Link to={`/${tenantId}`}>
                    <i className="fas fa-calendar"></i>
                    <span>{tenantId} Calendar</span>
                  </Link>
                </li>
              </>
            )}
          </ul>
        </nav>
        
        {/* Calendar Admin Section - at bottom */}
        <div className="admin-section">
          <div 
            className={`admin-header ${isAdminExpanded ? 'expanded' : ''}`} 
            onClick={toggleAdminSection}
          >
            <div className="admin-title">
              <i className="fas fa-cog"></i>
              <span>Calendar Admin</span>
            </div>
            <i className={`fas fa-chevron-${isAdminExpanded ? 'up' : 'down'}`}></i>
          </div>
          
          {isAdminExpanded && (
            <ul className="admin-menu">
              <li className={location.pathname === '/admin-login' || location.pathname === '/admin' ? 'active' : ''}>
                <Link to="/admin-login">
                  <span>Admin Dashboard</span>
                </Link>
              </li>
            </ul>
          )}
        </div>
        
        <div className="nav-footer">
          <div className="user-indicator">PR</div>
          <div className="copyright">
            © Laboratory Calendar. All Rights Reserved.
          </div>
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
