import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ChevronRight, ChevronDown, Loader2, Heart, Volume2, VolumeX } from 'lucide-react';
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

/**
 * Strips markdown symbols, headers, links, and HTML entities
 * to generate clean, natural-sounding plain text for speech synthesis.
 */
function stripMarkdown(md) {
  if (!md) return '';
  return md
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // [Text](url) -> Text
    .replace(/[*_~`#>+-]/g, ' ')             // remove markdown chars
    .replace(/\s+/g, ' ')                    // collapse whitespace
    .trim();
}

function Collapsible({ title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="glass-card rounded-2xl my-4">
      <button
        className="w-full flex justify-between items-center px-4 py-3 text-left font-medium text-white hover:bg-slate-800 transition cursor-pointer"
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
        // Update recently viewed list
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

  // Clean up any active speech synthesis when leaving page
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Handlers for AI widgets
  const handleExplain = async () => {
    setExplainLoading(true);
    try {
      const res = await fetch('/api/ai/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, scheme })
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <h1 className="text-3xl font-bold text-white font-outfit flex items-center space-x-3">
          <span>{scheme.title || scheme.schemeName}</span>
          <button
            onClick={toggleLike}
            className={`heart-btn ${isLiked ? 'liked' : ''} cursor-pointer`}
            aria-label={isLiked ? 'Unlike' : 'Like'}
          >
            <Heart className="w-5 h-5" />
          </button>
        </h1>
      </div>

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
        handleChat={handleChat}
        chatQuestion={chatQuestion}
        setChatQuestion={setChatQuestion}
        chatLoading={chatLoading}
        chatResponse={chatResponse}
      />
    </section>
  );
}

/**
 * Helper to transform third-person scheme eligibility text into natural,
 * direct second-person ("Are you...", "Do you...", "Is your...") Yes/No questions.
 */
function rephraseCriterionToQuestion(rawText) {
  let text = rawText
    .replace(/^(\d+\.|\*|-|\+)\s*/, '')       // remove leading bullets / numbers
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')   // strip links
    .replace(/[*_`]/g, '')                     // strip markdown symbols
    .replace(/&amp;/g, '&')
    .replace(/&gt;/g, '')
    .trim();

  // 1. Check Age patterns
  // e.g. "The age of the applicant must be at least 18 years." -> "Are you at least 18 years old?"
  // e.g. "Age between 18 and 70 years" -> "Are you between 18 and 70 years old?"
  if (/age\s+(of\s+the\s+applicant\s+)?(must\s+be|should\s+be|is)\s+(at\s+least|above|minimum)\s+(\d+)/i.test(text)) {
    const ageMatch = text.match(/(\d+)\s*(years|yrs)?/i);
    if (ageMatch) return `Are you at least ${ageMatch[1]} years old?`;
  }
  if (/upper\s+age\s+limit\s+.*(is|of)\s+(\d+)\s*(years|yrs)?/i.test(text)) {
    const ageMatch = text.match(/(\d+)\s*(years|yrs)?/i);
    if (ageMatch) return `Are you ${ageMatch[1]} years of age or younger?`;
  }
  if (/aged\s+between\s+(\d+)\s*(years|yrs)?\s*(completed)?\s*and\s+(\d+)\s*(years|yrs)?/i.test(text)) {
    const m = text.match(/(\d+)\s*(?:years|yrs)?\s*(?:completed)?\s*and\s+(\d+)/i);
    if (m) return `Are you between ${m[1]} and ${m[2]} years of age?`;
  }

  // 2. Gender & Caste conditions
  // e.g. "If the applicant is a male, he must be from SC / ST category."
  if (/if\s+(the\s+applicant\s+is\s+a\s+)?male/i.test(text) && /sc\s*\/?\s*st/i.test(text)) {
    return 'If you are male, do you belong to the SC / ST category?';
  }
  if (/if\s+(the\s+applicant\s+is\s+a\s+)?female/i.test(text)) {
    return 'Are you a female applicant as required by this scheme?';
  }

  // 3. Enterprise / Business type
  // e.g. "Finance is provided for Greenfield Enterprises."
  if (/greenfield\s+enterprise/i.test(text)) {
    return 'Is your business a new (Greenfield) enterprise rather than an existing one?';
  }
  if (/micro\s*,\s*small\s*(or|and)?\s*medium\s*enterprise|msme/i.test(text)) {
    return 'Is your enterprise registered as an MSME / Small Business?';
  }

  // 4. Default / Bank Account / Consent
  // e.g. "The applicant must not be in default to any bank/financial institution."
  if (/not\s+be\s+in\s+default|not\s+a\s+defaulter/i.test(text)) {
    return 'Are you free from any loan default with a bank or financial institution?';
  }
  if (/individual\s+bank\s+account\s+holders.*consent.*auto-debit/i.test(text)) {
    return 'Do you hold an active bank account and consent to the annual premium auto-debit?';
  }

  // 5. Nationality & Residency
  if (/indian\s+nationals?\s+(are|is)\s+not\s+eligible/i.test(text)) {
    return 'Are you a non-Indian national (e.g. from an eligible partner country)?';
  }
  if (/resident\s+of\s+([A-Za-z\s]+)/i.test(text)) {
    const stateMatch = text.match(/resident\s+of\s+([A-Za-z\s]+)/i);
    if (stateMatch) return `Are you a permanent resident of ${stateMatch[1].trim()}?`;
  }

  // 6. Educational qualifications & Students
  // e.g. "Law students who are pursuing a 3-year LLB course/5-year integrated LLB course."
  if (/^law\s+students?\s+who\s+are\s+pursuing/i.test(text)) {
    return text.replace(/^law\s+students?\s+who\s+are\s+pursuing/i, 'Are you currently pursuing').replace(/\.?$/, '?');
  }
  if (/^law\s+graduates?\s+who\s+have\s+completed/i.test(text)) {
    return text.replace(/^law\s+graduates?\s+who\s+have\s+completed/i, 'Are you a law graduate who has completed').replace(/\.?$/, '?');
  }
  if (/^students?\s+who\s+have\s+appeared\s+in/i.test(text)) {
    return text.replace(/^students?\s+who\s+have\s+appeared\s+in/i, 'Have you appeared in').replace(/\.?$/, '?');
  }
  if (/applicant\s+(should|must)\s+possess\s+at\s+least\s+a\s+master/i.test(text)) {
    return 'Do you hold at least a Master’s Degree in Natural Sciences or an equivalent qualifying discipline?';
  }
  if (/applicant\s+(should|must)\s+be\s+fluent\s+in\s+the\s+english\s+language/i.test(text)) {
    return 'Are you fluent in the English language?';
  }

  // 7. General modal transformations
  // "The applicant must [verb]..." -> "Do you [verb]...?"
  if (/^(the\s+)?applicant\s+(must|should|ought\s+to)\s+be\s+/i.test(text)) {
    return text.replace(/^(the\s+)?applicant\s+(must|should|ought\s+to)\s+be\s+/i, 'Are you ').replace(/\.?$/, '?');
  }
  if (/^(the\s+)?applicant\s+(must|should|ought\s+to)\s+have\s+/i.test(text)) {
    return text.replace(/^(the\s+)?applicant\s+(must|should|ought\s+to)\s+have\s+/i, 'Do you have ').replace(/\.?$/, '?');
  }
  if (/^(the\s+)?applicant\s+(must|should|ought\s+to)\s+/i.test(text)) {
    return text.replace(/^(the\s+)?applicant\s+(must|should|ought\s+to)\s+/i, 'Do you ').replace(/\.?$/, '?');
  }
  if (/^(the\s+)?applicant\s+is\s+/i.test(text)) {
    return text.replace(/^(the\s+)?applicant\s+is\s+/i, 'Are you ').replace(/\.?$/, '?');
  }

  // 8. General noun phrase conversions (e.g. "Candidates belonging to...")
  if (/^candidates?\s+(belonging\s+to|from)\s+/i.test(text)) {
    return text.replace(/^candidates?\s+(belonging\s+to|from)\s+/i, 'Do you belong to ').replace(/\.?$/, '?');
  }

  // If already a clean question
  if (text.endsWith('?')) return text;

  // Fallback: clean conversational question without awkward wrappers
  return `Do you satisfy: ${text.replace(/\.?$/, '')}?`;
}

