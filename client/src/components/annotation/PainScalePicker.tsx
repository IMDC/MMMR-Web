import { useState } from 'react';

interface Props {
  value: string[];
  numericPainScale: number;
  onChange: (value: string[], numericPainScale: number) => void;
}

// Numerical Rating Scale (NRS): 0=none, 1-3=mild, 4-6=moderate, 7-10=severe
function getCategory(scale: number) {
  if (scale === 0) return null;
  if (scale <= 3) return { label: 'Mild',     color: 'text-blue-600',   bg: 'bg-blue-50'   };
  if (scale <= 6) return { label: 'Moderate', color: 'text-orange-600', bg: 'bg-orange-50' };
  return              { label: 'Severe',   color: 'text-red-600',    bg: 'bg-red-50'    };
}

export default function PainScalePicker({ numericPainScale, onChange }: Props) {
  const [scale, setScale] = useState(numericPainScale);

  const handleScale = (v: number) => {
    setScale(v);
    onChange([], v);
  };

  const category = getCategory(scale);

  return (
    <div className="space-y-3">
      <div>
        <div className="flex justify-between items-center mb-2">
          <label htmlFor="pain-numeric-scale" className="text-xs text-gray-500">
            Numerical Rating Scale (NRS) — 0 to 10
          </label>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-gray-800" aria-live="polite">{scale}</span>
            {category ? (
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${category.bg} ${category.color}`}>
                {category.label}
              </span>
            ) : (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-400">No pain</span>
            )}
          </div>
        </div>
        <input
          id="pain-numeric-scale"
          type="range" min={0} max={10} step={1}
          value={scale}
          onChange={e => handleScale(parseInt(e.target.value))}
          className="w-full accent-mhmr-olive"
          aria-valuemin={0} aria-valuemax={10} aria-valuenow={scale}
          aria-label="Pain level 0 to 10"
        />
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>0 · None</span>
          <span>1–3 · Mild</span>
          <span>4–6 · Moderate</span>
          <span>7–10 · Severe</span>
        </div>
      </div>
    </div>
  );
}
