import { useEffect, useState } from 'react';
import { api, type UserDto } from '../api/client';
import { EditableNumberField } from '../components/EditableNumberField';

export default function UsersPage() {
  const [users, setUsers] = useState<UserDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  async function handleSaveValue(user: UserDto, value: number) {
    const updated = await api.updateUser(user.id, { value });
    setUsers((prev) => prev.map((u) => (u.id === user.id ? updated : u)));
  }

  if (loading) {
    return <p className="text-navy/60">Завантаження...</p>;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-navy/10 bg-white shadow-sm">
      {error && <p className="border-b border-ruby/20 bg-ruby/10 px-4 py-2 text-sm text-ruby">{error}</p>}
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="bg-navy text-cream">
            <th className="px-4 py-3 font-semibold">Telegram ID</th>
            <th className="px-4 py-3 font-semibold">Користувач</th>
            <th className="px-4 py-3 font-semibold">Значення (см)</th>
            <th className="px-4 py-3 font-semibold">Останній вимір</th>
            <th className="px-4 py-3 font-semibold">Чатів</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-navy/10">
          {users.map((user) => (
            <tr key={user.id} className="transition-colors hover:bg-cream/60">
              <td className="px-4 py-2 text-navy/70">{user.telegramId}</td>
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
              <td className="px-4 py-2 text-navy/70">
                {user.lastMeasurementAt ? new Date(user.lastMeasurementAt).toLocaleString() : '—'}
              </td>
              <td className="px-4 py-2 text-navy/70">{user.chats.length}</td>
            </tr>
          ))}
          {users.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-6 text-center text-navy/40">
                Ще немає користувачів
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
