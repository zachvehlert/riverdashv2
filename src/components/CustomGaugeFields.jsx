import { useState } from 'react';
import { fetchGaugesByState } from '../services/noaaApi';

export const US_STATES = [
  { code: 'AL', name: 'Alabama' },
  { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' },
  { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'DE', name: 'Delaware' },
  { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' },
  { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' },
];

const OPERATOR_LABELS = {
  '+': '+ Add',
  '-': '\u2212 Subtract',
  '*': '\u00d7 Multiply',
  '/': '\u00f7 Divide',
};

export function emptyOperation() {
  return { operator: '+', operandType: 'number', operandValue: '', gauge: null };
}

export function GaugePicker({ label, selectedGauge, onSelect, excludeIds }) {
  const [selectedState, setSelectedState] = useState('');
  const [gauges, setGauges] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showList, setShowList] = useState(!selectedGauge);

  async function handleStateChange(e) {
    const stateCode = e.target.value;
    setSelectedState(stateCode);
    setSearchTerm('');
    setGauges([]);
    setError(null);
    setShowList(true);

    if (stateCode) {
      setLoading(true);
      try {
        const data = await fetchGaugesByState(stateCode);
        setGauges(data);
      } catch {
        setError('Failed to load gauges.');
      } finally {
        setLoading(false);
      }
    }
  }

  function handleGaugeSelect(gauge) {
    onSelect(gauge);
    setShowList(false);
  }

  const filteredGauges = gauges.filter((g) => {
    const name = g.name || g.lid || '';
    return name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  if (selectedGauge && !showList) {
    return (
      <div className="form-group">
        <label>{label}</label>
        <button
          type="button"
          className="gauge-picker-btn"
          onClick={() => setShowList(true)}
        >
          <span className="gauge-picker-name">{selectedGauge.name || selectedGauge.lid}</span>
          <span className="gauge-picker-change">Change</span>
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="form-group">
        <label>{label} — State</label>
        <select value={selectedState} onChange={handleStateChange}>
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
          <label>{label} — Search</label>
          <input
            type="text"
            placeholder="Search by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
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
              const isExcluded = excludeIds?.includes(gauge.lid);
              return (
                <div
                  key={gauge.lid}
                  className={`gauge-item ${isExcluded ? 'disabled' : ''}`}
                  onClick={() => !isExcluded && handleGaugeSelect(gauge)}
                >
                  <span className="gauge-name">{gauge.name || gauge.lid}</span>
                  {isExcluded && <span className="already-added">Already used</span>}
                </div>
              );
            })
          )}
        </div>
      )}
    </>
  );
}

export function OperationRow({ index, op, onChange, onRemove, canRemove, usedGaugeIds }) {
  function updateField(field, value) {
    onChange(index, { ...op, [field]: value });
  }

  return (
    <div className="operation-row">
      <div className="operation-header">
        <span className="operation-label">Operation {index + 1}</span>
        {canRemove && (
          <button type="button" className="operation-remove-btn" onClick={() => onRemove(index)}>
            Remove
          </button>
        )}
      </div>

      <div className="form-group">
        <label>Operator</label>
        <select value={op.operator} onChange={(e) => updateField('operator', e.target.value)}>
          {Object.entries(OPERATOR_LABELS).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label>Operand Type</label>
        <div className="mode-toggle">
          <button
            className={`mode-toggle-btn ${op.operandType === 'number' ? 'active' : ''}`}
            onClick={() => updateField('operandType', 'number')}
          >
            Flat Number
          </button>
          <button
            className={`mode-toggle-btn ${op.operandType === 'gauge' ? 'active' : ''}`}
            onClick={() => updateField('operandType', 'gauge')}
          >
            Another Gauge
          </button>
        </div>
      </div>

      {op.operandType === 'number' ? (
        <div className="form-group">
          <label>Value</label>
          <input
            type="number"
            value={op.operandValue}
            onChange={(e) => updateField('operandValue', e.target.value)}
            placeholder="e.g. 500"
          />
        </div>
      ) : (
        <GaugePicker
          label="Gauge"
          selectedGauge={op.gauge}
          onSelect={(g) => updateField('gauge', g)}
          excludeIds={usedGaugeIds}
        />
      )}
    </div>
  );
}

// Converts persisted customConfig into form-editable state objects
export function configToFormState(customConfig) {
  const baseGauge = {
    lid: customConfig.baseGauge,
    name: customConfig.baseGaugeName || customConfig.baseGauge,
  };

  const operations = (customConfig.operations || []).map(op => ({
    operator: op.operator,
    operandType: op.operandType,
    operandValue: op.operandType === 'number' ? String(op.operandValue ?? '') : '',
    gauge: op.operandType === 'gauge'
      ? { lid: op.gauge, name: op.gaugeName || op.gauge }
      : null,
  }));

  return { baseGauge, operations };
}

// Converts form state back to persisted customConfig format
export function formStateToConfig(baseGauge, operations) {
  return {
    baseGauge: baseGauge.lid,
    baseGaugeName: baseGauge.name || baseGauge.lid,
    operations: operations.map(op => ({
      operator: op.operator,
      operandType: op.operandType,
      ...(op.operandType === 'number'
        ? { operandValue: parseFloat(op.operandValue) }
        : { gauge: op.gauge.lid, gaugeName: op.gauge.name || op.gauge.lid }),
    })),
  };
}

export function operationsValid(operations) {
  return operations.length > 0 && operations.every(op =>
    op.operandType === 'number'
      ? op.operandValue !== '' && !isNaN(parseFloat(op.operandValue))
      : op.gauge != null
  );
}

export function getUsedGaugeIds(baseGauge, operations) {
  return [
    baseGauge?.lid,
    ...operations.filter(op => op.operandType === 'gauge' && op.gauge).map(op => op.gauge.lid),
  ].filter(Boolean);
}
