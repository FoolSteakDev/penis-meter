import { useEffect, useState } from 'react';
import { api, type ConditionDto, type CreateConditionRequest, type DeltaMode } from '../api/client';
import { EditableFixedValuesField } from '../components/EditableFixedValuesField';
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
  const [newDeltaMode, setNewDeltaMode] = useState<DeltaMode>('range');
  const [newMinDelta, setNewMinDelta] = useState('0');
  const [newMaxDelta, setNewMaxDelta] = useState('1');
  const [newFixedValues, setNewFixedValues] = useState('0, 1, 2');
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

  async function handleChangeDeltaMode(condition: ConditionDto, deltaMode: DeltaMode) {
    if (condition.deltaMode === deltaMode) return;
    try {
      const updated = await api.updateCondition(condition.id, {
        deltaMode,
        fixedValues: deltaMode === 'fixed_list' && condition.fixedValues.length === 0 ? [0] : undefined,
      });
      patchLocal(condition.id, updated);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleCreate() {
    if (!newCode || !newName) return;
    setCreating(true);
    setError(null);
    try {
      const payload: CreateConditionRequest = {
        code: newCode,
        name: newName,
        description: newDescription || null,
        chance: Number(newChance),
        deltaMode: newDeltaMode,
      };
      if (newDeltaMode === 'range') {
        payload.minDelta = Number(newMinDelta);
        payload.maxDelta = Number(newMaxDelta);
      } else {
        payload.fixedValues = newFixedValues
          .split(',')
          .map((v) => Number(v.trim()))
          .filter((v) => !Number.isNaN(v));
      }
      const created = await api.createCondition(payload);
      setConditions((prev) => [...prev, created]);
      setNewCode('');
      setNewName('');
      setNewDescription('');
      setNewChance('0.1');
      setNewDeltaMode('range');
      setNewMinDelta('0');
      setNewMaxDelta('1');
      setNewFixedValues('0, 1, 2');
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
              <th className="px-4 py-3 font-semibold">Назва</th>
              <th className="px-4 py-3 font-semibold">Опис</th>
              <th className="w-24 px-3 py-3 font-semibold">Шанс</th>
              <th className="w-52 px-3 py-3 font-semibold">Дельта</th>
              <th className="w-24 px-3 py-3 text-center font-semibold">Увімкнено</th>
              <th className="w-14 px-3 py-3 text-center font-semibold">Видалити</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-navy/10">
            {conditions.map((condition) => (
              <tr key={condition.id} className="transition-colors hover:bg-cream/60">
                <td className="px-4 py-2 font-medium text-navy">{condition.name}</td>
                <td className="max-w-xs whitespace-normal break-words px-4 py-2 text-xs text-navy/70">
                  {condition.description || '—'}
                </td>
                <td className="px-3 py-2">
                  <EditableNumberField
                    value={condition.chance}
                    step="0.01"
                    size="lg"
                    disabled={condition.code === 'base'}
                    onSave={async (chance) => {
                      const updated = await api.updateCondition(condition.id, { chance });
                      patchLocal(condition.id, updated);
                    }}
                  />
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-col gap-1.5">
                    <div className="inline-flex w-fit overflow-hidden rounded-md border border-navy/20 text-xs">
                      <button
                        type="button"
                        onClick={() => handleChangeDeltaMode(condition, 'range')}
                        className={`px-2 py-0.5 transition-colors ${
                          condition.deltaMode === 'range'
                            ? 'bg-navy text-cream'
                            : 'bg-white text-navy/60 hover:bg-cream-dark'
                        }`}
                      >
                        Діапазон
                      </button>
                      <button
                        type="button"
                        onClick={() => handleChangeDeltaMode(condition, 'fixed_list')}
                        className={`border-l border-navy/20 px-2 py-0.5 transition-colors ${
                          condition.deltaMode === 'fixed_list'
                            ? 'bg-navy text-cream'
                            : 'bg-white text-navy/60 hover:bg-cream-dark'
                        }`}
                      >
                        Список
                      </button>
                    </div>
                    {condition.deltaMode === 'fixed_list' ? (
                      <EditableFixedValuesField
                        value={condition.fixedValues}
                        onSave={async (fixedValues) => {
                          const updated = await api.updateCondition(condition.id, { fixedValues });
                          patchLocal(condition.id, updated);
                        }}
                      />
                    ) : (
                      <div className="inline-flex items-center gap-1">
                        <EditableNumberField
                          value={condition.minDelta}
                          size="sm"
                          onSave={async (minDelta) => {
                            const updated = await api.updateCondition(condition.id, { minDelta });
                            patchLocal(condition.id, updated);
                          }}
                        />
                        <span className="text-navy/40">/</span>
                        <EditableNumberField
                          value={condition.maxDelta}
                          size="sm"
                          onSave={async (maxDelta) => {
                            const updated = await api.updateCondition(condition.id, { maxDelta });
                            patchLocal(condition.id, updated);
                          }}
                        />
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2 text-center">
                  <ToggleSwitch
                    checked={condition.isEnabled}
                    disabled={condition.isProtected}
                    onSave={async (isEnabled) => {
                      const updated = await api.updateCondition(condition.id, { isEnabled });
                      patchLocal(condition.id, updated);
                    }}
                  />
                </td>
                <td className="px-3 py-2 text-center">
                  <button
                    onClick={() => handleDelete(condition)}
                    disabled={condition.isProtected}
                    title="Видалити"
                    className="inline-flex items-center justify-center rounded-md border border-ruby/30 p-1.5 text-ruby transition-colors hover:bg-ruby/10 disabled:cursor-not-allowed disabled:border-navy/10 disabled:text-navy/30"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-4 w-4"
                    >
                      <path d="M3 6h18" />
                      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                      <line x1="10" y1="11" x2="10" y2="17" />
                      <line x1="14" y1="11" x2="14" y2="17" />
                    </svg>
                  </button>
                </td>
              </tr>
            ))}
            {conditions.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-navy/40">
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
          інший код (напр. <span className="font-mono">jackpot</span>) створює звичайну умову без спецлогіки: дельта
          або рандом у діапазоні мін..макс, або випадкове число зі списку фіксованих значень.
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
          <label className="flex flex-col gap-1 text-sm font-medium text-navy sm:col-span-2">
            Тип дельти
            <select
              value={newDeltaMode}
              onChange={(e) => setNewDeltaMode(e.target.value as DeltaMode)}
              className={inputClass}
            >
              <option value="range">Діапазон (мін/макс)</option>
              <option value="fixed_list">Список фіксованих чисел</option>
            </select>
          </label>
          {newDeltaMode === 'range' ? (
            <>
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
            </>
          ) : (
            <label className="flex flex-col gap-1 text-sm font-medium text-navy sm:col-span-2">
              Фіксовані значення (через кому)
              <input
                value={newFixedValues}
                onChange={(e) => setNewFixedValues(e.target.value)}
                placeholder="напр. 1, 2, 3.5"
                className={inputClass}
              />
            </label>
          )}
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
