import { useState } from 'react';
import { Plus } from 'lucide-react';
import { keywordRef } from '../../constants/referenceData';
import { ReferenceItem } from '../../types';

interface Props {
  value: string[];  // JSON-encoded ReferenceItem[]
  onChange: (value: string[]) => void;
}

export default function KeywordTagger({ value, onChange }: Props) {
  const [items, setItems] = useState<ReferenceItem[]>(() => {
    const parsed = value.map(v => { try { return JSON.parse(v); } catch { return null; } }).filter(Boolean);
    const predefinedIds = new Set(keywordRef.map(r => r.id));
    const predefined = keywordRef.map(ref => ({
      ...ref,
      checked: parsed.some((p: any) => p?.title === ref.title && p?.checked),
    }));
    const custom: ReferenceItem[] = parsed
      .filter((p: any) => p?.id && !predefinedIds.has(p.id))
      .map((p: any) => ({ ...p, checked: true }));
    return [...predefined, ...custom];
  });

  const [customInput, setCustomInput] = useState('');

  const toggle = (id: string) => {
    const updated = items.map(item =>
      item.id === id ? { ...item, checked: !item.checked } : item,
    );
    setItems(updated);
    onChange(updated.filter(i => i.checked).map(i => JSON.stringify(i)));
  };

  const addCustom = () => {
    const trimmed = customInput.trim();
    if (!trimmed) return;
    const newItem: ReferenceItem = { id: `custom_kw_${Date.now()}`, value: 0, title: trimmed, checked: true };
    const updated = [...items, newItem];
    setItems(updated);
    onChange(updated.filter(i => i.checked).map(i => JSON.stringify(i)));
    setCustomInput('');
  };

  return (
    <div>
      <p className="text-xs text-gray-500 mb-2">Select all that apply:</p>
      <div className="flex flex-wrap gap-2 mb-3">
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
      <div className="flex gap-2">
        <input
          type="text"
          value={customInput}
          onChange={e => setCustomInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addCustom()}
          placeholder="Add custom keyword..."
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
  );
}
