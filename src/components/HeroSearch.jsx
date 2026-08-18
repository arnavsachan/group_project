import React, { useState, useEffect, useRef } from 'react';
import { Search, Sparkles, X } from 'lucide-react';
import VoiceSearch from './VoiceSearch';

export default function HeroSearch({ searchQuery = '', onSearchChange, onUserSearch }) {
  const [localQuery, setLocalQuery] = useState(searchQuery);
  const isInternalChangeRef = useRef(false);

  // Sync from parent prop ONLY if change came externally (e.g. category clear, chip click from outside)
  useEffect(() => {
    if (!isInternalChangeRef.current) {
      setLocalQuery(searchQuery);
    }
    isInternalChangeRef.current = false;
  }, [searchQuery]);

  // Debounced search trigger (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localQuery !== searchQuery) {
        isInternalChangeRef.current = true;
        onSearchChange(localQuery, false); // Debounced typing update
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [localQuery, searchQuery, onSearchChange]);

  const handleChange = (e) => {
    const val = e.target.value;
    setLocalQuery(val);
  };

  const handleVoiceResult = (text) => {
    setLocalQuery(text);
    isInternalChangeRef.current = true;
    if (onUserSearch) onUserSearch(text);
    else onSearchChange(text, true);
  };

  const handleQuickChip = (chip) => {
    setLocalQuery(chip);
    isInternalChangeRef.current = true;
    if (onUserSearch) onUserSearch(chip);
    else onSearchChange(chip, true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    isInternalChangeRef.current = true;
    if (onUserSearch) onUserSearch(localQuery);
    else onSearchChange(localQuery, true);
  };

  const clearSearch = () => {
    setLocalQuery('');
    isInternalChangeRef.current = true;
    onSearchChange('', false);
  };

  return (
    <section className="relative overflow-hidden pt-12 pb-16 px-4 sm:px-6 lg:px-8">
      {/* Background Decorative Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-gradient-to-r from-indigo-600/20 via-purple-600/20 to-pink-600/20 blur-[120px] rounded-full pointer-events-none -z-10" />

      <div className="max-w-4xl mx-auto text-center">
        {/* Headline */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight font-outfit leading-tight mb-4">
          Find Government Schemes{' '}
          <span className="text-gradient-accent">Made Simple for You</span>
        </h1>

        <p className="text-lg sm:text-xl text-slate-300 max-w-2xl mx-auto mb-10 leading-relaxed">
          Search over <strong className="text-white font-semibold">4,764+ Central & State Schemes</strong> across India. Filter by category, location, and benefits with instant AI guidance.
        </p>

        {/* Search Bar Form */}
        <form onSubmit={handleSubmit} className="relative max-w-2xl mx-auto">
          <div className="relative flex items-center glass-card rounded-2xl p-2 border border-slate-700/80 shadow-2xl focus-within:border-indigo-500/80 focus-within:ring-4 focus-within:ring-indigo-500/20 transition-all duration-300">
            <div className="pl-4 pr-2 text-slate-400">
              <Search className="w-6 h-6 text-indigo-400" />
            </div>

            <input
              type="text"
              value={localQuery}
              onChange={handleChange}
              placeholder="Search scheme name, keyword (e.g. 'loan', 'scholarship', 'women', 'kisan')..."
              className="w-full bg-transparent text-white placeholder-slate-400 focus:outline-none text-base sm:text-lg px-2 py-3"
            />

            {localQuery && (
              <button
                type="button"
                onClick={clearSearch}
                className="p-2 text-slate-400 hover:text-white transition-colors"
                title="Clear search"
              >
                <X className="w-5 h-5" />
              </button>
            )}

            {/* Voice Search Button */}
            <div className="pr-1">
              <VoiceSearch onResult={handleVoiceResult} />
            </div>
          </div>

          {/* Quick Suggestion Chips */}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-4 text-xs">
            <span className="text-slate-400 font-medium mr-1">Trending Searches:</span>
            {['Stand-Up India', 'Scholarship', 'Farmer', 'Women', 'Loan', 'Pension'].map((chip) => (
              <button
                type="button"
                key={chip}
                onClick={() => handleQuickChip(chip)}
                className={`px-3 py-1.5 rounded-full border transition-all ${
                  localQuery.toLowerCase() === chip.toLowerCase()
                    ? 'bg-indigo-600 text-white border-indigo-500 font-semibold shadow-md shadow-indigo-500/20'
                    : 'bg-slate-900/60 text-slate-300 border-slate-800 hover:border-slate-700 hover:bg-slate-800/80'
                }`}
              >
                {chip}
              </button>
            ))}
          </div>
        </form>

      </div>
    </section>
  );
}
