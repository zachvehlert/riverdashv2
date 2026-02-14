const isDev = import.meta.env.DEV;
const USGS_BASE = isDev ? '/api/usgs' : 'https://waterservices.usgs.gov/nwis';
const NOAA_BASE = isDev ? '/api/noaa' : 'https://api.water.noaa.gov/nwps/v1';

// USGS parameter codes
const PARAM_CODES = {
  cfs: '00060', // Discharge, cubic feet per second
  ft: '00065',  // Gage height, feet
};

export async function fetchGaugesByState(stateCode) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const url = `${USGS_BASE}/site/?format=rdb&stateCd=${stateCode}&siteType=ST&siteStatus=active&hasDataTypeCd=iv`;
    const response = await fetch(url, { signal: controller.signal });

    if (!response.ok) {
      throw new Error(`Failed to fetch gauges: ${response.status}`);
    }

    const text = await response.text();
    return parseUSGSSites(text);
  } finally {
    clearTimeout(timeout);
  }
}

function parseUSGSSites(rdbText) {
  const lines = rdbText.split('\n');
  const sites = [];

  let headerIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line && !line.startsWith('#')) {
      headerIndex = i;
      break;
    }
  }

  if (headerIndex === -1) return sites;

  const headers = lines[headerIndex].split('\t');
  const siteNoIndex = headers.indexOf('site_no');
  const stationNmIndex = headers.indexOf('station_nm');

  if (siteNoIndex === -1) return sites;

  for (let i = headerIndex + 2; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const fields = line.split('\t');
    const siteNo = fields[siteNoIndex];
    const stationNm = fields[stationNmIndex] || siteNo;

    if (siteNo) {
      sites.push({
        lid: siteNo,
        name: stationNm,
      });
    }
  }

  return sites;
}

// Fetches full time series for a gauge: { id, name, values: [{dateTime, value}], unit, frozen }
export async function fetchGaugeTimeSeries(gaugeId, unit = 'cfs') {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  const paramCode = PARAM_CODES[unit] || PARAM_CODES.cfs;

  try {
    const url = `${USGS_BASE}/iv/?format=json&sites=${gaugeId}&parameterCd=${paramCode}&period=PT3H`;
    const response = await fetch(url, { signal: controller.signal });

    if (!response.ok) {
      throw new Error(`Failed to fetch gauge data: ${response.status}`);
    }

    const data = await response.json();
    return parseUSGSTimeSeries(gaugeId, data, unit);
  } finally {
    clearTimeout(timeout);
  }
}

function parseUSGSTimeSeries(gaugeId, data, unit) {
  const timeSeries = data.value?.timeSeries?.[0];

  if (!timeSeries) {
    return { id: gaugeId, name: gaugeId, values: [], unit, frozen: false };
  }

  const name = timeSeries.sourceInfo?.siteName || gaugeId;
  const noDataValue = timeSeries.variable?.noDataValue;
  const rawValues = timeSeries.values?.[0]?.value || [];
  const frozen = rawValues.some(v => v.qualifiers?.includes('Ice'));
  const values = rawValues
    .filter(v => parseFloat(v.value) !== noDataValue)
    .map(v => ({ dateTime: v.dateTime, value: parseFloat(v.value) }))
    .filter(v => !isNaN(v.value));

  return { id: gaugeId, name, values, unit, frozen };
}

// Derives level/trend/updated from a time series
function deriveFromTimeSeries(series) {
  const { id, name, values, unit, frozen } = series;

  if (values.length === 0) {
    return { id, name, level: null, trend: null, updated: null, unit, frozen };
  }

  const latest = values[values.length - 1];
  const level = latest.value;
  const updated = latest.dateTime;
  const trend = calculateTrend(values);

  return { id, name, level, trend, updated, unit, frozen };
}

export async function fetchGaugeData(gaugeId, unit = 'cfs') {
  const series = await fetchGaugeTimeSeries(gaugeId, unit);
  return deriveFromTimeSeries(series);
}

export async function computeCustomGaugeData(customConfig, unit = 'cfs') {
  const { baseGauge, operations } = customConfig;

  // Fetch base gauge time series
  const baseSeries = await fetchGaugeTimeSeries(baseGauge, unit);
  let currentValues = baseSeries.values;
  let oldestUpdated = currentValues.length > 0
    ? currentValues[currentValues.length - 1].dateTime
    : null;

  // Apply each operation left-to-right
  for (const op of operations) {
    if (currentValues.length === 0) break;

    if (op.operandType === 'number') {
      const numValue = parseFloat(op.operandValue);
      if (isNaN(numValue)) {
        return { level: null, trend: null, updated: null };
      }
      currentValues = currentValues.map(pt => ({
        dateTime: pt.dateTime,
        value: applyOp(pt.value, op.operator, numValue),
      }));
    } else {
      // operandType === 'gauge'
      const opSeries = await fetchGaugeTimeSeries(op.gauge, unit);
      currentValues = alignAndCompute(currentValues, opSeries.values, op.operator);

      // Track oldest updated timestamp
      if (opSeries.values.length > 0) {
        const opUpdated = opSeries.values[opSeries.values.length - 1].dateTime;
        if (oldestUpdated && new Date(opUpdated) < new Date(oldestUpdated)) {
          oldestUpdated = opUpdated;
        }
      }
    }
  }

  if (currentValues.length === 0) {
    return { level: null, trend: null, updated: null };
  }

  const derivedSeries = { ...baseSeries, values: currentValues };
  const result = deriveFromTimeSeries(derivedSeries);

  return {
    level: result.level,
    trend: result.trend,
    updated: oldestUpdated || result.updated,
  };
}

