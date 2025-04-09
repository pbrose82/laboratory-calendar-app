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

  return (
    <div className="app-container">
      {/* Left Navigation - Alchemized version */}
      <div className="c-sidenav o-flex--column"
           className={isExpanded ? 'c-sidenav--wide' : 'c-sidenav--mini'}
           data-qa="appSideNav">
        <div className={isExpanded ? 'o-flex--wide' : 'u-width-64'}>
          <div className="js-sidebar-header"
               className={isExpanded ? 'u-margin-horizontal-l' : 'u-margin-horizontal-m'}>
            
            {/* Header with toggle button */}
            <div className="u-margin-bottom-s u-margin-top-xs o-flex-flag">
              <button className="c-button-icon-white72 o-flex o-flex--center o-flex--middle u-margin-right-xxs"
                      type="button"
                      title={isExpanded ? "Collapse sidebar" : "Expand sidebar"}
                      onClick={onToggleSideNavSizeClick()}
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
            <button className="c-btn-like-input c-btn-like-input__search o-flex--start u-margin-top-xxs u-padding-none u-line-height-0x"
                    className={isExpanded ? 'u-1/1 u-margin-right-l' : 'u-width-32 u-min-width-32'}
                    title={isExpanded ? '' : 'Search'}
                    onClick={() => {}} 
                    data-qa="showQuickSearch">
              <i className="fas fa-search c-btn-like-input__search__icon"></i>
              {isExpanded && (
                <input 
                  placeholder="Search Laboratory Calendar"
                  readOnly
                  className="t-5 u-truncated u-padding-right-xxs"/>
              )}
            </button>

            {/* New button */}
            <div>
              <button type="button"
                      onClick={() => {}}
                      data-qa="newProcessAndView"
                      title={isExpanded ? '' : 'New'}
                      className="white-mat-button-base u-margin-top-m u-margin-bottom-l u-color-blue-gray-800 u-line-height-0x"
                      className={isExpanded ? 'u-margin-right-s' : 'u-width-32 u-min-width-32 u-padding-horizontal-ms'}>
                <div className="o-flex u-height-100 o-flex--middle">
                  <i className="fas fa-plus"></i>
                  {isExpanded && (
                    <div className="u-margin-left-xs">New</div>
                  )}
                </div>
              </button>
            </div>
          </div>

          {/* Navigation Menu */}
          <div className="u-overflow-auto js-views-and-assignments u-1/1">
            <div className={isExpanded ? '' : 'c-nav-mini-menu--height u-overflow-y-auto u-overflow-x-hidden'}>
              <Link to="/" 
                    className="c-sidenav__my-alchemy t-5 o-flex o-flex--middle u-padding-top-xs u-1/1 u-padding-horizontal-l"
                    className={location.pathname === '/' ? 'c-selectable-item__dark--active' : ''}
                    title={isExpanded ? null : 'Dashboard'}>
                <div className="c-icon--medium u-background-transparent u-margin-right-xxs u-padding-left-none">
                  <i className="fas fa-th-large u-color-white-opacity-72"></i>
                </div>
                {isExpanded && <span className="t-4">Dashboard</span>}
              </Link>

              <Link to="/"
                    className="c-sidenav__my-alchemy t-5 o-flex o-flex--middle u-margin-bottom-m u-padding-top-xs u-1/1 u-padding-horizontal-l"
                    title={isExpanded ? null : 'My Assignments'}>
                <div className="c-icon--medium u-background-transparent u-margin-right-xxs u-padding-left-none">
                  <i className="fas fa-tasks u-color-white-opacity-72"></i>
                </div>
                {isExpanded && <span className="t-4">My Assignments</span>}
              </Link>
              
              {/* Only show current tenant in nav if accessing directly via URL */}
              {tenantId && (
                <Link to={`/${tenantId}`}
                      className="c-sidenav__my-alchemy t-5 o-flex o-flex--middle u-margin-bottom-m u-padding-top-xs u-1/1 u-padding-horizontal-l"
                      className={location.pathname === `/${tenantId}` ? 'c-selectable-item__dark--active' : ''}
                      title={isExpanded ? null : `${tenantId} Calendar`}>
                  <div className="c-icon--medium u-background-transparent u-margin-right-xxs u-padding-left-none">
                    <i className="fas fa-calendar u-color-white-opacity-72"></i>
                  </div>
                  {isExpanded && <span className="t-4">{tenantId} Calendar</span>}
                </Link>
              )}
            </div>
            
            {/* Admin section is only shown if the user is authenticated */}
            {isAdminAuthenticated && isExpanded && (
              <div className="admin-menu-section">
                <h3 className="admin-section-title">Administration</h3>
                <ul className="admin-menu-list">
                  <li className={isAdminArea ? 'active' : ''}>
                    <Link to="/admin">
                      <i className="fas fa-cog"></i>
                      <span>Manage Tenants</span>
                    </Link>
                  </li>
                  <li>
                    <button onClick={handleLogout} className="logout-button">
                      <i className="fas fa-sign-out-alt"></i>
                      <span>Logout</span>
                    </button>
                  </li>
                </ul>
              </div>
            )}
            
            {/* Login link if not authenticated */}
            {!isAdminAuthenticated && (
              <div className="admin-auth-link">
                <Link to="/admin-login" 
                      className={isAdminArea ? 'active' : ''}>
                  <i className="fas fa-lock"></i>
                  {isExpanded && <span>Admin Login</span>}
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Footer copyright */}
        <div className="c-sidenav__copy u-font-size-12 u-padding-vertical-s u-text-align-center"
             className={!isExpanded ? 'u-height-32' : ''}>
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
