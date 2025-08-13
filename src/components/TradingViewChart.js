import React, { useEffect, useRef, useMemo } from 'react';

const TradingViewChart = React.memo(({ symbol, isMobile = false }) => {
  const containerRef = useRef(null);
  const widgetRef = useRef(null);
  const scriptRef = useRef(null);

  // Memoize the widget configuration to prevent unnecessary re-renders
  const widgetConfig = useMemo(() => ({
    autosize: true,
    symbol: `BINANCE:${symbol}USDT`,
    interval: 'D',
    timezone: 'Etc/UTC',
    theme: 'dark',
    style: '1',
    locale: 'en',
    toolbar_bg: '#f1f3f6',
    enable_publishing: false,
    allow_symbol_change: false,
    width: '100%',
    height: isMobile ? '400px' : '700px',
    hide_top_toolbar: false,
    hide_legend: false,
    save_image: false,
    backgroundColor: 'rgba(19, 23, 34, 0.5)',
    gridColor: 'rgba(255, 255, 255, 0.1)',
    watermark: {
      color: 'rgba(255, 255, 255, 0.1)',
      visible: true,
      text: 'Aquads',
      fontSize: 12,
      fontFamily: 'Arial'
    }
  }), [symbol, isMobile]); // Only re-memoize if symbol or isMobile changes

  useEffect(() => {
    // Only create chart if it doesn't exist and container is available
    if (containerRef.current && !widgetRef.current) {
      // Check if TradingView script is already loaded
      if (!window.TradingView) {
        // Create TradingView widget script
        scriptRef.current = document.createElement('script');
        scriptRef.current.src = 'https://s3.tradingview.com/tv.js';
        scriptRef.current.async = true;
        scriptRef.current.onload = () => {
          if (window.TradingView && containerRef.current && !widgetRef.current) {
            widgetRef.current = new window.TradingView.widget({
              ...widgetConfig,
              container_id: containerRef.current.id
            });
          }
        };
        document.head.appendChild(scriptRef.current);
      } else {
        // Script already loaded, create widget immediately
        if (containerRef.current && !widgetRef.current) {
          widgetRef.current = new window.TradingView.widget({
            ...widgetConfig,
            container_id: containerRef.current.id
          });
        }
      }
    }

    return () => {
      // Only cleanup on unmount, not on every re-render
      if (widgetRef.current) {
        widgetRef.current = null;
      }
    };
  }, [widgetConfig]); // Only depend on the memoized config

  return (
    <div
      ref={containerRef}
      id={`tradingview-chart-${symbol}`}
      className="w-full h-full"
      style={{
        height: isMobile ? '400px' : '700px',
        minHeight: isMobile ? '400px' : '600px'
      }}
    />
  );
});

export default TradingViewChart;
