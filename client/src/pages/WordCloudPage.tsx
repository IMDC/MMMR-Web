import { useEffect, useState, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Settings, X, ChevronDown } from 'lucide-react';
import cloud from 'd3-cloud';
import { useAnalysisStore } from '../store/analysisStore';
import { useVideoSetStore } from '../store/videoSetStore';
import Loader from '../components/common/Loader';

const CLOUD_HEIGHT = 500;

const PALETTES = [
  {
    label: 'Palette 1',
    value: 'IBM',
    colors: ['#648FFF', '#785EF0', '#DC267F', '#FE6100', '#FFB000'],
  },
  {
    label: 'Palette 2',
    value: 'Wong',
    colors: ['#000000', '#E69F00', '#56B4E9', '#009E73', '#F0E442', '#0072B2', '#D55E00', '#CC79A7'],
  },
  {
    label: 'Palette 3',
    value: 'Tol',
    colors: ['#332288', '#117733', '#44AA99', '#88CCEE', '#DDCC77', '#CC6677', '#AA4499', '#882255'],
  },
];

interface BaseWord {
  text: string;
  value: number;
  x: number;
  y: number;
  size: number;
}

interface LayoutWord extends BaseWord {
  color: string;
}

export default function WordCloudPage() {
  const { setId } = useParams<{ setId: string }>();
  const navigate = useNavigate();
  const { fetchFrequencyData, setSelectedWord } = useAnalysisStore();
  const { videoSets, fetchSets } = useVideoSetStore();

  const [allWords, setAllWords] = useState<{ text: string; value: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [baseLayout, setBaseLayout] = useState<BaseWord[]>([]);
  const [layoutWords, setLayoutWords] = useState<LayoutWord[]>([]);
  const [laying, setLaying] = useState(false);

  const [hiddenWords, setHiddenWords] = useState<Set<string>>(new Set());
  const [showSettings, setShowSettings] = useState(false);
  const [wordSearch, setWordSearch] = useState('');

  const [selectedPalette, setSelectedPalette] = useState(PALETTES[0]);
  const [showPaletteDropdown, setShowPaletteDropdown] = useState(false);

  const svgWrapperRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const el = svgWrapperRef.current;
    if (!el) return;
    const update = () => {
      const w = el.getBoundingClientRect().width;
      if (w > 0) setContainerWidth(w);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const videoSet = videoSets.find(s => s._id === setId);
  const setName = videoSet?.name ?? '';

  useEffect(() => { fetchSets(); }, []);

  // Always fetch with minCount=1 — all words available, user filters via hidden set
  useEffect(() => {
    if (!setId) return;
    setLoading(true);
    fetchFrequencyData(setId, 1)
      .then(result => setAllWords(result.wordCloudData?.slice(0, 150) || []))
      .finally(() => setLoading(false));
  }, [setId]);

  const displayWords = useMemo(
    () => allWords.filter(w => !hiddenWords.has(w.text)),
    [allWords, hiddenWords],
  );

  const modalWords = useMemo(() => {
    const q = wordSearch.toLowerCase().trim();
    return q ? allWords.filter(w => w.text.toLowerCase().includes(q)) : allWords;
  }, [allWords, wordSearch]);

  // Dynamic threshold based on word count (same as Android)
  const thresholdedWords = useMemo(() => {
    const sorted = [...displayWords].sort((a, b) => b.value - a.value);
    const count = sorted.length;
    let maxWords = 100;
    let minFrequency = 1;
    if (count > 200)      { maxWords = 80;  minFrequency = Math.max(2, Math.floor(sorted[50]?.value || 2)); }
    else if (count > 150) { maxWords = 100; minFrequency = Math.max(1, Math.floor(sorted[75]?.value || 1)); }
    else if (count > 100) { maxWords = 120; }
    else if (count > 50)  { maxWords = 80; }
    else                  { maxWords = 50; }
    return sorted.filter(w => w.value >= minFrequency).slice(0, maxWords);
  }, [displayWords]);

  // Effect 1: compute positions only — palette intentionally excluded
  // so switching palette never re-layouts and never causes overlap
  useEffect(() => {
    if (thresholdedWords.length === 0 || containerWidth === 0) return;

    const count = thresholdedWords.length;
    // Slightly conservative max font so d3-cloud can place all words without gaps
    const minFont = count > 80 ? 10 : count > 50 ? 12 : count > 30 ? 14 : 16;
    const maxFont = count > 80 ? 30 : count > 50 ? 44 : count > 30 ? 58 : 72;

    const maxVal = Math.max(...thresholdedWords.map(w => w.value));
    const minVal = Math.min(...thresholdedWords.map(w => w.value));
    const range = maxVal - minVal || 1;
    const fontSize = (v: number) =>
      Math.round(minFont + Math.sqrt((v - minVal) / range) * (maxFont - minFont));

    setLaying(true);

    cloud<{ text: string; value: number }>()
      .size([containerWidth, CLOUD_HEIGHT])
      .words(thresholdedWords.map(w => ({ ...w })))
      .padding(2)
      .rotate(0)
      .font('Arial')
      .fontWeight('bold')
      .fontSize(d => fontSize(d.value!))
      .spiral('archimedean')
      .on('end', (words: any[]) => {
        // Only keep words that d3-cloud successfully placed (x/y defined and non-zero origin)
        setBaseLayout(
          words
            .filter(w => w.x !== undefined && w.y !== undefined)
            .map(w => ({ text: w.text, value: w.value, x: w.x, y: w.y, size: w.size })),
        );
        setLaying(false);
      })
      .start();
  }, [thresholdedWords, containerWidth]); // palette NOT here

  // Effect 2: apply colors — never repositions, just recolors
  useEffect(() => {
    if (baseLayout.length === 0) return;
    const palette = selectedPalette.colors;
    setLayoutWords(
      baseLayout.map((w, i) => ({
        ...w,
        color: palette[i % palette.length],
      })),
    );
  }, [baseLayout, selectedPalette]);

  const toggleHidden = (word: string) => {
    setHiddenWords(prev => {
      const next = new Set(prev);
      next.has(word) ? next.delete(word) : next.add(word);
      return next;
    });
  };

  // viewBox maps d3-cloud's (0,0) center to middle of SVG — guaranteed correct centering
  const viewBox = containerWidth > 0
    ? `${-containerWidth / 2} ${-CLOUD_HEIGHT / 2} ${containerWidth} ${CLOUD_HEIGHT}`
    : undefined;

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
          Word Cloud{setName ? ` — ${setName}` : ''}
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="card">
          {/* Toolbar */}
          <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
            {/* Palette dropdown */}
            <div className="relative">
              <p className="text-xs text-gray-500 mb-1.5">Select Color Palette:</p>
              <button
                onClick={() => setShowPaletteDropdown(v => !v)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-full text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
                aria-label="Select color palette"
                aria-expanded={showPaletteDropdown}
              >
                <span className="flex gap-1">
                  {selectedPalette.colors.slice(0, 5).map((c, i) => (
                    <span key={i} className="w-4 h-4 rounded-sm" style={{ backgroundColor: c }} aria-hidden="true" />
                  ))}
                </span>
                <span>{selectedPalette.label}</span>
                <ChevronDown size={14} aria-hidden="true" />
              </button>

              {showPaletteDropdown && (
                <div className="absolute top-full mt-1 left-0 z-20 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden min-w-[210px]">
                  {PALETTES.map(p => (
                    <button
                      key={p.value}
                      onClick={() => { setSelectedPalette(p); setShowPaletteDropdown(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left ${selectedPalette.value === p.value ? 'bg-gray-50' : ''}`}
                    >
                      <span className="flex gap-1">
                        {p.colors.slice(0, 5).map((c, i) => (
                          <span key={i} className="w-4 h-4 rounded-sm shrink-0" style={{ backgroundColor: c }} aria-hidden="true" />
                        ))}
                      </span>
                      <span className="text-sm font-medium text-gray-700">{p.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => setShowSettings(true)}
              className="flex items-center gap-1.5 bg-mhmr-olive text-white text-xs font-semibold px-4 py-2 rounded-full hover:bg-mhmr-olive-dark transition-colors shrink-0 self-end"
              aria-label="Open word settings"
            >
              <Settings size={13} aria-hidden="true" />
              Word Settings
            </button>
          </div>

          {/* SVG wrapper — always in DOM so ResizeObserver fires on mount */}
          <div ref={svgWrapperRef} style={{ width: '100%' }}>
            {loading ? (
              <div className="flex justify-center py-16">
                <Loader message="Building word cloud..." />
              </div>
            ) : allWords.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <p>No word data available.</p>
                <p className="text-sm mt-1">Transcribe some videos first.</p>
              </div>
            ) : displayWords.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-16 italic">
                All words are hidden. Open Word Settings to restore them.
              </p>
            ) : (
              <div style={{ height: `${CLOUD_HEIGHT}px`, position: 'relative' }}>
                {laying && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/60 z-10">
                    <Loader message="Rendering..." />
                  </div>
                )}
                {viewBox && layoutWords.length > 0 && (
                  <svg
                    width="100%"
                    height={CLOUD_HEIGHT}
                    viewBox={viewBox}
                    aria-label="Word cloud visualization"
                  >
                    {layoutWords.map(word => (
                      <text
                        key={word.text}
                        textAnchor="middle"
                        transform={`translate(${word.x},${word.y})`}
                        style={{
                          fontSize: `${word.size}px`,
                          fontFamily: 'Arial, sans-serif',
                          fontWeight: 'bold',
                          fill: word.color,
                          cursor: 'pointer',
                          userSelect: 'none',
                        }}
                        onClick={() => {
                          setSelectedWord(word.text);
                          navigate(`/analysis/${setId}/line`);
                        }}
                        role="button"
                        aria-label={`View trend for ${word.text}`}
                      >
                        {word.text}
                      </text>
                    ))}
                  </svg>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Word Settings Modal ── */}
      {showSettings && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowSettings(false)}
          onKeyDown={e => e.key === 'Escape' && setShowSettings(false)}
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="cloud-settings-title"
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
              <h2 id="cloud-settings-title" className="font-bold text-gray-800">Word Settings</h2>
              <button
                onClick={() => setShowSettings(false)}
                className="text-gray-400 hover:text-gray-600"
                aria-label="Close word settings"
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>

            {/* Word list + search — no frequency filter */}
            <div className="px-5 pt-4 pb-3 border-b border-gray-100 shrink-0 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Words in cloud</p>
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
              <p className="text-xs text-gray-400">Tap a word to remove it from the cloud.</p>
            </div>

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

            <div className="px-5 py-4 border-t border-gray-100 shrink-0">
              <button onClick={() => setShowSettings(false)} className="btn-primary w-full">
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