/**
 * Helper to parse eligibility_md into individual actionable criteria questions.
 */
function parseEligibilityCriteria(md, schemeTitle = '') {
  if (!md || !md.trim()) {
    return [
      {
        id: 'c-0',
        text: `Are you seeking benefits provided under ${schemeTitle || 'this scheme'} and eligible to apply?`,
        raw: 'General scheme qualification.'
      }
    ];
  }

  // Split by list bullets, numbered items, or line breaks
  const rawLines = md
    .split(/\n+/)
    .map(line => line.trim())
    .filter(line => {
      if (!line) return false;
      // Filter out markdown headers, notes headers, reservation headers, and horizontal rules
      if (line.startsWith('#') || line.startsWith('---') || line.startsWith('>') || line.toLowerCase().startsWith('**note') || line.toLowerCase().startsWith('**reservation') || line.toLowerCase().startsWith('preference shall be')) return false;
      return true;
    });

  // Clean and format items
  const criteria = [];
  let index = 0;

  for (const line of rawLines) {
    let clean = line
      .replace(/^(\d+\.|\*|-|\+)\s*/, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/[*_`]/g, '')
      .trim();

    if (clean.length < 10) continue;

    const questionText = rephraseCriterionToQuestion(clean);

    criteria.push({
      id: `crit-${index++}`,
      text: questionText,
      raw: clean
    });

    if (criteria.length >= 8) break; // Keep maximum 8 criteria for clean UX
  }

  // If no lines extracted, fallback
  if (criteria.length === 0) {
    criteria.push({
      id: 'crit-fallback',
      text: `Do you satisfy the official criteria: "${stripMarkdown(md).substring(0, 160)}..."?`,
      raw: stripMarkdown(md)
    });
  }

  return criteria;
}

/** Rule-Based "Can I Apply?" Criteria Checker Component */
function CriteriaEligibilityChecker({ scheme }) {
  const criteria = React.useMemo(() => {
    return parseEligibilityCriteria(scheme?.eligibility_md, scheme?.title);
  }, [scheme?.eligibility_md, scheme?.title]);

  const [answers, setAnswers] = useState({});
  const [evaluation, setEvaluation] = useState(null);

  const handleOptionChange = (criterionId, value) => {
    setAnswers(prev => ({ ...prev, [criterionId]: value }));
    setEvaluation(null); // Reset evaluation on change
  };

  const handleCheck = (e) => {
    e.preventDefault();

    // Check if all questions are answered
    const unanswered = criteria.filter(c => !answers[c.id]);
    if (unanswered.length > 0) {
      setEvaluation({
        error: `Please answer all ${criteria.length} criteria questions above before checking eligibility.`
      });
      return;
    }

    const failedCriteria = criteria.filter(c => answers[c.id] === 'no');

    if (failedCriteria.length === 0) {
      setEvaluation({
        eligible: true,
        message: 'You appear eligible for this scheme! You satisfy all stated eligibility criteria.',
        unmet: []
      });
    } else {
      setEvaluation({
        eligible: false,
        message: `You may not be eligible because you answered "No" to ${failedCriteria.length} requirement(s).`,
        unmet: failedCriteria.map(c => c.raw)
      });
    }
  };

  const handleReset = () => {
    setAnswers({});
    setEvaluation(null);
  };

  return (
    <form onSubmit={handleCheck} className="space-y-4 text-slate-200">
      <p className="text-xs text-slate-400 mb-2">
        Answer the official eligibility requirements below based on your personal profile:
      </p>

      <div className="space-y-3">
        {criteria.map((c, idx) => (
          <div
            key={c.id}
            className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          >
            <div className="flex items-start space-x-2.5 flex-1">
              <span className="w-5 h-5 rounded-full bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 text-[11px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                {idx + 1}
              </span>
              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                {c.text}
              </p>
            </div>

            <div className="flex items-center space-x-4 pl-7 sm:pl-0 flex-shrink-0">
              <label className="inline-flex items-center space-x-1.5 cursor-pointer text-xs font-medium text-slate-300 hover:text-emerald-400">
                <input
                  type="radio"
                  name={c.id}
                  value="yes"
                  checked={answers[c.id] === 'yes'}
                  onChange={() => handleOptionChange(c.id, 'yes')}
                  className="text-emerald-500 focus:ring-emerald-500 bg-slate-800 border-slate-700 w-4 h-4 cursor-pointer"
                />
                <span>Yes</span>
              </label>

              <label className="inline-flex items-center space-x-1.5 cursor-pointer text-xs font-medium text-slate-300 hover:text-rose-400">
                <input
                  type="radio"
                  name={c.id}
                  value="no"
                  checked={answers[c.id] === 'no'}
                  onChange={() => handleOptionChange(c.id, 'no')}
                  className="text-rose-500 focus:ring-rose-500 bg-slate-800 border-slate-700 w-4 h-4 cursor-pointer"
                />
                <span>No</span>
              </label>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center space-x-3 pt-2">
        <button
          type="submit"
          className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:brightness-110 text-white text-xs sm:text-sm font-semibold rounded-xl transition cursor-pointer shadow-md shadow-indigo-500/20"
        >
          Check Eligibility
        </button>

        {Object.keys(answers).length > 0 && (
          <button
            type="button"
            onClick={handleReset}
            className="px-3.5 py-2 text-xs text-slate-400 hover:text-slate-200 bg-slate-800/80 hover:bg-slate-700/80 rounded-xl transition cursor-pointer"
          >
            Reset
          </button>
        )}
      </div>

      {evaluation?.error && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs">
          ⚠️ {evaluation.error}
        </div>
      )}

      {evaluation && !evaluation.error && (
        <div
          className={`p-4 rounded-xl border text-sm animate-in fade-in duration-200 ${
            evaluation.eligible
              ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200'
              : 'bg-rose-950/60 border-rose-500/40 text-rose-200'
          }`}
        >
          <div className="flex items-center space-x-2 font-bold mb-1.5">
            <span>{evaluation.eligible ? '✅' : '❌'}</span>
            <span>Status: {evaluation.eligible ? 'Eligible' : 'Not Eligible'}</span>
          </div>
          <p className="text-xs leading-relaxed">{evaluation.message}</p>

          {evaluation.unmet?.length > 0 && (
            <div className="mt-3 pt-2.5 border-t border-rose-800/50">
              <p className="text-xs font-semibold text-rose-300 mb-1">Unmet Requirements:</p>
              <ul className="list-disc list-inside space-y-1 text-xs text-rose-200/90">
                {evaluation.unmet.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </form>
  );
}

/** Tab navigation component with Read Aloud Text-to-Speech support */
function TabNavigation({ scheme, handleExplain, explain, explainLoading, handleChat, chatQuestion, setChatQuestion, chatLoading, chatResponse }) {
  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'eligibility', label: 'Eligibility' },
    { id: 'benefits', label: 'Benefits' },
    { id: 'application', label: 'Application Process' },
    { id: 'documents', label: 'Documents' },
  ];
  const [active, setActive] = useState('overview');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);

  // Check speech synthesis support on mount
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setSpeechSupported(false);
    }
  }, []);

  // Stop speech when switching tabs
  const handleTabSwitch = (tabId) => {
    if (isSpeaking && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
    setActive(tabId);
  };

  // Get plain readable text for currently active tab
  const getActiveTabText = () => {
    if (!scheme) return '';
    switch (active) {
      case 'overview':
        return stripMarkdown(scheme.detailed_description_md || scheme.brief_description || scheme.title || '');
      case 'eligibility':
        return stripMarkdown(scheme.eligibility_md || 'No eligibility details specified.');
      case 'benefits':
        return stripMarkdown(scheme.benefits_md || 'No benefits details specified.');
      case 'application':
        return stripMarkdown(scheme.application_process_md || 'No application process details specified.');
      case 'documents':
        return stripMarkdown(scheme.documents_md || 'No documents listed for this scheme.');
      default:
        return '';
    }
  };

  // Toggle Read Aloud
  const toggleSpeech = () => {
    if (!speechSupported || typeof window === 'undefined') return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const textToRead = getActiveTabText();
    if (!textToRead.trim()) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(textToRead);
    utterance.rate = 0.95;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const naturalVoice = voices.find(v => (v.lang.includes('en-IN') || v.lang.includes('en-GB') || v.lang.includes('en-US')) && !v.name.includes('Google') && v.localService) ||
                         voices.find(v => v.lang.includes('en'));
    if (naturalVoice) {
      utterance.voice = naturalVoice;
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  const renderContent = () => {
    switch (active) {
      case 'overview':
        return (
          <div className="glass-card rounded-2xl p-6 text-slate-300">
            {scheme.detailed_description_md && (
              <MarkdownRenderer markdown={scheme.detailed_description_md} />
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              {scheme.categories && scheme.categories.map((cat) => (
                <span key={cat} className="px-2.5 py-1 bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-lg text-xs font-medium">
                  {cat}
                </span>
              ))}
              {scheme.tags && scheme.tags.map((tag) => (
                <span key={tag} className="px-2.5 py-1 bg-slate-800 text-slate-300 border border-slate-700 rounded-lg text-xs">
                  {tag}
                </span>
              ))}
            </div>
            <div className="mt-8">
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
                            {explain.summary.keyBenefits.map((b, i) => <li key={i}>{b}</li>)}
                          </ul>
                        )}
                      </div>
                    )}
                    <button onClick={handleExplain} className="mt-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-400 text-white rounded cursor-pointer">
                      Get Explanation
                    </button>
                  </div>
                )}
              </Collapsible>

              <Collapsible title="Can I Apply?" defaultOpen={false}>
                <CriteriaEligibilityChecker scheme={scheme} />
              </Collapsible>

              <Collapsible title="Ask AI About This Scheme" defaultOpen={false}>
                <form onSubmit={handleChat} className="flex flex-col space-y-2">
                  <textarea rows={3} placeholder="Ask a question..." className="w-full glass-input px-3 py-2 rounded" value={chatQuestion} onChange={e => setChatQuestion(e.target.value)} required />
                  <button type="submit" disabled={chatLoading} className="self-start px-4 py-2 bg-indigo-500 hover:bg-indigo-400 text-white rounded cursor-pointer">
                    {chatLoading ? 'Sending…' : 'Send'}
                  </button>
                </form>
                {chatResponse && <div className="text-slate-300 mt-2">{chatResponse.answer}</div>}
              </Collapsible>
            </div>
          </div>
        );
      case 'eligibility':
        return <div className="glass-card rounded-2xl p-6 text-slate-300">{scheme.eligibility_md ? <MarkdownRenderer markdown={scheme.eligibility_md} /> : 'No information.'}</div>;
      case 'benefits':
        return <div className="glass-card rounded-2xl p-6 text-slate-300">{scheme.benefits_md ? <MarkdownRenderer markdown={scheme.benefits_md} /> : 'No information.'}</div>;
      case 'application':
        return <div className="glass-card rounded-2xl p-6 text-slate-300">{scheme.application_process_md ? <MarkdownRenderer markdown={scheme.application_process_md} /> : 'No information.'}</div>;
      case 'documents':
        return <div className="glass-card rounded-2xl p-6 text-slate-300">{scheme.documents_md ? <MarkdownRenderer markdown={scheme.documents_md} /> : 'No documents.'}</div>;
      default: return null;
    }
  };

  return (
    <div className="mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <nav className="flex space-x-2 overflow-x-auto pb-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => handleTabSwitch(tab.id)}
              className={`px-4 py-2 rounded-t-xl font-medium cursor-pointer transition ${active === tab.id ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20' : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'}`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
        {speechSupported && (
          <button
            onClick={toggleSpeech}
            className={`inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold border transition-all duration-200 cursor-pointer ${isSpeaking ? 'bg-rose-500/20 border-rose-500/40 text-rose-300 animate-pulse' : 'glass-card bg-slate-900/80 border-slate-700/80 text-slate-200'}`}
            title={isSpeaking ? 'Stop reading' : 'Read aloud'}
          >
            {isSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            <span>{isSpeaking ? 'Stop' : 'Read Aloud'}</span>
          </button>
        )}
      </div>
      {renderContent()}
    </div>
  );
}

export { SchemeDetails };
