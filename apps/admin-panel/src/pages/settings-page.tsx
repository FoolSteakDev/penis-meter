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
        </div>
      )}
    </div>
  );
}
