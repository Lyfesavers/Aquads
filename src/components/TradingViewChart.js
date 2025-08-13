import React, { useEffect, useRef } from 'react';

const TradingViewChart = ({ symbol, isMobile = false }) => {
  const containerRef = useRef(null);

  useEffect(() => {
    // Only create chart once on mount - no reloading since TradingView is live
    if (containerRef.current && !containerRef.current.hasChildNodes()) {
      // Create TradingView widget
      const script = document.createElement('script');
      script.src = 'https://s3.tradingview.com/tv.js';
      script.async = true;
      script.onload = () => {
        if (window.TradingView && containerRef.current) {
          new window.TradingView.widget({
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
            container_id: containerRef.current.id,
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
          });
        }
      };

      document.head.appendChild(script);
    }

    return () => {
      // Only cleanup on unmount, not on symbol changes
      if (containerRef.current && containerRef.current.parentNode) {
        // Cleanup will happen naturally when component unmounts
      }
    };
  }, []); // Empty dependency array - only run once

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
};

export default TradingViewChart;
