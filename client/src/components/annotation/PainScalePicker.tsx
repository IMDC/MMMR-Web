import { useState } from 'react';
import { Plus } from 'lucide-react';
import { painscaleRef } from '../../constants/referenceData';
import { PainScaleItem } from '../../types';

const severityColors: Record<string, string> = {
  none: 'border-gray-200 text-gray-600 hover:border-orange-300',
  mild: 'border-orange-300 bg-orange-50 text-orange-700',
  moderate: 'border-orange-400 bg-orange-100 text-orange-800',
  severe: 'border-red-400 bg-red-100 text-red-700',
};

interface Props {
  value: string[];     // JSON-encoded PainScaleItem[]
  numericPainScale: number;
  onChange: (value: string[], numericPainScale: number) => void;
}

export default function PainScalePicker({ value, numericPainScale, onChange }: Props) {
  const [items, setItems] = useState<PainScaleItem[]>(() => {
    const parsedAll: PainScaleItem[] = value.map(v => { try { return JSON.parse(v); } catch { return null; } }).filter(Boolean);
    const parsedMap: Record<string, string> = {};
    parsedAll.forEach(p => { if (p?.name) parsedMap[p.name] = p.severity_level || 'none'; });
    const predefinedIds = new Set(painscaleRef.map(r => r.id));
    const predefined = painscaleRef.map(ref => ({ ...ref, severity_level: parsedMap[ref.name] || 'none' }));
    const custom = parsedAll.filter(p => p?.id && !predefinedIds.has(p.id));
    return [...predefined, ...custom];
  });

  const [scale, setScale] = useState(numericPainScale);
  const [customInput, setCustomInput] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const setSeverity = (id: string, severity: string) => {
    const updated = items.map(item => item.id === id ? { ...item, severity_level: severity } : item);
    setItems(updated);
    setExpandedId(null);
    onChange(updated.map(i => JSON.stringify(i)), scale);
  };

  const handleScale = (v: number) => {
    setScale(v);
    onChange(items.map(i => JSON.stringify(i)), v);
  };

  const addCustom = () => {
    const trimmed = customInput.trim();
    if (!trimmed) return;
    const newItem: PainScaleItem = { id: `custom_ps_${Date.now()}`, name: trimmed, severity_level: 'mild' };
    const updated = [...items, newItem];
    setItems(updated);
    onChange(updated.map(i => JSON.stringify(i)), scale);
    setCustomInput('');
  };

  const category = scale <= 0
    ? null
    : scale <= 1.5
    ? { label: 'Mild', color: 'text-amber-600', bg: 'bg-amber-50' }
    : scale <= 2.5
    ? { label: 'Moderate', color: 'text-orange-600', bg: 'bg-orange-50' }
    : { label: 'Severe', color: 'text-red-600', bg: 'bg-red-50' };

  return (
    <div className="space-y-4">
      {/* Numeric scale */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <div>
            <label htmlFor="pain-numeric-scale" className="text-xs text-gray-500">Overall Pain Level — McGill Pain Scale</label>
            <a
              href="https://www.mcgill.ca/painresearch/research/mcgill-pain-questionnaire"
              target="_blank"
              rel="noopener noreferrer"
              className="block text-xs text-mhmr-olive underline hover:opacity-80 transition-opacity"
            >
              Learn more
            </a>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-gray-800" aria-live="polite">{scale.toFixed(1)}</span>
            {category && (
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${category.bg} ${category.color}`}>
                {category.label}
              </span>
            )}
            {!category && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-400">No pain</span>
            )}
          </div>
        </div>
        <input
          id="pain-numeric-scale"
          type="range" min={0} max={3} step={0.1}
          value={scale}
          onChange={e => handleScale(parseFloat(e.target.value))}
          className="w-full accent-mhmr-olive"
          aria-valuemin={0} aria-valuemax={3} aria-valuenow={scale}
          aria-label="Pain level"
        />
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>0 · No pain</span>
          <span>1.5 · Mild</span>
          <span>2.5 · Moderate</span>
          <span>3 · Severe</span>
        </div>
      </div>

      {/* McGill descriptors */}
      <div>
        <p className="text-xs text-gray-500 mb-2">McGill pain descriptors — tap a descriptor to set its severity</p>
        <div className="grid grid-cols-2 gap-2 mb-3">
          {items.map(item => (
            <div key={item.id} className={expandedId === item.id ? 'col-span-2' : ''}>
              {/* Descriptor button */}
              <button
                onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                className={`w-full text-xs py-1.5 px-3 rounded-lg border-2 font-medium text-left transition-all
                  ${severityColors[item.severity_level] || severityColors.none}`}
              >
                <span>{item.name}</span>
                {item.severity_level !== 'none' && (
                  <span className="ml-1 text-[10px] opacity-70 capitalize">({item.severity_level})</span>
                )}
              </button>

              {/* Severity options — shown when expanded */}
              {expandedId === item.id && (
                <div className="mt-2 rounded-xl p-2.5" style={{ background: '#f3f4f6', border: '1px solid #e5e7eb' }}>
                  <p className="text-[10px] font-semibold uppercase tracking-wide mb-2" style={{ color: '#9ca3af' }}>Set severity</p>
                  <div className="flex gap-1.5">
                    {([
                      { level: 'none',     label: 'None',     bg: '#6b7280', color: '#ffffff' },
                      { level: 'mild',     label: 'Mild',     bg: '#3b82f6', color: '#ffffff' },
                      { level: 'moderate', label: 'Moderate', bg: '#f97316', color: '#ffffff' },
                      { level: 'severe',   label: 'Severe',   bg: '#7c3aed', color: '#ffffff' },
                    ] as const).map(({ level, label, bg, color }) => (
                      <button
                        key={level}
                        onClick={() => setSeverity(item.id, level)}
                        style={{
                          backgroundColor: bg,
                          color,
                          outline: item.severity_level === level ? `3px solid ${bg}` : 'none',
                          outlineOffset: '2px',
                          transform: item.severity_level === level ? 'scale(1.05)' : 'scale(1)',
                          opacity: item.severity_level === level ? 1 : 0.6,
                        }}
                        className="flex-1 text-[11px] font-bold py-1.5 rounded-lg transition-all hover:opacity-100"
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={customInput}
            onChange={e => setCustomInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addCustom()}
            placeholder="Add custom descriptor..."
            className="flex-1 text-xs border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-mhmr-olive"
          />
          <button
            onClick={addCustom}
            className="flex items-center gap-1 text-xs bg-mhmr-olive text-white px-3 py-1.5 rounded-lg hover:bg-mhmr-olive-dark transition-colors"
          >
            <Plus size={13} />
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
