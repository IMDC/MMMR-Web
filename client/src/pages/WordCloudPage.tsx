import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Settings, X, ChevronDown } from 'lucide-react';
import WordCloud from 'wordcloud';
import { useAnalysisStore } from '../store/analysisStore';
import { useVideoSetStore } from '../store/videoSetStore';
import Loader from '../components/common/Loader';

const PALETTES = [
  {
    label: 'Palette 1',
    value: 'IBM',
    colors: ['#648FFF', '#785EF0', '#DC267F', '#FE6100', '#FFB000'],
  },
  {
    label: 'Palette 2',
    value: 'Wong',
    colors: ['#E69F00', '#56B4E9', '#009E73', '#0072B2', '#D55E00', '#CC79A7', '#F0E442'],
  },
  {
    label: 'Palette 3',
    value: 'Tol',
    colors: ['#332288', '#117733', '#44AA99', '#88CCEE', '#DDCC77', '#CC6677', '#AA4499', '#882255'],
  },
];

export default function WordCloudPage() {
  const { setId } = useParams<{ setId: string }>();
  const navigate = useNavigate();
  const { fetchFrequencyData, setSelectedWord } = useAnalysisStore();
  const { videoSets, fetchSets } = useVideoSetStore();

  const [allWords, setAllWords] = useState<{ text: string; value: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [rendering, setRendering] = useState(false);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; word: string; count: number } | null>(null);

  const [hiddenWords, setHiddenWords] = useState<Set<string>>(new Set());
  const [showSettings, setShowSettings] = useState(false);
  const [wordSearch, setWordSearch] = useState('');

  const [selectedPalette, setSelectedPalette] = useState(PALETTES[0]);
  const [showPaletteDropdown, setShowPaletteDropdown] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ w: 0, h: 0 });

  const videoSet = videoSets.find(s => s._id === setId);
  const setName = videoSet?.name ?? '';

  // Track wrapper width → derive canvas dimensions
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const update = () => {
      const { width } = el.getBoundingClientRect();
      if (width > 0) {
        const w = Math.min(Math.floor(width), 900);
        setCanvasSize({ w, h: Math.floor(w * 0.6) });
      }
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => { fetchSets(); }, []);

  useEffect(() => {
    if (!setId) return;
    setLoading(true);
    fetchFrequencyData(setId, 1)
      .then(result => setAllWords(result.wordCloudData?.slice(0, 200) || []))
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

  // Sorted word list for wordcloud2: [[text, weight], ...]
  const wordList = useMemo((): [string, number][] =>
    [...displayWords]
      .sort((a, b) => b.value - a.value)
      .slice(0, 150)
      .map(w => [w.text, w.value]),
  [displayWords]);

  // Render onto canvas whenever words, palette, or size changes
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || canvasSize.w === 0 || wordList.length === 0) return;

    // Set physical canvas resolution
    canvas.width = canvasSize.w;
    canvas.height = canvasSize.h;

    const palette = selectedPalette.colors;
    // Assign colors in frequency order so most-frequent words get distinct colors
    const wordColorMap: Record<string, string> = {};
    wordList.forEach(([word], i) => {
      wordColorMap[word] = palette[i % palette.length];
    });

    const maxVal = wordList[0]?.[1] ?? 1;

    setRendering(true);

    WordCloud(canvas, {
      list: wordList,
      // gridSize controls placement resolution — smaller = tighter packing
      gridSize: Math.max(2, Math.round(canvasSize.w / 120)),
      weightFactor: (size: number) => {
        const ratio = size / maxVal;
        const maxPx = Math.min(canvasSize.h * 0.11, 72);
        const minPx = Math.max(13, canvasSize.h * 0.028);
        // Exponent < 1 compresses the size range so low-frequency words stay readable
        return minPx + Math.pow(ratio, 0.60) * (maxPx - minPx);
      },
      fontFamily: 'Arial, sans-serif',
      fontWeight: 'bold',
      color: (word: string) => wordColorMap[word] ?? palette[0],
      rotateRatio: 0,       // all words horizontal, like sample image
      rotationSteps: 1,
      backgroundColor: 'transparent',
      drawOutOfBound: false,
      shrinkToFit: true,    // auto-shrinks fonts until everything fits
      origin: [canvasSize.w / 2, canvasSize.h / 2], // largest word centered
      hover: (item: [string, number] | null, _dim: unknown, event: MouseEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        if (item) {
          const rect = canvas.getBoundingClientRect();
          // Scale mouse position from display coords to canvas logical coords
          const scaleX = canvas.width / rect.width;
          const scaleY = canvas.height / rect.height;
          setTooltip({
            x: (event.clientX - rect.left) / scaleX,
            y: (event.clientY - rect.top) / scaleY,
            word: item[0],
            count: item[1],
          });
          canvas.style.cursor = 'pointer';
        } else {
          setTooltip(null);
          canvas.style.cursor = 'default';
        }
      },
      click: (item: [string, number]) => {
        setSelectedWord(item[0]);
        navigate(`/analysis/${setId}/line`);
      },
    });

    setTimeout(() => setRendering(false), 150);
  }, [wordList, selectedPalette, canvasSize, setId, navigate, setSelectedWord]);

  useEffect(() => {
    if (!loading) render();
  }, [render, loading]);

  const toggleHidden = (word: string) => {
    setHiddenWords(prev => {
      const next = new Set(prev);
      next.has(word) ? next.delete(word) : next.add(word);
      return next;
    });
  };

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

          {/* Canvas wrapper */}
          <div ref={wrapperRef} className="w-full">
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
              <div
                className="relative mx-auto"
                style={{ width: canvasSize.w || '100%', height: canvasSize.h || 400 }}
                onMouseLeave={() => setTooltip(null)}
              >
                {rendering && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/60 z-10">
                    <Loader message="Rendering..." />
                  </div>
                )}
                <canvas
                  ref={canvasRef}
                  style={{ width: '100%', height: '100%' }}
                  aria-label="Word cloud visualization"
                />
                {tooltip && canvasSize.w > 0 && (
                  <div
                    className="absolute z-20 pointer-events-none"
                    style={{
                      left: `${(tooltip.x / canvasSize.w) * 100}%`,
                      top: `${(tooltip.y / canvasSize.h) * 100}%`,
                      transform: 'translate(-50%, calc(-100% - 10px))',
                    }}
                  >
                    <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg whitespace-nowrap">
                      <span className="font-bold">{tooltip.word}</span>
                      <span className="text-gray-300 ml-1.5">× {tooltip.count}</span>
                      <div className="text-gray-400 mt-0.5">Click to view trend</div>
                    </div>
                    {/* Arrow */}
                    <div className="w-2 h-2 bg-gray-900 rotate-45 mx-auto -mt-1" />
                  </div>
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
