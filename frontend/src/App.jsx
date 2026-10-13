import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import SimulationBanner from './components/SimulationBanner';
import Dashboard from './pages/Dashboard';
import AddParticipants from './pages/AddParticipants';
import ProfileLab from './pages/ProfileLab';
import DatingArenaAndRankings from './pages/DatingArenaAndRankings';

function App() {
  return (
    <Router>
      <div className="min-h-screen flex flex-col bg-[#FFFCFC] text-[#292329] selection:bg-[#FBE5EB] selection:text-[#292329]">
        <Navbar />
        <SimulationBanner />

        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/add-participants" element={<AddParticipants />} />
            <Route path="/profile-lab" element={<ProfileLab />} />
            <Route path="/dating-arena" element={<DatingArenaAndRankings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>

        <footer className="border-t border-[#F0E4E7] bg-white py-6 px-4 text-center text-xs text-[#827780]">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#E8A4B4]"></span>
              <span className="font-medium text-[#292329]">Agentic Dating</span>
              <span>— React · Express · FastAPI · LangGraph · MongoDB</span>
            </div>
            <div className="text-[11px] text-[#827780]">
              Authorized LinkedIn & Instagram public sources · Simulated conversations
            </div>
          </div>
        </footer>
      </div>
    </Router>
  );
}

export default App;
