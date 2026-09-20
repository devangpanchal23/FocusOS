import React, { useState, useEffect } from 'react';
import { v3Api } from '../services/api';
import { ApiKeyItem, WebhookItem } from '../types';
import {
  Code2,
  Key,
  Webhook,
  Plus,
  Trash2,
  Send,
  Copy,
  Check,
  CheckCircle2,
  AlertCircle,
  Terminal,
  ShieldAlert,
} from 'lucide-react';

export const DeveloperPage: React.FC = () => {
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookItem[]>([]);
  const [loading, setLoading] = useState(true);

  // New Key Modal
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [revealedKey, setRevealedKey] = useState<string | null>(null);

  // New Webhook Modal
  const [showWebhookModal, setShowWebhookModal] = useState(false);
  const [newWebhookUrl, setNewWebhookUrl] = useState('');

  // Webhook Test State
  const [testResult, setTestResult] = useState<any | null>(null);
  const [testingWebhookId, setTestingWebhookId] = useState<string | null>(null);

  const [copiedText, setCopiedText] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [keysRes, whRes] = await Promise.all([
        v3Api.getApiKeys(),
        v3Api.getWebhooks(),
      ]);
      setKeys(keysRes.keys || []);
      setWebhooks(whRes.webhooks || []);
    } catch (err) {
      console.error('Error fetching developer settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;

    try {
      const res = await v3Api.createApiKey({ name: newKeyName });
      setRevealedKey(res.key.rawKey || 'fk_live_generated');
      setNewKeyName('');
      loadData();
    } catch (err) {
      console.error('Error creating API key:', err);
    }
  };

  const handleRevokeKey = async (keyId: string) => {
    if (!window.confirm('Are you sure you want to revoke this API key? Any daemon using it will stop working.')) return;
    try {
      await v3Api.revokeApiKey(keyId);
      setKeys((prev) => prev.filter((k) => k.id !== keyId));
    } catch (err) {
      console.error('Error revoking API key:', err);
    }
  };

  const handleCreateWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWebhookUrl.trim()) return;

    try {
      await v3Api.createWebhook({
        url: newWebhookUrl,
        events: ['focus.completed', 'goal.achieved'],
      });
      setShowWebhookModal(false);
      setNewWebhookUrl('');
      loadData();
    } catch (err) {
      console.error('Error creating webhook:', err);
    }
  };

  const handleDeleteWebhook = async (id: string) => {
    try {
      await v3Api.deleteWebhook(id);
      setWebhooks((prev) => prev.filter((w) => w.id !== id));
    } catch (err) {
      console.error('Error deleting webhook:', err);
    }
  };

  const handleTestWebhook = async (id: string) => {
    try {
      setTestingWebhookId(id);
      const res = await v3Api.testWebhook(id);
      setTestResult(res);
    } catch (err: any) {
      alert(err.message || 'Webhook ping failed');
    } finally {
      setTestingWebhookId(null);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-white tracking-tight">Developer Platform & Public API v3</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono">
              REST /v3
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Programmatically query screen-time telemetry, automate focus sessions, and receive real-time webhook event dispatches.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setRevealedKey(null);
              setShowKeyModal(true);
            }}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-indigo-600/20"
          >
            <Key className="w-3.5 h-3.5" /> Generate API Key
          </button>
          <button
            onClick={() => setShowWebhookModal(true)}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center gap-2 border border-slate-700"
          >
            <Webhook className="w-3.5 h-3.5" /> Add Webhook
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* API Keys Panel */}
        <div className="space-y-4">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-indigo-400" />
                <h3 className="text-base font-bold text-white">Active API Keys</h3>
              </div>
              <span className="text-xs text-slate-500">{keys.length} keys</span>
            </div>

            {keys.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-xs">
                No API keys created yet. Generate one to authenticate your CLI or daemons.
              </div>
            ) : (
              <div className="space-y-3">
                {keys.map((k) => (
                  <div
                    key={k.id}
                    className="p-4 rounded-xl bg-slate-800/40 border border-slate-800 flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{k.name}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-indigo-300 border border-white/5">
                          {k.keyPrefix}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-3">
                        <span>Scopes: {k.scopes}</span>
                        <span>•</span>
                        <span>Created: {new Date(k.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleRevokeKey(k.id)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 transition"
                      title="Revoke Key"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Webhooks Panel */}
        <div className="space-y-4">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Webhook className="w-4 h-4 text-sky-400" />
                <h3 className="text-base font-bold text-white">Event Subscriptions</h3>
              </div>
              <span className="text-xs text-slate-500">{webhooks.length} endpoints</span>
            </div>

            {webhooks.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-xs">
                No webhook endpoints registered.
              </div>
            ) : (
              <div className="space-y-3">
                {webhooks.map((wh) => (
                  <div
                    key={wh.id}
                    className="p-4 rounded-xl bg-slate-800/40 border border-slate-800 space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-mono text-white truncate max-w-[280px]">
                        {wh.url}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleTestWebhook(wh.id)}
                          disabled={testingWebhookId === wh.id}
                          className="px-2.5 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-[11px] font-semibold transition flex items-center gap-1"
                        >
                          <Send className="w-3 h-3" /> Test Ping
                        </button>
                        <button
                          onClick={() => handleDeleteWebhook(wh.id)}
                          className="p-1 rounded-lg text-slate-500 hover:text-rose-400 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="text-[10px] font-mono text-slate-400 flex items-center justify-between pt-2 border-t border-slate-800">
                      <span>Secret: {wh.secret.substring(0, 10)}...</span>
                      <span className="text-emerald-400">ACTIVE</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Test Result Display */}
            {testResult && (
              <div className="mt-4 p-3 rounded-xl bg-slate-950 border border-slate-700 text-xs font-mono space-y-1">
                <div className="flex items-center justify-between text-emerald-400 font-bold">
                  <span>Ping Status: {testResult.status} ({testResult.httpCode})</span>
                  <button onClick={() => setTestResult(null)} className="text-slate-500 hover:text-white">✕</button>
                </div>
                <p className="text-slate-400 text-[10px] truncate">Signature: {testResult.signature}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Code Snippets & Quickstart */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-indigo-400" />
          <h3 className="text-base font-bold text-white">Public API v3 Quickstart</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-slate-950 border border-white/5 space-y-2">
            <span className="text-[10px] uppercase font-bold text-slate-400">1. Query Today's Telemetry</span>
            <pre className="text-xs font-mono text-slate-300 overflow-x-auto p-2 rounded bg-slate-900">
{`curl -X GET http://localhost:5000/api/v3/predictions \\
  -H "Authorization: Bearer YOUR_TOKEN"`}
            </pre>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-white/5 space-y-2">
            <span className="text-[10px] uppercase font-bold text-slate-400">2. Browser Companion Sync</span>
            <pre className="text-xs font-mono text-slate-300 overflow-x-auto p-2 rounded bg-slate-900">
{`curl -X POST http://localhost:5000/api/v3/extension/heartbeat \\
  -H "Content-Type: application/json" \\
  -d '{"domain":"github.com","durationSeconds":60}'`}
            </pre>
          </div>
        </div>
      </div>

      {/* New Key Modal */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">Generate Live API Key</h3>

            {revealedKey ? (
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
                  ⚠️ Make sure to copy your API key now. You will not be able to see it again.
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-700 flex items-center justify-between">
                  <span className="font-mono text-xs text-white truncate max-w-[280px]">
                    {revealedKey}
                  </span>
                  <button
                    onClick={() => handleCopy(revealedKey)}
                    className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-xs flex items-center gap-1"
                  >
                    {copiedText === revealedKey ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" /> Copy
                      </>
                    )}
                  </button>
                </div>
                <button
                  onClick={() => setShowKeyModal(false)}
                  className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreateKey} className="space-y-4">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Key Name / Identifier</label>
                  <input
                    type="text"
                    placeholder="e.g. Personal CLI Script"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white"
                    required
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowKeyModal(false)}
                    className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold"
                  >
                    Generate Key
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* New Webhook Modal */}
      {showWebhookModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleCreateWebhook} className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">Add Webhook Endpoint</h3>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Payload URL</label>
              <input
                type="url"
                placeholder="https://your-server.com/focusos-webhook"
                value={newWebhookUrl}
                onChange={(e) => setNewWebhookUrl(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white"
                required
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowWebhookModal(false)}
                className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold"
              >
                Save Endpoint
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
