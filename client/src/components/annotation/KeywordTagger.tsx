import { useState, useEffect } from 'react';
import { keywordRef } from '../../constants/referenceData';
import { ReferenceItem } from '../../types';

interface Props {
  value: string[];  // JSON-encoded ReferenceItem[]
  onChange: (value: string[]) => void;
}

export default function KeywordTagger({ value, onChange }: Props) {
  const [items, setItems] = useState<ReferenceItem[]>(() => {
    const parsed = value.map(v => { try { return JSON.parse(v); } catch { return null; } }).filter(Boolean);
    return keywordRef.map(ref => ({
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
      <p className="text-xs text-gray-500 mb-2">Select all that apply:</p>
      <div className="flex flex-wrap gap-2">
        {items.map(item => (
          <button
            key={item.id}
            onClick={() => toggle(item.id)}
            className={item.checked ? 'tag-pill' : 'tag-pill-inactive'}
          >
            {item.title}
          </button>
        ))}
      </div>
    </div>
  );
}
