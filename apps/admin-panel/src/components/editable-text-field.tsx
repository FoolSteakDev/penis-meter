import { useEffect, useRef, useState } from 'react';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface EditableTextFieldProps {
  value: string | null;
  onSave: (value: string) => Promise<void>;
  placeholder?: string;
  className?: string;
}

const SAVE_DELAY_MS = 600;
const SAVED_FLASH_MS = 1200;

export function EditableTextField({ value, onSave, placeholder, className }: EditableTextFieldProps) {
  const [text, setText] = useState(value ?? '');
  const [status, setStatus] = useState<SaveStatus>('idle');
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setText(value ?? '');
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
      setStatus('saving');
      try {
        await onSave(nextText);
        setStatus('saved');
        if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
        flashTimeoutRef.current = setTimeout(() => setStatus('idle'), SAVED_FLASH_MS);
      } catch {
        setStatus('error');
      }
    }, SAVE_DELAY_MS);
  }

  return (
    <div className="inline-flex w-full items-center gap-1.5">
      <input
        type="text"
        value={text}
        placeholder={placeholder}
        onChange={(e) => {
          setText(e.target.value);
          scheduleSave(e.target.value);
        }}
        className={
          className ??
          'w-full rounded-md border border-navy/20 bg-white px-2 py-1 text-sm text-navy transition-colors focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/40'
        }
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
