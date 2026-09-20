import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Layers,
  Search,
  Plus,
  Tag,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Pin,
  Trash2,
  RefreshCw,
  Sliders,
} from 'lucide-react';
import { v4Api } from '../../services/v4.service';

export const KnowledgeHubPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'KNOWLEDGE' | 'CONTEXT'>('KNOWLEDGE');
  const [items, setItems] = useState<any[]>([]);
  const [context, setContext] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [isLoading, setIsLoading] = useState(false);

  // New Knowledge Item Form
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('STRATEGY');
  const [newContent, setNewContent] = useState('');
  const [newTags, setNewTags] = useState('focus, deep-work');

  useEffect(() => {
    loadData();
  }, [selectedCategory]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [knowledgeData, contextData] = await Promise.all([
        v4Api.getKnowledgeItems(selectedCategory, searchQuery),
        v4Api.getContext(),
      ]);
      setItems(knowledgeData);
      setContext(contextData);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;
    try {
      await v4Api.createKnowledgeItem({
        title: newTitle,
        category: newCategory,
        content: newContent,
        tags: newTags.split(',').map((t) => t.trim()),
      });
      setNewTitle('');
      setNewContent('');
      setIsCreating(false);
      await loadData();
    } catch (e: any) {
      alert(`Error creating item: ${e.message}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this knowledge item?')) return;
    try {
      await v4Api.deleteKnowledgeItem(id);
      await loadData();
    } catch (e: any) {
      alert(`Delete failed: ${e.message}`);
    }
  };

  return (
    <div className="space-y-8 pb-12 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30">
              PHASE 6–7 LAYER
            </span>
            <span className="text-xs text-zinc-500">•</span>
            <span className="text-xs text-zinc-400">Context & Grounding Vault</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight font-['Outfit']">
            Personal Knowledge & Context Engine
          </h1>
          <p className="text-sm text-zinc-400">
            A verified productivity knowledge layer grounding AI recommendations in your rules, notes, and factual telemetry.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('KNOWLEDGE')}
            className={`py-2 px-3.5 rounded-xl text-xs font-semibold transition ${
              activeTab === 'KNOWLEDGE'
                ? 'bg-purple-600/30 text-purple-300 border border-purple-500/40'
                : 'bg-[#181826] text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Knowledge Vault ({items.length})
          </button>
          <button
            onClick={() => setActiveTab('CONTEXT')}
            className={`py-2 px-3.5 rounded-xl text-xs font-semibold transition ${
              activeTab === 'CONTEXT'
                ? 'bg-purple-600/30 text-purple-300 border border-purple-500/40'
                : 'bg-[#181826] text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Context Inspector ({context?.totalContexts || 0})
          </button>
        </div>
      </div>

      {activeTab === 'KNOWLEDGE' ? (
        <div className="space-y-6">
          {/* Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-[#12121b] border border-[#242436]">
            <div className="flex items-center gap-2 overflow-x-auto text-xs">
              {['ALL', 'STRATEGY', 'RULE', 'REFLECTION', 'NOTE'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg font-medium transition ${
                    selectedCategory === cat
                      ? 'bg-purple-600/30 text-purple-300 border border-purple-500/30'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#191926]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <button
              onClick={() => setIsCreating(!isCreating)}
              className="py-2 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-purple-600/20 transition"
            >
              <Plus className="w-4 h-4" />
              Add Knowledge Item
            </button>
          </div>

          {/* Creation Form */}
          {isCreating && (
            <form onSubmit={handleCreate} className="p-6 rounded-3xl bg-[#13131e] border border-[#27273c] shadow-xl space-y-4 animate-fadeIn">
              <h3 className="text-sm font-bold text-white">New Productivity Knowledge Item</h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 space-y-1">
                  <label className="text-xs text-zinc-400 font-medium">Title</label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g., Deep Work Startup Ritual"
                    className="w-full bg-[#0c0c12] border border-[#202030] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-zinc-400 font-medium">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full bg-[#0c0c12] border border-[#202030] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="STRATEGY">Strategy</option>
                    <option value="RULE">Personal Rule</option>
                    <option value="REFLECTION">Reflection</option>
                    <option value="NOTE">Note</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-zinc-400 font-medium">Content</label>
                <textarea
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Describe your strategy, ritual, or productivity rule..."
                  rows={4}
                  className="w-full bg-[#0c0c12] border border-[#202030] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 font-sans leading-relaxed"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-zinc-400 font-medium">Tags (comma-separated)</label>
                <input
                  type="text"
                  value={newTags}
                  onChange={(e) => setNewTags(e.target.value)}
                  placeholder="focus, deep-work, morning"
                  className="w-full bg-[#0c0c12] border border-[#202030] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="py-1.5 px-4 rounded-xl text-xs text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="py-1.5 px-5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold"
                >
                  Save to Vault
                </button>
              </div>
            </form>
          )}

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((item) => {
              let tags: string[] = [];
              try {
                tags = JSON.parse(item.tags);
              } catch {
                tags = [];
              }

              return (
                <div
                  key={item.id}
                  className="p-5 rounded-2xl bg-[#101017] border border-[#212132] hover:border-[#303046] transition-all flex flex-col justify-between space-y-4 group shadow-md"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30">
                        {item.category}
                      </span>
                      {item.isPinned && (
                        <span className="text-[10px] text-amber-400 flex items-center gap-1 font-mono">
                          <Pin className="w-3 h-3" /> Pinned
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-bold text-white group-hover:text-purple-300 transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-xs text-zinc-400 leading-relaxed whitespace-pre-line">
                      {item.content}
                    </p>
                  </div>

                  <div className="space-y-3 pt-2 border-t border-[#1a1a27]">
                    <div className="flex flex-wrap gap-1">
                      {tags.map((t, idx) => (
                        <span key={idx} className="text-[10px] px-2 py-0.5 rounded bg-[#161622] text-zinc-400 font-mono">
                          #{t}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-zinc-500">
                      <span>Citations: {item.aiCitations}</span>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="text-zinc-600 hover:text-red-400 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* CONTEXT INSPECTOR: FACTS VS PREFERENCES VS ASSUMPTIONS */
        <div className="space-y-6">
          <div className="p-4 rounded-2xl bg-[#12121c] border border-[#222234] flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-6">
              <div>
                <span className="text-zinc-500">Observed Telemetry:</span>
                <span className="font-bold text-emerald-400 ml-1.5">{context?.observedCount} Facts</span>
              </div>
              <div>
                <span className="text-zinc-500">User Preferences:</span>
                <span className="font-bold text-indigo-400 ml-1.5">{context?.preferencesCount} Declared</span>
              </div>
              <div>
                <span className="text-zinc-500">AI Assumptions:</span>
                <span className="font-bold text-amber-400 ml-1.5">{context?.assumptionsCount} Inferred</span>
              </div>
            </div>

            <div className="text-[11px] text-zinc-400 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Never converts assumptions into facts silently</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {context?.items?.map((ctx: any) => (
              <div key={ctx.id} className="p-4 rounded-2xl bg-[#111119] border border-[#212130] space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-indigo-300 font-semibold">{ctx.key}</span>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                    ctx.sourceType === 'OBSERVED_DATA' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                    ctx.sourceType === 'USER_PREFERENCE' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' :
                    'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}>
                    {ctx.sourceType.replace('_', ' ')} ({(ctx.confidence * 100).toFixed(0)}%)
                  </span>
                </div>

                <p className="text-zinc-200 font-medium">{ctx.value}</p>

                {ctx.evidence && (
                  <p className="text-[11px] text-zinc-500 font-mono pt-1 border-t border-[#1b1b28]">
                    Evidence: {ctx.evidence}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
