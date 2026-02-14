import { useState, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import ForecastDisplay from './ForecastDisplay';
import { fetchForecast } from '../services/noaaApi';

function formatLevel(level, unit) {
  if (level == null) return '—';
  if (unit === 'cfs') {
    return `${Math.round(level).toLocaleString()} cfs`;
  }
  return `${level.toFixed(2)} ft`;
}

function isFlat(trend, unit) {
  if (trend === 0) return true;
  return unit === 'ft' && Math.abs(trend) <= 0.1;
}

function formatTrend(trend, unit) {
  if (trend == null || typeof trend !== 'number') return '—';
  if (isFlat(trend, unit)) return 'Flat';
  const arrow = trend > 0 ? '⬆️' : '⬇️';
  if (unit === 'cfs') {
    return `${arrow} ${Math.abs(Math.round(trend)).toLocaleString()} cfs/hr`;
  }
  return `${arrow} ${Math.abs(trend).toFixed(2)} ft/hr`;
}

function getTrendClass(trend, unit) {
  if (trend == null || typeof trend !== 'number' || isFlat(trend, unit)) return 'trend-stable';
  if (trend > 0) return 'trend-rising';
  if (trend < 0) return 'trend-falling';
  return 'trend-stable';
}

function getLevelClass(level, minFlow, maxFlow) {
  if (level == null) return '';
  const hasMin = minFlow != null;
  const hasMax = maxFlow != null;
  if (!hasMin && !hasMax) return '';
  if (hasMin && level < minFlow) return 'level-out-of-range';
  if (hasMax && level > maxFlow) return 'level-out-of-range';
  return 'level-in-range';
}

function formatUpdated(timestamp) {
  if (!timestamp) return '—';
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export default function RiverRow({ river, onEdit }) {
  const [expanded, setExpanded] = useState(false);
  const [forecastData, setForecastData] = useState(null);
  const [forecastLoading, setForecastLoading] = useState(false);
  const [forecastError, setForecastError] = useState(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: river.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const unit = river.unit || 'cfs';
  const displayName = river.displayName || river.name;
  const isCustom = river.isCustom;

  useEffect(() => {
    if (expanded && !isCustom && !forecastData && !forecastLoading && !forecastError) {
      setForecastLoading(true);
      fetchForecast(river.id)
        .then(setForecastData)
        .catch((err) => {
          console.error('Failed to fetch forecast:', err);
          setForecastError(err);
        })
        .finally(() => setForecastLoading(false));
    }
  }, [expanded, river.id, isCustom, forecastData, forecastLoading, forecastError]);

  function handleRowClick(e) {
    if (e.target.closest('.drag-handle') || e.target.closest('.edit-btn')) {
      return;
    }
    setExpanded(!expanded);
  }

  return (
    <>
      <tr
        ref={setNodeRef}
        style={style}
        className={`river-row ${isDragging ? 'dragging' : ''} ${expanded ? 'expanded' : ''}`}
        onClick={handleRowClick}
      >
        <td className="drag-handle" {...attributes} {...listeners}>
          ⠿
        </td>
        <td className="river-name">
          {displayName}
        </td>
        <td className="river-level">
          {river.frozen && river.level == null
            ? <span className="gauge-frozen">Gauge Frozen (Estimated)</span>
            : <span className={`badge ${getLevelClass(river.level, river.minFlow, river.maxFlow)}`}>{formatLevel(river.level, unit)}</span>}
        </td>
        <td className="river-trend">
          <span className={`badge ${getTrendClass(river.trend, river.unit)}`}>
            {formatTrend(river.trend, unit)}
          </span>
        </td>
        <td className="river-updated">{formatUpdated(river.updated)}</td>
        <td className="river-actions">
          <button className="edit-btn" onClick={() => onEdit(river)}>
            ✎
          </button>
        </td>
      </tr>
      {expanded && (
        <tr className="forecast-row">
          <td colSpan="6">
            {!isCustom && (
              <>
                <ForecastDisplay
                  data={forecastData}
                  loading={forecastLoading}
                  error={forecastError}
                />
                <div className="gauge-links">
                  <a
                    href={`https://waterdata.usgs.gov/monitoring-location/USGS-${river.id}/`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="gauge-link-btn"
                    onClick={(e) => e.stopPropagation()}
                  >
                    View on USGS
                  </a>
                  {forecastData?.lid && (
                    <a
                      href={`https://water.noaa.gov/gauges/${forecastData.lid}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="gauge-link-btn"
                      onClick={(e) => e.stopPropagation()}
                    >
                      View on NOAA
                    </a>
                  )}
                </div>
              </>
            )}
            <div className="mobile-edit">
              <button className="edit-btn" onClick={() => onEdit(river)}>
                ✎ Edit Gauge
              </button>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
