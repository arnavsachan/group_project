import React from 'react';
import { Landmark, Cpu, ChevronLeft } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export default function Navbar({ activeTab = "home", onTabChange }) {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-50 glass-card border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Left side: Back button and brand */}
        <div className="flex items-center space-x-4">
          {/* Back button */}
          <button
            onClick={() => navigate(-1)}
            className="flex items-center text-slate-300 hover:text-white"
            aria-label="Go back"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="ml-1">Back</span>
          </button>

          {/* Brand / Logo */}
          <div className="flex flex-col">
            <span className="font-bold text-xl tracking-tight text-white font-outfit">
              Scheme Finder
            </span>
            <span className="text-xs bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
              🇮🇳 India
            </span>
          </div>
        </div>

        {/* Center info */}
        <p className="text-xs text-slate-400 font-medium">
          National Portal Index • 4,764 Schemes
        </p>

        {/* Navigation Tabs */}
        <nav className="hidden md:flex items-center space-x-1 bg-slate-900/60 p-1.5 rounded-xl border border-slate-800">
          <button
            onClick={() => onTabChange && onTabChange('home')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              activeTab === 'home'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            Home Search
          </button>

          <Link
            to="/find-schemes"
            className={`px-4 py-2 text-sm font-medium rounded-lg ${
              activeTab === 'find-schemes'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/20'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-slate-100'
            }`}
          >
            Find Schemes
          </Link>

          <Link
            to="/profile"
            className="px-4 py-2 text-sm font-medium rounded-lg bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow-md shadow-emerald-500/20"
          >
            Profile
          </Link>
        </nav>

        {/* AI Status Badge */}
        <div className="flex items-center space-x-3">
          <div
            className="flex items-center space-x-2 bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs px-3.5 py-1.5 rounded-full font-medium shadow-inner"
            title="Running in Smart Offline AI Mode (evaluating local scheme dataset markdown with zero API key dependency)"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            <Cpu className="w-3.5 h-3.5 text-amber-400" />
            <span>Smart Offline AI</span>
          </div>
        </div>
      </div>
    </header>
  );
}
