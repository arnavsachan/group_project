import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ChevronRight, ChevronDown, Loader2, Heart } from 'lucide-react';
import { marked } from 'marked';
import MarkdownRenderer from './MarkdownRenderer';
import useLocalStorage from '../hooks/useLocalStorage';

const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal"
];

function decodeHTMLEntities(text) {
  const txt = document.createElement('textarea');
  txt.innerHTML = text;
  return txt.value;
}

function Collapsible({ title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="glass-card rounded-2xl my-4">
      <button
        className="w-full flex justify-between items-center px-4 py-3 text-left font-medium text-white hover:bg-slate-800 transition"
        onClick={() => setOpen(!open)}
      >
        <span>{title}</span>
        {open ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
      </button>
      {open && <div className="px-4 pb-4 pt-2 text-slate-300">{children}</div>}
    </div>
  );
}

export default function SchemeDetails() {
  const { slug } = useParams();
  const [scheme, setScheme] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // AI widget states
  const [explain, setExplain] = useState(null);
  const [explainLoading, setExplainLoading] = useState(false);

  const [applyProfile, setApplyProfile] = useState({ age: '', income: '', state: '' });
  const [applyResult, setApplyResult] = useState(null);
  const [applyLoading, setApplyLoading] = useState(false);

  const [chatQuestion, setChatQuestion] = useState('');
  const [chatResponse, setChatResponse] = useState(null);
  const [chatLoading, setChatLoading] = useState(false);

  // Persistence hooks
  const [likedSchemes, setLikedSchemes] = useLocalStorage('likedSchemes', []);
  const isLiked = likedSchemes.includes(slug);
  const toggleLike = () => {
    if (isLiked) {
      setLikedSchemes(likedSchemes.filter(s => s !== slug));
    } else {
      setLikedSchemes([...likedSchemes, slug]);
    }
  };

  const [recentlyViewed, setRecentlyViewed] = useLocalStorage('recentlyViewed', []);

  // Fetch scheme details
  useEffect(() => {
    async function fetchScheme() {
    try {
      const res = await fetch(`/api/schemes/${slug}`);
      if (!res.ok) throw new Error('Failed to load scheme');
      const data = await res.json();
      setScheme(data);
      // Update recently viewed list (most recent first, max 10)
      setRecentlyViewed(prev => {
        const filtered = prev.filter(s => s !== slug);
        const updated = [slug, ...filtered].slice(0, 10);
        return updated;
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }
    fetchScheme();
  }, [slug]);

  // Record recent view after scheme loads
  useEffect(() => {
    if (scheme && scheme.slug) {
      setRecentlyViewed(prev => {
        const filtered = prev.filter(s => s !== scheme.slug);
        const updated = [scheme.slug, ...filtered];
        return updated.slice(0, 10);
      });
    }
  }, [scheme]);

  // Handlers for AI widgets (unchanged)
  const handleExplain = async () => {
    setExplainLoading(true);
    try {
      const res = await fetch('/api/ai/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug })
      });
      const data = await res.json();
      setExplain(data);
    } catch (e) {
      setExplain({ error: e.message });
    } finally {
      setExplainLoading(false);
    }
  };

  const handleCanApply = async (e) => {
    e.preventDefault();
    setApplyLoading(true);
    try {
      const res = await fetch('/api/ai/can-i-apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, profile: applyProfile })
      });
      const data = await res.json();
      setApplyResult(data);
    } catch (e) {
      setApplyResult({ error: e.message });
    } finally {
      setApplyLoading(false);
    }
  };

  const handleChat = async (e) => {
    e.preventDefault();
    setChatLoading(true);
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, question: chatQuestion })
      });
      const data = await res.json();
      setChatResponse(data);
    } catch (e) {
      setChatResponse({ error: e.message });
    } finally {
      setChatLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin w-12 h-12 text-indigo-400" />
      </div>
    );
  }

  if (error) {
    return <div className="text-red-400 p-4">Error: {error}</div>;
  }

  const getFirstUrl = () => {
    if (!scheme || !scheme.applicationProcess) return null;
    const first = scheme.applicationProcess.find(p => p.url);
    return first ? first.url : null;
  };

  return (
    <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-white font-outfit mb-4 flex items-center space-x-3">
        {scheme.title || scheme.schemeName}
        <button
          onClick={toggleLike}
          className={`heart-btn ${isLiked ? 'liked' : ''}`}
          aria-label={isLiked ? 'Unlike' : 'Like'}
        >
          <Heart className="w-5 h-5" />
        </button>
      </h1>

      {/* Apply button */}
      {getFirstUrl() && (
        <a
          href={getFirstUrl()}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block mb-6 px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition"
        >
          Apply Now
        </a>
      )}

      {/* Tab navigation */}
      <TabNavigation
        scheme={scheme}
        handleExplain={handleExplain}
        explain={explain}
        explainLoading={explainLoading}
        handleCanApply={handleCanApply}
        applyProfile={applyProfile}
        setApplyProfile={setApplyProfile}
        applyLoading={applyLoading}
        applyResult={applyResult}
        handleChat={handleChat}
        chatQuestion={chatQuestion}
        setChatQuestion={setChatQuestion}
        chatLoading={chatLoading}
        chatResponse={chatResponse}
      />
    </section>
  );
}

