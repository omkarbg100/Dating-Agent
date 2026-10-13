import React from 'react';
import { NavLink } from 'react-router-dom';
import { Heart, Activity, UserPlus, Cpu, Sparkles } from 'lucide-react';

export const Navbar = () => {
  const navLinkClass = ({ isActive }) =>
    `flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-150 ${
      isActive
        ? 'bg-[#FBE5EB] text-[#292329] border border-[#E8A4B4]/60 shadow-xs'
        : 'text-[#827780] hover:text-[#292329] hover:bg-white/60'
    }`;

  return (
    <header className="sticky top-0 z-50 border-b border-[#F0E4E7] bg-[#FFFCFC]/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <NavLink to="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-full bg-[#FFF1F4] border border-[#F0E4E7] flex items-center justify-center text-[#E8A4B4]">
            <span className="w-2.5 h-2.5 rounded-full bg-[#E8A4B4]"></span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-base text-[#292329] tracking-tight">
                Agentic Dating
              </span>
              <span className="text-[10px] uppercase tracking-wider font-medium px-2 py-0.5 rounded-full bg-[#FFF1F4] text-[#827780] border border-[#F0E4E7]">
                AI Simulation
              </span>
            </div>
          </div>
        </NavLink>

        {/* Capsule Navigation (Inspired by reference site top nav pill) */}
        <nav className="flex items-center p-1 rounded-full bg-[#FFF1F4] border border-[#F0E4E7] shadow-xs">
          <NavLink to="/" className={navLinkClass}>
            <Activity className="w-3.5 h-3.5" />
            <span>Dashboard</span>
          </NavLink>
          <NavLink to="/add-participants" className={navLinkClass}>
            <UserPlus className="w-3.5 h-3.5" />
            <span>Add Participants</span>
          </NavLink>
          <NavLink to="/profile-lab" className={navLinkClass}>
            <Cpu className="w-3.5 h-3.5" />
            <span>Profile Lab</span>
          </NavLink>
          <NavLink to="/dating-arena" className={navLinkClass}>
            <Sparkles className="w-3.5 h-3.5 text-[#E8A4B4]" />
            <span>Arena & Rankings</span>
          </NavLink>
        </nav>

        {/* Status indicator badge (Reference-inspired) */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-[#F0E4E7] text-[11px] text-[#827780]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#54866A]"></span>
          <span>live · 6-node langgraph</span>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
