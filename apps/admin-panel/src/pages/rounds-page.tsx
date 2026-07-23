import { useEffect, useState } from 'react';
import { api, type ConditionDto, type RoundDto } from '../api/client';
import { EditableNumberField } from '../components/editable-number-field';
import { EditableTextField } from '../components/editable-text-field';
import { formatKyivDateTime } from '../utils/kyiv-time';

const SOURCE_LABEL: Record<NonNullable<RoundDto['themeSource']>, string> = {
  admin: 'Адмін',
  random_fallback: 'Авторандом',
  legacy: 'Legacy',
};

export default function RoundsPage() {
  const [rounds, setRounds] = useState<RoundDto[]>([]);
  const [conditions, setConditions] = useState<ConditionDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [roundsResponse, conditionsResponse] = await Promise.all([
        api.listRounds(),
        api.listConditions(),
      ]);
      setRounds(roundsResponse);
      setConditions(conditionsResponse);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function patchLocal(id: string, updated: RoundDto) {
    setRounds((prev) => prev.map((r) => (r.id === id ? updated : r)));
  }

  async function handleAddNext() {
    setAdding(true);
    setError(null);
    try {
      const created = await api.createNextRound();
      setRounds((prev) => [...prev, created]);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setAdding(false);
    }
  }

  if (loading) {
    return <p className="text-navy/60">Завантаження...</p>;
  }

  const seasons = [...new Set(rounds.map((r) => r.seasonNumber))].sort((a, b) => a - b);
  const selectClass =
    'w-full rounded-md border border-navy/20 bg-white px-2 py-1 text-sm text-navy transition-colors focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/40 disabled:cursor-not-allowed disabled:border-navy/10 disabled:bg-cream-dark disabled:text-navy/40';

  return (
    <div className="space-y-8">
      {error && (
        <p className="rounded-lg border border-ruby/20 bg-ruby/10 px-4 py-2 text-sm text-ruby">{error}</p>
      )}

      <button
        onClick={handleAddNext}
        disabled={adding}
        className="rounded-md bg-gold px-4 py-2 text-sm font-semibold text-navy-dark shadow-sm transition-colors hover:bg-gold-dark disabled:cursor-not-allowed disabled:bg-navy/10 disabled:text-navy/30"
      >
        {adding ? 'Додавання...' : '+ Додати наступний раунд'}
      </button>

      {seasons.length === 0 && <p className="text-navy/40">Раундів ще немає</p>}

      {seasons.map((seasonNumber) => (
        <div key={seasonNumber} className="overflow-x-auto rounded-xl border border-navy/10 bg-white shadow-sm">
          <h2 className="border-b border-navy/10 bg-cream px-4 py-2 text-sm font-bold text-navy">
            Сезон {seasonNumber}
          </h2>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-navy text-cream">
                <th className="px-4 py-3 font-semibold">Раунд</th>
                <th className="px-4 py-3 font-semibold">Дати</th>
                <th className="px-3 py-3 font-semibold">Джерело</th>
                <th className="px-3 py-3 font-semibold">Назва теми</th>
                <th className="px-3 py-3 font-semibold">Опис</th>
                <th className="w-40 px-3 py-3 font-semibold">Умова</th>
                <th className="w-24 px-3 py-3 font-semibold">Шанс</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy/10">
              {rounds
                .filter((r) => r.seasonNumber === seasonNumber)
                .sort((a, b) => a.roundNumber - b.roundNumber)
                .map((round) => (
                  <tr key={round.id} className="transition-colors hover:bg-cream/60">
                    <td className="px-4 py-2 font-medium text-navy">
                      {round.roundInSeason}/4 (#{round.roundNumber})
                    </td>
                    <td className="px-4 py-2 text-xs text-navy/70">
                      {formatKyivDateTime(round.startsAt)} - {formatKyivDateTime(round.endsAt)}
                    </td>
                    <td className="px-3 py-2 text-xs text-navy/70">
                      {round.themeSource ? SOURCE_LABEL[round.themeSource] : '—'}
                    </td>
                    <td className="px-3 py-2">
                      {round.isEditable ? (
                        <EditableTextField
                          value={round.themeName}
                          placeholder="напр. Тиждень удачі"
                          onSave={async (themeName) => {
                            const updated = await api.updateRound(round.id, { themeName });
                            patchLocal(round.id, updated);
                          }}
                        />
                      ) : (
                        round.themeName || '—'
                      )}
                    </td>
                    <td className="max-w-xs px-3 py-2">
                      {round.isEditable ? (
                        <EditableTextField
                          value={round.themeDescription}
                          placeholder="флейвор-опис"
                          onSave={async (themeDescription) => {
                            const updated = await api.updateRound(round.id, { themeDescription });
                            patchLocal(round.id, updated);
                          }}
                        />
                      ) : (
                        <span className="whitespace-normal break-words text-xs text-navy/70">
                          {round.themeDescription || '—'}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {round.isEditable ? (
                        <select
                          value={round.conditionCode ?? ''}
                          className={selectClass}
                          onChange={async (e) => {
                            const conditionCode = e.target.value || null;
                            try {
                              const updated = await api.updateRound(round.id, { conditionCode });
                              patchLocal(round.id, updated);
                            } catch (err) {
                              setError((err as Error).message);
                            }
                          }}
                        >
                          <option value="">—</option>
                          {conditions.map((c) => (
                            <option key={c.code} value={c.code}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        conditions.find((c) => c.code === round.conditionCode)?.name ?? round.conditionCode ?? '—'
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {round.isEditable ? (
                        <EditableNumberField
                          value={round.conditionChance ?? 0}
                          step="0.01"
                          onSave={async (conditionChance) => {
                            const updated = await api.updateRound(round.id, { conditionChance });
                            patchLocal(round.id, updated);
                          }}
                        />
                      ) : (
                        (round.conditionChance ?? '—')
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
