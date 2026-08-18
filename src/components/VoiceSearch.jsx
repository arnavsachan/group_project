import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2 } from 'lucide-react';

export default function VoiceSearch({ onResult, onStateChange }) {
  const [isSupported, setIsSupported] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef(null);

  useEffect(() => {
    // Check browser Web Speech API support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-IN'; // Indian English recognition

    recognition.onstart = () => {
      setIsListening(true);
      if (onStateChange) onStateChange(true);
    };

    recognition.onresult = (event) => {
      let currentTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        currentTranscript += event.results[i][0].transcript;
      }
      setTranscript(currentTranscript);
      if (onResult) onResult(currentTranscript);
    };

    recognition.onerror = (event) => {
      console.warn('Speech recognition error:', event.error);
      setIsListening(false);
      if (onStateChange) onStateChange(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      if (onStateChange) onStateChange(false);
    };

    recognitionRef.current = recognition;
  }, [onResult, onStateChange]);

  const toggleListening = () => {
    if (!isSupported || !recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      setTranscript('');
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.error('Failed to start speech recognition:', err);
      }
    }
  };

  // Fallback state for unsupported browsers (Firefox/Brave)
  if (!isSupported) {
    return (
      <button
        type="button"
        disabled
        className="p-2.5 rounded-xl bg-slate-800/40 text-slate-600 cursor-not-allowed border border-slate-800 opacity-60"
        title="Voice search is not supported by your current browser (Use Chrome, Edge, or Safari)"
      >
        <MicOff className="w-5 h-5 text-slate-500" />
      </button>
    );
  }

  return (
    <div className="relative inline-flex items-center">
      <button
        type="button"
        onClick={toggleListening}
        className={`p-2.5 rounded-xl transition-all duration-300 flex items-center justify-center ${
          isListening
            ? 'bg-red-500/20 text-red-400 border border-red-500/50 mic-active-pulse scale-105 shadow-lg shadow-red-500/30'
            : 'bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/30 border border-indigo-500/30 hover:border-indigo-500/50 hover:scale-105'
        }`}
        title={isListening ? 'Click to stop listening' : 'Voice Search (Speak in English / Hindi)'}
      >
        {isListening ? (
          <Volume2 className="w-5 h-5 animate-pulse text-red-400" />
        ) : (
          <Mic className="w-5 h-5 text-indigo-400" />
        )}
      </button>

      {isListening && (
        <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap bg-red-950/90 text-red-200 border border-red-500/30 text-[11px] font-medium px-2.5 py-0.5 rounded-md shadow-lg animate-pulse">
          🎙️ Listening... Speak query
        </span>
      )}
    </div>
  );
}
