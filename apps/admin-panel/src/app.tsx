import { useState } from 'react';
import ConditionsPage from './pages/conditions-page';
import RoundsPage from './pages/rounds-page';
import SettingsPage from './pages/settings-page';
import UsersPage from './pages/users-page';

type Tab = 'users' | 'conditions' | 'rounds' | 'settings';

const TABS: { id: Tab; label: string }[] = [
  { id: 'users', label: 'Користувачі' },
  { id: 'conditions', label: 'Умови росту' },
  { id: 'rounds', label: 'Раунди' },
  { id: 'settings', label: 'Налаштування' },
];

export default function App() {
  const [tab, setTab] = useState<Tab>('users');

  return (
    <div className="min-h-screen bg-cream">
      <header className="border-b-4 border-gold bg-navy">
        <div className="mx-auto max-w-5xl px-6 py-5">
          <h1 className="text-2xl font-extrabold tracking-tight text-gold">📏 Penis Meter — Admin</h1>
          <p className="mt-1 text-sm text-cream/70">Керування користувачами та умовами росту</p>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        <nav className="mb-6 flex gap-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                tab === t.id ? 'bg-gold text-navy-dark shadow-sm' : 'bg-white text-navy/60 hover:bg-cream-dark'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>

        {tab === 'users' && <UsersPage />}
        {tab === 'conditions' && <ConditionsPage />}
        {tab === 'rounds' && <RoundsPage />}
        {tab === 'settings' && <SettingsPage />}
      </main>
    </div>
  );
}
