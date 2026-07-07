import { useEffect, useState } from 'react';
import { api, type UserDto } from '../api/client';

export default function UsersPage() {
  const [users, setUsers] = useState<UserDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingValues, setEditingValues] = useState<Record<string, string>>({});

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

  useEffect(() => {
    load();
  }, []);

  async function handleSave(user: UserDto) {
    const raw = editingValues[user.id];
    if (raw === undefined) {
      return;
    }
    const value = Number(raw);
    if (Number.isNaN(value)) {
      return;
    }
    try {
      await api.updateUser(user.id, { value });
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  if (loading) return <p>Loading...</p>;
  if (error) return <p style={{ color: 'red' }}>{error}</p>;

  return (
    <table cellPadding={8} style={{ borderCollapse: 'collapse', width: '100%' }}>
      <thead>
        <tr style={{ textAlign: 'left', borderBottom: '2px solid #ccc' }}>
          <th>Telegram ID</th>
          <th>Username</th>
          <th>Value (cm)</th>
          <th>Last measurement</th>
          <th>Chats</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {users.map((user) => (
          <tr key={user.id} style={{ borderBottom: '1px solid #eee' }}>
            <td>{user.telegramId}</td>
            <td>{user.username ? `@${user.username}` : user.firstName}</td>
            <td>
              <input
                type="number"
                value={editingValues[user.id] ?? String(user.value)}
                onChange={(e) => setEditingValues((prev) => ({ ...prev, [user.id]: e.target.value }))}
                style={{ width: 80 }}
              />
            </td>
            <td>{user.lastMeasurementAt ? new Date(user.lastMeasurementAt).toLocaleString() : '-'}</td>
            <td>{user.chats.length}</td>
            <td>
              <button onClick={() => handleSave(user)}>Save</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
