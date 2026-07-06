import { useState } from 'react';
import { Plus, X } from 'lucide-react';

interface Props {
  value: string[];
  onChange: (value: string[]) => void;
}

export default function TextCommentsBox({ value, onChange }: Props) {
  const [draft, setDraft] = useState('');

  const add = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    onChange([...value, trimmed]);
    setDraft('');
  };

  const remove = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      {/* Existing comments */}
      {value.length > 0 && (
        <div className="space-y-2">
          {value.map((comment, i) => (
            <div key={i} className="flex items-start gap-2 bg-gray-50 rounded-lg p-2">
              <p className="flex-1 text-sm text-gray-700">{comment}</p>
              <button onClick={() => remove(i)} className="text-gray-300 hover:text-red-400 shrink-0">
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add new comment */}
      <div className="flex gap-2">
        <textarea
          value={draft}
          onChange={e => setDraft(e.target.value)}
          placeholder="Add a comment..."
          className="form-input resize-none"
          rows={2}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              add();
            }
          }}
        />
        <button
          onClick={add}
          disabled={!draft.trim()}
          className="btn-primary self-end flex items-center gap-1 shrink-0 py-1.5 px-3 text-sm"
        >
          <Plus size={14} />
          Add
        </button>
      </div>
    </div>
  );
}
