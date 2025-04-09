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
                    location.pathname.substring(1) : null;
  
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

  // Get current tenant name for display
  const getTenantName = () => {
    if (tenantId === 'demo-tenant') {
      return 'Demo Tenant';
    } else if (tenantId === 'productcaseelnandlims') {
      return 'Product CASE UAT Calendar';
    } else {
      return tenantId ? `${tenantId} Calendar` : '';
    }
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
              <Link to="/" 
                    className={`c-sidenav__my-alchemy t-5 o-flex o-flex--middle u-padding-top-xs u-1/1 u-padding-horizontal-l ${location.pathname === '/' ? 'c-selectable-item__dark--active' : ''}`}
                    title={isExpanded ? null : 'Dashboard'}>
                <div className="c-icon--medium u-background-transparent u-margin-right-xxs u-padding-left-none">
                  <i className="fas fa-th-large u-color-white-opacity-72"></i>
                </div>
                {isExpanded && <span className="t-4">Dashboard</span>}
              </Link>

              <Link to="/"
                    className="c-sidenav__my-alchemy t-5 o-flex o-flex--middle u-padding-top-xs u-1/1 u-padding-horizontal-l"
                    title={isExpanded ? null : 'My Assignments'}>
                <div className="c-icon--medium u-background-transparent u-margin-right-xxs u-padding-left-none">
                  <i className="fas fa-tasks u-color-white-opacity-72"></i>
                </div>
                {isExpanded && <span className="t-4">My Assignments</span>}
              </Link>
              
              {/* Show only the current tenant in navigation */}
              {tenantId && (
                <Link to={`/${tenantId}`}
                      className={`c-sidenav__my-alchemy t-5 o-flex o-flex--middle u-padding-top-xs u-1/1 u-padding-horizontal-l c-selectable-item__dark--active`}
                      title={isExpanded ? null : getTenantName()}>
                  <div className="c-icon--medium u-background-transparent u-margin-right-xxs u-padding-left-none">
                    <i className="fas fa-calendar u-color-white-opacity-72"></i>
                  </div>
                  {isExpanded && <span className="t-4">{getTenantName()}</span>}
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Admin section header */}
        {isExpanded && (
          <div className="admin-header">
            <span>ADMINISTRATION</span>
          </div>
        )}
        
        {/* Admin section */}
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
