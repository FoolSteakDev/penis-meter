import { useEffect, useRef, useState } from 'react';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface EditableFixedValuesFieldProps {
  value: number[];
  onSave: (value: number[]) => Promise<void>;
  disabled?: boolean;
}

const SAVE_DELAY_MS = 600;
const SAVED_FLASH_MS = 1200;

function toText(values: number[]): string {
  return values.join(', ');
}

function parseValues(text: string): number[] | null {
  const parts = text
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
  if (parts.length === 0) return null;
  const parsed = parts.map(Number);
  if (parsed.some((n) => Number.isNaN(n))) return null;
  return parsed;
}

export function EditableFixedValuesField({ value, onSave, disabled }: EditableFixedValuesFieldProps) {
  const [text, setText] = useState(toText(value));
  const [status, setStatus] = useState<SaveStatus>('idle');
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setText(toText(value));
  }, [value]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
    };
  }, []);

  function scheduleSave(nextText: string) {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      const parsed = parseValues(nextText);
      if (!parsed) {
        setStatus('error');
        return;
      }
      setStatus('saving');
      try {
        await onSave(parsed);
        setStatus('saved');
        if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
        flashTimeoutRef.current = setTimeout(() => setStatus('idle'), SAVED_FLASH_MS);
      } catch {
        setStatus('error');
      }
    }, SAVE_DELAY_MS);
  }

  return (
    <div className="inline-flex items-center gap-1.5">
      <input
        type="text"
        value={text}
        disabled={disabled}
        placeholder="напр. 1, 2, 3.5"
        onChange={(e) => {
          setText(e.target.value);
          scheduleSave(e.target.value);
        }}
        className="w-40 rounded-md border border-navy/20 bg-white px-2 py-1 text-sm text-navy transition-colors focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/40 disabled:cursor-not-allowed disabled:border-navy/10 disabled:bg-cream-dark disabled:text-navy/40"
      />
      {status === 'saving' && <span className="text-xs text-navy/40 animate-pulse">●</span>}
      {status === 'saved' && <span className="text-xs text-emerald-600">✓</span>}
      {status === 'error' && (
        <span className="text-xs text-ruby" title="Список чисел через кому, мінімум одне значення">
          !
        </span>
      )}
    </div>
  );
}
