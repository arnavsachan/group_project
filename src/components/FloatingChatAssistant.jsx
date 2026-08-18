import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, Sparkles, Loader2, Minimize2, ExternalLink, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';

const SUGGESTED_PROMPTS = [
  "Schemes for students in Bihar",
  "Financial aid for women entrepreneurs",
  "Subsidies for small farmers",
  "Health insurance under ₹3 Lakh income"
];

export default function FloatingChatAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      sender: 'bot',
      text: "Namaste! 🙏 I am your AI Scheme Assistant. Ask me anything about 4,764+ central and state government schemes, subsidies, and eligibility!"
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, messages]);

  const handleSend = async (textToSend) => {
    const query = (textToSend || input).trim();
    if (!query || loading) return;

    setErrorMsg('');
    const userMessageId = Date.now().toString();
    const newMessages = [...messages, { id: userMessageId, sender: 'user', text: query }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const historyPayload = newMessages.slice(-6).map(m => ({
        role: m.sender === 'user' ? 'user' : 'model',
        text: m.text
      }));

      const res = await fetch('/api/ai/assistant-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          history: historyPayload
        })
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 429) {
          setErrorMsg(data.error || 'Please wait a moment before sending another message.');
        } else {
          setErrorMsg(data.error || 'AI assistant is temporarily unavailable.');
        }
        setMessages(prev => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            sender: 'bot',
            text: data.error || 'AI assistant is temporarily unavailable. Please try again or use the Find Schemes page.'
          }
        ]);
        return;
      }

      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'bot',
          text: data.reply || 'No information found.'
        }
      ]);
    } catch (err) {
      console.error('Chat error:', err);
      setErrorMsg('Network error. Unable to reach AI server.');
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'bot',
          text: 'AI assistant is temporarily unavailable. Please try again in a few moments.'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: 'welcome',
        sender: 'bot',
        text: 'Chat cleared! Ask me anything about government schemes, eligibility, or benefits!'
      }
    ]);
    setErrorMsg('');
  };

  const renderFormattedText = (text) => {
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = linkRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      const label = match[1];
      const url = match[2];
      if (url.startsWith('/')) {
        parts.push(
          <Link
            key={match.index}
            to={url}
            onClick={() => setIsOpen(false)}
            className="text-indigo-400 font-semibold underline hover:text-indigo-300 transition inline-flex items-center gap-0.5"
          >
            {label}
            <ExternalLink className="w-3 h-3 inline" />
          </Link>
        );
      } else {
        parts.push(
          <a
            key={match.index}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-400 font-semibold underline hover:text-indigo-300 transition"
          >
            {label}
          </a>
        );
      }
      lastIndex = linkRegex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return (
      <div className="whitespace-pre-wrap leading-relaxed space-y-2">
        {parts.map((p, i) => (typeof p === 'string' ? <span key={i}>{p}</span> : p))}
      </div>
    );
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans">
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="group relative flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 text-white shadow-2xl shadow-indigo-500/40 hover:scale-105 active:scale-95 transition-all duration-300 border border-white/20 cursor-pointer"
          aria-label="Open AI Scheme Assistant"
        >
          <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-slate-900"></span>
          </span>
          <MessageSquare className="w-6 h-6 group-hover:scale-110 transition-transform duration-200" />
        </button>
      )}

      {isOpen && (
        <div className="w-[92vw] sm:w-[420px] h-[580px] max-h-[85vh] glass-card rounded-2xl border border-slate-700/80 bg-slate-950/95 backdrop-blur-2xl shadow-2xl shadow-black/80 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200">
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-800 bg-slate-900/80">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shadow-md shadow-indigo-500/20">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center space-x-1.5">
                  <span className="font-bold text-sm text-white font-outfit">Scheme Finder AI</span>
                  <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded font-medium border border-indigo-500/30">
                    Gemini Flash
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="text-[11px] text-slate-400">4,764+ Schemes Live</span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-1 text-slate-400">
              <button
                onClick={clearChat}
                className="p-1.5 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition cursor-pointer"
                title="Clear Chat"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
                title="Minimize Chat"
              >
                <Minimize2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 scrollbar-thin scrollbar-thumb-slate-800">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex gap-2.5 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.sender === 'bot' && (
                  <div className="w-7 h-7 rounded-lg bg-indigo-600/30 border border-indigo-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Sparkles className="w-4 h-4 text-indigo-400" />
                  </div>
                )}
                <div
                  className={`text-sm px-3.5 py-2.5 rounded-2xl max-w-[82%] shadow-sm ${
                    m.sender === 'user'
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-tr-none'
                      : 'bg-slate-900/90 text-slate-200 border border-slate-800/90 rounded-tl-none'
                  }`}
                >
                  {m.sender === 'user' ? (
                    <p className="whitespace-pre-wrap">{m.text}</p>
                  ) : (
                    renderFormattedText(m.text)
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-2.5 justify-start items-center text-slate-400 text-xs py-1">
                <div className="w-7 h-7 rounded-lg bg-indigo-600/30 border border-indigo-500/30 flex items-center justify-center flex-shrink-0">
                  <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
                </div>
                <div className="bg-slate-900/90 border border-slate-800 px-3.5 py-2 rounded-2xl text-slate-300 text-xs flex items-center space-x-2">
                  <span className="animate-pulse">Searching schemes & analyzing eligibility...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {messages.length <= 2 && !loading && (
            <div className="px-4 py-2 border-t border-slate-900 bg-slate-950/60">
              <p className="text-[11px] text-slate-400 mb-1.5 font-medium">💡 Quick Questions:</p>
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTED_PROMPTS.map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(p)}
                    className="text-[11px] bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-indigo-300 border border-slate-800 px-2.5 py-1 rounded-full transition cursor-pointer"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="px-4 py-1.5 bg-red-950/80 border-t border-red-800/60 text-red-300 text-xs text-center">
              {errorMsg}
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-3 border-t border-slate-800/80 bg-slate-900/90 flex items-center gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about any scheme, age, or state..."
              className="flex-1 bg-slate-950/90 text-white placeholder-slate-500 text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500 transition"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="p-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 active:scale-95 transition cursor-pointer"
              aria-label="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

