import { useEffect, useState } from 'react';
import { api, type ConditionDto } from '../api/client';

interface EditableFields {
  chance: string;
  minDelta: string;
  maxDelta: string;
  isEnabled: boolean;
}

function toEditable(condition: ConditionDto): EditableFields {
  return {
    chance: String(condition.chance),
    minDelta: String(condition.minDelta),
    maxDelta: String(condition.maxDelta),
    isEnabled: condition.isEnabled,
  };
}

export default function ConditionsPage() {
  const [conditions, setConditions] = useState<ConditionDto[]>([]);
  const [availableCodes, setAvailableCodes] = useState<string[]>([]);
  const [edits, setEdits] = useState<Record<string, EditableFields>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newChance, setNewChance] = useState('0.1');
  const [newMinDelta, setNewMinDelta] = useState('0');
  const [newMaxDelta, setNewMaxDelta] = useState('1');

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [conditionsResponse, codesResponse] = await Promise.all([
        api.listConditions(),
        api.listAvailableCodes(),
      ]);
      setConditions(conditionsResponse);
      setEdits(Object.fromEntries(conditionsResponse.map((c) => [c.id, toEditable(c)])));
      setAvailableCodes(codesResponse);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const usedCodes = new Set(conditions.map((c) => c.code));
  const creatableCodes = availableCodes.filter((code) => !usedCodes.has(code));

  function updateEdit(id: string, patch: Partial<EditableFields>) {
    setEdits((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }

  async function handleSave(condition: ConditionDto) {
    const edit = edits[condition.id];
    if (!edit) return;
    try {
      await api.updateCondition(condition.id, {
        chance: Number(edit.chance),
        minDelta: Number(edit.minDelta),
        maxDelta: Number(edit.maxDelta),
        isEnabled: edit.isEnabled,
      });
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleDelete(condition: ConditionDto) {
    if (condition.isProtected) return;
    if (!confirm(`Delete condition "${condition.name}"?`)) return;
    try {
      await api.deleteCondition(condition.id);
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleCreate() {
    if (!newCode || !newName) return;
    try {
      await api.createCondition({
        code: newCode,
        name: newName,
        description: newDescription || null,
        chance: Number(newChance),
        minDelta: Number(newMinDelta),
        maxDelta: Number(newMaxDelta),
      });
      setNewCode('');
      setNewName('');
      setNewDescription('');
      setNewChance('0.1');
      setNewMinDelta('0');
      setNewMaxDelta('1');
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  if (loading) return <p>Loading...</p>;

  return (
    <div>
      {error && <p style={{ color: 'red' }}>{error}</p>}

      <table cellPadding={8} style={{ borderCollapse: 'collapse', width: '100%', marginBottom: 32 }}>
        <thead>
          <tr style={{ textAlign: 'left', borderBottom: '2px solid #ccc' }}>
            <th>Code</th>
            <th>Name</th>
            <th>Enabled</th>
            <th>Chance</th>
            <th>Min delta</th>
            <th>Max delta</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {conditions.map((condition) => {
            const edit = edits[condition.id] ?? toEditable(condition);
            return (
              <tr key={condition.id} style={{ borderBottom: '1px solid #eee' }}>
                <td>{condition.code}</td>
                <td>{condition.name}</td>
                <td>
                  <input
                    type="checkbox"
                    checked={edit.isEnabled}
                    onChange={(e) => updateEdit(condition.id, { isEnabled: e.target.checked })}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    step="0.01"
                    value={edit.chance}
                    onChange={(e) => updateEdit(condition.id, { chance: e.target.value })}
                    style={{ width: 70 }}
                    disabled={condition.code === 'base'}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    value={edit.minDelta}
                    onChange={(e) => updateEdit(condition.id, { minDelta: e.target.value })}
                    style={{ width: 70 }}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    value={edit.maxDelta}
                    onChange={(e) => updateEdit(condition.id, { maxDelta: e.target.value })}
                    style={{ width: 70 }}
                  />
                </td>
                <td style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => handleSave(condition)}>Save</button>
                  <button onClick={() => handleDelete(condition)} disabled={condition.isProtected}>
                    Delete
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <h2>Create new condition</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 400 }}>
        <label>
          Code
          <select value={newCode} onChange={(e) => setNewCode(e.target.value)}>
            <option value="">- select handler code -</option>
            {creatableCodes.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
        </label>
        <label>
          Name
          <input value={newName} onChange={(e) => setNewName(e.target.value)} />
        </label>
        <label>
          Description
          <input value={newDescription} onChange={(e) => setNewDescription(e.target.value)} />
        </label>
        <label>
          Chance (0..1)
          <input type="number" step="0.01" value={newChance} onChange={(e) => setNewChance(e.target.value)} />
        </label>
        <label>
          Min delta
          <input type="number" value={newMinDelta} onChange={(e) => setNewMinDelta(e.target.value)} />
        </label>
        <label>
          Max delta
          <input type="number" value={newMaxDelta} onChange={(e) => setNewMaxDelta(e.target.value)} />
        </label>
        <button onClick={handleCreate} disabled={!newCode || !newName}>
          Create
        </button>
      </div>
    </div>
  );
}
