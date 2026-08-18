import React from 'react';
import { Layers, Building2, MapPin, Zap, CheckCircle2 } from 'lucide-react';

export default function StatsSection({ stats, loading }) {
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 glass-card rounded-2xl bg-slate-900/50"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const total = stats.totalSchemes || 4764;
  const central = stats.levels?.Central || 713;
  const stateCount = stats.levels?.State || 4051;
  const dbtCount = stats.dbtBreakdown?.dbt || 1240;

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-14">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
        
        {/* KPI Card 1: Total Schemes */}
        <div className="glass-card glass-card-hover rounded-2xl p-5 border border-slate-800 flex items-center space-x-4">
          <div className="p-3.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-white font-outfit">
              {total.toLocaleString()}
            </div>
            <div className="text-xs text-slate-400 font-medium">Total Schemes Indexed</div>
          </div>
        </div>

        {/* KPI Card 2: Central vs State */}
        <div className="glass-card glass-card-hover rounded-2xl p-5 border border-slate-800 flex items-center space-x-4">
          <div className="p-3.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-white font-outfit">
              {central} <span className="text-xs font-normal text-slate-400">/ {stateCount}</span>
            </div>
            <div className="text-xs text-slate-400 font-medium">Central vs State Schemes</div>
          </div>
        </div>

        {/* KPI Card 3: States & UTs */}
        <div className="glass-card glass-card-hover rounded-2xl p-5 border border-slate-800 flex items-center space-x-4">
          <div className="p-3.5 rounded-xl bg-pink-500/10 text-pink-400 border border-pink-500/20">
            <MapPin className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-white font-outfit">
              36
            </div>
            <div className="text-xs text-slate-400 font-medium">States & UTs Covered</div>
          </div>
        </div>

        {/* KPI Card 4: DBT Schemes */}
        <div className="glass-card glass-card-hover rounded-2xl p-5 border border-slate-800 flex items-center space-x-4">
          <div className="p-3.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-white font-outfit">
              {dbtCount.toLocaleString()}
            </div>
            <div className="text-xs text-slate-400 font-medium">DBT Direct Transfer Schemes</div>
          </div>
        </div>

      </div>
    </section>
  );
}
