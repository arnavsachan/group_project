import React, { useState, useEffect, useCallback, useRef } from 'react';
import Navbar from './components/Navbar';
import HeroSearch from './components/HeroSearch';
import StatsSection from './components/StatsSection';
import CategoriesGrid from './components/CategoriesGrid';
import SchemeList from './components/SchemeList';

export default function HomePage() {
  const [activeTab, setActiveTab] = useState('home');
  const [stats, setStats] = useState(null);
  const [availableStates, setAvailableStates] = useState([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const shouldScrollRef = useRef(false);

  // Scheme Search State
  const [searchParams, setSearchParams] = useState({
    q: '',
    level: 'All',
    state: 'All',
    category: 'All',
    dbt: false,
    page: 1,
    limit: 12
  });

  const [schemesData, setSchemesData] = useState({ schemes: [], total: 0, totalPages: 1 });
  const [schemesLoading, setSchemesLoading] = useState(true);

  // Smooth scroll helper to results section
  const scrollToResults = useCallback(() => {
    setTimeout(() => {
      const section = document.getElementById('scheme-results-section');
      if (section) {
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  }, []);

  // 1. Fetch Stats & Filters on Mount
  useEffect(() => {
    async function fetchInitialMetadata() {
      try {
        setStatsLoading(true);
        const [statsRes, filtersRes] = await Promise.all([
          fetch('/api/schemes/stats'),
          fetch('/api/schemes/filters')
        ]);
        if (statsRes.ok) {
          const statsJson = await statsRes.json();
          setStats(statsJson);
        }
        if (filtersRes.ok) {
          const filtersJson = await filtersRes.json();
          setAvailableStates(filtersJson.states || []);
        }
      } catch (err) {
        console.error('Failed to fetch stats/filters:', err);
      } finally {
        setStatsLoading(false);
      }
    }
    fetchInitialMetadata();
  }, []);

  // 2. Fetch Schemes when search parameters change
  const fetchSchemes = useCallback(async () => {
    try {
      setSchemesLoading(true);
      const queryParts = [];
      queryParts.push(`q=${encodeURIComponent(searchParams.q || '')}`);
      if (searchParams.level && searchParams.level !== 'All') {
        queryParts.push(`level=${encodeURIComponent(searchParams.level)}`);
      }
      if (searchParams.state && searchParams.state !== 'All') {
        queryParts.push(`state=${encodeURIComponent(searchParams.state)}`);
      }
      if (searchParams.category && searchParams.category !== 'All') {
        queryParts.push(`category=${encodeURIComponent(searchParams.category)}`);
      }
      if (searchParams.dbt) {
        queryParts.push(`dbt=true`);
      }
      queryParts.push(`page=${searchParams.page}`);
      queryParts.push(`limit=${searchParams.limit}`);

      const url = `/api/schemes?${queryParts.join('&')}`;
      console.log('🔍 Executing scheme fetch API:', url);
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        setSchemesData({
          schemes: json.schemes || [],
          total: json.total || 0,
          totalPages: json.totalPages || 1
        });
      }
    } catch (err) {
      console.error('Failed to fetch schemes:', err);
    } finally {
      setSchemesLoading(false);
      if (shouldScrollRef.current) {
        shouldScrollRef.current = false;
        scrollToResults();
      }
    }
  }, [searchParams, scrollToResults]);

  useEffect(() => {
    fetchSchemes();
  }, [fetchSchemes]);

  const handleSearchChange = (newQuery, autoScroll = false) => {
    if (autoScroll) shouldScrollRef.current = true;
    setSearchParams(prev => ({
      ...prev,
      q: newQuery,
      page: 1
    }));
  };

  const handleUserSearch = (newQuery) => {
    shouldScrollRef.current = true;
    setSearchParams(prev => ({
      ...prev,
      q: newQuery,
      page: 1
    }));
    scrollToResults();
  };

  const handleCategorySelect = (categoryName) => {
    shouldScrollRef.current = true;
    setSearchParams(prev => ({
      ...prev,
      category: categoryName,
      page: 1
    }));
    scrollToResults();
  };

  const handleFilterChange = (newFilters, autoScroll = false) => {
    if (autoScroll) shouldScrollRef.current = true;
    setSearchParams(prev => ({
      ...prev,
      ...newFilters
    }));
  };

  const handlePageChange = (newPage) => {
    shouldScrollRef.current = true;
    setSearchParams(prev => ({
      ...prev,
      page: newPage
    }));
    scrollToResults();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-600 selection:text-white">
      <main className="flex-1">
        <HeroSearch
          searchQuery={searchParams.q}
          onSearchChange={handleSearchChange}
          onUserSearch={handleUserSearch}
        />
        <StatsSection stats={stats} loading={statsLoading} />
        <CategoriesGrid
          categories={stats?.topCategories || []}
          selectedCategory={searchParams.category}
          onSelectCategory={handleCategorySelect}
        />
        <section id="scheme-results-section" className="pt-8">
          <SchemeList
            schemes={schemesData.schemes}
            total={schemesData.total}
            page={searchParams.page}
            totalPages={schemesData.totalPages}
            onPageChange={handlePageChange}
            loading={schemesLoading}
            filters={searchParams}
            onFilterChange={handleFilterChange}
            availableStates={availableStates}
          />
        </section>
      </main>
      <footer className="border-t border-slate-800/80 bg-slate-950 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-slate-300 font-outfit">Scheme Finder India</span>
            <span>• Indexing 4,764 Government Schemes</span>
          </div>
          <p>© 2026 Scheme Finder • Powered by Smart Offline AI Engine</p>
        </div>
      </footer>
    </div>
  );
}
