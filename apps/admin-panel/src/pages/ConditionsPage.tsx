import { useEffect, useState } from 'react';
import { api, type ConditionDto } from '../api/client';
import { EditableNumberField } from '../components/EditableNumberField';
import { ToggleSwitch } from '../components/ToggleSwitch';

export default function ConditionsPage() {
  const [conditions, setConditions] = useState<ConditionDto[]>([]);
  const [availableCodes, setAvailableCodes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newChance, setNewChance] = useState('0.1');
  const [newMinDelta, setNewMinDelta] = useState('0');
  const [newMaxDelta, setNewMaxDelta] = useState('1');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [conditionsResponse, codesResponse] = await Promise.all([
        api.listConditions(),
        api.listAvailableCodes(),
      ]);
      setConditions(conditionsResponse);
      setAvailableCodes(codesResponse);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const usedCodes = new Set(conditions.map((c) => c.code));
  const creatableCodes = availableCodes.filter((code) => !usedCodes.has(code));

  function patchLocal(id: string, updated: ConditionDto) {
    setConditions((prev) => prev.map((c) => (c.id === id ? updated : c)));
  }

  async function handleDelete(condition: ConditionDto) {
    if (condition.isProtected) return;
    if (!confirm(`Видалити умову "${condition.name}"?`)) return;
    try {
      await api.deleteCondition(condition.id);
      setConditions((prev) => prev.filter((c) => c.id !== condition.id));
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleCreate() {
    if (!newCode || !newName) return;
    setCreating(true);
    setError(null);
    try {
      const created = await api.createCondition({
        code: newCode,
        name: newName,
        description: newDescription || null,
        chance: Number(newChance),
        minDelta: Number(newMinDelta),
        maxDelta: Number(newMaxDelta),
      });
      setConditions((prev) => [...prev, created]);
      setNewCode('');
      setNewName('');
      setNewDescription('');
      setNewChance('0.1');
      setNewMinDelta('0');
      setNewMaxDelta('1');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return <p className="text-navy/60">Завантаження...</p>;
  }

  const inputClass =
    'rounded-md border border-navy/20 px-3 py-1.5 text-sm text-navy transition-colors focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/40';

  return (
    <div className="space-y-8">
      {error && <p className="rounded-lg border border-ruby/20 bg-ruby/10 px-4 py-2 text-sm text-ruby">{error}</p>}

      <div className="overflow-x-auto rounded-xl border border-navy/10 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="bg-navy text-cream">
              <th className="px-4 py-3 font-semibold">Код</th>
              <th className="px-4 py-3 font-semibold">Назва</th>
              <th className="px-4 py-3 font-semibold">Увімкнено</th>
              <th className="px-4 py-3 font-semibold">Шанс</th>
              <th className="px-4 py-3 font-semibold">Мін. дельта</th>
              <th className="px-4 py-3 font-semibold">Макс. дельта</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-navy/10">
            {conditions.map((condition) => (
              <tr key={condition.id} className="transition-colors hover:bg-cream/60">
                <td className="px-4 py-2 font-mono text-xs text-navy/70">{condition.code}</td>
                <td className="px-4 py-2 font-medium text-navy">{condition.name}</td>
                <td className="px-4 py-2">
                  <ToggleSwitch
                    checked={condition.isEnabled}
                    onSave={async (isEnabled) => {
                      const updated = await api.updateCondition(condition.id, { isEnabled });
                      patchLocal(condition.id, updated);
                    }}
                  />
                </td>
                <td className="px-4 py-2">
                  <EditableNumberField
                    value={condition.chance}
                    step="0.01"
                    disabled={condition.code === 'base'}
                    onSave={async (chance) => {
                      const updated = await api.updateCondition(condition.id, { chance });
                      patchLocal(condition.id, updated);
                    }}
                  />
                </td>
                <td className="px-4 py-2">
                  <EditableNumberField
                    value={condition.minDelta}
                    onSave={async (minDelta) => {
                      const updated = await api.updateCondition(condition.id, { minDelta });
                      patchLocal(condition.id, updated);
                    }}
                  />
                </td>
                <td className="px-4 py-2">
                  <EditableNumberField
                    value={condition.maxDelta}
                    onSave={async (maxDelta) => {
                      const updated = await api.updateCondition(condition.id, { maxDelta });
                      patchLocal(condition.id, updated);
                    }}
                  />
                </td>
                <td className="px-4 py-2 text-right">
                  <button
                    onClick={() => handleDelete(condition)}
                    disabled={condition.isProtected}
                    className="rounded-md border border-ruby/30 px-2.5 py-1 text-xs font-medium text-ruby transition-colors hover:bg-ruby/10 disabled:cursor-not-allowed disabled:border-navy/10 disabled:text-navy/30"
                  >
                    Видалити
                  </button>
                </td>
              </tr>
            ))}
            {conditions.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-navy/40">
                  Ще немає умов
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="rounded-xl border border-gold/40 bg-white p-6 shadow-sm">
        <h2 className="mb-1 text-lg font-bold text-navy">Нова умова</h2>
        <p className="mb-4 text-xs text-navy/60">
          Коди зі спецлогікою: <span className="font-mono">{availableCodes.join(', ') || '—'}</span>
          {creatableCodes.length === 0 && availableCodes.length > 0 ? ' (усі вже використані нижче)' : ''}. Будь-який
          інший код (напр. <span className="font-mono">jackpot</span>) створює звичайну умову з рандомом у діапазоні
          мін..макс без спецлогіки.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm font-medium text-navy">
            Код
            <input
              value={newCode}
              onChange={(e) => setNewCode(e.target.value)}
              list="available-codes"
              placeholder="напр. jackpot"
              className={inputClass}
            />
            <datalist id="available-codes">
              {creatableCodes.map((code) => (
                <option key={code} value={code} />
              ))}
            </datalist>
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-navy">
            Назва
            <input value={newName} onChange={(e) => setNewName(e.target.value)} className={inputClass} />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-navy sm:col-span-2">
            Опис
            <input
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-navy">
            Шанс (0..1)
            <input
              type="number"
              step="0.01"
              value={newChance}
              onChange={(e) => setNewChance(e.target.value)}
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-navy">
            Мін. дельта
            <input
              type="number"
              value={newMinDelta}
              onChange={(e) => setNewMinDelta(e.target.value)}
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-navy">
            Макс. дельта
            <input
              type="number"
              value={newMaxDelta}
              onChange={(e) => setNewMaxDelta(e.target.value)}
              className={inputClass}
            />
          </label>
        </div>
        <button
          onClick={handleCreate}
          disabled={!newCode || !newName || creating}
          className="mt-5 rounded-md bg-gold px-4 py-2 text-sm font-semibold text-navy-dark shadow-sm transition-colors hover:bg-gold-dark disabled:cursor-not-allowed disabled:bg-navy/10 disabled:text-navy/30"
        >
          {creating ? 'Створення...' : 'Створити'}
        </button>
      </div>
    </div>
  );
}
