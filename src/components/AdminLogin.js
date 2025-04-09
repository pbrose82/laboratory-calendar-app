import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminLogin.css';

// Simple admin authentication
// In a real app, this would be handled with proper authentication
function AdminLogin() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if already authenticated
    const adminAuth = sessionStorage.getItem('adminAuthenticated');
    if (adminAuth === 'true') {
      navigate('/admin');
    }
  }, [navigate]);

  // Admin password - in a real app, this would be server-side
  // For demo purposes, we're using a simple password
  const ADMIN_PASSWORD = 'admin123';
  
  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    // Simulate API call with delay
    setTimeout(() => {
      if (password === ADMIN_PASSWORD) {
        // Store authentication in session storage
        sessionStorage.setItem('adminAuthenticated', 'true');
        navigate('/admin');
      } else {
        setError('Invalid password');
        setIsLoading(false);
      }
    }, 800);
  };

  return (
    <div className="dashboard-container">
      <div className="content-header">
        <h1>Calendar Admin</h1>
      </div>
      
      <div className="admin-login-container">
        <div className="admin-login-card">
          <div className="admin-login-header">
            <i className="fas fa-lock"></i>
            <h2>Admin Authentication Required</h2>
          </div>
          
          <form onSubmit={handleSubmit}>
            {error && <div className="login-error">{error}</div>}
            
            <div className="form-group">
              <label htmlFor="password">Admin Password</label>
              <div className="password-input">
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter admin password"
                  required
                />
                <i className="fas fa-key"></i>
              </div>
              <div className="help-text">
                For demo: use "admin123"
              </div>
            </div>
            
            <button 
              type="submit" 
              className="login-button"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  Authenticating...
                </>
              ) : (
                <>
                  <i className="fas fa-sign-in-alt"></i>
                  Log In
                </>
              )}
            </button>
          </form>
          
          <div className="admin-login-footer">
            <p>
              This area is restricted to calendar administrators.
              <br />
              <a href="/" className="back-link">Return to Calendar</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminLogin;
