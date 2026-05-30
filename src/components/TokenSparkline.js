import React, { useMemo } from 'react';

const TokenSparkline = ({ prices, width = 100, height = 28, className = '' }) => {
  const chart = useMemo(() => {
    if (!Array.isArray(prices) || prices.length < 2) return null;

    const validPrices = prices.filter((p) => Number.isFinite(p) && p > 0);
    if (validPrices.length < 2) return null;

    const min = Math.min(...validPrices);
    const max = Math.max(...validPrices);
    const range = max - min || 1;
    const padding = 2;
    const innerHeight = height - padding * 2;

    const points = validPrices
      .map((price, i) => {
        const x = (i / (validPrices.length - 1)) * width;
        const y = padding + innerHeight - ((price - min) / range) * innerHeight;
        return `${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(' ');

    const isPositive = validPrices[validPrices.length - 1] >= validPrices[0];

    return {
      points,
      color: isPositive ? '#4ade80' : '#f87171',
    };
  }, [prices, width, height]);

  if (!chart) {
    return <span className={`inline-block text-gray-600 text-xs ${className}`}>—</span>;
  }

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      aria-hidden="true"
    >
      <polyline
        fill="none"
        stroke={chart.color}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        points={chart.points}
      />
    </svg>
  );
};

export default React.memo(TokenSparkline);
