import React from 'react';
import LaboratoryCalendar from './components/LaboratoryCalendar';
import './App.css';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>Laboratory Resource Calendar</h1>
      </header>
      <main>
        <LaboratoryCalendar />
      </main>
      <footer>
        <p>© 2024 Laboratory Management System</p>
      </footer>
    </div>
  );
}

export default App;