import { useState } from 'react';
import { emotionOptions } from '../../constants/referenceData';
import { EmotionSticker } from '../../types';

interface Props {
  value: string[];  // JSON-encoded EmotionSticker[]
  onChange: (value: string[]) => void;
}

export default function EmotionPicker({ value, onChange }: Props) {
  const [selected, setSelected] = useState<string[]>(() => {
    return value.map(v => {
      try { return JSON.parse(v).sentiment || ''; }
      catch { return ''; }
    }).filter(Boolean);
  });

  const toggle = (sentiment: string) => {
    const updated = selected.includes(sentiment)
      ? selected.filter(s => s !== sentiment)
      : [...selected, sentiment];
    setSelected(updated);
    onChange(updated.map(s => JSON.stringify({ sentiment: s, timestamp: new Date().toISOString() })));
  };

  return (
    <div>
      <p className="text-xs text-gray-500 mb-3">How are you feeling? (Select all that apply)</p>
      <div className="grid grid-cols-5 gap-2">
        {emotionOptions.map(({ sentiment, emoji, label }) => (
          <button
            key={sentiment}
            onClick={() => toggle(sentiment)}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all
              ${selected.includes(sentiment)
                ? 'border-mhmr-olive bg-mhmr-olive/10 scale-105'
                : 'border-gray-200 hover:border-mhmr-olive/50'
              }`}
          >
            <span className="text-2xl">{emoji}</span>
            <span className={`text-xs font-medium ${selected.includes(sentiment) ? 'text-mhmr-olive' : 'text-gray-600'}`}>
              {label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
