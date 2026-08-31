import { useState } from 'react';
import { Zap, ZapOff, Sparkles, Check, User } from 'lucide-react';
import Header from '../components/layout/Header';
import { useAuthStore } from '../store/authStore';

export default function SettingsPage() {
  const user = useAuthStore(s => s.user);
  const updatePreferences = useAuthStore(s => s.updatePreferences);

  const [autoTranscribe, setAutoTranscribe] = useState<boolean | null>(user?.autoTranscribe ?? null);
  const [aiEnabled, setAiEnabled] = useState(user?.aiConsent === 'agreed');
  const [showAiConfirm, setShowAiConfirm] = useState(false);
  const [summaryFormat, setSummaryFormat] = useState<'sentence' | 'chips' | 'both'>(user?.summaryFormat ?? 'both');

  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [displayNameSaved, setDisplayNameSaved] = useState(false);
  const [displayNameError, setDisplayNameError] = useState('');

  const saveDisplayName = async () => {
    if (!displayName.trim()) return;
    setDisplayNameError('');
    try {
      await updatePreferences({ displayName: displayName.trim() });
      setDisplayNameSaved(true);
      setTimeout(() => setDisplayNameSaved(false), 2000);
    } catch {
      setDisplayNameError('Failed to save. Please try again.');
    }
  };

  const toggle = (enabled: boolean) => {
    setAutoTranscribe(enabled);
    updatePreferences({ autoTranscribe: enabled });
  };

  const handleAiToggle = () => {
    if (aiEnabled) {
      setAiEnabled(false);
      updatePreferences({ aiConsent: 'disagreed' });
    } else {
      setShowAiConfirm(true);
    }
  };

  const confirmAiEnable = () => {
    setAiEnabled(true);
    setShowAiConfirm(false);
    updatePreferences({ aiConsent: 'agreed' });
  };

  return (
    <div className="flex flex-col h-full">
      <Header title="Settings" subtitle="App preferences" />

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Display Name */}
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-gray-100 text-gray-600">
              <User size={18} />
            </div>
            <h2 className="font-semibold text-gray-800">Display Name</h2>
          </div>
          <label htmlFor="settings-display-name" className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Name
          </label>
          <div className="flex gap-2 mt-1">
            <input
              id="settings-display-name"
              type="text"
              value={displayName}
              onChange={e => { setDisplayName(e.target.value); setDisplayNameSaved(false); }}
              onKeyDown={e => e.key === 'Enter' && saveDisplayName()}
              maxLength={40}
              className="form-input flex-1"
              placeholder="e.g. Alex"
            />
            <button
              onClick={saveDisplayName}
              disabled={!displayName.trim()}
              className="btn-primary px-4 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              {displayNameSaved ? <><Check size={14} /> Saved</> : 'Save'}
            </button>
          </div>
          {displayNameError && <p className="text-xs text-red-500 mt-2">{displayNameError}</p>}
          <p className="text-xs text-gray-400 mt-2">This is how your name appears in the app. Your login username stays the same.</p>
        </div>

        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-blue-50 text-blue-600">
              <Zap size={18} />
            </div>
            <h2 className="font-semibold text-gray-800">Transcription</h2>
          </div>

          <p className="text-sm text-gray-500 mb-4 leading-relaxed">
            When auto-transcription is enabled, videos are automatically transcribed after saving.
            This enables keyword analysis, sentiment tracking, and AI summaries.
          </p>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => toggle(true)}
              className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-colors text-left
                ${autoTranscribe === true
                  ? 'border-mhmr-olive bg-mhmr-olive/10'
                  : 'border-gray-100 hover:border-gray-300'}`}
              aria-pressed={autoTranscribe === true}
            >
              <Zap size={20} className={autoTranscribe === true ? 'text-mhmr-olive' : 'text-gray-400'} />
              <div>
                <p className="font-semibold text-gray-800 text-sm">Auto-Transcription On</p>
                <p className="text-xs text-gray-400">Transcribe every video automatically after saving</p>
              </div>
              {autoTranscribe === true && (
                <span className="ml-auto text-xs font-semibold text-mhmr-olive">Active</span>
              )}
            </button>

            <button
              onClick={() => toggle(false)}
              className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-colors text-left
                ${autoTranscribe === false
                  ? 'border-gray-400 bg-gray-50'
                  : 'border-gray-100 hover:border-gray-300'}`}
              aria-pressed={autoTranscribe === false}
            >
              <ZapOff size={20} className={autoTranscribe === false ? 'text-gray-600' : 'text-gray-400'} />
              <div>
                <p className="font-semibold text-gray-800 text-sm">Manual Transcription</p>
                <p className="text-xs text-gray-400">Transcribe videos manually when needed</p>
              </div>
              {autoTranscribe === false && (
                <span className="ml-auto text-xs font-semibold text-gray-500">Active</span>
              )}
            </button>
          </div>

          {autoTranscribe === null && (
            <p className="text-xs text-gray-400 mt-3">
              No preference set yet — you will be prompted after your first save.
            </p>
          )}
        </div>

        {/* AI Features */}
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-purple-50 text-purple-600">
              <Sparkles size={18} />
            </div>
            <h2 className="font-semibold text-gray-800">AI Features</h2>
          </div>

          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm text-gray-800 font-medium">{aiEnabled ? 'Enabled' : 'Disabled'}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {aiEnabled
                  ? 'AI summaries on cards · Text reports auto-generate'
                  : "AI summaries hidden · You'll be asked before each report"}
              </p>
            </div>
            <button
              role="switch"
              aria-checked={aiEnabled}
              aria-label="Enable AI features"
              onClick={handleAiToggle}
              className={`relative w-12 h-6 rounded-full transition-colors shrink-0 ${aiEnabled ? 'bg-mhmr-olive' : 'bg-gray-300'}`}
            >
              <span
                className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${aiEnabled ? 'translate-x-6' : ''}`}
                aria-hidden="true"
              />
            </button>
          </div>

          {aiEnabled && (
            <div className="border-t border-gray-100 pt-3">
              <p className="text-xs text-gray-500 mb-2">Video card summary format:</p>
              <div className="flex flex-col gap-2">
                {([['sentence', 'Sentence only', 'A concise one-liner describing the video'],
                   ['chips', 'Keywords only', '3–5 short topic tags'],
                   ['both', 'Both', 'Sentence + keyword chips']] as const).map(([fmt, label, desc]) => (
                  <button
                    key={fmt}
                    onClick={() => {
                      setSummaryFormat(fmt);
                      updatePreferences({ summaryFormat: fmt });
                    }}
                    className={`flex items-center justify-between p-3 rounded-xl border-2 transition-colors text-left ${
                      summaryFormat === fmt ? 'border-mhmr-olive bg-mhmr-olive/5' : 'border-gray-100 hover:border-gray-300'
                    }`}
                    aria-pressed={summaryFormat === fmt}
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-800">{label}</p>
                      <p className="text-xs text-gray-400">{desc}</p>
                    </div>
                    {summaryFormat === fmt && <Check size={14} className="text-mhmr-olive shrink-0" aria-hidden="true" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          <p className="text-xs text-gray-400 mt-3 leading-relaxed">
            When enabled, transcript text is sent to OpenAI GPT-4 to generate summaries and analyses.
          </p>
        </div>
      </div>

      {/* AI enable confirmation modal */}
      {showAiConfirm && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          role="presentation"
          onClick={() => setShowAiConfirm(false)}
          onKeyDown={e => e.key === 'Escape' && setShowAiConfirm(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="ai-confirm-title"
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6"
            onClick={e => e.stopPropagation()}
          >
            <h2 id="ai-confirm-title" className="font-bold text-gray-800 mb-2">Enable AI Features?</h2>
            <p className="text-sm text-gray-600 mb-5">
              When enabled, transcript text is sent to OpenAI GPT-4 to generate summaries on video cards and auto-generate text reports.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowAiConfirm(false)} className="flex-1 btn-secondary">
                Cancel
              </button>
              <button onClick={confirmAiEnable} className="flex-1 btn-primary">
                Enable
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
