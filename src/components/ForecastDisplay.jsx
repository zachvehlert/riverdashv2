import { useState } from 'react';

export default function ForecastDisplay({ data, loading, error }) {
  const [useFallback, setUseFallback] = useState(false);

  if (loading) {
    return <div className="forecast-loading">Loading flow graph...</div>;
  }

  if (error) {
    return <div className="forecast-error">Flow graph unavailable</div>;
  }

  if (!data?.lid) {
    return <div className="forecast-empty">No flow graph available</div>;
  }

  const lid = data.lid.toUpperCase();
  const primaryUrl = `https://water.noaa.gov/resources/probabilistic/short_term/${lid}.shortrange.hefs.png`;
  const fallbackUrl = `https://www.nwrfc.noaa.gov/station/flowplot/hydroPlot.php?id=${data.lid}&pe=HG&v=${Date.now()}`;
  const imgUrl = useFallback ? fallbackUrl : primaryUrl;

  return (
    <div className="forecast-display">
      <div className="forecast-graph">
        <a href={imgUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
          <img
            src={imgUrl}
            alt="Hydrograph"
            onError={(e) => {
              if (!useFallback) {
                setUseFallback(true);
              } else {
                e.target.closest('.forecast-graph').innerHTML = '<div class="forecast-error">Graph unavailable</div>';
              }
            }}
          />
        </a>
      </div>
    </div>
  );
}