function applyOp(a, operator, b) {
  switch (operator) {
    case '+': return a + b;
    case '-': return a - b;
    case '*': return a * b;
    case '/': return b !== 0 ? a / b : NaN;
    default: return a;
  }
}

// Aligns two time series by timestamp (7.5min tolerance) and computes point-by-point
function alignAndCompute(valuesA, valuesB, operator) {
  const TOLERANCE_MS = 7.5 * 60 * 1000; // 7.5 minutes
  const results = [];

  for (const ptA of valuesA) {
    const timeA = new Date(ptA.dateTime).getTime();

    // Find closest point in B within tolerance
    let bestMatch = null;
    let bestDiff = Infinity;

    for (const ptB of valuesB) {
      const diff = Math.abs(new Date(ptB.dateTime).getTime() - timeA);
      if (diff < bestDiff) {
        bestDiff = diff;
        bestMatch = ptB;
      }
    }

    if (bestMatch && bestDiff <= TOLERANCE_MS) {
      const value = applyOp(ptA.value, operator, bestMatch.value);
      results.push({ dateTime: ptA.dateTime, value });
    }
  }

  return results;
}

function findClosestReading(values, targetTime) {
  let closest = null;
  let closestDiff = Infinity;

  for (let i = values.length - 1; i >= 0; i--) {
    const readingTime = new Date(values[i].dateTime).getTime();
    const diff = Math.abs(readingTime - targetTime);

    if (diff < closestDiff) {
      closestDiff = diff;
      closest = values[i];
    } else if (readingTime < targetTime) {
      break;
    }
  }

  return closest;
}

function parseValue(reading) {
  const v = typeof reading.value === 'number' ? reading.value : parseFloat(reading.value);
  return isNaN(v) ? null : v;
}

function calculateTrend(values) {
  if (values.length < 2) return null;

  const latest = values[values.length - 1];
  const latestTime = new Date(latest.dateTime).getTime();
  const latestValue = parseValue(latest);

  if (latestValue == null) return null;

  // Pick 3 points: now, ~1hr ago, ~2hrs ago
  const points = [{ time: latestTime, value: latestValue }];

  for (let hoursBack = 1; hoursBack <= 2; hoursBack++) {
    const target = latestTime - hoursBack * 60 * 60 * 1000;
    const reading = findClosestReading(values, target);
    if (!reading) break;

    const val = parseValue(reading);
    if (val == null) break;

    points.push({ time: new Date(reading.dateTime).getTime(), value: val });
  }

  if (points.length < 2) return null;

  // Average the rate per hour across consecutive pairs
  const rates = [];
  for (let i = 0; i < points.length - 1; i++) {
    const hours = (points[i].time - points[i + 1].time) / (1000 * 60 * 60);
    if (hours < 0.1) continue;
    rates.push((points[i].value - points[i + 1].value) / hours);
  }

  if (rates.length === 0) return null;

  const avg = rates.reduce((sum, r) => sum + r, 0) / rates.length;
  return Math.round(avg * 100) / 100;
}

export async function fetchForecast(gaugeId) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
    // Fetch both gauge info (for images) and stageflow (for forecast data)
    const [gaugeResponse, stageflowResponse] = await Promise.all([
      fetch(`${NOAA_BASE}/gauges/${gaugeId}`, { signal: controller.signal }),
      fetch(`${NOAA_BASE}/gauges/${gaugeId}/stageflow`, { signal: controller.signal }),
    ]);

    if (!gaugeResponse.ok || !stageflowResponse.ok) {
      throw new Error(`Failed to fetch forecast`);
    }

    const [gaugeData, stageflowData] = await Promise.all([
      gaugeResponse.json(),
      stageflowResponse.json(),
    ]);

    return {
      daily: parseForecast(stageflowData),
      images: gaugeData.images || {},
      lid: gaugeData.lid,
    };
  } finally {
    clearTimeout(timeout);
  }
}

function parseForecast(data) {
  const forecastData = data.forecast?.data || [];

  if (forecastData.length === 0) {
    return [];
  }

  // Group by day and calculate high/low
  const dailyData = {};

  for (const point of forecastData) {
    const date = new Date(point.validTime);
    const dayKey = date.toISOString().split('T')[0];

    // Flow is in kcfs (thousands of cfs), convert to cfs
    const flowCfs = (point.secondary || 0) * 1000;

    if (!dailyData[dayKey]) {
      dailyData[dayKey] = {
        date: dayKey,
        high: flowCfs,
        low: flowCfs,
      };
    }

    dailyData[dayKey].high = Math.max(dailyData[dayKey].high, flowCfs);
    dailyData[dayKey].low = Math.min(dailyData[dayKey].low, flowCfs);
  }

  // Convert to array and sort by date, limit to 5 days
  return Object.values(dailyData)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5);
}
