import { useState } from 'react';
import { Zap, ZapOff, Sparkles, Check, User } from 'lucide-react';
import Header from '../components/layout/Header';
import { useAuthStore } from '../store/authStore';

export default function SettingsPage() {
  const user = useAuthStore(s => s.user);
  const updatePreferences = useAuthStore(s => s.updatePreferences);

  const [autoTranscribe, setAutoTranscribe] = useState<boolean | null>(user?.autoTranscribe ?? null);
  const [aiConsent, setAiConsent] = useState<'agreed' | 'disagreed' | null>(user?.aiConsent ?? null);
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

  const confirmAiEnable = () => {
    setAiConsent('agreed');
    setShowAiConfirm(false);
    updatePreferences({ aiConsent: 'agreed' });
  };

  return (
    <div className="flex flex-col h-full">
      <Header title="Settings" subtitle="App preferences" />

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* Display Name */}
        <div className="card !p-3">
          <div className="flex items-center gap-2 mb-2">
            <User size={16} className="text-gray-500" />
            <h2 className="font-semibold text-gray-800 text-sm">Display Name</h2>
          </div>
          <div className="flex gap-2">
            <input
              id="settings-display-name"
              type="text"
              value={displayName}
              onChange={e => { setDisplayName(e.target.value); setDisplayNameSaved(false); }}
              onKeyDown={e => e.key === 'Enter' && saveDisplayName()}
              maxLength={40}
              className="form-input flex-1 !py-1.5 !text-sm"
              placeholder="e.g. Alex"
            />
            <button
              onClick={saveDisplayName}
              disabled={!displayName.trim()}
              className="btn-primary px-3 py-1.5 text-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
            >
              {displayNameSaved ? <><Check size={13} /> Saved</> : 'Save'}
            </button>
          </div>
          {displayNameError && <p className="text-xs text-red-500 mt-1">{displayNameError}</p>}
        </div>

        <div className="card !p-3">
          <div className="flex items-center gap-2 mb-1">
            <Zap size={16} className="text-blue-500" />
            <h2 className="font-semibold text-gray-800 text-sm">Transcription</h2>
          </div>
          <p className="text-xs text-gray-500 mb-2">Auto-transcription converts your video audio to text after saving, enabling keyword analysis, sentiment tracking, and AI summaries.</p>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => toggle(true)}
              className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-colors text-center
                ${autoTranscribe === true ? 'border-mhmr-olive bg-mhmr-olive/10' : 'border-gray-100 hover:border-gray-300'}`}
              aria-pressed={autoTranscribe === true}
            >
              <Zap size={18} className={autoTranscribe === true ? 'text-mhmr-olive' : 'text-gray-400'} />
              <p className="font-semibold text-gray-800 text-xs">Auto</p>
              <p className="text-xs text-gray-400 leading-tight">Transcribe after saving</p>
            </button>

            <button
              onClick={() => toggle(false)}
              className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-colors text-center
                ${autoTranscribe === false ? 'border-gray-400 bg-gray-50' : 'border-gray-100 hover:border-gray-300'}`}
              aria-pressed={autoTranscribe === false}
            >
              <ZapOff size={18} className={autoTranscribe === false ? 'text-gray-600' : 'text-gray-400'} />
              <p className="font-semibold text-gray-800 text-xs">Manual</p>
              <p className="text-xs text-gray-400 leading-tight">Transcribe when needed</p>
            </button>
          </div>

          {autoTranscribe === null && (
            <p className="text-xs text-gray-400 mt-2">No preference set yet — you'll be prompted after your first save.</p>
          )}
        </div>

        {/* AI Features */}
        <div className="card !p-3">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles size={16} className="text-purple-500" />
            <h2 className="font-semibold text-gray-800 text-sm">AI Features</h2>
          </div>
          <p className="text-xs text-gray-500 mb-2">Sends transcript text to OpenAI GPT-4 to generate summaries, keyword topics, and health insights on your videos.</p>

          <div className="grid grid-cols-2 gap-2 mb-2">
            <button
              onClick={() => { if (aiConsent !== 'agreed') setShowAiConfirm(true); }}
              className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-colors text-center
                ${aiConsent === 'agreed' ? 'border-mhmr-olive bg-mhmr-olive/10' : 'border-gray-100 hover:border-gray-300'}`}
              aria-pressed={aiConsent === 'agreed'}
            >
              <Sparkles size={18} className={aiConsent === 'agreed' ? 'text-mhmr-olive' : 'text-gray-400'} />
              <p className="font-semibold text-gray-800 text-xs">Enabled</p>
              <p className="text-xs text-gray-400 leading-tight">AI summaries &amp; reports</p>
            </button>

            <button
              onClick={() => { if (aiConsent !== 'disagreed') { setAiConsent('disagreed'); updatePreferences({ aiConsent: 'disagreed' }); } }}
              className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-colors text-center
                ${aiConsent === 'disagreed' ? 'border-gray-400 bg-gray-50' : 'border-gray-100 hover:border-gray-300'}`}
              aria-pressed={aiConsent === 'disagreed'}
            >
              <Sparkles size={18} className={aiConsent === 'disagreed' ? 'text-gray-600' : 'text-gray-400'} />
              <p className="font-semibold text-gray-800 text-xs">Disabled</p>
              <p className="text-xs text-gray-400 leading-tight">No AI summaries</p>
            </button>
          </div>

          {aiConsent === null && (
            <p className="text-xs text-gray-400 mt-1 mb-2">No preference set yet.</p>
          )}

          {aiConsent === 'agreed' && (
            <div className="border-t border-gray-100 pt-2">
              <p className="text-xs text-gray-500 mb-1.5">Video card summary format:</p>
              <div className="grid grid-cols-3 gap-2">
                {([['sentence', 'Sentence', 'One-liner'],
                   ['chips', 'Keywords', '3–5 tags'],
                   ['both', 'Both', 'Sentence + tags']] as const).map(([fmt, label, desc]) => (
                  <button
                    key={fmt}
                    onClick={() => {
                      setSummaryFormat(fmt);
                      updatePreferences({ summaryFormat: fmt });
                    }}
                    className={`flex flex-col items-center gap-0.5 p-2 rounded-xl border-2 transition-colors text-center ${
                      summaryFormat === fmt ? 'border-mhmr-olive bg-mhmr-olive/5' : 'border-gray-100 hover:border-gray-300'
                    }`}
                    aria-pressed={summaryFormat === fmt}
                  >
                    <p className="text-xs font-semibold text-gray-800">{label}</p>
                    <p className="text-xs text-gray-400">{desc}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
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
