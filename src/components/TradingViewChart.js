import React, { useEffect, useRef } from 'react';

// Load TradingView script once per session
let tvScriptLoadingPromise;
let TV_CONTAINER_EL = null;
let TV_CONTAINER_ID = null;
const TV_SCRIPT_SRC = 'https://s3.tradingview.com/tv.js';

const TradingViewChart = ({ symbol, isMobile = false }) => {
  const anchorRef = useRef(null);
  const widgetRef = useRef(null);

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

  // Ensure a single global container exists and is anchored visually
  useEffect(() => {
    if (!TV_CONTAINER_EL) {
      TV_CONTAINER_EL = document.createElement('div');
      TV_CONTAINER_ID = `tradingview-chart-${Math.random().toString(36).slice(2)}`;
      TV_CONTAINER_EL.id = TV_CONTAINER_ID;
      TV_CONTAINER_EL.style.width = '100%';
      TV_CONTAINER_EL.style.height = isMobile ? '400px' : '700px';
    }
    if (anchorRef.current && TV_CONTAINER_EL.parentNode !== anchorRef.current) {
      anchorRef.current.innerHTML = '';
      anchorRef.current.appendChild(TV_CONTAINER_EL);
    }
  }, [isMobile]);

  // Create the widget once (never recreate on prop changes)
  useEffect(() => {
    let cancelled = false;
    const createWidget = async () => {
      try {
        if (tvScriptLoadingPromise) {
          await tvScriptLoadingPromise;
        }
        if (cancelled || !TV_CONTAINER_EL || !window.TradingView) return;

        // Reuse a single global widget if it exists
        if (window.__TV_WIDGET_SINGLETON) {
          widgetRef.current = window.__TV_WIDGET_SINGLETON;
          return;
        }

        const widget = new window.TradingView.widget({
          symbol: `BINANCE:${symbol}USDT`,
          interval: 'D',
          timezone: 'Etc/UTC',
          theme: 'dark',
          style: '1',
          locale: 'en',
          enable_publishing: false,
          allow_symbol_change: false,
          container_id: TV_CONTAINER_ID,
          width: '100%',
          height: isMobile ? 400 : 700,
          hide_top_toolbar: false,
          hide_legend: false
        });
        widgetRef.current = widget;
        window.__TV_WIDGET_SINGLETON = widget;
      } catch (e) {
        // no-op
      }
    };
    createWidget();
    return () => {
      cancelled = true;
      // Do not remove the singleton on unmount; keep it alive
    };
  }, []);

  // On symbol change, update the existing widget without remount
  useEffect(() => {
    // Ensure container stays anchored
    if (anchorRef.current && TV_CONTAINER_EL && TV_CONTAINER_EL.parentNode !== anchorRef.current) {
      anchorRef.current.innerHTML = '';
      anchorRef.current.appendChild(TV_CONTAINER_EL);
    }

    const widget = window.__TV_WIDGET_SINGLETON || widgetRef.current;
    if (!widget || !symbol) return;
    try {
      const target = `BINANCE:${symbol}USDT`;
      if (typeof widget.onChartReady === 'function') {
        widget.onChartReady(() => {
          const chart = (widget.activeChart && widget.activeChart()) ||
                        (widget.chart && widget.chart());
          if (chart && typeof chart.setSymbol === 'function') {
            chart.setSymbol(target, 'D');
          }
        });
      }
    } catch (e) {
      // ignore
    }
  }, [symbol]);

  return (
    <div
      ref={anchorRef}
      className="w-full h-full"
      style={{
        height: isMobile ? '400px' : '700px',
        minHeight: isMobile ? '400px' : '600px'
      }}
    />
  );
};

export default TradingViewChart;
