import React from 'react';
import { Filter, ChevronLeft, ChevronRight, SearchX, Sparkles } from 'lucide-react';
import SchemeCard from './SchemeCard';

export default function SchemeList({ 
  schemes = [], 
  total = 0, 
  page = 1, 
  totalPages = 1, 
  onPageChange, 
  loading = false,
  filters,
  onFilterChange,
  availableStates = []
}) {
  return (
    <section id="scheme-results-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 scroll-mt-24">
      
      {/* Header & Filter Controls Bar */}
      <div className="glass-card rounded-2xl p-5 mb-8 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Results Summary */}
        <div>
          <h2 className="text-xl font-bold font-outfit text-white flex items-center gap-2">
            Scheme Catalog Results
            <span className="text-xs bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-semibold px-2.5 py-0.5 rounded-full">
              {total.toLocaleString()} Found
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Page {page} of {totalPages || 1} • Displaying real-time database matches
          </p>
        </div>

        {/* Filters Controls */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Level Filter */}
          <select
            value={filters.level}
            onChange={(e) => onFilterChange({ ...filters, level: e.target.value, page: 1 }, true)}
            className="bg-slate-900 text-slate-200 text-xs font-medium border border-slate-800 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500"
          >
            <option value="All">All Levels (Central & State)</option>
            <option value="Central">Central Schemes Only</option>
            <option value="State">State Schemes Only</option>
          </select>

          {/* State Filter */}
          <select
            value={filters.state}
            onChange={(e) => onFilterChange({ ...filters, state: e.target.value, page: 1 }, true)}
            className="bg-slate-900 text-slate-200 text-xs font-medium border border-slate-800 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500 max-w-[180px]"
          >
            <option value="All">All States / UTs</option>
            {availableStates.map((st) => (
              <option key={st} value={st}>{st}</option>
            ))}
          </select>

          {/* DBT Filter Toggle */}
          <button
            onClick={() => onFilterChange({ ...filters, dbt: !filters.dbt, page: 1 }, true)}
            className={`text-xs font-semibold px-3 py-2 rounded-xl border transition-all ${
              filters.dbt
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm shadow-emerald-500/20'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
            }`}
          >
            ⚡ DBT Only
          </button>
        </div>

      </div>

      {/* Loading Skeleton Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-64 glass-card rounded-2xl bg-slate-900/40 border border-slate-800"></div>
          ))}
        </div>
      ) : schemes.length === 0 ? (
        /* Empty State */
        <div className="glass-card rounded-3xl p-12 text-center border border-slate-800 max-w-xl mx-auto my-12">
          <SearchX className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white font-outfit mb-2">No schemes match your query</h3>
          <p className="text-sm text-slate-400 mb-6">
            Try adjusting your search query, clearing state filters, or selecting a different category.
          </p>
          <button
            onClick={() => onFilterChange({ q: '', level: 'All', state: 'All', category: 'All', dbt: false, page: 1 }, true)}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm rounded-xl transition-all shadow-lg shadow-indigo-600/30"
          >
            Reset All Filters
          </button>
        </div>
      ) : (
        /* Scheme Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {schemes.map((scheme) => (
            <SchemeCard key={scheme.slug} scheme={scheme} />
          ))}
        </div>
      )}

      {/* Pagination Bar */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between mt-12 pt-6 border-t border-slate-800">
          <button
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page === 1}
            className="px-4 py-2 bg-slate-900 border border-slate-800 text-slate-300 font-semibold text-xs rounded-xl hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>

          <span className="text-xs font-semibold text-slate-400">
            Page <strong className="text-white">{page}</strong> of {totalPages}
          </span>

          <button
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            className="px-4 py-2 bg-slate-900 border border-slate-800 text-slate-300 font-semibold text-xs rounded-xl hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 transition-all"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

    </section>
  );
}
