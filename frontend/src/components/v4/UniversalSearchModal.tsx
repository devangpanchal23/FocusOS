import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Zap, Target, BookOpen, Cpu, Bot, Smartphone, ArrowRight, Loader2 } from 'lucide-react';
import { v4Api } from '../../services/v4.service';

interface UniversalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UniversalSearchModal: React.FC<UniversalSearchModalProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      if (!query) {
        // Run default query to show sample indexed items
        handleSearch('focus');
      }
    }
  }, [isOpen]);

  const handleSearch = async (text: string) => {
    setQuery(text);
    if (!text.trim()) {
      setResults([]);
      return;
    }
    setIsLoading(true);
    try {
      const res = await v4Api.universalSearch(text);
      setResults(res.results || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const getIcon = (category: string) => {
    switch (category) {
      case 'APPLICATIONS':
        return <Smartphone className="w-4 h-4 text-emerald-400" />;
      case 'FOCUS_SESSIONS':
        return <Zap className="w-4 h-4 text-amber-400" />;
      case 'GOALS':
        return <Target className="w-4 h-4 text-indigo-400" />;
      case 'KNOWLEDGE':
        return <BookOpen className="w-4 h-4 text-purple-400" />;
      case 'WORKFLOWS':
        return <Cpu className="w-4 h-4 text-cyan-400" />;
      case 'AI_MESSAGES':
      default:
        return <Bot className="w-4 h-4 text-pink-400" />;
    }
  };

  const filteredResults = activeCategory === 'ALL'
    ? results
    : results.filter((r) => r.category === activeCategory);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-2xl bg-[#101016] border border-[#272738] rounded-2xl shadow-2xl shadow-black/80 overflow-hidden flex flex-col max-h-[80vh]">
        {/* Search Input Bar */}
        <div className="p-4 border-b border-[#212130] flex items-center gap-3 bg-[#13131b]">
          <Search className="w-5 h-5 text-indigo-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search apps, focus sessions, goals, notes, workflows, or AI conversations..."
            className="w-full bg-transparent text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none"
          />
          {isLoading ? (
            <Loader2 className="w-4 h-4 text-zinc-400 animate-spin shrink-0" />
          ) : query ? (
            <button onClick={() => handleSearch('')} className="text-zinc-500 hover:text-zinc-300">
              <X className="w-4 h-4" />
            </button>
          ) : (
            <kbd className="text-[10px] px-2 py-0.5 rounded bg-[#1e1e2d] text-zinc-400 border border-[#2e2e42]">ESC</kbd>
          )}
        </div>

        {/* Category Pills */}
        <div className="px-4 py-2 border-b border-[#1b1b26] flex items-center gap-2 overflow-x-auto text-xs bg-[#0d0d12]">
          {['ALL', 'APPLICATIONS', 'FOCUS_SESSIONS', 'GOALS', 'KNOWLEDGE', 'WORKFLOWS'].map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                activeCategory === cat
                  ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#181822]'
              }`}
            >
              {cat.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5 divide-y divide-[#181824]">
          {filteredResults.length === 0 ? (
            <div className="p-8 text-center text-zinc-500 text-xs">
              {query ? `No items found matching "${query}"` : 'Type anything to search across FocusOS telemetry & knowledge'}
            </div>
          ) : (
            filteredResults.map((item, idx) => (
              <div
                key={idx}
                onClick={() => {
                  onClose();
                  navigate(item.route);
                }}
                className="pt-2 first:pt-0 group flex items-center justify-between p-2.5 rounded-xl hover:bg-[#181824] cursor-pointer transition-all border border-transparent hover:border-[#2b2b3e]"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-[#1a1a26] flex items-center justify-center shrink-0">
                    {getIcon(item.category)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-zinc-200 group-hover:text-white truncate">
                      {item.title}
                    </p>
                    <p className="text-[11px] text-zinc-400 truncate">{item.subtitle}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-zinc-500 group-hover:text-indigo-400 transition-colors">
                  <span className="text-[10px] uppercase font-mono tracking-wider">{item.category.replace('_', ' ')}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2 bg-[#0a0a0f] border-t border-[#1f1f2a] flex items-center justify-between text-[11px] text-zinc-500">
          <span>Tip: Use universal search to jump directly to any action or telemetry insight.</span>
          <span className="font-mono">FocusOS Search 4.0</span>
        </div>
      </div>
    </div>
  );
};
