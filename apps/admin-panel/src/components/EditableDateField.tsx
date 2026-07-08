import { useEffect, useState, type ChangeEvent } from 'react';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface EditableDateFieldProps {
  value: string | null;
  onSave: (value: string) => Promise<void>;
  disabled?: boolean;
}

const SAVED_FLASH_MS = 1200;

function toDateInputValue(value: string | null): string {
  return value ? value.slice(0, 10) : '';
}

export function EditableDateField({ value, onSave, disabled }: EditableDateFieldProps) {
  const [text, setText] = useState(toDateInputValue(value));
  const [status, setStatus] = useState<SaveStatus>('idle');

  useEffect(() => {
    setText(toDateInputValue(value));
  }, [value]);

  async function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const next = e.target.value;
    setText(next);
    if (!next) return;

    setStatus('saving');
    try {
      await onSave(next);
      setStatus('saved');
      setTimeout(() => setStatus('idle'), SAVED_FLASH_MS);
    } catch {
      setStatus('error');
    }
  }

  return (
    <div className="inline-flex items-center gap-1.5">
      <input
        type="date"
        value={text}
        disabled={disabled}
        onChange={handleChange}
        className="rounded-md border border-navy/20 bg-white px-2 py-1 text-sm text-navy transition-colors focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/40 disabled:cursor-not-allowed disabled:border-navy/10 disabled:bg-cream-dark disabled:text-navy/40"
      />
      {status === 'saving' && <span className="text-xs text-navy/40 animate-pulse">●</span>}
      {status === 'saved' && <span className="text-xs text-emerald-600">✓</span>}
      {status === 'error' && (
        <span className="text-xs text-ruby" title="Помилка збереження">
          !
        </span>
      )}
    </div>
  );
}
