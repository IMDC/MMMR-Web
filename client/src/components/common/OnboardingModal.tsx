import { useState } from 'react';
import { Mic, Sparkles } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

interface Props {
  onComplete: () => void;
}

export default function OnboardingModal({ onComplete }: Props) {
  const updatePreferences = useAuthStore(s => s.updatePreferences);
  const [step, setStep] = useState<1 | 2>(1);
  const [displayName, setDisplayName] = useState('');

  const handleContinue = () => {
    if (!displayName.trim()) return;
    setStep(2);
  };

  const handleConsent = async (agreed: boolean) => {
    await updatePreferences({
      displayName: displayName.trim(),
      aiConsent: agreed ? 'agreed' : 'disagreed',
      ...(agreed && { autoTranscribe: true }),
    });
    onComplete();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
      >
        {step === 1 ? (
          <div className="p-6">
            <div className="w-12 h-12 rounded-2xl bg-mhmr-olive/10 flex items-center justify-center mb-4">
              <img src="/roundLogo.png" alt="" className="h-8 w-8 object-contain" aria-hidden="true" />
            </div>
            <h2 id="onboarding-title" className="text-lg font-bold text-gray-800 mb-1">
              Welcome to MyMissionMyRecord
            </h2>
            <p className="text-sm text-gray-500 mb-5">
              What should we call you? This is just your display name — your login stays the same.
            </p>
            <label htmlFor="display-name-input" className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Display name
            </label>
            <input
              id="display-name-input"
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleContinue()}
              placeholder="e.g. Alex"
              className="form-input mt-1 mb-5"
              autoFocus
              maxLength={40}
            />
            <button
              onClick={handleContinue}
              disabled={!displayName.trim()}
              className="btn-primary w-full disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Continue
            </button>
          </div>
        ) : (
          <div className="p-6">
            <h2 id="onboarding-title" className="text-lg font-bold text-gray-800 mb-1">
              Your data belongs to you
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              This app has optional AI features that send data to OpenAI. Here's exactly what they do:
            </p>

            <div className="space-y-3 mb-4">
              <div className="flex gap-3 p-3 rounded-xl bg-blue-50">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                  <Mic size={15} className="text-blue-600" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">Transcription (Whisper)</p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                    Your video audio is sent to OpenAI to convert speech to text. Audio is processed and not stored permanently by OpenAI.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 p-3 rounded-xl bg-purple-50">
                <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
                  <Sparkles size={15} className="text-purple-600" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">AI Analysis & Summaries (GPT-4)</p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                    Your transcript text is sent to OpenAI to generate summaries, keyword topics, and health insights.
                  </p>
                </div>
              </div>
            </div>

            <p className="text-xs text-gray-400 mb-5 leading-relaxed">
              You can turn AI features on or off at any time in Settings.
            </p>

            <div className="flex flex-col gap-2">
              <button onClick={() => handleConsent(true)} className="btn-primary w-full">
                I agree — enable AI features
              </button>
              <button
                onClick={() => handleConsent(false)}
                className="w-full py-2.5 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
              >
                No thanks, keep AI off
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
