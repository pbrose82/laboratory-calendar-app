import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LaboratoryCalendar from './components/LaboratoryCalendar';
import AdminPage from './components/AdminPage';
import TenantCalendar from './components/TenantCalendar';
import AppLayout from './components/AppLayout';
import './App.css';

function App() {
  return (
    <Router>
      <AppLayout>
        <Routes>
          <Route path="/" element={<LaboratoryCalendar />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/:tenantId" element={<TenantCalendar />} />
        </Routes>
      </AppLayout>
    </Router>
  );
}

export default App;
