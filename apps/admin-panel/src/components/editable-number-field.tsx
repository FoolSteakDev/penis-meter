import { useEffect, useRef, useState } from 'react';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface EditableNumberFieldProps {
  value: number;
  onSave: (value: number) => Promise<void>;
  step?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const SAVE_DELAY_MS = 600;
const SAVED_FLASH_MS = 1200;

const WIDTH_BY_SIZE: Record<NonNullable<EditableNumberFieldProps['size']>, string> = {
  sm: 'w-14',
  md: 'w-20',
  lg: 'w-28',
};

export function EditableNumberField({ value, onSave, step = '1', disabled, size = 'md' }: EditableNumberFieldProps) {
  const [text, setText] = useState(String(value));
  const [status, setStatus] = useState<SaveStatus>('idle');
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setText(String(value));
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
      const parsed = Number(nextText);
      if (nextText.trim() === '' || Number.isNaN(parsed)) {
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
        type="number"
        step={step}
        value={text}
        disabled={disabled}
        onChange={(e) => {
          setText(e.target.value);
          scheduleSave(e.target.value);
        }}
        className={`${WIDTH_BY_SIZE[size]} rounded-md border border-navy/20 bg-white px-2 py-1 text-sm text-navy transition-colors focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/40 disabled:cursor-not-allowed disabled:border-navy/10 disabled:bg-cream-dark disabled:text-navy/40`}
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
