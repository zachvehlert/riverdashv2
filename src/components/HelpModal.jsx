export default function HelpModal({ isOpen, onClose, theme, onToggleTheme }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>About RiverDash</h2>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="modal-body help-body">
          <div className="theme-toggle-row">
            <span className="theme-toggle-label">Dark Mode</span>
            <button
              className={`toggle-switch ${theme === 'dark' ? 'active' : ''}`}
              onClick={onToggleTheme}
              role="switch"
              aria-checked={theme === 'dark'}
              aria-label="Toggle dark mode"
            >
              <span className="toggle-knob" />
            </button>
          </div>

          <p>
            This site is a simple tool for tracking flows on your favorite
            rivers. <strong>RiverDash will always be free and will never require a
            login.</strong>
          </p>

          <h3>Getting Started</h3>
          <p>
            Use the{' '}
            <span className="help-inline-btn">Add River</span>
            {' '}button to add gauges to your dashboard.
          </p>

          <h3>Reading the Data</h3>
          <p>
            Click on any river to edit its display name, flow thresholds,
            and measurement type.
          </p>
          <p>
            Flow values are shown in either feet (ft) or cubic feet per
            second (cfs).
          </p>

          <h3>Color Coding</h3>

          <h4>Level</h4>
          <div className="help-examples">
            <div className="help-example-row">
              <span className="badge level-in-range">1,234 cfs</span>
              <span className="help-example-desc">Water level is within set range</span>
            </div>
            <div className="help-example-row">
              <span className="badge level-out-of-range">1,234 cfs</span>
              <span className="help-example-desc">Water level is outside set range</span>
            </div>
            <div className="help-example-row">
              <span className="badge">1,234 cfs</span>
              <span className="help-example-desc">Water level range is not set</span>
            </div>
          </div>

          <h4>Trend</h4>
          <div className="help-examples">
            <div className="help-example-row">
              <span className="badge trend-rising">⬆️ 12.3 cfs/hr</span>
              <span className="help-example-desc">Water level is rising</span>
            </div>
            <div className="help-example-row">
              <span className="badge trend-falling">⬇️ 8.5 cfs/hr</span>
              <span className="help-example-desc">Water level is falling</span>
            </div>
            <div className="help-example-row">
              <span className="badge trend-stable">Flat</span>
              <span className="help-example-desc">Water level is stable</span>
            </div>
          </div>

          <h3>Custom Gauges</h3>
          <p>
            Switch to the <strong>Custom Gauge</strong> tab when adding a river
            to create a derived gauge that performs math on real USGS readings.
            Pick a base gauge, then add one or more operations
            (+, −, ×, ÷) using either a flat number or
            another USGS gauge.
          </p>

          <h3>Data Storage</h3>
          <p>
            Your gauge list is saved in your browser's local storage. No
            account or login is needed — just bookmark the page and your
            dashboard will be waiting for you.
          </p>
        </div>

        <div className="modal-footer">
          <span />
          <button className="add-btn" onClick={onClose}>
            Got It
          </button>
        </div>
      </div>
    </div>
  );
}
