import { useEffect, useState } from "react";
import {
  api,
  type CreateQuestRequest,
  type QuestCategory,
  type QuestDto,
  type QuestRuleDto,
} from "../api/client";
import { EditableNumberField } from "../components/editable-number-field";
import { ToggleSwitch } from "../components/toggle-switch";

const CATEGORY_LABELS: Record<QuestCategory, string> = {
  restraint: "🧘 Утримання",
  precision: "⏱ Точність",
  position: "🏆 Позиція",
  luck: "🎲 Удача",
  duel: "⚔️ Дуельні",
};

const CATEGORIES = Object.keys(CATEGORY_LABELS) as QuestCategory[];

function paramsToText(params: Record<string, unknown>): string {
  const entries = Object.entries(params).map(([key, value]) =>
    Array.isArray(value) ? `${key}=${value.join("|")}` : `${key}=${String(value)}`,
  );
  return entries.join(", ") || "—";
}

export default function QuestsPage() {
  const [quests, setQuests] = useState<QuestDto[]>([]);
  const [rules, setRules] = useState<QuestRuleDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newCode, setNewCode] = useState("");
  const [newEmoji, setNewEmoji] = useState("🧭");
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newCategory, setNewCategory] = useState<QuestCategory>("restraint");
  const [newRule, setNewRule] = useState("");
  const [newTarget, setNewTarget] = useState("1");
  const [newParamValues, setNewParamValues] = useState<Record<string, string>>({});
  const [newDurationMinutes, setNewDurationMinutes] = useState("1440");
  const [newRewardCm, setNewRewardCm] = useState("10");
  const [newPenaltyCm, setNewPenaltyCm] = useState("7");
  const [newCooldownHours, setNewCooldownHours] = useState("24");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [questsResponse, rulesResponse] = await Promise.all([api.listQuests(), api.listQuestRules()]);
      setQuests(questsResponse);
      setRules(rulesResponse);
      if (rulesResponse.length > 0) {
        setNewRule((current) => current || rulesResponse[0].code);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function patchLocal(id: string, updated: QuestDto) {
    setQuests((prev) => prev.map((q) => (q.id === id ? updated : q)));
  }

  async function handleDelete(quest: QuestDto) {
    if (quest.activeAssignments > 0) return;
    if (!confirm(`Видалити квест "${quest.name}"?`)) return;
    try {
      await api.deleteQuest(quest.id);
      setQuests((prev) => prev.filter((q) => q.id !== quest.id));
    } catch (err) {
      setError((err as Error).message);
    }
  }

  const selectedRule = rules.find((r) => r.code === newRule) ?? null;

  async function handleCreate() {
    if (!newCode || !newName || !newRule) return;
    setCreating(true);
    setError(null);
    try {
      const params: Record<string, unknown> = {};
      for (const param of selectedRule?.params ?? []) {
        const raw = newParamValues[param.key];
        if (raw === undefined || raw.trim() === "") continue;
        params[param.key] = param.type === "number" ? Number(raw) : raw.split(",").map((v) => v.trim()).filter(Boolean);
      }

      const payload: CreateQuestRequest = {
        code: newCode,
        emoji: newEmoji,
        name: newName,
        description: newDescription,
        category: newCategory,
        rule: newRule,
        target: Number(newTarget),
        params,
        durationMinutes: Number(newDurationMinutes),
        rewardCm: Number(newRewardCm),
        penaltyCm: Number(newPenaltyCm),
        cooldownHours: Number(newCooldownHours),
      };
      const created = await api.createQuest(payload);
      setQuests((prev) => [...prev, created]);
      setNewCode("");
      setNewName("");
      setNewDescription("");
      setNewParamValues({});
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
    "rounded-md border border-navy/20 px-3 py-1.5 text-sm text-navy transition-colors focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/40";

  return (
    <div className="space-y-8">
      {error && (
        <p className="rounded-lg border border-ruby/20 bg-ruby/10 px-4 py-2 text-sm text-ruby">{error}</p>
      )}

      <div className="overflow-x-auto rounded-xl border border-navy/10 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="bg-navy text-cream">
              <th className="px-4 py-3 font-semibold">Квест</th>
              <th className="px-3 py-3 font-semibold">Категорія / правило</th>
              <th className="w-20 px-3 py-3 font-semibold">Ціль</th>
              <th className="w-24 px-3 py-3 font-semibold">Таймер, хв</th>
              <th className="w-20 px-3 py-3 font-semibold">+ см</th>
              <th className="w-20 px-3 py-3 font-semibold">− см</th>
              <th className="w-24 px-3 py-3 font-semibold">Кулдаун, год</th>
              <th className="w-20 px-3 py-3 text-center font-semibold">Активні</th>
              <th className="w-24 px-3 py-3 text-center font-semibold">Увімкнено</th>
              <th className="w-14 px-3 py-3 text-center font-semibold">Видалити</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-navy/10">
            {quests.map((quest) => (
              <tr key={quest.id} className="transition-colors hover:bg-cream/60">
                <td className="px-4 py-2 align-top">
                  <div className="font-medium text-navy">
                    {quest.emoji} {quest.name}
                  </div>
                  <div className="mt-0.5 max-w-xs whitespace-normal break-words text-xs text-navy/60">
                    {quest.description}
                  </div>
                  <div className="mt-0.5 font-mono text-[11px] text-navy/40">{quest.code}</div>
                </td>
                <td className="px-3 py-2 align-top text-xs text-navy/70">
                  <div>{CATEGORY_LABELS[quest.category]}</div>
                  <div className="font-mono">{quest.rule}</div>
                  <div className="mt-0.5 text-navy/40">{paramsToText(quest.params)}</div>
                </td>
                <td className="px-3 py-2 align-top">
                  <EditableNumberField
                    value={quest.target}
                    size="sm"
                    onSave={async (target) => {
                      const updated = await api.updateQuest(quest.id, { target });
                      patchLocal(quest.id, updated);
                    }}
                  />
                </td>
                <td className="px-3 py-2 align-top">
                  <EditableNumberField
                    value={quest.durationMinutes}
                    size="md"
                    step="5"
                    onSave={async (durationMinutes) => {
                      const updated = await api.updateQuest(quest.id, { durationMinutes });
                      patchLocal(quest.id, updated);
                    }}
                  />
                </td>
                <td className="px-3 py-2 align-top">
                  <EditableNumberField
                    value={quest.rewardCm}
                    size="sm"
                    step="0.5"
                    onSave={async (rewardCm) => {
                      const updated = await api.updateQuest(quest.id, { rewardCm });
                      patchLocal(quest.id, updated);
                    }}
                  />
                </td>
                <td className="px-3 py-2 align-top">
                  <EditableNumberField
                    value={quest.penaltyCm}
                    size="sm"
                    step="0.5"
                    onSave={async (penaltyCm) => {
                      const updated = await api.updateQuest(quest.id, { penaltyCm });
                      patchLocal(quest.id, updated);
                    }}
                  />
                </td>
                <td className="px-3 py-2 align-top">
                  <EditableNumberField
                    value={quest.cooldownHours}
                    size="sm"
                    onSave={async (cooldownHours) => {
                      const updated = await api.updateQuest(quest.id, { cooldownHours });
                      patchLocal(quest.id, updated);
                    }}
                  />
                </td>
                <td className="px-3 py-2 text-center align-top text-navy/70">{quest.activeAssignments}</td>
                <td className="px-3 py-2 text-center align-top">
                  <ToggleSwitch
                    checked={quest.isEnabled}
                    onSave={async (isEnabled) => {
                      const updated = await api.updateQuest(quest.id, { isEnabled });
                      patchLocal(quest.id, updated);
                    }}
                  />
                </td>
                <td className="px-3 py-2 text-center align-top">
                  <button
                    onClick={() => handleDelete(quest)}
                    disabled={quest.activeAssignments > 0}
                    title={quest.activeAssignments > 0 ? "Спершу дочекайся або скинь активні призначення" : "Видалити"}
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
            {quests.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-6 text-center text-navy/40">
                  Ще немає квестів
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="rounded-xl border border-gold/40 bg-white p-6 shadow-sm">
        <h2 className="mb-1 text-lg font-bold text-navy">Новий квест</h2>

        <div className="mb-4 rounded-lg border border-navy/15 bg-cream-dark/60 p-3 text-xs text-navy/70">
          <strong className="text-navy">Квест ≠ ачівка.</strong> Ачівки вже покривають накопичувальні лічильники
          за все життя. Новий квест мусить мати щонайменше одну з ознак: <strong>(а) утримання</strong> — виграє
          той, хто НЕ зробить чогось до дедлайну; <strong>(б) точність/вузьке вікно</strong> — час доби, рівно N,
          поспіль без пропуску, коротке вікно там, де ачівка дає роки; <strong>(в) порівняння</strong> — з іншими
          гравцями або з власним станом на старті квесту. Квест без жодної з цих ознак — просто ачівка з таймером.
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm font-medium text-navy">
            Код
            <input value={newCode} onChange={(e) => setNewCode(e.target.value)} placeholder="напр. vow_silence" className={inputClass} />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-navy">
            Емодзі
            <input value={newEmoji} onChange={(e) => setNewEmoji(e.target.value)} className={inputClass} />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-navy sm:col-span-2">
            Назва
            <input value={newName} onChange={(e) => setNewName(e.target.value)} className={inputClass} />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-navy sm:col-span-2">
            Опис (показується на екрані підтвердження)
            <input value={newDescription} onChange={(e) => setNewDescription(e.target.value)} className={inputClass} />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-navy">
            Категорія
            <select value={newCategory} onChange={(e) => setNewCategory(e.target.value as QuestCategory)} className={inputClass}>
              {CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {CATEGORY_LABELS[category]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-navy">
            Правило
            <select
              value={newRule}
              onChange={(e) => {
                setNewRule(e.target.value);
                setNewParamValues({});
              }}
              className={inputClass}
            >
              {rules.map((rule) => (
                <option key={rule.code} value={rule.code}>
                  {rule.label} ({rule.kind})
                </option>
              ))}
            </select>
          </label>

          {selectedRule && selectedRule.kind !== 'avoid' && (
            <label className="flex flex-col gap-1 text-sm font-medium text-navy">
              Ціль ({selectedRule.unit})
              <input type="number" value={newTarget} onChange={(e) => setNewTarget(e.target.value)} className={inputClass} />
            </label>
          )}

          {selectedRule?.params.map((param) => (
            <label key={param.key} className="flex flex-col gap-1 text-sm font-medium text-navy">
              {param.label} {param.required ? '*' : '(необов’язково)'}
              <input
                value={newParamValues[param.key] ?? ""}
                onChange={(e) => setNewParamValues((prev) => ({ ...prev, [param.key]: e.target.value }))}
                placeholder={param.type === "string_list" ? "через кому" : undefined}
                className={inputClass}
              />
              {param.hint && <span className="text-xs font-normal text-navy/50">{param.hint}</span>}
            </label>
          ))}

          <label className="flex flex-col gap-1 text-sm font-medium text-navy">
            Таймер, хв
            <input type="number" value={newDurationMinutes} onChange={(e) => setNewDurationMinutes(e.target.value)} className={inputClass} />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-navy">
            Кулдаун, год
            <input type="number" value={newCooldownHours} onChange={(e) => setNewCooldownHours(e.target.value)} className={inputClass} />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-navy">
            Нагорода, см
            <input type="number" value={newRewardCm} onChange={(e) => setNewRewardCm(e.target.value)} className={inputClass} />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-navy">
            Штраф, см
            <input type="number" value={newPenaltyCm} onChange={(e) => setNewPenaltyCm(e.target.value)} className={inputClass} />
          </label>
        </div>

        <button
          onClick={handleCreate}
          disabled={!newCode || !newName || !newRule || creating}
          className="mt-5 rounded-md bg-gold px-4 py-2 text-sm font-semibold text-navy-dark shadow-sm transition-colors hover:bg-gold-dark disabled:cursor-not-allowed disabled:bg-navy/10 disabled:text-navy/30"
        >
          {creating ? "Створення..." : "Створити"}
        </button>
      </div>
    </div>
  );
}
