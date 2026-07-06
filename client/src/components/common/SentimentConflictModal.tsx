import { Info, X, ChevronRight } from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import SentimentBadge from './SentimentBadge';

export default function SentimentConflictModal() {
  const { sentimentConflicts, dismissSentimentConflict, clearAllConflicts } = useUIStore();
  const conflict = sentimentConflicts[0];
  const remaining = sentimentConflicts.length - 1;

  if (!conflict) return null;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="sentiment-conflict-title"
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full"
      >
        {/* Header */}
        <div className="bg-mhmr-olive rounded-t-2xl p-5 flex items-center gap-3">
          <Info className="text-white shrink-0" size={22} />
          <h2 id="sentiment-conflict-title" className="text-white font-bold flex-1">Difference in Sentiment Noticed</h2>
          <button onClick={clearAllConflicts} className="text-white/70 hover:text-white" aria-label="Close">
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm text-gray-600">
            Video: <span className="font-medium text-gray-800">{conflict.videoTitle}</span>
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-500 mb-1">Your markups suggest</p>
              <SentimentBadge sentiment={conflict.userSentiment} size="md" />
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-500 mb-1">AI analysis suggests</p>
              <SentimentBadge sentiment={conflict.aiSentiment} size="md" />
            </div>
          </div>

          <p className="text-sm text-gray-600 leading-relaxed">
            Based on the AI's analysis and your markups, there appears to be a difference in sentiment.
            It's completely okay — we just want to keep you informed.
          </p>

          {remaining > 0 && (
            <p className="text-xs text-gray-400">
              {remaining} more alert{remaining > 1 ? 's' : ''} in queue
            </p>
          )}

          <div className="flex gap-2">
            {remaining > 0 ? (
              <>
                <button onClick={clearAllConflicts} className="btn-secondary flex-1 text-sm">
                  Skip All
                </button>
                <button onClick={dismissSentimentConflict} className="btn-primary flex-1 flex items-center justify-center gap-1 text-sm">
                  Next ({remaining} left) <ChevronRight size={14} />
                </button>
              </>
            ) : (
              <button onClick={dismissSentimentConflict} className="btn-primary w-full">
                OK
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
