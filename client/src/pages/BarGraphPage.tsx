import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Settings, X } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { useAnalysisStore } from '../store/analysisStore';
import { useVideoSetStore } from '../store/videoSetStore';
import { useVideoStore } from '../store/videoStore';
import { Video } from '../types';
import Loader from '../components/common/Loader';

// Must match updated tailwind.config.js sentiment colors
const SENTIMENT_COLORS: Record<string, string> = {
  'Very Negative': '#B71C1C',
  'Negative':      '#E65100',
  'Neutral':       '#616161',
  'Positive':      '#2E7D32',
  'Very Positive': '#00695C',
};
const SENTIMENT_ORDER = ['Very Negative', 'Negative', 'Neutral', 'Positive', 'Very Positive'];

function getVideoSentiment(v: Video) {
  return v.biasAdjustedSentiment || v.sentiment || '';
}

export default function BarGraphPage() {
  const { setId } = useParams<{ setId: string }>();
  const navigate = useNavigate();
  const { fetchFrequencyData, setSelectedWord } = useAnalysisStore();
  const { videoSets, fetchSets } = useVideoSetStore();
  const { videos, fetchVideos } = useVideoStore();

  const [data, setData] = useState<{ text: string; value: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [minCount, setMinCount] = useState(1);
  const [minCountInput, setMinCountInput] = useState('2');
  // hiddenWords: words removed from the chart (checked in modal = hidden)
  const [hiddenWords, setHiddenWords] = useState<Set<string>>(new Set());
  const [showWordSettings, setShowWordSettings] = useState(false);
  const [wordSearch, setWordSearch] = useState('');
  const videoSet = videoSets.find(s => s._id === setId);

  useEffect(() => {
    fetchSets();
    fetchVideos();
  }, []);

  useEffect(() => {
    if (!setId) return;
    setLoading(true);
    fetchFrequencyData(setId, minCount)
      .then(result => { setData(result.barData.data || []); })
      .finally(() => setLoading(false));
  }, [setId, minCount]);

  // Chart data: all words minus hidden ones
  const displayData = useMemo(
    () => data.filter(d => !hiddenWords.has(d.text)).slice(0, 50),
    [data, hiddenWords],
  );

  // Modal word list, filtered by search
  const modalWords = useMemo(() => {
    const q = wordSearch.toLowerCase().trim();
    return q ? data.filter(d => d.text.toLowerCase().includes(q)) : data;
  }, [data, wordSearch]);

  // Sentiment distribution across videos in this set
  const setVideos = videos.filter(v => videoSet?.videoIDs.includes(v._id));
  const sentimentData = SENTIMENT_ORDER
    .map(label => ({
      sentiment: label,
      count: setVideos.filter(v => getVideoSentiment(v) === label).length,
      color: SENTIMENT_COLORS[label],
    }))
    .filter(d => d.count > 0);

  const toggleHidden = (word: string) => {
    setHiddenWords(prev => {
      const next = new Set(prev);
      next.has(word) ? next.delete(word) : next.add(word);
      return next;
    });
  };

  const handleBarClick = (item: any) => {
    const word = item?.activePayload?.[0]?.payload?.text;
    if (word) { setSelectedWord(word); navigate(`/analysis/${setId}/line`); }
  };

  const handleMinCountChange = (val: string) => {
    setMinCountInput(val);
    const n = parseInt(val, 10);
    if (!isNaN(n) && n >= 1) setMinCount(n);
  };

  const setName = videoSet?.name ?? '';

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-mhmr-olive px-4 py-3 flex items-center gap-3 shadow-sm shrink-0">
        <button
          onClick={() => navigate('/analysis')}
          className="text-white/80 hover:text-white"
          aria-label="Back to Data Analysis"
        >
          <ArrowLeft size={22} aria-hidden="true" />
        </button>
        <h1 className="text-white font-bold flex-1 truncate">
          Word Frequency{setName ? ` — ${setName}` : ''}
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader message="Loading frequency data..." />
          </div>
        ) : data.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p>No frequency data available.</p>
            <p className="text-sm mt-1">Transcribe videos first, then analyze this set.</p>
          </div>
        ) : (
          <>
            {/* ── Word Frequency Chart ── */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs text-gray-400">Click a bar to view its trend over time</p>
                <button
                  onClick={() => setShowWordSettings(true)}
                  className="flex items-center gap-1.5 bg-mhmr-olive text-white text-xs font-semibold px-4 py-2 rounded-full hover:bg-mhmr-olive-dark transition-colors shrink-0"
                  aria-label="Open word settings"
                >
                  <Settings size={13} aria-hidden="true" />
                  Word Settings
                </button>
              </div>

              {displayData.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-10 italic">
                  All words are hidden. Open Word Settings to restore them.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={500}>
                  <BarChart
                    data={displayData}
                    onClick={handleBarClick}
                    barSize={80}
                    margin={{ top: 5, right: 10, left: -15, bottom: 110 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                      dataKey="text"
                      angle={-45}
                      textAnchor="end"
                      tick={{ fontSize: 11 }}
                      interval={0}
                    />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ fontSize: 12, borderRadius: 8 }}
                      formatter={(v: any) => [v, 'Count']}
                    />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]} cursor="pointer">
                      {displayData.map(entry => (
                        <Cell key={entry.text} fill="#6B8E23" />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* ── Sentiment Distribution Chart ── */}
            <div className="card">
              <h2 className="font-bold text-gray-900 mb-0.5">
                Sentiment Distribution{setName ? ` — ${setName}` : ''}
              </h2>
              <p className="text-xs text-gray-400 mb-4">Video count by sentiment</p>

              {sentimentData.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8 italic">
                  No sentiment data yet. Analyze this video set first.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={sentimentData}
                    barSize={52}
                    margin={{ top: 5, right: 10, left: -15, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                      dataKey="sentiment"
                      tick={{ fontSize: 11 }}
                      interval={0}
                    />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      allowDecimals={false}
                      label={{ value: 'Videos', angle: -90, position: 'insideLeft', fontSize: 11, dy: 25 }}
                    />
                    <Tooltip
                      contentStyle={{ fontSize: 12, borderRadius: 8 }}
                      formatter={(v: any) => [v, 'Videos']}
                    />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {sentimentData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── Word Settings Modal ── */}
      {showWordSettings && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowWordSettings(false)}
          onKeyDown={e => e.key === 'Escape' && setShowWordSettings(false)}
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="word-settings-title"
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
              <h2 id="word-settings-title" className="font-bold text-gray-800">Word Settings</h2>
              <button
                onClick={() => setShowWordSettings(false)}
                className="text-gray-400 hover:text-gray-600"
                aria-label="Close word settings"
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>

            {/* Min frequency row */}
            <div className="px-5 py-4 border-b border-gray-100 shrink-0">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Frequency Filter</p>
              <div className="flex items-center gap-3">
                <label htmlFor="min-freq-input" className="text-sm text-gray-700 shrink-0">
                  Show words appearing ≥
                </label>
                <input
                  id="min-freq-input"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  value={minCountInput}
                  onChange={e => handleMinCountChange(e.target.value)}
                  className="form-input w-20 text-center"
                  aria-label="Minimum word frequency"
                />
                <span className="text-sm text-gray-700 shrink-0">times</span>
              </div>
            </div>

            {/* Word list header + search */}
            <div className="px-5 pt-4 pb-3 border-b border-gray-100 shrink-0 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Words in visualization
                </p>
                {hiddenWords.size > 0 && (
                  <button
                    onClick={() => setHiddenWords(new Set())}
                    className="text-xs text-mhmr-olive hover:underline font-medium"
                  >
                    Show all ({hiddenWords.size} hidden)
                  </button>
                )}
              </div>
              <input
                type="text"
                value={wordSearch}
                onChange={e => setWordSearch(e.target.value)}
                placeholder="Search words..."
                className="form-input"
                aria-label="Search words"
              />
              <p className="text-xs text-gray-400">Tap a word to remove it from the chart.</p>
            </div>

            {/* Word grid */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {modalWords.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6 italic">No words match your search.</p>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {modalWords.map(item => {
                    const isHidden = hiddenWords.has(item.text);
                    return (
                      <button
                        key={item.text}
                        onClick={() => toggleHidden(item.text)}
                        aria-pressed={isHidden}
                        className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg border text-left text-xs transition-all ${
                          isHidden
                            ? 'bg-red-50 border-red-200 text-red-500 line-through opacity-70'
                            : 'bg-white border-gray-200 text-gray-700 hover:border-mhmr-olive hover:bg-mhmr-olive/5'
                        }`}
                      >
                        {/* Checkbox indicator */}
                        <span
                          className={`w-3.5 h-3.5 rounded border-2 shrink-0 flex items-center justify-center transition-colors ${
                            isHidden ? 'bg-red-400 border-red-400' : 'border-gray-300'
                          }`}
                          aria-hidden="true"
                        >
                          {isHidden && (
                            <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                              <path d="M1 1l6 6M7 1L1 7" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                            </svg>
                          )}
                        </span>
                        <span className="truncate font-medium">{item.text}</span>
                        <span className="text-gray-400 shrink-0 ml-auto">({item.value})</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Done button */}
            <div className="px-5 py-4 border-t border-gray-100 shrink-0">
              <button
                onClick={() => setShowWordSettings(false)}
                className="btn-primary w-full"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
