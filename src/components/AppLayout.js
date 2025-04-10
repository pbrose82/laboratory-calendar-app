import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import './AppLayout.css';

function AppLayout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(true);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  
  // Extract tenant ID from path if on tenant path
  const tenantId = location.pathname.startsWith('/') && location.pathname.length > 1 && 
                    !location.pathname.startsWith('/admin') ? 
                    location.pathname.substring(1).split('/')[0] : null;
  
  useEffect(() => {
    // Check if admin is authenticated from session storage
    const adminAuth = sessionStorage.getItem('adminAuthenticated');
    setIsAdminAuthenticated(adminAuth === 'true');
  }, [location]);

  const onToggleSideNavSizeClick = () => {
    setIsExpanded(!isExpanded);
  };
  
  const handleLogout = () => {
    sessionStorage.removeItem('adminAuthenticated');
    setIsAdminAuthenticated(false);
    navigate('/');
  };

  const isAdminArea = location.pathname === '/admin' || location.pathname === '/admin-login';

  // Get formatted tenant display name - avoid showing the technical ID
  const getTenantDisplayName = () => {
    if (tenantId === 'demo-tenant') {
      return 'Demo Tenant';
    } else if (tenantId === 'productcaseelnlims4uat') {
      return 'Product CASE UAT';
    } else if (tenantId === 'productcaseelnandlims') {
      return 'Product CASE UAT';
    } else {
      return tenantId ? `${tenantId}` : '';
    }
  };

  // Check if a specific path is active
  const isPathActive = (path) => {
    if (tenantId) {
      return location.pathname === `/${tenantId}${path}`;
    }
    return false;
  };

  return (
    <div className="app-container">
      {/* Left Navigation - Alchemized version */}
      <div className={`c-sidenav o-flex--column ${isExpanded ? 'c-sidenav--wide' : 'c-sidenav--mini'}`}
           data-qa="appSideNav">
        <div className={isExpanded ? 'o-flex--wide' : 'u-width-64'}>
          <div className={`js-sidebar-header ${isExpanded ? 'u-margin-horizontal-l' : 'u-margin-horizontal-m'}`}>
            
            {/* Header with toggle button */}
            <div className="u-margin-bottom-s u-margin-top-xs o-flex-flag">
              <button className="c-button-icon-white72 o-flex o-flex--center o-flex--middle u-margin-right-xxs"
                      type="button"
                      title={isExpanded ? "Collapse sidebar" : "Expand sidebar"}
                      onClick={onToggleSideNavSizeClick}
                      data-qa="toggleSideNavSize">
                {isExpanded ? (
                  <i className="fas fa-chevron-left u-color-white-opacity-72"></i>
                ) : (
                  <i className="fas fa-chevron-right u-color-white-opacity-72"></i>
                )}
              </button>

              {isExpanded && (
                <div className="nav-header-title">
                  <span>Laboratory Calendar</span>
                </div>
              )}
            </div>

            {/* Search box */}
            <div className={`search-transparent ${isExpanded ? 'search-wide' : 'search-narrow'}`}>
              <i className="fas fa-search search-icon"></i>
              {isExpanded && (
                <input 
                  placeholder="Search Laboratory Calendar"
                  readOnly
                  className="search-input-transparent"/>
              )}
            </div>
          </div>

          {/* Navigation Menu */}
          <div className="u-overflow-auto js-views-and-assignments u-1/1">
            <div className={isExpanded ? '' : 'c-nav-mini-menu--height u-overflow-y-auto u-overflow-x-hidden'}>
              {/* Alchemy Dashboard link */}
              {tenantId && (
                <a href={`https://app.alchemy.cloud/${tenantId}/dashboard`}
                   className={`c-sidenav__my-alchemy t-5 o-flex o-flex--middle u-padding-top-xs u-1/1 u-padding-horizontal-l`}
                   target="_blank" 
                   rel="noopener noreferrer"
                   title={isExpanded ? null : 'Alchemy Dashboard'}>
                  <div className="c-icon--medium u-background-transparent u-margin-right-xxs u-padding-left-none">
                    <i className="fas fa-th-large u-color-white-opacity-72"></i>
                  </div>
                  {isExpanded && <span className="t-4">Alchemy Dashboard</span>}
                </a>
              )}
              
              {/* Only show tenant-specific menu items if a tenant is selected */}
              {tenantId && (
                <>
                  {/* Calendar View - Default view */}
                  <Link to={`/${tenantId}`}
                        className={`c-sidenav__my-alchemy t-5 o-flex o-flex--middle u-padding-top-xs u-1/1 u-padding-horizontal-l ${location.pathname === `/${tenantId}` ? 'c-selectable-item__dark--active' : ''}`}
                        title={isExpanded ? null : 'Calendar View'}>
                    <div className="c-icon--medium u-background-transparent u-margin-right-xxs u-padding-left-none">
                      <i className="fas fa-calendar-alt u-color-white-opacity-72"></i>
                    </div>
                    {isExpanded && <span className="t-4">Calendar View</span>}
                  </Link>

                  {/* Resource Dashboard */}
                  <Link to={`/${tenantId}/resource-dashboard`}
                        className={`c-sidenav__my-alchemy t-5 o-flex o-flex--middle u-padding-top-xs u-1/1 u-padding-horizontal-l ${isPathActive('/resource-dashboard') ? 'c-selectable-item__dark--active' : ''}`}
                        title={isExpanded ? null : 'Resource Dashboard'}>
                    <div className="c-icon--medium u-background-transparent u-margin-right-xxs u-padding-left-none">
                      <i className="fas fa-tachometer-alt u-color-white-opacity-72"></i>
                    </div>
                    {isExpanded && <span className="t-4">Resource Dashboard</span>}
                  </Link>

                  {/* Equipment List View */}
                  <Link to={`/${tenantId}/equipment-list`}
                        className={`c-sidenav__my-alchemy t-5 o-flex o-flex--middle u-padding-top-xs u-1/1 u-padding-horizontal-l ${isPathActive('/equipment-list') ? 'c-selectable-item__dark--active' : ''}`}
                        title={isExpanded ? null : 'Equipment List'}>
                    <div className="c-icon--medium u-background-transparent u-margin-right-xxs u-padding-left-none">
                      <i className="fas fa-microscope u-color-white-opacity-72"></i>
                    </div>
                    {isExpanded && <span className="t-4">Equipment List</span>}
                  </Link>

                  {/* Technician Schedule */}
                  <Link to={`/${tenantId}/technician-schedule`}
                        className={`c-sidenav__my-alchemy t-5 o-flex o-flex--middle u-padding-top-xs u-1/1 u-padding-horizontal-l ${isPathActive('/technician-schedule') ? 'c-selectable-item__dark--active' : ''}`}
                        title={isExpanded ? null : 'Technician Schedule'}>
                    <div className="c-icon--medium u-background-transparent u-margin-right-xxs u-padding-left-none">
                      <i className="fas fa-user-md u-color-white-opacity-72"></i>
                    </div>
                    {isExpanded && <span className="t-4">Technician Schedule</span>}
                  </Link>

                  {/* Gantt Chart View */}
                  <Link to={`/${tenantId}/gantt-chart`}
                        className={`c-sidenav__my-alchemy t-5 o-flex o-flex--middle u-padding-top-xs u-1/1 u-padding-horizontal-l ${isPathActive('/gantt-chart') ? 'c-selectable-item__dark--active' : ''}`}
                        title={isExpanded ? null : 'Gantt Chart'}>
                    <div className="c-icon--medium u-background-transparent u-margin-right-xxs u-padding-left-none">
                      <i className="fas fa-tasks u-color-white-opacity-72"></i>
                    </div>
                    {isExpanded && <span className="t-4">Gantt Chart</span>}
                  </Link>

                  {/* Analytics & Reports */}
                  <Link to={`/${tenantId}/analytics`}
                        className={`c-sidenav__my-alchemy t-5 o-flex o-flex--middle u-padding-top-xs u-1/1 u-padding-horizontal-l ${isPathActive('/analytics') ? 'c-selectable-item__dark--active' : ''}`}
                        title={isExpanded ? null : 'Analytics & Reports'}>
                    <div className="c-icon--medium u-background-transparent u-margin-right-xxs u-padding-left-none">
                      <i className="fas fa-chart-bar u-color-white-opacity-72"></i>
                    </div>
                    {isExpanded && <span className="t-4">Analytics & Reports</span>}
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Admin section */}
        <div className="admin-section">
          {/* Admin section header */}
          {isExpanded && (
            <div className="admin-header">
              <span>ADMINISTRATION</span>
            </div>
          )}
          
          {/* Admin menu items */}
          <div className="admin-menu">
            {isAdminAuthenticated ? (
              <>
                <Link to="/admin"
                      className={`c-sidenav__my-alchemy t-5 o-flex o-flex--middle u-padding-top-xs u-1/1 u-padding-horizontal-l ${isAdminArea ? 'c-selectable-item__dark--active' : ''}`}
                      title={isExpanded ? null : 'Manage Tenants'}>
                  <div className="c-icon--medium u-background-transparent u-margin-right-xxs u-padding-left-none">
                    <i className="fas fa-cog u-color-white-opacity-72"></i>
                  </div>
                  {isExpanded && <span className="t-4">Manage Tenants</span>}
                </Link>
                
                <button onClick={handleLogout}
                        className="c-sidenav__my-alchemy t-5 o-flex o-flex--middle u-padding-top-xs u-1/1 u-padding-horizontal-l c-admin-btn">
                  <div className="c-icon--medium u-background-transparent u-margin-right-xxs u-padding-left-none">
                    <i className="fas fa-sign-out-alt u-color-white-opacity-72"></i>
                  </div>
                  {isExpanded && <span className="t-4">Logout</span>}
                </button>
              </>
            ) : (
              <Link to="/admin-login"
                    className={`c-sidenav__my-alchemy t-5 o-flex o-flex--middle u-padding-top-xs u-1/1 u-padding-horizontal-l ${isAdminArea ? 'c-selectable-item__dark--active' : ''}`}
                    title={isExpanded ? null : 'Admin Login'}>
                <div className="c-icon--medium u-background-transparent u-margin-right-xxs u-padding-left-none">
                  <i className="fas fa-lock u-color-white-opacity-72"></i>
                </div>
                {isExpanded && <span className="t-4">Admin Login</span>}
              </Link>
            )}
          </div>
        </div>

        {/* Footer copyright */}
        <div className={`c-sidenav__copy u-font-size-12 u-padding-vertical-s u-text-align-center ${!isExpanded ? 'u-height-32' : ''}`}>
          <span>{isExpanded ? '© Alchemy Cloud, Inc. All Rights Reserved.' : '© Alchemy'}</span>
        </div>
      </div>
      
      {/* Main Content */}
      <main className={`main-content ${isExpanded ? 'expanded' : 'collapsed'}`}>
        <div className="content-wrapper">
          {children}
        </div>
      </main>
    </div>
  );
}

export default AppLayout;
