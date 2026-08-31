import { useEffect, useState } from "react";
import {
  api,
  type AchievementDefinitionDto,
  type AchievementSettingsDto,
  type DuelSettingsDto,
} from "../api/client";
import { EditableNumberField } from "../components/editable-number-field";
import { ToggleSwitch } from "../components/toggle-switch";
import RoundsPage from "./rounds-page";

type SettingsTab = "duels" | "rounds" | "achievements";

const SETTINGS_TABS: { id: SettingsTab; label: string }[] = [
  { id: "duels", label: "⚔️ Дуелі" },
  { id: "rounds", label: "📅 Раунди" },
  { id: "achievements", label: "🎖 Досягнення" },
];

export default function SettingsPage() {
  const [settingsTab, setSettingsTab] = useState<SettingsTab>("duels");

  return (
    <div className="flex flex-col gap-6 md:flex-row md:items-start">
      <nav className="flex gap-2 overflow-x-auto md:w-44 md:flex-shrink-0 md:flex-col md:gap-1.5">
        {SETTINGS_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setSettingsTab(t.id)}
            className={`whitespace-nowrap rounded-md px-4 py-2 text-left text-sm font-semibold transition-colors ${
              settingsTab === t.id
                ? "bg-gold text-navy-dark shadow-sm"
                : "bg-white text-navy/60 hover:bg-cream-dark"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div className="min-w-0 flex-1">
        {settingsTab === "duels" && <DuelSettingsPanel />}
        {settingsTab === "rounds" && <RoundsPage />}
        {settingsTab === "achievements" && <AchievementSettingsPanel />}
      </div>
    </div>
  );
}

function DuelSettingsPanel() {
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

          <div className="mt-3 flex items-center gap-2 text-sm font-medium text-navy">
            Строк дії виклику
            <EditableNumberField
              value={duelSettings.challengeTtlMinutes}
              step="1"
              size="md"
              onSave={async (challengeTtlMinutes) => {
                const updated = await api.updateDuelSettings({ challengeTtlMinutes });
                setDuelSettings(updated);
              }}
            />
            <span className="text-xs text-navy/50">хв</span>
          </div>

          <div className="mt-3 flex items-center gap-2 text-sm font-medium text-navy">
            Ліміт одночасних викликів
            <EditableNumberField
              value={duelSettings.maxPendingChallenges}
              step="1"
              size="sm"
              onSave={async (maxPendingChallenges) => {
                const updated = await api.updateDuelSettings({ maxPendingChallenges });
                setDuelSettings(updated);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

const RESET_CONFIRM_TIMEOUT_MS = 5000;

type ResetScope = "all" | "one";

function AchievementSettingsPanel() {
  const [settings, setSettings] = useState<AchievementSettingsDto | null>(null);
  const [definitions, setDefinitions] = useState<AchievementDefinitionDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [resetScope, setResetScope] = useState<ResetScope>("all");
  const [resetTelegramId, setResetTelegramId] = useState("");
  const [keepCounters, setKeepCounters] = useState(false);
  const [confirmArmed, setConfirmArmed] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!confirmArmed) return;
    const timeout = setTimeout(() => setConfirmArmed(false), RESET_CONFIRM_TIMEOUT_MS);
    return () => clearTimeout(timeout);
  }, [confirmArmed]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [nextSettings, nextDefinitions] = await Promise.all([
        api.getAchievementSettings(),
        api.getAchievementDefinitions(),
      ]);
      setSettings(nextSettings);
      setDefinitions(nextDefinitions);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleResetClick() {
    if (!confirmArmed) {
      setConfirmArmed(true);
      return;
    }

    setConfirmArmed(false);
    setResetting(true);
    setError(null);
    setResetMessage(null);
    try {
      const telegramId =
        resetScope === "one" && resetTelegramId.trim() !== "" ? Number(resetTelegramId) : undefined;
      const { affected } = await api.resetAchievements({ telegramId, keepCounters });
      setResetMessage(`Скинуто: ${affected} гравців`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setResetting(false);
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

      {settings && (
        <div className="rounded-xl border border-navy/10 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-navy">🎖 Досягнення</h2>
          </div>

          <div className="flex items-center justify-between gap-2 py-1.5">
            <span className="text-sm font-medium text-navy">Система досягнень увімкнена</span>
            <ToggleSwitch
              checked={settings.isEnabled}
              onSave={async (isEnabled) => {
                const updated = await api.updateAchievementSettings({ isEnabled });
                setSettings(updated);
              }}
            />
          </div>

          <div className="flex items-center justify-between gap-2 py-1.5">
            <span className="text-sm font-medium text-navy">Анонсувати нові рівні в чат</span>
            <ToggleSwitch
              checked={settings.announceEnabled}
              onSave={async (announceEnabled) => {
                const updated = await api.updateAchievementSettings({ announceEnabled });
                setSettings(updated);
              }}
            />
          </div>

          <div className="mt-2 flex items-center gap-2 text-sm font-medium text-navy">
            Множник нагород
            <EditableNumberField
              value={settings.rewardMultiplier}
              step="0.1"
              size="sm"
              onSave={async (rewardMultiplier) => {
                const updated = await api.updateAchievementSettings({ rewardMultiplier });
                setSettings(updated);
              }}
            />
            <span className="text-xs text-navy/50">(0–5, дефолт 1)</span>
          </div>

          <div className="mt-6 border-t border-navy/10 pt-5">
            <h3 className="mb-1 text-sm font-bold text-navy">Довідник досягнень</h3>
            <p className="mb-3 text-xs text-navy/60">
              Умови задані в коді, apps/bot-server/src/achievements/achievement.registry.ts.
              Тут — лише перегляд.
            </p>
            <div className="max-h-96 overflow-y-auto rounded-md border border-navy/10">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-cream-dark text-navy/70">
                  <tr>
                    <th className="px-3 py-2">Категорія</th>
                    <th className="px-3 py-2">Досягнення</th>
                    <th className="px-3 py-2">Пороги</th>
                    <th className="px-3 py-2">Нагороди, см</th>
                  </tr>
                </thead>
                <tbody>
                  {definitions.map((def) => (
                    <tr key={def.code} className="border-t border-navy/5">
                      <td className="px-3 py-1.5 text-navy/60">{def.category}</td>
                      <td className="px-3 py-1.5 font-medium text-navy">
                        {def.emoji} {def.name}
                      </td>
                      <td className="px-3 py-1.5 text-navy">{def.thresholds.join(" / ")}</td>
                      <td className="px-3 py-1.5 text-navy">{def.rewards.join(" / ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-6 rounded-lg border border-ruby/30 bg-ruby/5 p-4">
            <h3 className="mb-1 text-sm font-bold text-ruby">Небезпечна зона</h3>
            <p className="mb-3 text-xs text-navy/60">
              Скидання обнуляє прогрес досягнень. Уже нараховані см у гравців лишаються.
            </p>

            <div className="mb-3 flex flex-wrap items-center gap-4 text-sm text-navy">
              <label className="flex items-center gap-1.5">
                <input
                  type="radio"
                  name="reset-scope"
                  checked={resetScope === "all"}
                  onChange={() => setResetScope("all")}
                />
                Усім гравцям
              </label>
              <label className="flex items-center gap-1.5">
                <input
                  type="radio"
                  name="reset-scope"
                  checked={resetScope === "one"}
                  onChange={() => setResetScope("one")}
                />
                Одному гравцю
              </label>
              {resetScope === "one" && (
                <input
                  type="number"
                  placeholder="telegram_id"
                  value={resetTelegramId}
                  onChange={(e) => setResetTelegramId(e.target.value)}
                  className="w-32 rounded-md border border-navy/20 px-2 py-1 text-sm text-navy focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/40"
                />
              )}
            </div>

            <label className="mb-3 flex items-center gap-1.5 text-sm text-navy">
              <input
                type="checkbox"
                checked={keepCounters}
                onChange={(e) => setKeepCounters(e.target.checked)}
              />
              Лишити лічильники (рівні відкриються заново, см нарахуються повторно)
            </label>

            <button
              type="button"
              disabled={resetting || (resetScope === "one" && resetTelegramId.trim() === "")}
              onClick={handleResetClick}
              className={`rounded-md px-3 py-1.5 text-sm font-semibold shadow-sm transition-colors disabled:cursor-not-allowed disabled:bg-navy/10 disabled:text-navy/30 ${
                confirmArmed
                  ? "bg-ruby text-white hover:bg-ruby/90"
                  : "border border-ruby/40 text-ruby hover:bg-ruby/10"
              }`}
            >
              {confirmArmed ? "Точно скинути? Клікни ще раз" : "Скинути досягнення"}
            </button>

            {resetMessage && <p className="mt-2 text-sm text-navy/70">{resetMessage}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
