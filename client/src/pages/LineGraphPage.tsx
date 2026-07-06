import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, X, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { useAnalysisStore } from '../store/analysisStore';
import { useVideoSetStore } from '../store/videoSetStore';
import Loader from '../components/common/Loader';

// ── Constants ─────────────────────────────────────────────────────────────────
const HOUR_LABELS = [
  '12AM','1AM','2AM','3AM','4AM','5AM','6AM','7AM','8AM','9AM','10AM','11AM',
  '12PM','1PM','2PM','3PM','4PM','5PM','6PM','7PM','8PM','9PM','10PM','11PM',
];
const DAY_LABELS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const COMPARISON_COLORS = ['#FF6B6B','#4ECDC4','#45B7D1','#96CEB4','#FF8E53','#9B59B6'];
const MAIN_COLOR = '#6B8E23';

type Period = 'daily' | 'weekly' | 'range';

interface FreqMap { map: Record<string, number>; datetime: string; videoID: string; }
interface DataPoint { label: string | number; value: number; videoIDs: string[]; }
interface WordLine { word: string; color: string; }

// ── Client-side line data computation (matches Android lineGraphData.tsx) ─────
function computeLineData(freqMaps: FreqMap[], word: string) {
  const trackedHours = new Map<string, number>();
  const trackedWeeks = new Map<string, number>();
  const datesForHours: { label: string; value: number }[] = [];
  const byHour: DataPoint[][] = [];
  const datesForWeeks: { label: string; value: number }[] = [];
  const byWeek: DataPoint[][] = [];

  if (freqMaps.length === 0) return { datesForHours: [], byHour: [], datesForWeeks: [], byWeek: [], byRange: [] };

  const allDates = freqMaps.map(f => new Date(f.datetime));
  const earliest = new Date(Math.min(...allDates.map(d => d.getTime())));
  const latest   = new Date(Math.max(...allDates.map(d => d.getTime())));

  // Pre-fill range map for every calendar date in the span
  const rangeMap = new Map<string, DataPoint>();
  const cur = new Date(earliest);
  while (cur <= latest) {
    const key = `${cur.getMonth() + 1}-${cur.getDate()}`;
    rangeMap.set(key, { label: key, value: 0, videoIDs: [] });
    cur.setDate(cur.getDate() + 1);
  }

  for (const item of freqMaps) {
    const d = new Date(item.datetime);
    const dateStr = d.toDateString();
    const hour = d.getHours();
    const dow  = d.getDay();

    // Week bounds
    const ws = new Date(d); ws.setDate(d.getDate() - d.getDay());
    const we = new Date(ws); we.setDate(ws.getDate() + 6);
    const weekLabel = `${ws.toDateString()} - ${we.toDateString()}`;

    if (!trackedHours.has(dateStr)) {
      trackedHours.set(dateStr, datesForHours.length);
      byHour.push(Array.from({ length: 24 }, () => ({ label: 0, value: 0, videoIDs: [] })));
      datesForHours.push({ label: dateStr, value: datesForHours.length });
    }
    if (!trackedWeeks.has(weekLabel)) {
      trackedWeeks.set(weekLabel, datesForWeeks.length);
      byWeek.push(Array.from({ length: 7 }, () => ({ label: 0, value: 0, videoIDs: [] })));
      datesForWeeks.push({ label: weekLabel, value: datesForWeeks.length });
    }

    const count = item.map[word] || 0;
    if (count > 0) {
      byHour[trackedHours.get(dateStr)!][hour].value  += count;
      byHour[trackedHours.get(dateStr)!][hour].videoIDs.push(item.videoID);
      byWeek[trackedWeeks.get(weekLabel)!][dow].value += count;
      byWeek[trackedWeeks.get(weekLabel)!][dow].videoIDs.push(item.videoID);
      const key = `${d.getMonth() + 1}-${d.getDate()}`;
      const re = rangeMap.get(key);
      if (re) { re.value += count; re.videoIDs.push(item.videoID); }
    }
  }

  const sortedDatesHours = [...datesForHours]
    .sort((a, b) => new Date(a.label).getTime() - new Date(b.label).getTime())
    .map((item, i) => ({ ...item, value: i }));
  const sortedByHour = sortedDatesHours.map(d => byHour[trackedHours.get(d.label)!]);

  const sortedDatesWeeks = [...datesForWeeks]
    .sort((a, b) => new Date(a.label.split(' - ')[0]).getTime() - new Date(b.label.split(' - ')[0]).getTime())
    .map((item, i) => ({ ...item, value: i }));
  const sortedByWeek = sortedDatesWeeks.map(d => byWeek[trackedWeeks.get(d.label)!]);

  const byRange = Array.from(rangeMap.values()).sort((a, b) => {
    const [mA, dA] = (a.label as string).split('-').map(Number);
    const [mB, dB] = (b.label as string).split('-').map(Number);
    return new Date(2000, mA - 1, dA).getTime() - new Date(2000, mB - 1, dB).getTime();
  });

  return { datesForHours: sortedDatesHours, byHour: sortedByHour, datesForWeeks: sortedDatesWeeks, byWeek: sortedByWeek, byRange };
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function LineGraphPage() {
  const { setId } = useParams<{ setId: string }>();
  const navigate = useNavigate();
  const { fetchFrequencyData, selectedWord, setSelectedWord } = useAnalysisStore();
  const { videoSets, fetchSets } = useVideoSetStore();

  const [freqMaps, setFreqMaps]   = useState<FreqMap[]>([]);
  const [wordList, setWordList]   = useState<{ text: string }[]>([]);
  const [loading, setLoading]     = useState(true);

  const [period, setPeriod]       = useState<Period>('range');
  const [dateIdx, setDateIdx]     = useState(0);

  // Multi-word comparison (main word is selectedWord, up to 2 extras)
  const [compWords, setCompWords] = useState<WordLine[]>([]);
  const [showWordModal, setShowWordModal] = useState(false);
  const [tempPicked, setTempPicked] = useState<Set<string>>(new Set());

  const videoSet = videoSets.find(s => s._id === setId);
  const setName  = videoSet?.name ?? '';

  useEffect(() => { fetchSets(); }, []);

  useEffect(() => {
    if (!setId) return;
    setLoading(true);
    fetchFrequencyData(setId, 1).then(result => {
      setFreqMaps(result.freqMaps || []);
      const list = (result.wordList || []).map((w: any) => ({ text: w.text }));
      setWordList(list);
      if (!selectedWord && list.length > 0) setSelectedWord(list[0].text);
    }).finally(() => setLoading(false));
  }, [setId]);

  // Compute line data for every tracked word
  const allLines: WordLine[] = useMemo(() => [
    { word: selectedWord, color: MAIN_COLOR },
    ...compWords,
  ], [selectedWord, compWords]);

  const lineDataByWord = useMemo(() => {
    const out: Record<string, ReturnType<typeof computeLineData>> = {};
    for (const { word } of allLines) {
      if (word) out[word] = computeLineData(freqMaps, word);
    }
    return out;
  }, [freqMaps, allLines]);

  // Period-specific date options (for dropdown + navigation)
  const firstWord = allLines[0]?.word;
  const dateOptions = useMemo(() => {
    if (!firstWord || !lineDataByWord[firstWord]) return [];
    if (period === 'daily')  return lineDataByWord[firstWord].datesForHours;
    if (period === 'weekly') return lineDataByWord[firstWord].datesForWeeks;
    return [];
  }, [period, firstWord, lineDataByWord]);

  // Clamp dateIdx when period or options change
  useEffect(() => { setDateIdx(0); }, [period, selectedWord]);

  // Build merged chart data
  const chartData = useMemo(() => {
    if (!firstWord || !lineDataByWord[firstWord]) return [];

    let points: { xLabel: string }[] = [];

    if (period === 'daily') {
      points = HOUR_LABELS.map(h => ({ xLabel: h }));
      for (const { word } of allLines) {
        const rows = lineDataByWord[word]?.byHour[dateIdx] || [];
        rows.forEach((pt, i) => {
          (points[i] as any)[word] = pt.value;
        });
      }
    } else if (period === 'weekly') {
      points = DAY_LABELS.map(d => ({ xLabel: d }));
      for (const { word } of allLines) {
        const rows = lineDataByWord[word]?.byWeek[dateIdx] || [];
        rows.forEach((pt, i) => {
          (points[i] as any)[word] = pt.value;
        });
      }
    } else {
      // range: use first word's byRange for x labels, all words contribute values
      const base = lineDataByWord[firstWord]?.byRange || [];
      points = base.map(pt => ({ xLabel: pt.label as string }));
      for (const { word } of allLines) {
        const rows = lineDataByWord[word]?.byRange || [];
        rows.forEach((pt, i) => {
          if (points[i]) (points[i] as any)[word] = pt.value;
        });
      }
    }

    return points;
  }, [period, dateIdx, allLines, lineDataByWord, firstWord]);

  // Word comparison modal
  const availableForComparison = useMemo(() =>
    wordList
      .map(w => w.text)
      .filter(t => t !== selectedWord && !compWords.some(c => c.word === t))
      .sort(),
  [wordList, selectedWord, compWords]);

  const openWordModal = () => {
    setTempPicked(new Set(compWords.map(c => c.word)));
    setShowWordModal(true);
  };

  const applyWordModal = () => {
    const picked = Array.from(tempPicked) as string[];
    setCompWords(picked.map((word, i) => ({
      word,
      color: COMPARISON_COLORS[i % COMPARISON_COLORS.length],
    })));
    setShowWordModal(false);
  };

  const toggleTemp = (word: string) => {
    setTempPicked(prev => {
      const next = new Set(prev);
      next.has(word) ? next.delete(word) : next.add(word);
      return next;
    });
  };

  const periodLabel = period === 'daily' ? 'Hour' : period === 'weekly' ? 'Weekday' : 'Video Dates';

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-mhmr-olive px-4 py-3 flex items-center gap-3 shadow-sm shrink-0">
        <button onClick={() => navigate('/analysis')} className="text-white/80 hover:text-white" aria-label="Back to Data Analysis">
          <ArrowLeft size={22} aria-hidden="true" />
        </button>
        <h1 className="text-white font-bold flex-1 truncate">
          Trends Over Time{setName ? ` — ${setName}` : ''}
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="flex justify-center py-12"><Loader message="Loading trend data..." /></div>
        ) : (
          <>
            {/* ── Word selector + comparison chips ── */}
            <div className="card space-y-3">
              <div>
                <label htmlFor="word-select" className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
                  Select word to track
                </label>
                <select
                  id="word-select"
                  value={selectedWord}
                  onChange={e => { setSelectedWord(e.target.value); setCompWords([]); }}
                  className="form-input"
                >
                  {wordList.map(w => (
                    <option key={w.text} value={w.text}>{w.text}</option>
                  ))}
                </select>
              </div>

              {/* Word chips */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Main word chip */}
                <span className="flex items-center gap-1.5 bg-gray-100 rounded-full px-3 py-1.5 text-xs font-semibold text-gray-700">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: MAIN_COLOR }} aria-hidden="true" />
                  {selectedWord}
                  <span className="text-gray-400 font-normal">(main)</span>
                </span>

                {/* Comparison chips */}
                {compWords.map(cw => (
                  <span key={cw.word} className="flex items-center gap-1.5 bg-gray-100 rounded-full px-3 py-1.5 text-xs font-semibold text-gray-700">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cw.color }} aria-hidden="true" />
                    {cw.word}
                    <button
                      onClick={() => setCompWords(compWords.filter(c => c.word !== cw.word))}
                      className="ml-0.5 w-4 h-4 rounded-full bg-red-400 text-white flex items-center justify-center hover:bg-red-500"
                      aria-label={`Remove ${cw.word}`}
                    >
                      <X size={10} aria-hidden="true" />
                    </button>
                  </span>
                ))}

                {/* Add word button (max 3 words total) */}
                {allLines.length < 3 && (
                  <button
                    onClick={openWordModal}
                    className="flex items-center gap-1 bg-mhmr-olive text-white text-xs font-semibold px-3 py-1.5 rounded-full hover:bg-mhmr-olive-dark transition-colors"
                  >
                    <Plus size={12} aria-hidden="true" /> Add Word
                  </button>
                )}
              </div>
            </div>

            {/* ── Chart card ── */}
            <div className="card">
              {/* Period tabs */}
              <div className="flex gap-1 mb-4 bg-gray-100 rounded-xl p-1">
                {(['daily', 'weekly', 'range'] as Period[]).map(p => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      period === p ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {p === 'daily' ? 'Daily' : p === 'weekly' ? 'Weekly' : 'Video Set Dates'}
                  </button>
                ))}
              </div>

              {/* Date navigation (Daily + Weekly only) */}
              {period !== 'range' && dateOptions.length > 0 && (
                <div className="flex items-center gap-2 mb-4">
                  <button
                    onClick={() => setDateIdx(i => Math.max(0, i - 1))}
                    disabled={dateIdx === 0}
                    className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    aria-label="Previous period"
                  >
                    <ChevronLeft size={16} aria-hidden="true" />
                  </button>
                  <select
                    value={dateIdx}
                    onChange={e => setDateIdx(Number(e.target.value))}
                    className="form-input flex-1 text-sm"
                    aria-label="Select date"
                  >
                    {dateOptions.map((opt, i) => (
                      <option key={i} value={i}>{opt.label}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => setDateIdx(i => Math.min(dateOptions.length - 1, i + 1))}
                    disabled={dateIdx >= dateOptions.length - 1}
                    className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    aria-label="Next period"
                  >
                    <ChevronRight size={16} aria-hidden="true" />
                  </button>
                </div>
              )}

              {/* Chart title */}
              <p className="text-sm font-semibold text-gray-700 mb-3">
                Word count of{' '}
                <span className="text-mhmr-olive">"{selectedWord}"</span>
                {compWords.length > 0 && (
                  <> vs{' '}
                    {compWords.map((c, i) => (
                      <span key={c.word}>
                        <span style={{ color: c.color }}>"{c.word}"</span>
                        {i < compWords.length - 1 ? ' & ' : ''}
                      </span>
                    ))}
                  </>
                )}
                {' '}over{' '}
                {period === 'daily' && dateOptions[dateIdx] ? dateOptions[dateIdx].label : ''}
                {period === 'weekly' && dateOptions[dateIdx] ? `week of ${dateOptions[dateIdx].label}` : ''}
                {period === 'range' ? 'video set dates' : ''}
              </p>

              {chartData.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8 italic">No data for this period.</p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                      dataKey="xLabel"
                      tick={{ fontSize: 10 }}
                      interval={period === 'range' ? 'preserveStartEnd' : 0}
                      angle={period === 'range' ? -45 : 0}
                      textAnchor={period === 'range' ? 'end' : 'middle'}
                      height={period === 'range' ? 50 : 30}
                    />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ fontSize: 12, borderRadius: 8 }}
                      formatter={(v: any, name: any) => [v, name]}
                      labelFormatter={label => `${periodLabel}: ${label}`}
                    />
                    {allLines.length > 1 && (
                      <Legend
                        wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                        formatter={(value) => value}
                      />
                    )}
                    {allLines.map(({ word, color }) => (
                      <Line
                        key={word}
                        type="monotone"
                        dataKey={word}
                        name={word}
                        stroke={color}
                        strokeWidth={2.5}
                        dot={{ r: 4, fill: color, strokeWidth: 2, stroke: 'white' }}
                        activeDot={{ r: 6 }}
                        connectNulls
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              )}

              <p className="text-xs text-gray-400 text-center mt-2">
                {period === 'daily' ? '' : period === 'weekly' ? '' : ''}
              </p>
            </div>
          </>
        )}
      </div>

      {/* ── Compare Words Modal ── */}
      {showWordModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowWordModal(false)}
          onKeyDown={e => e.key === 'Escape' && setShowWordModal(false)}
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="compare-words-title"
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[75vh] flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-gray-100 shrink-0">
              <h2 id="compare-words-title" className="font-bold text-gray-800 text-lg">Compare Words</h2>
              <p className={`text-sm mt-0.5 ${tempPicked.size >= 2 ? 'text-mhmr-olive font-medium' : 'text-gray-500'}`}>
                Select up to 2 words to compare
              </p>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {availableForComparison.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6 italic">No other words available.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {availableForComparison.map(word => {
                    const selected = tempPicked.has(word);
                    const disabled = tempPicked.size >= 2 && !selected;
                    return (
                      <button
                        key={word}
                        onClick={() => !disabled && toggleTemp(word)}
                        disabled={disabled}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium border transition-all ${
                          selected
                            ? 'bg-mhmr-olive text-white border-mhmr-olive'
                            : disabled
                            ? 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed'
                            : 'bg-white text-gray-700 border-gray-200 hover:border-mhmr-olive hover:bg-mhmr-olive/5'
                        }`}
                      >
                        {selected && <span className="w-1.5 h-1.5 rounded-full bg-white" aria-hidden="true" />}
                        {word}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="px-5 py-4 border-t border-gray-100 flex gap-3 shrink-0">
              <button
                onClick={() => setShowWordModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-600 font-semibold text-sm hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={applyWordModal}
                disabled={tempPicked.size === 0}
                className="flex-1 py-2.5 rounded-xl bg-mhmr-olive text-white font-semibold text-sm hover:bg-mhmr-olive-dark disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
