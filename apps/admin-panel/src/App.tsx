import { useState } from 'react';
import ConditionsPage from './pages/ConditionsPage';
import UsersPage from './pages/UsersPage';

type Tab = 'users' | 'conditions';

export default function App() {
  const [tab, setTab] = useState<Tab>('users');

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: 960, margin: '0 auto', padding: 24 }}>
      <h1>Penis Meter - Admin</h1>
      <nav style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        <button onClick={() => setTab('users')} disabled={tab === 'users'}>
          Users
        </button>
        <button onClick={() => setTab('conditions')} disabled={tab === 'conditions'}>
          Conditions
        </button>
      </nav>
      {tab === 'users' ? <UsersPage /> : <ConditionsPage />}
    </div>
  );
}
