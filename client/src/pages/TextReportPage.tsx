import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronDown, ChevronUp, List, FileText, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { useAnalysisStore } from '../store/analysisStore';
import { useVideoSetStore } from '../store/videoSetStore';
import { useVideoStore } from '../store/videoStore';
import { Video } from '../types';
import SentimentBadge from '../components/common/SentimentBadge';
import Loader from '../components/common/Loader';

type ReportFormat = 'bullet' | 'sentence';

const SENTIMENT_OPTIONS = ['All', 'Very Negative', 'Negative', 'Neutral', 'Positive', 'Very Positive'] as const;

// Must match updated tailwind.config.js sentiment colors
const SENTIMENT_COLORS: Record<string, string> = {
  'Very Positive': '#00695C',
  'Positive':      '#2E7D32',
  'Neutral':       '#616161',
  'Negative':      '#E65100',
  'Very Negative': '#B71C1C',
};

const SENTIMENT_EMOJI: Record<string, string> = {
  'Very Positive': '😄',
  'Positive':      '🙂',
  'Neutral':       '😐',
  'Negative':      '😟',
  'Very Negative': '😢',
};

function getVideoSentiment(video: Video): string {
  return video.biasAdjustedSentiment || video.sentiment || '';
}

function parseBullets(raw: string): string[] {
  return raw.split('\n')
    .map(l => l.replace(/^[\u2022\u2023\u2043\u25E6\u2014\u2013\-\*\d]+[.):]?\s*/, '').trim())
    .filter(Boolean);
}

