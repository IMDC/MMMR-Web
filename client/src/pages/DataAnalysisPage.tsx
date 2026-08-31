import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { BarChart2, TrendingUp, Cloud, FileText, Loader2 } from 'lucide-react';
import { useVideoSetStore } from '../store/videoSetStore';
import { useAnalysisStore } from '../store/analysisStore';
import { useVideoStore } from '../store/videoStore';
import { useAuthStore } from '../store/authStore';
import Header from '../components/layout/Header';

const analysisCards = [
  {
    id: 'bar',
    label: 'Bar Graph',
    description: 'Word & symptom frequency across all videos',
    icon: BarChart2,
    color: 'bg-blue-50 text-blue-600',
  },
  {
    id: 'line',
    label: 'Line Graph',
    description: 'Track how a word\'s frequency changes over time',
    icon: TrendingUp,
    color: 'bg-green-50 text-green-600',
  },
  {
    id: 'cloud',
    label: 'Word Cloud',
    description: 'Visual representation of word frequencies',
    icon: Cloud,
    color: 'bg-purple-50 text-purple-600',
  },
  {
    id: 'report',
    label: 'Text Report',
    description: 'AI-generated bullet points and summaries',
    icon: FileText,
    color: 'bg-orange-50 text-orange-600',
  },
];

export default function DataAnalysisPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { videoSets, fetchSets } = useVideoSetStore();
  const { videos, fetchVideos } = useVideoStore();
  const { analyzeVideoSet, clearCache } = useAnalysisStore();
  const user = useAuthStore(s => s.user);
  const updatePreferences = useAuthStore(s => s.updatePreferences);
  const [selectedSetId, setSelectedSetId] = useState(searchParams.get('setId') || '');

  const aiGlobalEnabled = user?.aiConsent === 'agreed';

  // Modal states
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetchSets(), fetchVideos()]);
  }, []);

  useEffect(() => {
    if (!selectedSetId && videoSets.length > 0) {
      setSelectedSetId(videoSets[0]._id);
    }
  }, [videoSets]);

  const selectedSet = videoSets.find(s => s._id === selectedSetId);
  const setVideos = videos.filter(v => selectedSet?.videoIDs.includes(v._id));
  const transcribedCount = setVideos.filter(v => v.isTranscribed).length;

  // ── Analysis runner ───────────────────────────────────────────────
  const runAnalysisAndNavigate = async () => {
    if (!selectedSetId) return;
    setAnalyzing(true);
    setAnalyzeError(null);
    clearCache(selectedSetId);
    try {
      await analyzeVideoSet(selectedSetId);
      await Promise.all([fetchSets(), fetchVideos()]);
      navigate(`/analysis/${selectedSetId}/report`);
    } catch {
      setAnalyzeError('Analysis failed. Please check your connection and try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  // ── Card click ────────────────────────────────────────────────────
  const handleCardClick = async (id: string) => {
    if (id !== 'report') {
      navigate(`/analysis/${selectedSetId}/${id}`);
      return;
    }
    // Already have a report
    if (selectedSet?.isSummaryGenerated) {
      const hasNew = setVideos.some(v => v.isTranscribed && !v.bulletPointsLocked);
      if (hasNew) {
        // New unanalyzed videos — show overlay, run incremental analysis, then navigate
        await runAnalysisAndNavigate();
      } else {
        // All videos already analyzed — open instantly
        navigate(`/analysis/${selectedSetId}/report`);
      }
      return;
    }
    // Need to generate — check global preference
    if (aiGlobalEnabled) {
      await runAnalysisAndNavigate();
    } else {
      setShowConsentModal(true);
    }
  };

  // ── Consent modal responses ───────────────────────────────────────
  const handleConsentYes = async () => {
    setShowConsentModal(false);
    await runAnalysisAndNavigate();
  };

  const handleConsentYesForAll = async () => {
    updatePreferences({ aiConsent: 'agreed' });
    setShowConsentModal(false);
    await runAnalysisAndNavigate();
  };

  return (
    <div className="flex flex-col h-full">
      <Header title="Data Analysis" subtitle="Analyze your health journal" />

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Video set selector */}
        <div className="card">
          <label htmlFor="set-select" className="section-title block">Select Video Set</label>
          {videoSets.length === 0 ? (
            <p className="text-sm text-gray-400">No video sets yet. Create one from Manage Videos.</p>
          ) : (
            <select
              id="set-select"
              value={selectedSetId}
              onChange={e => setSelectedSetId(e.target.value)}
              className="form-input"
            >
              {videoSets.map(s => (
                <option key={s._id} value={s._id}>{s.name} ({s.videoIDs.length} videos)</option>
              ))}
            </select>
          )}

          {selectedSet && (
            <div className="mt-3 text-sm text-gray-500">
              {transcribedCount}/{setVideos.length} videos transcribed
              {transcribedCount === 0 && (
                <span className="text-orange-500 ml-2">⚠ Transcribe videos first for best results</span>
              )}
            </div>
          )}
        </div>

        {/* Analysis error */}
        {analyzeError && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
            {analyzeError}
          </div>
        )}

        {/* Analysis cards */}
        {selectedSetId && (
          <div className="grid grid-cols-2 gap-3">
            {analysisCards.map(({ id, label, description, icon: Icon, color }) => (
              <button
                key={id}
                onClick={() => handleCardClick(id)}
                className="card flex flex-col items-center text-center hover:shadow-md transition-shadow active:scale-[0.98]"
              >
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-3 ${color}`}>
                  <Icon size={26} />
                </div>
                <h3 className="font-semibold text-gray-800">{label}</h3>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">{description}</p>
              </button>
            ))}
          </div>
        )}

        {!selectedSetId && (
          <div className="text-center py-10">
            <BarChart2 size={48} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400">Select a video set to begin analysis</p>
          </div>
        )}
      </div>

      {/* ── Per-set AI consent modal ── */}
      {showConsentModal && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          role="presentation"
          onClick={() => setShowConsentModal(false)}
          onKeyDown={e => e.key === 'Escape' && setShowConsentModal(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="consent-modal-title"
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6"
            onClick={e => e.stopPropagation()}
          >
            <h2 id="consent-modal-title" className="font-bold text-gray-800 mb-2">Use AI for Text Report?</h2>
            <p className="text-sm text-gray-600 mb-5">
              Would you like to opt in to AI-generated text reports? This will send transcripts from the selected video set to an external AI service (ChatGPT).
            </p>
            <div className="flex flex-col gap-2">
              <button onClick={handleConsentYesForAll} className="btn-primary w-full">
                Yes, and enable for all future sets
              </button>
              <button onClick={handleConsentYes} className="btn-secondary w-full">
                Yes, just this once
              </button>
              <button
                onClick={() => setShowConsentModal(false)}
                className="w-full py-2 text-sm text-gray-500 hover:text-gray-700"
              >
                No
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Generating overlay ── */}
      {analyzing && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-2xl px-8 py-6 flex flex-col items-center gap-3">
            <Loader2 size={32} className="animate-spin text-mhmr-olive" />
            <p className="font-semibold text-gray-800">Generating report...</p>
            <p className="text-xs text-gray-400">This may take a moment</p>
          </div>
        </div>
      )}
    </div>
  );
}
