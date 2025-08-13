import React, { useMemo, useState, useEffect } from 'react';
import TradingViewChart from './TradingViewChart';

const ChartDock = React.memo(({ symbol }) => {
  const normalizedSymbol = useMemo(() => {
    if (!symbol || typeof symbol !== 'string') return null;
    return symbol.toUpperCase();
  }, [symbol]);

  const [lastSymbol, setLastSymbol] = useState(null);
  useEffect(() => {
    if (normalizedSymbol) setLastSymbol(normalizedSymbol);
  }, [normalizedSymbol]);

  if (!lastSymbol) return null;

  return (
    <div className="mt-4 bg-gray-700/50 rounded-lg overflow-hidden">
      <TradingViewChart symbol={lastSymbol} isMobile={false} />
    </div>
  );
});

export default ChartDock;


