import { useEffect, useState } from "react";
import { api, type DuelSettingsDto } from "../api/client";
import { EditableNumberField } from "../components/editable-number-field";
import { ToggleSwitch } from "../components/toggle-switch";

export default function SettingsPage() {
  const [duelSettings, setDuelSettings] = useState<DuelSettingsDto | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newTarget, setNewTarget] = useState("3");
  const [newRewardCm, setNewRewardCm] = useState("5");
  const [savingQuestTargets, setSavingQuestTargets] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setDuelSettings(await api.getDuelSettings());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddQuestTarget() {
    if (!duelSettings) return;
    const target = Number(newTarget);
    const rewardCm = Number(newRewardCm);
    if (!Number.isInteger(target) || target <= 0 || Number.isNaN(rewardCm)) {
      return;
    }
    setSavingQuestTargets(true);
    setError(null);
    try {
      const updated = await api.updateDuelSettings({
        questTargets: [
          ...duelSettings.questTargets.filter((t) => t.target !== target),
          { target, rewardCm },
        ].sort((a, b) => a.target - b.target),
      });
      setDuelSettings(updated);
      setNewTarget("3");
      setNewRewardCm("5");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSavingQuestTargets(false);
    }
  }

  async function handleRemoveQuestTarget(target: number) {
    if (!duelSettings) return;
    setSavingQuestTargets(true);
    setError(null);
    try {
      const updated = await api.updateDuelSettings({
        questTargets: duelSettings.questTargets.filter(
          (t) => t.target !== target,
        ),
      });
      setDuelSettings(updated);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSavingQuestTargets(false);
    }
  }

  if (loading) {
    return <p className="text-navy/60">Завантаження...</p>;
  }

  return (
    <div className="space-y-8">
      {error && (
        <p className="rounded-lg border border-ruby/20 bg-ruby/10 px-4 py-2 text-sm text-ruby">
          {error}
        </p>
      )}

      {duelSettings && (
        <div className="rounded-xl border border-navy/10 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-navy">⚔️ Дуелі</h2>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-navy/60">
                Увімкнено
              </span>
              <ToggleSwitch
                checked={duelSettings.isEnabled}
                onSave={async (isEnabled) => {
                  const updated = await api.updateDuelSettings({
                    isEnabled,
                  });
                  setDuelSettings(updated);
                }}
              />
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm font-medium text-navy">
            Дельта дуелі
            <EditableNumberField
              value={duelSettings.minDelta}
              size="md"
              onSave={async (minDelta) => {
                const updated = await api.updateDuelSettings({ minDelta });
                setDuelSettings(updated);
              }}
            />
            <span className="text-navy/40">/</span>
            <EditableNumberField
              value={duelSettings.maxDelta}
              size="md"
              onSave={async (maxDelta) => {
                const updated = await api.updateDuelSettings({ maxDelta });
                setDuelSettings(updated);
              }}
            />
            <span className="text-xs text-navy/50">см (мін/макс)</span>
          </div>

          <div className="mt-6 border-t border-navy/10 pt-5">
            <h3 className="mb-1 text-sm font-bold text-navy">
              🎯 Стріки квесту "виграй N дуелей"
            </h3>
            <p className="mb-3 text-xs text-navy/60">
              На старт раунду частина юзерів отримує квест на випадковий
              стрік зі списку нижче.
            </p>

            <div className="mb-3 space-y-1.5">
              {duelSettings.questTargets
                .slice()
                .sort((a, b) => a.target - b.target)
                .map((entry) => (
                  <div
                    key={entry.target}
                    className="flex items-center gap-3 rounded-md border border-navy/10 bg-cream/40 px-3 py-1.5 text-sm text-navy"
                  >
                    <span className="font-medium">
                      {entry.target} перемог{entry.target === 1 ? "а" : ""}
                    </span>
                    <span className="text-navy/40">→</span>
                    <span>+{entry.rewardCm} см</span>
                    <button
                      type="button"
                      disabled={savingQuestTargets}
                      onClick={() => handleRemoveQuestTarget(entry.target)}
                      className="ml-auto rounded-md border border-ruby/30 px-2 py-0.5 text-xs text-ruby transition-colors hover:bg-ruby/10 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Видалити
                    </button>
                  </div>
                ))}
              {duelSettings.questTargets.length === 0 && (
                <p className="text-xs text-navy/40">Список порожній.</p>
              )}
            </div>

            <div className="flex items-end gap-3">
              <label className="flex flex-col gap-1 text-xs font-medium text-navy">
                Ціль перемог
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={newTarget}
                  onChange={(e) => setNewTarget(e.target.value)}
                  className="w-20 rounded-md border border-navy/20 px-2 py-1 text-sm text-navy focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/40"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-navy">
                Нагорода, см
                <input
                  type="number"
                  step="0.1"
                  value={newRewardCm}
                  onChange={(e) => setNewRewardCm(e.target.value)}
                  className="w-24 rounded-md border border-navy/20 px-2 py-1 text-sm text-navy focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/40"
                />
              </label>
              <button
                type="button"
                disabled={savingQuestTargets}
                onClick={handleAddQuestTarget}
                className="rounded-md bg-gold px-3 py-1.5 text-sm font-semibold text-navy-dark shadow-sm transition-colors hover:bg-gold-dark disabled:cursor-not-allowed disabled:bg-navy/10 disabled:text-navy/30"
              >
                Додати
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
