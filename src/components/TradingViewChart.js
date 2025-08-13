import React, { useEffect, useRef } from 'react';

// Load TradingView script once per session
let tvScriptLoadingPromise;
const TV_SCRIPT_SRC = 'https://s3.tradingview.com/tv.js';

const TradingViewChart = ({ symbol, isMobile = false }) => {
  const containerRef = useRef(null);
  const widgetRef = useRef(null);
  const widgetIdRef = useRef(`tradingview-chart-${Math.random().toString(36).slice(2)}`);

  useEffect(() => {
    if (!tvScriptLoadingPromise) {
      tvScriptLoadingPromise = new Promise((resolve, reject) => {
        if (window.TradingView) {
          resolve();
          return;
        }
        const existing = document.querySelector(`script[src="${TV_SCRIPT_SRC}"]`);
        if (existing) {
          existing.addEventListener('load', () => resolve());
          existing.addEventListener('error', reject);
          return;
        }
        const script = document.createElement('script');
        script.src = TV_SCRIPT_SRC;
        script.async = true;
        script.onload = () => resolve();
        script.onerror = reject;
        document.head.appendChild(script);
      });
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const createWidget = async () => {
      try {
        if (tvScriptLoadingPromise) {
          await tvScriptLoadingPromise;
        }
        if (cancelled || !containerRef.current || !window.TradingView) return;

        // Remove any previous widget instance
        if (widgetRef.current && typeof widgetRef.current.remove === 'function') {
          try { widgetRef.current.remove(); } catch (e) { /* ignore */ }
          widgetRef.current = null;
        }

        widgetRef.current = new window.TradingView.widget({
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
          container_id: widgetIdRef.current,
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
      } catch (e) {
        // no-op; avoid crashing UI if script fails
      }
    };

    createWidget();
    return () => {
      cancelled = true;
      if (widgetRef.current && typeof widgetRef.current.remove === 'function') {
        try { widgetRef.current.remove(); } catch (e) { /* ignore */ }
        widgetRef.current = null;
      }
    };
  }, [symbol, isMobile]);

  return (
    <div
      ref={containerRef}
      id={widgetIdRef.current}
      className="w-full h-full"
      style={{
        height: isMobile ? '400px' : '700px',
        minHeight: isMobile ? '400px' : '600px'
      }}
    />
  );
};

export default TradingViewChart;
