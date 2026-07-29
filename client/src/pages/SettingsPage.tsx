import { useState } from 'react';
import { Zap, ZapOff, FileText } from 'lucide-react';
import Header from '../components/layout/Header';
import { useAuthStore } from '../store/authStore';

export default function SettingsPage() {
  const userId = useAuthStore(s => s.user?.id ?? 'guest');
  const autotranscribeKey = `mhmr_autotranscribe_${userId}`;
  const aiPrefKey = `mhmr_ai_reports_${userId}`;

  const [autoTranscribe, setAutoTranscribe] = useState<boolean | null>(() => {
    const pref = localStorage.getItem(autotranscribeKey);
    if (pref === null) return null;
    return pref === 'true';
  });

  const [aiReports, setAiReports] = useState(
    () => localStorage.getItem(aiPrefKey) === 'true'
  );
  const [showAiConfirm, setShowAiConfirm] = useState(false);

  const toggle = (enabled: boolean) => {
    localStorage.setItem(autotranscribeKey, String(enabled));
    setAutoTranscribe(enabled);
  };

  const handleAiToggle = () => {
    if (aiReports) {
      localStorage.setItem(aiPrefKey, 'false');
      setAiReports(false);
    } else {
      setShowAiConfirm(true);
    }
  };

  const confirmAiEnable = () => {
    localStorage.setItem(aiPrefKey, 'true');
    setAiReports(true);
    setShowAiConfirm(false);
  };

  return (
    <div className="flex flex-col h-full">
      <Header title="Settings" subtitle="App preferences" />

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
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

        {/* AI Text Reports */}
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-orange-50 text-orange-600">
              <FileText size={18} />
            </div>
            <h2 className="font-semibold text-gray-800">AI Text Reports</h2>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-800 font-medium">
                {aiReports ? 'Enabled' : 'Disabled'}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {aiReports
                  ? 'Text reports generate automatically without asking each time'
                  : "You'll be asked each time you open a Text Report"}
              </p>
            </div>
            <button
              role="switch"
              aria-checked={aiReports}
              aria-label="Enable AI Text Reports"
              onClick={handleAiToggle}
              className={`relative w-12 h-6 rounded-full transition-colors shrink-0 ${aiReports ? 'bg-mhmr-olive' : 'bg-gray-300'}`}
            >
              <span
                className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${aiReports ? 'translate-x-6' : ''}`}
                aria-hidden="true"
              />
            </button>
          </div>

          <p className="text-xs text-gray-400 mt-3 leading-relaxed">
            When enabled, AI reports send your video transcripts to an external AI service (ChatGPT) to generate summaries and sentiment analysis.
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
            <h2 id="ai-confirm-title" className="font-bold text-gray-800 mb-2">Enable AI Text Reports?</h2>
            <p className="text-sm text-gray-600 mb-5">
              When enabled, new video sets will automatically use AI-generated text reports without asking each time.
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
