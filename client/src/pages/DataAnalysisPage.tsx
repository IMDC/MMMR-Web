import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { BarChart2, TrendingUp, Cloud, FileText, Loader2, ChevronRight } from 'lucide-react';
import { useVideoSetStore } from '../store/videoSetStore';
import { useAnalysisStore } from '../store/analysisStore';
import { useVideoStore } from '../store/videoStore';
import Header from '../components/layout/Header';
import Loader from '../components/common/Loader';
import SentimentBadge from '../components/common/SentimentBadge';

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
  const { analyzeVideoSet, isAnalyzing, clearCache } = useAnalysisStore();
  const [selectedSetId, setSelectedSetId] = useState(searchParams.get('setId') || '');
  const [aiOptedIn, setAiOptedIn] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

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

  const handleGenerateAnalysis = async () => {
    if (!selectedSetId) return;
    setAnalyzing(true);
    clearCache(selectedSetId);
    try {
      await analyzeVideoSet(selectedSetId);
      await Promise.all([fetchSets(), fetchVideos()]);
    } finally {
      setAnalyzing(false);
    }
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

        {/* AI opt-in */}
        {selectedSet && (
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-800 text-sm">AI Text Reports</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Enable to generate AI-powered summaries and sentiment analysis
                </p>
              </div>
              <button
                role="switch"
                aria-checked={aiOptedIn}
                aria-label="Enable AI Text Reports"
                onClick={() => setAiOptedIn(v => !v)}
                className={`relative w-12 h-6 rounded-full transition-colors ${aiOptedIn ? 'bg-mhmr-olive' : 'bg-gray-300'}`}
              >
                <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${aiOptedIn ? 'translate-x-6' : ''}`} aria-hidden="true" />
              </button>
            </div>

            {aiOptedIn && (
              <div className="mt-4">
                {selectedSet.isSummaryGenerated && (
                  <div className="mb-3 flex items-center gap-2">
                    <span className="text-xs text-gray-500">Last sentiment:</span>
                    {selectedSet.sentiment && <SentimentBadge sentiment={selectedSet.sentiment} />}
                  </div>
                )}
                <button
                  onClick={handleGenerateAnalysis}
                  disabled={analyzing || transcribedCount === 0}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  {analyzing ? (
                    <><Loader2 size={16} className="animate-spin" /> Generating...</>
                  ) : (
                    selectedSet.isSummaryGenerated ? 'Regenerate Analysis' : 'Generate Analysis'
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Analysis cards */}
        {selectedSetId && (
          <div className="grid grid-cols-2 gap-3">
            {analysisCards.map(({ id, label, description, icon: Icon, color }) => (
              <button
                key={id}
                onClick={() => navigate(`/analysis/${selectedSetId}/${id}`)}
                className="card text-left hover:shadow-md transition-shadow active:scale-[0.98]"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${color}`}>
                  <Icon size={20} />
                </div>
                <h3 className="font-semibold text-gray-800 text-sm">{label}</h3>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{description}</p>
                <div className="flex items-center justify-end mt-3">
                  <ChevronRight size={16} className="text-gray-300" />
                </div>
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
    </div>
  );
}