/** Tab navigation component */
function TabNavigation({ scheme, handleExplain, explain, explainLoading, handleCanApply, applyProfile, setApplyProfile, applyLoading, applyResult, handleChat, chatQuestion, setChatQuestion, chatLoading, chatResponse }) {
  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'eligibility', label: 'Eligibility' },
    { id: 'benefits', label: 'Benefits' },
    { id: 'application', label: 'Application Process' },
    { id: 'documents', label: 'Documents' },
    { id: 'faqs', label: 'FAQs' },
  ];
  const [active, setActive] = useState('overview');

  const renderContent = () => {
    switch (active) {
      case 'overview':
        return (
          <div className="glass-card rounded-2xl p-6 text-slate-300">
            {scheme.detailed_description_md && (
              <MarkdownRenderer markdown={scheme.detailed_description_md} />
            )}
            {/* Categories and Tags */}
            <div className="mt-4 flex flex-wrap gap-2">
              {scheme.categories && scheme.categories.map((cat) => (
                <span key={cat} className="px-2 py-1 bg-indigo-600 text-white rounded text-sm">
                  {cat}
                </span>
              ))}
              {scheme.tags && scheme.tags.map((tag) => (
                <span key={tag} className="px-2 py-1 bg-slate-600 text-white rounded text-sm">
                  {tag}
                </span>
              ))}
            </div>
            {/* AI Widgets */}
            <div className="mt-8">
              {/* Explain Simply */}
              <Collapsible title="Explain Simply" defaultOpen={false}>
                {explainLoading ? (
                  <Loader2 className="animate-spin w-6 h-6 text-indigo-400" />
                ) : (
                  <div>
                    {explain && (
                      <div className="text-slate-300">
                        <p className="mb-2">{explain.summary?.whatIsIt}</p>
                        {explain.summary?.keyBenefits && (
                          <ul className="list-disc list-inside mb-2 space-y-1">
                            {explain.summary.keyBenefits.map((b, i) => (
                              <li key={i}>{b}</li>
                            ))}
                          </ul>
                        )}
                        {explain.summary?.keyEligibility && (
                          <ul className="list-disc list-inside space-y-1">
                            {explain.summary.keyEligibility.map((e, i) => (
                              <li key={i}>{e}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                    <button
                      onClick={handleExplain}
                      className="mt-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-400 text-white rounded"
                    >
                      Get Explanation
                    </button>
                  </div>
                )}
              </Collapsible>

              {/* Can I Apply? */}
              <Collapsible title="Can I Apply?" defaultOpen={false}>
                <form onSubmit={handleCanApply} className="space-y-3">
                  <input
                    type="number"
                    placeholder="Age"
                    className="w-full glass-input px-3 py-2 rounded"
                    value={applyProfile.age}
                    onChange={e => setApplyProfile({ ...applyProfile, age: e.target.value })}
                    required
                  />
                  <input
                    type="number"
                    placeholder="Annual Income (₹)"
                    className="w-full glass-input px-3 py-2 rounded"
                    value={applyProfile.income}
                    onChange={e => setApplyProfile({ ...applyProfile, income: e.target.value })}
                    required
                  />
                  <select
                    className="w-full glass-input px-3 py-2 rounded"
                    value={applyProfile.state}
                    onChange={e => setApplyProfile({ ...applyProfile, state: e.target.value })}
                    required
                  >
                    <option value="" disabled>Select State</option>
                    {INDIAN_STATES.map((st) => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    disabled={applyLoading}
                    className="px-4 py-2 bg-indigo-500 hover:bg-indigo-400 text-white rounded"
                  >
                    {applyLoading ? 'Checking…' : 'Check Eligibility'}
                  </button>
                </form>
                {applyResult && (
                  <div className="text-slate-300 mt-2">
                    {applyResult.message ? (
                      <p>{applyResult.message}</p>
                    ) : applyResult.eligible !== undefined ? (
                      <div>
                        <p><strong>Eligibility:</strong> {applyResult.eligible ? 'Yes' : 'No'}</p>
                        {applyResult.reason && <p>{applyResult.reason}</p>}
                      </div>
                    ) : (
                      <p>No eligibility information returned.</p>
                    )}
                  </div>
                )}
              </Collapsible>

              {/* Ask AI Chat */}
              <Collapsible title="Ask AI About This Scheme" defaultOpen={false}>
                <form onSubmit={handleChat} className="flex flex-col space-y-2">
                  <textarea
                    rows={3}
                    placeholder="Ask a question about the scheme…"
                    className="w-full glass-input px-3 py-2 rounded"
                    value={chatQuestion}
                    onChange={e => setChatQuestion(e.target.value)}
                    required
                  />
                  <button
                    type="submit"
                    disabled={chatLoading}
                    className="self-start px-4 py-2 bg-indigo-500 hover:bg-indigo-400 text-white rounded"
                  >
                    {chatLoading ? 'Sending…' : 'Send'}
                  </button>
                </form>
                {chatResponse && (
                  <div className="text-slate-300 mt-2">
                    {chatResponse.answer ? (
                      <p>{chatResponse.answer}</p>
                    ) : (
                      <pre className="whitespace-pre-wrap">{JSON.stringify(chatResponse, null, 2)}</pre>
                    )}
                  </div>
                )}
              </Collapsible>
            </div>
          </div>
        );
      case 'eligibility':
        return (
          <div className="glass-card rounded-2xl p-6 text-slate-300">
            {scheme.eligibility_md ? (
              <MarkdownRenderer markdown={scheme.eligibility_md} />
            ) : (
              <p>No eligibility information available.</p>
            )}
          </div>
        );
      case 'benefits':
        return (
          <div className="glass-card rounded-2xl p-6 text-slate-300">
            {scheme.benefits_md ? (
              <MarkdownRenderer markdown={scheme.benefits_md} />
            ) : (
              <p>No benefits information available.</p>
            )}
          </div>
        );
      case 'application':
        return (
          <div className="glass-card rounded-2xl p-6 text-slate-300">
            {scheme.application_process_md ? (
              <MarkdownRenderer markdown={scheme.application_process_md} />
            ) : (
              <p>No application process information available.</p>
            )}
          </div>
        );
      case 'documents':
        return (
          <div className="glass-card rounded-2xl p-6 text-slate-300">
            {scheme.documents_md ? (
              <MarkdownRenderer markdown={scheme.documents_md} />
            ) : (
              <p>No documents listed for this scheme.</p>
            )}
          </div>
        );
      case 'faqs':
        return (
          <div className="glass-card rounded-2xl p-4 text-slate-300">
            <p>No FAQs available for this scheme.</p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="mb-6">
      <nav className="flex space-x-2 overflow-x-auto mb-4">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActive(tab.id)}
            className={`px-4 py-2 rounded-t-xl font-medium ${active === tab.id ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'} transition`}
          >
            {tab.label}
          </button>
        ))}
      </nav>
      {renderContent()}
    </div>
  );
}

export { SchemeDetails };
