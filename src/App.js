import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LaboratoryCalendar from './components/LaboratoryCalendar';
import AdminPage from './components/AdminPage';
import AdminLogin from './components/AdminLogin';
import TenantCalendar from './components/TenantCalendar';
import ResourceDashboard from './components/ResourceDashboard';
import EquipmentList from './components/EquipmentList';
import TechnicianSchedule from './components/TechnicianSchedule';
import GanttChart from './components/GanttChart';
import Analytics from './components/Analytics';
import CapacityPlanning from './components/CapacityPlanning'; // Import the new component
import AppLayout from './components/AppLayout';
import 'antd/dist/reset.css'
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
          
          {/* Resource Planning Routes */}
          <Route path="/:tenantId/resource-dashboard" element={<ResourceDashboard />} />
          <Route path="/:tenantId/equipment-list" element={<EquipmentList />} />
          <Route path="/:tenantId/technician-schedule" element={<TechnicianSchedule />} />
          <Route path="/:tenantId/gantt-chart" element={<GanttChart />} />
          <Route path="/:tenantId/analytics" element={<Analytics />} />
          
          {/* New Capacity Planning Route */}
          <Route path="/:tenantId/capacity-planning" element={<CapacityPlanning />} />
        </Routes>
      </AppLayout>
    </Router>
  );
}

export default App;
