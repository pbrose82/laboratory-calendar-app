import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LaboratoryCalendar from './components/LaboratoryCalendar';
import AdminPage from './components/AdminPage';
import AdminLogin from './components/AdminLogin';
import TenantCalendar from './components/TenantCalendar';
import AppLayout from './components/AppLayout';
import './App.css';

// Protected route component
const ProtectedRoute = ({ children }) => {
  const isAuthenticated = sessionStorage.getItem('adminAuthenticated') === 'true';
  
  if (!isAuthenticated) {
    return <Navigate to="/admin-login" replace />;
  }
  
  return children;
};

function App() {
  return (
    <Router>
      <AppLayout>
        <Routes>
          <Route path="/" element={<LaboratoryCalendar />} />
          <Route path="/admin-login" element={<AdminLogin />} />
          <Route path="/admin" element={
            <ProtectedRoute>
              <AdminPage />
            </ProtectedRoute>
          } />
          <Route path="/:tenantId" element={<TenantCalendar />} />
        </Routes>
      </AppLayout>
    </Router>
  );
}

export default App;
