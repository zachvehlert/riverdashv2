import { useState, useEffect } from 'react';
import RiverTable from './components/RiverTable';
import AddRiverModal from './components/AddRiverModal';
import EditRiverModal from './components/EditRiverModal';
import HelpModal from './components/HelpModal';
import { fetchGaugeData, computeCustomGaugeData } from './services/noaaApi';
import './App.css';

const STORAGE_KEY = 'riverdash-gauges';
const THEME_KEY = 'riverdash-theme';

function getInitialTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === 'light' || saved === 'dark') return saved;
  return 'dark';
}

function loadSavedGauges() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function saveGauges(gauges) {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(
      gauges.map(({ id, name, displayName, unit, maxFlow, minFlow, isCustom, customConfig }) => ({
        id,
        name,
        displayName,
        unit: unit || 'cfs',
        maxFlow: maxFlow ?? null,
        minFlow: minFlow ?? null,
        ...(isCustom ? { isCustom: true, customConfig } : {}),
      }))
    )
  );
}

async function fetchData(gauge) {
  const unit = gauge.unit || 'cfs';
  if (gauge.isCustom) {
    const data = await computeCustomGaugeData(gauge.customConfig, unit);
    return { ...gauge, ...data, unit };
  }
  const data = await fetchGaugeData(gauge.id, unit);
  return {
    ...gauge,
    ...data,
    displayName: gauge.displayName || data.name,
    unit,
  };
}

export default function App() {
  const [rivers, setRivers] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRiver, setEditingRiver] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    async function loadData() {
      const saved = loadSavedGauges();
      if (saved.length === 0) {
        setLoading(false);
        return;
      }

      try {
        const results = await Promise.all(
          saved.map(async (gauge) => {
            try {
              return await fetchData(gauge);
            } catch {
              return {
                ...gauge,
                level: null,
                trend: null,
                updated: null,
                unit: gauge.unit || 'cfs',
              };
            }
          })
        );
        setRivers(results);
      } catch (err) {
        setError('Failed to load river data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  useEffect(() => {
    if (rivers.length > 0) {
      saveGauges(rivers);
    } else if (!loading) {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [rivers, loading]);

  function handleReorder(newOrder) {
    setRivers(newOrder);
  }

  function handleRemove(id) {
    setRivers((prev) => prev.filter((r) => r.id !== id));
  }

  async function handleAdd(gauge) {
    try {
      const result = await fetchData(gauge);
      setRivers((prev) => [...prev, result]);
    } catch {
      setRivers((prev) => [
        ...prev,
        {
          ...gauge,
          level: null,
          trend: null,
          updated: null,
        },
      ]);
    }
  }

  async function handleRefresh() {
    if (rivers.length === 0) return;

    setLoading(true);
    try {
      const results = await Promise.all(
        rivers.map(async (river) => {
          try {
            return await fetchData(river);
          } catch {
            return river;
          }
        })
      );
      setRivers(results);
    } catch (err) {
      setError('Failed to refresh data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleEditSave({ displayName, unit, minFlow, maxFlow, customConfig }) {
    if (!editingRiver) return;

    const river = editingRiver;
    const unitChanged = unit !== river.unit;
    const configChanged = customConfig && JSON.stringify(customConfig) !== JSON.stringify(river.customConfig);
    const flowFields = { minFlow, maxFlow };
    const needsRefetch = unitChanged || configChanged;

    if (needsRefetch) {
      try {
        const updated = {
          ...river,
          displayName,
          unit,
          ...flowFields,
          ...(customConfig ? { customConfig } : {}),
        };
        const data = await fetchData(updated);
        setRivers((prev) =>
          prev.map((r) =>
            r.id === river.id ? { ...data, displayName, ...flowFields } : r
          )
        );
      } catch {
        setRivers((prev) =>
          prev.map((r) =>
            r.id === river.id
              ? {
                  ...r,
                  displayName,
                  unit,
                  level: null,
                  trend: null,
                  ...flowFields,
                  ...(customConfig ? { customConfig } : {}),
                }
              : r
          )
        );
      }
    } else {
      setRivers((prev) =>
        prev.map((r) =>
          r.id === river.id ? { ...r, displayName, ...flowFields } : r
        )
      );
    }
  }

  return (
    <div className="app">
      <button className="help-btn" onClick={() => setHelpOpen(true)} aria-label="Help">
        ?
      </button>
      <header className="app-header">
        <img src="/icon.svg" alt="" className="app-icon" />
        <h1>RiverDash</h1>
        <div className="header-actions">
          <button className="add-river-btn" onClick={() => setIsModalOpen(true)}>
            Add River
          </button>
          <button
            className="refresh-btn"
            onClick={handleRefresh}
            disabled={loading || rivers.length === 0}
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </header>

      {error && <div className="error-banner">{error}</div>}

      <main className="app-main">
        {loading && rivers.length === 0 ? (
          <div className="loading-state">Loading...</div>
        ) : (
          <RiverTable
            rivers={rivers}
            onReorder={handleReorder}
            onEdit={setEditingRiver}
          />
        )}
      </main>

      <AddRiverModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAdd={handleAdd}
        existingIds={rivers.map((r) => r.id)}
      />

      <EditRiverModal
        river={editingRiver}
        isOpen={!!editingRiver}
        onClose={() => setEditingRiver(null)}
        onSave={handleEditSave}
        onDelete={() => {
          if (editingRiver) {
            handleRemove(editingRiver.id);
            setEditingRiver(null);
          }
        }}
      />

      <HelpModal
        isOpen={helpOpen}
        onClose={() => setHelpOpen(false)}
        theme={theme}
        onToggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
      />
    </div>
  );
}
