import React from 'react';
import { Landmark, MapPin, Zap, ExternalLink, Tag, Globe, Sparkles, Heart } from 'lucide-react';
import useLocalStorage from '../hooks/useLocalStorage';
import { Link } from 'react-router-dom';

export default function SchemeCard({ scheme, matchScore }) {
  const [likedSchemes, setLikedSchemes] = useLocalStorage('likedSchemes', []);
  const isLiked = likedSchemes.includes(scheme.slug);
  const toggleLike = () => {
    if (isLiked) {
      setLikedSchemes(likedSchemes.filter(s => s !== scheme.slug));
    } else {
      setLikedSchemes([...likedSchemes, scheme.slug]);
    }
  };
  if (!scheme) return null;

  const isCentral = scheme.level === 'Central';
  const categories = scheme.categories || [];
  const briefDesc = scheme.brief_description || 'Detailed scheme guidelines and financial assistance managed by nodal department.';


  return (
    <div className="glass-card glass-card-hover rounded-2xl p-6 border border-slate-800 flex flex-col justify-between h-full group relative">
      {matchScore && (
        <div className="absolute top-2 right-2 bg-indigo-600/20 text-indigo-300 text-xs px-2 py-0.5 rounded">
          Match: {matchScore}%
        </div>
      )}
      <div>
        
        {/* Top Badges */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* Level & State Badge */}
            <span className={`text-xs font-semibold px-3 py-1 rounded-full border flex items-center gap-1.5 ${
              isCentral
                ? 'bg-purple-500/10 text-purple-300 border-purple-500/20'
                : 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20'
            }`}>
              {isCentral ? (
                <>
                  <Landmark className="w-3.5 h-3.5 text-purple-400" />
                  Central Scheme
                </>
              ) : (
                <>
                  <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                  State: {scheme.state || 'State/UT'}
                </>
              )}
            </span>

            {/* DBT Badge */}
            {scheme.dbt_scheme && (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-emerald-400" />
                DBT Eligible
              </span>
            )}
          </div>

          {/* Application Mode */}
          <span className="text-xs text-slate-400 bg-slate-900 px-2.5 py-1 rounded-md border border-slate-800 font-medium">
            {scheme.application_mode || 'Online / Offline'}
          </span>
        </div>

        {/* Scheme Title */}
        <h3 className="text-lg font-bold text-white group-hover:text-indigo-300 transition-colors font-outfit mb-2 leading-snug">
          <Link to={`/scheme/${scheme.slug}`} className="hover:underline" >{scheme.title}</Link>
        </h3>

        {/* Nodal Ministry / Agency */}
        {(scheme.nodal_ministry || scheme.implementing_agency) && (
          <p className="text-xs text-slate-400 mb-3 font-medium flex items-center gap-1">
            <Globe className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
            <span className="truncate">{scheme.nodal_ministry || scheme.implementing_agency}</span>
          </p>
        )}

        {/* Brief Description */}
        <p className="text-sm text-slate-300 line-clamp-3 mb-4 leading-relaxed font-normal">
          {briefDesc}
        </p>

        {/* Categories Tags */}
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {categories.slice(0, 3).map((cat, idx) => (
              <span key={idx} className="text-[11px] font-medium px-2.5 py-0.5 rounded-md bg-slate-900/80 text-slate-400 border border-slate-800/80">
                {cat}
              </span>
            ))}
          </div>
        )}

      </div>

      {/* Card Footer Actions */}
      <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
        <button onClick={toggleLike} className={`heart-btn ${isLiked ? 'liked' : ''} cursor-pointer`} aria-label={isLiked ? 'Unlike' : 'Like'}>
          <Heart className="w-5 h-5" />
        </button>
        <Link
          to={`/scheme/${scheme.slug}`}
          className="text-xs font-semibold text-indigo-400 bg-slate-900 border border-slate-800 px-3.5 py-1.5 rounded-lg hover:bg-slate-800 hover:text-indigo-300 transition-colors flex items-center gap-1.5"
        >
          View Details
          <ExternalLink className="w-3 h-3 text-indigo-400" />
        </Link>
      </div>
    </div>
  );
}
