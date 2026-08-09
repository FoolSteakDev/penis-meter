import { Fragment, useEffect, useState } from 'react';
import { api, type UserDto } from '../api/client';
import { EditableDateField } from '../components/editable-date-field';
import { EditableNumberField } from '../components/editable-number-field';
import { formatKyivDateTime } from '../utils/kyiv-time';

export default function UsersPage() {
  const [users, setUsers] = useState<UserDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const response = await api.listUsers(1, 100);
      setUsers(response.items);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function applyUpdate(id: string, updated: UserDto) {
    setUsers((prev) => prev.map((u) => (u.id === id ? updated : u)));
  }

  async function handleSaveValue(user: UserDto, value: number) {
    applyUpdate(user.id, await api.updateUser(user.id, { value }));
  }

  async function handleSaveWorkDays(user: UserDto, workDays: number) {
    const restDays = user.work.schedule[1] ?? 2;
    applyUpdate(user.id, await api.updateUser(user.id, { work: { schedule: [workDays, restDays] } }));
  }

  async function handleSaveRestDays(user: UserDto, restDays: number) {
    const workDays = user.work.schedule[0] ?? 5;
    applyUpdate(user.id, await api.updateUser(user.id, { work: { schedule: [workDays, restDays] } }));
  }

  async function handleSaveLastWeekend(user: UserDto, lastWeekend: string) {
    applyUpdate(user.id, await api.updateUser(user.id, { work: { lastWeekend } }));
  }

  if (loading) {
    return <p className="text-navy/60">Завантаження...</p>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-navy/10 bg-white shadow-sm">
      {error && <p className="border-b border-ruby/20 bg-ruby/10 px-4 py-2 text-sm text-ruby">{error}</p>}
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="bg-navy text-cream">
            <th className="px-4 py-3 font-semibold">Користувач</th>
            <th className="px-4 py-3 font-semibold">Значення (см)</th>
            <th className="px-4 py-3 font-semibold">Графік (роб./вих.)</th>
            <th className="px-4 py-3 font-semibold">Останні вихідні</th>
            <th className="px-4 py-3 font-semibold">Останній вимір</th>
            <th className="px-4 py-3 font-semibold">Чатів</th>
            <th className="px-4 py-3 font-semibold"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-navy/10">
          {users.map((user) => (
            <Fragment key={user.id}>
              <tr className="transition-colors hover:bg-cream/60">
                <td className="px-4 py-2 font-medium text-navy">
                  {user.username ? `@${user.username}` : user.firstName}
                </td>
                <td className="px-4 py-2">
                  <EditableNumberField
                    value={user.value}
                    step="0.1"
                    onSave={(value) => handleSaveValue(user, value)}
                  />
                </td>
                <td className="px-4 py-2">
                  <div className="inline-flex items-center gap-1">
                    <EditableNumberField
                      value={user.work.schedule[0] ?? 5}
                      step="1"
                      onSave={(workDays) => handleSaveWorkDays(user, workDays)}
                    />
                    <span className="text-navy/40">/</span>
                    <EditableNumberField
                      value={user.work.schedule[1] ?? 2}
                      step="1"
                      onSave={(restDays) => handleSaveRestDays(user, restDays)}
                    />
                  </div>
                </td>
                <td className="px-4 py-2">
                  <EditableDateField
                    value={user.work.lastWeekend}
                    onSave={(lastWeekend) => handleSaveLastWeekend(user, lastWeekend)}
                  />
                </td>
                <td className="px-4 py-2 text-navy/70">{formatKyivDateTime(user.lastMeasurementAt)}</td>
                <td className="px-4 py-2 text-navy/70">{user.chats.length}</td>
                <td className="px-4 py-2">
                  <button
                    type="button"
                    className="text-navy/60 underline decoration-dotted hover:text-navy"
                    onClick={() => setExpandedUserId((prev) => (prev === user.id ? null : user.id))}
                  >
                    {expandedUserId === user.id ? 'Сховати' : 'Прогрес'}
                  </button>
                </td>
              </tr>
              {expandedUserId === user.id && (
                <tr className="bg-cream/40">
                  <td colSpan={7} className="px-4 py-3 text-navy/70">
                    <div className="flex flex-wrap gap-x-6 gap-y-1">
                      <span>Досвід: {user.experience}</span>
                      <span>Приріст сезону: {user.seasonGrowth} см</span>
                      <span>Приріст раунду: {user.roundGrowth} см</span>
                      <span>Найкраща дельта раунду: {user.roundBestDelta ?? '-'} см</span>
                      <span>Вимірів у раунді: {user.roundMeasurementCount}</span>
                      <span>Поточна серія: {user.streakCurrent}</span>
                      <span>Найкраща серія: {user.streakBest}</span>
                    </div>
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
          {users.length === 0 && (
            <tr>
              <td colSpan={7} className="px-4 py-6 text-center text-navy/40">
                Ще немає користувачів
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
