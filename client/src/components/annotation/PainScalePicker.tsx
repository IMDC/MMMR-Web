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
  numericScale: number;
  onChange: (value: string[], numericScale: number) => void;
}

export default function PainScalePicker({ value, numericScale, onChange }: Props) {
  const [items, setItems] = useState<PainScaleItem[]>(() => {
    const parsedAll: PainScaleItem[] = value.map(v => { try { return JSON.parse(v); } catch { return null; } }).filter(Boolean);
    const parsedMap: Record<string, string> = {};
    parsedAll.forEach(p => { if (p?.name) parsedMap[p.name] = p.severity_level || 'none'; });
    const predefinedIds = new Set(painscaleRef.map(r => r.id));
    const predefined = painscaleRef.map(ref => ({ ...ref, severity_level: parsedMap[ref.name] || 'none' }));
    const custom = parsedAll.filter(p => p?.id && !predefinedIds.has(p.id));
    return [...predefined, ...custom];
  });

  const [scale, setScale] = useState(numericScale);
  const [customInput, setCustomInput] = useState('');

  const cycleSeverity = (id: string) => {
    const cycle = ['none', 'mild', 'moderate', 'severe'];
    const updated = items.map(item => {
      if (item.id !== id) return item;
      const next = cycle[(cycle.indexOf(item.severity_level) + 1) % cycle.length];
      return { ...item, severity_level: next };
    });
    setItems(updated);
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

  return (
    <div className="space-y-4">
      {/* Numeric scale */}
      <div>
        <div className="flex justify-between items-center mb-1">
          <label htmlFor="pain-numeric-scale" className="text-xs text-gray-500">Overall Pain Level</label>
          <span className="text-sm font-bold text-mhmr-olive" aria-live="polite">{scale}/3</span>
        </div>
        <input
          id="pain-numeric-scale"
          type="range" min={0} max={3} step={0.5}
          value={scale}
          onChange={e => handleScale(parseFloat(e.target.value))}
          className="w-full accent-mhmr-olive"
          aria-valuemin={0} aria-valuemax={3} aria-valuenow={scale}
        />
        <div className="flex justify-between text-xs text-gray-400 mt-0.5">
          <span>No pain</span><span>Mild</span><span>Moderate</span><span>Severe</span>
        </div>
      </div>

      {/* McGill descriptors */}
      <div>
        <p className="text-xs text-gray-500 mb-2">Pain descriptors (tap to cycle: none → mild → moderate → severe)</p>
        <div className="grid grid-cols-2 gap-2 mb-3">
          {items.map(item => (
            <button
              key={item.id}
              onClick={() => cycleSeverity(item.id)}
              className={`text-xs py-1.5 px-3 rounded-lg border-2 font-medium text-left transition-all
                ${severityColors[item.severity_level] || severityColors.none}`}
            >
              <span>{item.name}</span>
              {item.severity_level !== 'none' && (
                <span className="ml-1 text-[10px] opacity-70 capitalize">({item.severity_level})</span>
              )}
            </button>
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
