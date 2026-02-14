import { useState, useEffect } from 'react';
import {
  GaugePicker,
  OperationRow,
  emptyOperation,
  configToFormState,
  formStateToConfig,
  operationsValid,
  getUsedGaugeIds,
} from './CustomGaugeFields';

export default function EditRiverModal({ river, isOpen, onClose, onSave, onDelete }) {
  const [displayName, setDisplayName] = useState('');
  const [unit, setUnit] = useState('cfs');
  const [minFlow, setMinFlow] = useState('');
  const [maxFlow, setMaxFlow] = useState('');

  // Custom gauge editing state
  const [baseGauge, setBaseGauge] = useState(null);
  const [operations, setOperations] = useState([emptyOperation()]);

  useEffect(() => {
    if (river) {
      setDisplayName(river.displayName || river.name || '');
      setUnit(river.unit || 'cfs');
      setMinFlow(river.minFlow != null ? String(river.minFlow) : '');
      setMaxFlow(river.maxFlow != null ? String(river.maxFlow) : '');

      if (river.isCustom && river.customConfig) {
        const { baseGauge: bg, operations: ops } = configToFormState(river.customConfig);
        setBaseGauge(bg);
        setOperations(ops.length > 0 ? ops : [emptyOperation()]);
      } else {
        setBaseGauge(null);
        setOperations([emptyOperation()]);
      }
    }
  }, [river]);

  if (!isOpen || !river) return null;

  const isCustom = river.isCustom;
  const usedGaugeIds = isCustom ? getUsedGaugeIds(baseGauge, operations) : [];

  function handleOperationChange(index, updatedOp) {
    setOperations(prev => prev.map((op, i) => i === index ? updatedOp : op));
  }

  function handleOperationRemove(index) {
    setOperations(prev => prev.filter((_, i) => i !== index));
  }

  function handleAddOperation() {
    setOperations(prev => [...prev, emptyOperation()]);
  }

  const customValid = !isCustom || (baseGauge && operationsValid(operations));

  function handleSave() {
    const result = {
      displayName: displayName.trim() || river.name,
      unit,
      minFlow: minFlow ? parseFloat(minFlow) : null,
      maxFlow: maxFlow ? parseFloat(maxFlow) : null,
    };

    if (isCustom && baseGauge) {
      result.customConfig = formStateToConfig(baseGauge, operations);
    }

    onSave(result);
    onClose();
  }

  function handleDelete() {
    if (confirm('Remove this gauge?')) {
      onDelete();
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={`modal-content ${isCustom ? '' : 'modal-small'}`} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Edit Gauge</h2>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="modal-body">
          {isCustom && (
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
                </>
              )}
            </>
          )}

          <div className="form-group">
            <label htmlFor="edit-name">Display Name</label>
            <input
              id="edit-name"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="edit-unit">Display Unit</label>
            <select
              id="edit-unit"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
            >
              <option value="cfs">Flow (cfs)</option>
              <option value="ft">Gage Height (ft)</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="edit-min-flow">Min Runnable Flow</label>
            <input
              id="edit-min-flow"
              type="number"
              value={minFlow}
              onChange={(e) => setMinFlow(e.target.value)}
              placeholder="Optional"
            />
          </div>

          <div className="form-group">
            <label htmlFor="edit-max-flow">Max Runnable Flow</label>
            <input
              id="edit-max-flow"
              type="number"
              value={maxFlow}
              onChange={(e) => setMaxFlow(e.target.value)}
              placeholder="Optional"
            />
          </div>
        </div>

        <div className="modal-footer">
          <button className="delete-btn" onClick={handleDelete}>
            Delete
          </button>
          <div className="modal-footer-right">
            <button className="cancel-btn" onClick={onClose}>
              Cancel
            </button>
            <button className="add-btn" onClick={handleSave} disabled={!customValid}>
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