export default function TextReportPage() {
  const { setId } = useParams<{ setId: string }>();
  const navigate = useNavigate();
  const { analyzeVideoSet } = useAnalysisStore();
  const { videoSets, fetchSets } = useVideoSetStore();
  const { videos, fetchVideos } = useVideoStore();

  const [reportFormat, setReportFormat] = useState<ReportFormat>('bullet');
  const [sentimentFilter, setSentimentFilter] = useState('All');
  const [openTranscripts, setOpenTranscripts] = useState<Set<string>>(new Set());
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    fetchSets();
    fetchVideos();
  }, []);

  const set = videoSets.find(s => s._id === setId);

  // Initialise format from saved set preference
  useEffect(() => {
    if (set?.reportFormat) setReportFormat(set.reportFormat);
  }, [set?._id]);

  const setVideos = videos
    .filter(v => set?.videoIDs.includes(v._id))
    .sort((a, b) => new Date(b.datetimeRecorded).getTime() - new Date(a.datetimeRecorded).getTime());

  const filteredVideos = sentimentFilter === 'All'
    ? setVideos
    : setVideos.filter(v => getVideoSentiment(v) === sentimentFilter);

  // Emotional distribution counts
  const sentimentCounts = setVideos.reduce<Record<string, number>>((acc, v) => {
    const s = getVideoSentiment(v);
    if (s) acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});

  // Keep pie slices in a consistent order
  const pieData = SENTIMENT_OPTIONS
    .filter(s => s !== 'All' && sentimentCounts[s])
    .map(label => ({ name: label, value: sentimentCounts[label], color: SENTIMENT_COLORS[label] }));

  const toggleTranscript = (id: string) => {
    setOpenTranscripts(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleRegenerate = async () => {
    if (!setId) return;
    setRegenerating(true);
    try {
      await analyzeVideoSet(setId);
      // Refresh both set (summary) and individual videos (tsOutputBullet, sentiment, etc.)
      await Promise.all([fetchSets(), fetchVideos()]);
    } finally {
      setRegenerating(false);
    }
  };

  if (!set) {
    return (
      <div className="flex flex-col h-full">
        <div className="bg-mhmr-olive px-4 py-3 flex items-center gap-3 shrink-0">
          <button onClick={() => navigate('/analysis')} className="text-white/80 hover:text-white" aria-label="Back to Data Analysis">
            <ArrowLeft size={22} aria-hidden="true" />
          </button>
          <h1 className="text-white font-bold flex-1">Text Report</h1>
        </div>
        <div className="flex justify-center py-12"><Loader message="Loading report..." /></div>
      </div>
    );
  }

  const hasReport = !!set.isSummaryGenerated;
  const setSummaryBullets = set.summaryAnalysisBullet ? parseBullets(set.summaryAnalysisBullet) : [];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-mhmr-olive px-4 py-3 flex items-center gap-3 shadow-sm shrink-0">
        <button onClick={() => navigate('/analysis')} className="text-white/80 hover:text-white" aria-label="Back to Data Analysis">
          <ArrowLeft size={22} aria-hidden="true" />
        </button>
        <h1 className="text-white font-bold flex-1">Text Report</h1>
        {set.sentiment && <SentimentBadge sentiment={set.sentiment} />}
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Format toggle — sticky */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3">
          <div className="flex gap-2" role="group" aria-label="Report format">
            <button
              onClick={() => setReportFormat('bullet')}
              aria-pressed={reportFormat === 'bullet'}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${
                reportFormat === 'bullet' ? 'bg-mhmr-olive text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <List size={16} aria-hidden="true" />
              Bullet Points
            </button>
            <button
              onClick={() => setReportFormat('sentence')}
              aria-pressed={reportFormat === 'sentence'}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${
                reportFormat === 'sentence' ? 'bg-mhmr-olive text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <FileText size={16} aria-hidden="true" />
              Full Sentences
            </button>
          </div>
        </div>

        <div className="p-4 space-y-4">

          {/* ── 1. Video Set Summary ── */}
          <div className="card">
            <h2 className="font-bold text-gray-900 mb-3">
              {set.name} — Video Set Summary
            </h2>

            {!hasReport ? (
              <p className="text-sm text-gray-400 italic">Summary has not been generated yet.</p>
            ) : reportFormat === 'bullet' && setSummaryBullets.length > 0 ? (
              <ul className="space-y-2">
                {setSummaryBullets.map((point, i) => (
                  <li key={i} className="flex gap-2 text-sm text-gray-700 leading-relaxed">
                    <span className="text-mhmr-olive font-bold shrink-0 mt-0.5">•</span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            ) : set.summaryAnalysisSentence ? (
              <p className="text-sm text-gray-700 leading-relaxed">{set.summaryAnalysisSentence}</p>
            ) : (
              <p className="text-sm text-gray-400 italic">
                No {reportFormat === 'bullet' ? 'bullet points' : 'summary'} available.
              </p>
            )}

            {hasReport && (
              <div className="mt-4 pt-3 border-t border-gray-100">
                <button
                  onClick={handleRegenerate}
                  disabled={regenerating}
                  className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
                >
                  {regenerating
                    ? <><Loader2 size={13} className="animate-spin" aria-hidden="true" /> Regenerating...</>
                    : 'Regenerate Report'}
                </button>
              </div>
            )}

            {!hasReport && (
              <div className="mt-4 flex flex-col items-start gap-3">
                <p className="text-xs text-gray-400">
                  Go to Data Analysis to generate an AI-powered report for this set.
                </p>
                <button
                  onClick={() => navigate(`/analysis?setId=${setId}`)}
                  className="btn-primary text-sm"
                >
                  Go to Analysis
                </button>
              </div>
            )}
          </div>

          {/* ── 2. Emotional Distribution ── */}
          {setVideos.length > 0 && (
            <div className="card">
              <h2 className="font-bold text-gray-900 mb-4">Emotional distribution of video set</h2>

              {pieData.length > 0 ? (
                <div className="flex flex-col items-center gap-4">
                  {/* Donut chart */}
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={90}
                        paddingAngle={3}
                        dataKey="value"
                        aria-label="Sentiment distribution pie chart"
                      >
                        {pieData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ fontSize: 12, borderRadius: 8 }}
                        formatter={(v: any, name: any) => [`${v} video${v !== 1 ? 's' : ''}`, name]}
                      />
                    </PieChart>
                  </ResponsiveContainer>

                  {/* Legend */}
                  <div className="flex flex-wrap justify-center gap-x-5 gap-y-2">
                    {pieData.map(entry => (
                      <div key={entry.name} className="flex items-center gap-1.5">
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: entry.color }}
                          aria-hidden="true"
                        />
                        <span className="text-xs text-gray-700">{entry.name}</span>
                        <span className="text-xs font-bold text-gray-900">({entry.value})</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-400 text-center py-4 italic">
                  No sentiment data yet. Transcribe and analyze videos first.
                </p>
              )}
            </div>
          )}

          {/* ── 3. Individual Videos ── */}
          <div className="card">
            <h2 className="font-bold text-gray-900 mb-4">Individual videos in video set</h2>

            {/* Filter by feeling */}
            <div className="flex items-center gap-3 mb-5">
              <label htmlFor="sentiment-filter" className="text-sm font-medium text-gray-700 shrink-0">
                Filter by feeling:
              </label>
              <select
                id="sentiment-filter"
                value={sentimentFilter}
                onChange={e => setSentimentFilter(e.target.value)}
                className="form-input flex-1"
              >
                {SENTIMENT_OPTIONS.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>

            {filteredVideos.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6 italic">
                {sentimentFilter === 'All'
                  ? 'No videos in this set.'
                  : `No ${sentimentFilter} videos found.`}
              </p>
            ) : (
              <div className="space-y-0">
                {filteredVideos.map((video, idx) => {
                  const videoSentiment = getVideoSentiment(video);
                  const transcriptOpen = openTranscripts.has(video._id);
                  const videoBullets = video.tsOutputBullet ? parseBullets(video.tsOutputBullet) : [];

                  return (
                    <div
                      key={video._id}
                      className={`py-5 ${idx > 0 ? 'border-t border-gray-100' : ''}`}
                    >
                      {/* Title + date */}
                      <h3 className="font-bold text-gray-900 leading-snug">{video.title}</h3>
                      <p className="text-xs text-gray-500 mt-0.5 mb-3">
                        {format(new Date(video.datetimeRecorded), 'MMM d, yyyy • h:mm a')}
                      </p>

                      {/* Transcript (collapsible) */}
                      <button
                        onClick={() => toggleTranscript(video._id)}
                        className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 hover:text-mhmr-olive transition-colors mb-2"
                        aria-expanded={transcriptOpen}
                        aria-controls={`transcript-${video._id}`}
                      >
                        {transcriptOpen
                          ? <ChevronUp size={15} aria-hidden="true" />
                          : <ChevronDown size={15} aria-hidden="true" />}
                        Video transcript:
                      </button>
                      {transcriptOpen && (
                        <div
                          id={`transcript-${video._id}`}
                          className="bg-gray-50 rounded-xl p-3 mb-3"
                        >
                          {video.transcript
                            ? <p className="text-xs text-gray-600 leading-relaxed">{video.transcript}</p>
                            : <p className="text-xs text-gray-400 italic">No transcript available.</p>}
                        </div>
                      )}

                      {/* Video output */}
                      <div className="mb-3">
                        <p className="text-sm font-semibold text-gray-700 mb-1.5">Video output:</p>
                        {reportFormat === 'bullet' ? (
                          videoBullets.length > 0 ? (
                            <ul className="space-y-1.5">
                              {videoBullets.map((point, i) => (
                                <li key={i} className="flex gap-2 text-sm text-gray-600 leading-relaxed">
                                  <span className="text-mhmr-olive font-bold shrink-0 mt-0.5">•</span>
                                  <span>{point}</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-sm text-gray-400 italic">No bullet point output generated.</p>
                          )
                        ) : (
                          video.tsOutputSentence
                            ? <p className="text-sm text-gray-600 leading-relaxed">{video.tsOutputSentence}</p>
                            : <p className="text-sm text-gray-400 italic">No sentence output generated.</p>
                        )}
                      </div>

                      {/* Overall feeling */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-gray-700">Overall feeling:</p>
                        {videoSentiment ? (
                          <>
                            <SentimentBadge sentiment={videoSentiment} />
                            <span
                              className="text-xl leading-none"
                              role="img"
                              aria-label={videoSentiment}
                            >
                              {SENTIMENT_EMOJI[videoSentiment] ?? '😐'}
                            </span>
                          </>
                        ) : (
                          <span className="text-sm text-gray-400 italic">Not yet analyzed</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
