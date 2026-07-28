import { useState } from 'react';
import { Zap, ZapOff } from 'lucide-react';
import Header from '../components/layout/Header';
import { useAuthStore } from '../store/authStore';

export default function SettingsPage() {
  const userId = useAuthStore(s => s.user?.id ?? 'guest');
  const autotranscribeKey = `mhmr_autotranscribe_${userId}`;

  const [autoTranscribe, setAutoTranscribe] = useState<boolean | null>(() => {
    const pref = localStorage.getItem(autotranscribeKey);
    if (pref === null) return null;
    return pref === 'true';
  });

  const toggle = (enabled: boolean) => {
    localStorage.setItem(autotranscribeKey, String(enabled));
    setAutoTranscribe(enabled);
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
      </div>
    </div>
  );
}
