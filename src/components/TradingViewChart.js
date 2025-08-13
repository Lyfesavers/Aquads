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

  // Create the widget once
  useEffect(() => {
    let cancelled = false;
    const createWidget = async () => {
      try {
        if (tvScriptLoadingPromise) {
          await tvScriptLoadingPromise;
        }
        if (cancelled || !containerRef.current || !window.TradingView || widgetRef.current) return;

        const config = {
          symbol: `BINANCE:${symbol}USDT`,
          interval: 'D',
          timezone: 'Etc/UTC',
          theme: 'dark',
          style: '1',
          locale: 'en',
          enable_publishing: false,
          allow_symbol_change: false,
          container_id: widgetIdRef.current,
          width: '100%',
          height: isMobile ? 400 : 700,
          hide_top_toolbar: false,
          hide_legend: false
        };
        setTimeout(() => {
          if (!cancelled && containerRef.current && window.TradingView && !widgetRef.current) {
            widgetRef.current = new window.TradingView.widget(config);
            try { console.log('[TV] widget created', { symbol, isMobile, id: widgetIdRef.current, ts: Date.now() }); } catch (_) {}
          }
        }, 0);
      } catch (e) {
        // no-op
      }
    };
    createWidget();
    return () => {
      cancelled = true;
      if (widgetRef.current && typeof widgetRef.current.remove === 'function') {
        try { widgetRef.current.remove(); } catch (e) {}
        widgetRef.current = null;
      }
    };
  }, []);

  // On symbol change, update the existing widget's symbol without recreating
  useEffect(() => {
    if (!widgetRef.current || !symbol) return;
    try {
      const target = `BINANCE:${symbol}USDT`;
      if (typeof widgetRef.current.onChartReady === 'function') {
        widgetRef.current.onChartReady(() => {
          const chart = widgetRef.current.activeChart?.() || widgetRef.current.chart?.();
          if (chart && typeof chart.setSymbol === 'function') {
            chart.setSymbol(target, 'D');
          }
        });
      }
    } catch (_) {}
  }, [symbol]);

  return (
    <div 
      ref={containerRef}
      id={widgetIdRef.current}
      className="w-full h-full"
      style={{ 
        height: isMobile ? '400px' : '700px',
        minHeight: isMobile ? '400px' : '600px'
      }}
      data-tv-sticky
    />
  );
};

export default TradingViewChart;
