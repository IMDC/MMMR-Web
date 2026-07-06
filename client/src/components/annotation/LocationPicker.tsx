import { useState } from 'react';
import { locationRef } from '../../constants/referenceData';
import { ReferenceItem } from '../../types';

interface Props {
  value: string[];
  onChange: (value: string[]) => void;
}

export default function LocationPicker({ value, onChange }: Props) {
  const [items, setItems] = useState<ReferenceItem[]>(() => {
    const parsed = value.map(v => { try { return JSON.parse(v); } catch { return null; } }).filter(Boolean);
    return locationRef.map(ref => ({
      ...ref,
      checked: parsed.some((p: any) => p?.title === ref.title && p?.checked),
    }));
  });

  const toggle = (id: string) => {
    const updated = items.map(item =>
      item.id === id ? { ...item, checked: !item.checked } : item,
    );
    setItems(updated);
    onChange(updated.filter(i => i.checked).map(i => JSON.stringify(i)));
  };

  return (
    <div>
      <p className="text-xs text-gray-500 mb-2">Where was this recorded?</p>
      <div className="grid grid-cols-2 gap-2">
        {items.map(item => (
          <button
            key={item.id}
            onClick={() => toggle(item.id)}
            className={`text-sm py-2 px-3 rounded-lg border text-left font-medium transition-colors
              ${item.checked
                ? 'bg-mhmr-olive text-white border-mhmr-olive'
                : 'bg-white text-gray-600 border-gray-200 hover:border-mhmr-olive hover:text-mhmr-olive'
              }`}
          >
            {item.title}
          </button>
        ))}
      </div>
    </div>
  );
}
