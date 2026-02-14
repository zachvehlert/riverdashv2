import { useState } from 'react';
import { fetchGaugesByState } from '../services/noaaApi';
import {
  US_STATES,
  GaugePicker,
  OperationRow,
  emptyOperation,
  formStateToConfig,
  operationsValid,
  getUsedGaugeIds,
} from './CustomGaugeFields';

export default function AddRiverModal({ isOpen, onClose, onAdd, existingIds }) {
  const [mode, setMode] = useState('usgs'); // 'usgs' | 'custom'

  // USGS mode state
  const [selectedState, setSelectedState] = useState('');
  const [gauges, setGauges] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedGauge, setSelectedGauge] = useState(null);
  const [customName, setCustomName] = useState('');
  const [unit, setUnit] = useState('cfs');
  const [showList, setShowList] = useState(true);
  const [maxFlow, setMaxFlow] = useState('');
  const [minFlow, setMinFlow] = useState('');

  // Custom mode state
  const [baseGauge, setBaseGauge] = useState(null);
  const [operations, setOperations] = useState([emptyOperation()]);
  const [customDisplayName, setCustomDisplayName] = useState('');
  const [customUnit, setCustomUnit] = useState('cfs');
  const [customMaxFlow, setCustomMaxFlow] = useState('');
  const [customMinFlow, setCustomMinFlow] = useState('');

  if (!isOpen) return null;

  const usedGaugeIds = getUsedGaugeIds(baseGauge, operations);

  // Auto-populate custom display name
  function getAutoName() {
    if (!baseGauge) return '';
    let name = baseGauge.name || baseGauge.lid;
    for (const op of operations) {
      if (op.operandType === 'number' && op.operandValue !== '') {
        name += ` ${op.operator} ${op.operandValue}`;
      } else if (op.operandType === 'gauge' && op.gauge) {
        name += ` ${op.operator} ${op.gauge.name || op.gauge.lid}`;
      }
    }
    return name;
  }

  function handleOperationChange(index, updatedOp) {
    setOperations(prev => prev.map((op, i) => i === index ? updatedOp : op));
  }

  function handleOperationRemove(index) {
    setOperations(prev => prev.filter((_, i) => i !== index));
  }

  function handleAddOperation() {
    setOperations(prev => [...prev, emptyOperation()]);
  }

  // USGS mode handlers
  async function handleStateChange(e) {
    const stateCode = e.target.value;
    setSelectedState(stateCode);
    setSearchTerm('');
    setSelectedGauge(null);
    setCustomName('');
    setGauges([]);
    setError(null);
    setShowList(true);

    if (stateCode) {
      setLoading(true);
      try {
        const data = await fetchGaugesByState(stateCode);
        setGauges(data);
      } catch (err) {
        setError('Failed to load gauges. Please try again.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
  }

  function handleGaugeSelect(gauge) {
    setSelectedGauge(gauge);
    setCustomName(gauge.name || gauge.lid);
    setShowList(false);
  }

  const filteredGauges = gauges.filter((g) => {
    const name = g.name || g.lid || '';
    return name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  function handleAddUsgs() {
    if (selectedGauge) {
      onAdd({
        id: selectedGauge.lid,
        name: selectedGauge.name || selectedGauge.lid,
        displayName: customName.trim() || selectedGauge.name || selectedGauge.lid,
        unit,
        maxFlow: maxFlow ? parseFloat(maxFlow) : null,
        minFlow: minFlow ? parseFloat(minFlow) : null,
      });
      handleClose();
    }
  }

  function handleAddCustom() {
    const autoName = getAutoName();
    const displayName = customDisplayName.trim() || autoName;

    onAdd({
      id: `custom-${Date.now()}`,
      name: displayName,
      displayName,
      unit: customUnit,
      maxFlow: customMaxFlow ? parseFloat(customMaxFlow) : null,
      minFlow: customMinFlow ? parseFloat(customMinFlow) : null,
      isCustom: true,
      customConfig: formStateToConfig(baseGauge, operations),
    });
    handleClose();
  }

  const isCustomValid = baseGauge && operationsValid(operations);

  function handleClose() {
    setMode('usgs');
    setSelectedState('');
    setGauges([]);
    setSearchTerm('');
    setSelectedGauge(null);
    setCustomName('');
    setUnit('cfs');
    setMaxFlow('');
    setMinFlow('');
    setError(null);
    setShowList(true);
    setBaseGauge(null);
    setOperations([emptyOperation()]);
    setCustomDisplayName('');
    setCustomUnit('cfs');
    setCustomMaxFlow('');
    setCustomMinFlow('');
    onClose();
  }

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add River Gauge</h2>
          <button className="close-btn" onClick={handleClose}>
            ×
          </button>
        </div>

        <div className="modal-body">
          <div className="mode-toggle">
            <button
              className={`mode-toggle-btn ${mode === 'usgs' ? 'active' : ''}`}
              onClick={() => setMode('usgs')}
            >
              USGS Gauge
            </button>
            <button
              className={`mode-toggle-btn ${mode === 'custom' ? 'active' : ''}`}
              onClick={() => setMode('custom')}
            >
              Custom Gauge
            </button>
          </div>

          {mode === 'usgs' ? (
            <>
              <div className="form-group">
                <label htmlFor="state-select">State</label>
                <select
                  id="state-select"
                  value={selectedState}
                  onChange={handleStateChange}
                >
                  <option value="">Select a state...</option>
                  {US_STATES.map((state) => (
                    <option key={state.code} value={state.code}>
                      {state.name}
                    </option>
                  ))}
                </select>
              </div>

              {selectedState && (
                <div className="form-group">
                  <label htmlFor="search-input">Search Gauges</label>
                  <input
                    id="search-input"
                    type="text"
                    placeholder="Search by name..."
                    value={showList ? searchTerm : (selectedGauge?.name || selectedGauge?.lid || searchTerm)}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onFocus={() => { setShowList(true); setSearchTerm(''); }}
                  />
                </div>
              )}

              {loading && <div className="loading">Loading gauges...</div>}

              {error && <div className="error">{error}</div>}

              {!loading && selectedState && showList && (
                <div className="gauge-list">
                  {filteredGauges.length === 0 ? (
                    <p className="no-results">No gauges found.</p>
                  ) : (
                    filteredGauges.map((gauge) => {
                      const isExisting = existingIds.includes(gauge.lid);
                      return (
                        <div
                          key={gauge.lid}
                          className={`gauge-item ${
                            selectedGauge?.lid === gauge.lid ? 'selected' : ''
                          } ${isExisting ? 'disabled' : ''}`}
                          onClick={() => !isExisting && handleGaugeSelect(gauge)}
                        >
                          <span className="gauge-name">
                            {gauge.name || gauge.lid}
                          </span>
                          {isExisting && (
                            <span className="already-added">Already added</span>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {selectedGauge && (
                <>
                  <div className="form-group">
                    <label htmlFor="custom-name">Display Name</label>
                    <input
                      id="custom-name"
                      type="text"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      placeholder="Custom display name..."
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="unit-select">Display Unit</label>
                    <select
                      id="unit-select"
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                    >
                      <option value="cfs">Flow (cfs)</option>
                      <option value="ft">Gage Height (ft)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="min-flow">Min Runnable Flow</label>
                    <input
                      id="min-flow"
                      type="number"
                      value={minFlow}
                      onChange={(e) => setMinFlow(e.target.value)}
                      placeholder="Optional"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="max-flow">Max Runnable Flow</label>
                    <input
                      id="max-flow"
                      type="number"
                      value={maxFlow}
                      onChange={(e) => setMaxFlow(e.target.value)}
                      placeholder="Optional"
                    />
                  </div>
                </>
              )}
            </>
          ) : (
            /* Custom Gauge Mode */
            <>
              <GaugePicker
                label="Base Gauge"
                selectedGauge={baseGauge}
                onSelect={setBaseGauge}
                excludeIds={[]}
              />

              {baseGauge && (
                <>
                  {operations.map((op, i) => (
                    <OperationRow
                      key={i}
                      index={i}
                      op={op}
                      onChange={handleOperationChange}
                      onRemove={handleOperationRemove}
                      canRemove={operations.length > 1}
                      usedGaugeIds={usedGaugeIds}
                    />
                  ))}

                  <button
                    type="button"
                    className="add-operation-btn"
                    onClick={handleAddOperation}
                  >
                    + Add Operation
                  </button>

                  <div className="form-group">
                    <label>Display Name</label>
                    <input
                      type="text"
                      value={customDisplayName}
                      onChange={(e) => setCustomDisplayName(e.target.value)}
                      placeholder={getAutoName() || 'Custom display name...'}
                    />
                  </div>

                  <div className="form-group">
                    <label>Display Unit</label>
                    <select
                      value={customUnit}
                      onChange={(e) => setCustomUnit(e.target.value)}
                    >
                      <option value="cfs">Flow (cfs)</option>
                      <option value="ft">Gage Height (ft)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Min Runnable Flow</label>
                    <input
                      type="number"
                      value={customMinFlow}
                      onChange={(e) => setCustomMinFlow(e.target.value)}
                      placeholder="Optional"
                    />
                  </div>

                  <div className="form-group">
                    <label>Max Runnable Flow</label>
                    <input
                      type="number"
                      value={customMaxFlow}
                      onChange={(e) => setCustomMaxFlow(e.target.value)}
                      placeholder="Optional"
                    />
                  </div>
                </>
              )}
            </>
          )}
        </div>

        <div className="modal-footer">
          <button className="cancel-btn" onClick={handleClose}>
            Cancel
          </button>
          {mode === 'usgs' ? (
            <button
              className="add-btn"
              onClick={handleAddUsgs}
              disabled={!selectedGauge}
            >
              Add Gauge
            </button>
          ) : (
            <button
              className="add-btn"
              onClick={handleAddCustom}
              disabled={!isCustomValid}
            >
              Add Custom Gauge
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
