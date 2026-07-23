import { useEffect, useState } from 'react';

interface ToggleSwitchProps {
  checked: boolean;
  onSave: (checked: boolean) => Promise<void>;
  disabled?: boolean;
}

export function ToggleSwitch({ checked, onSave, disabled }: ToggleSwitchProps) {
  const [value, setValue] = useState(checked);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setValue(checked);
  }, [checked]);

  async function handleClick() {
    const next = !value;
    setValue(next);
    setSaving(true);
    try {
      await onSave(next);
    } catch {
      setValue(!next);
    } finally {
      setSaving(false);
    }
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      disabled={disabled || saving}
      onClick={handleClick}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-40 ${
        value ? 'bg-gold' : 'bg-navy/20'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
          value ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}
