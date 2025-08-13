import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

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

  // Create the widget once (never recreate on prop changes)
  useEffect(() => {
    let cancelled = false;
    const createWidget = async () => {
      try {
        if (tvScriptLoadingPromise) {
          await tvScriptLoadingPromise;
        }
        if (cancelled || !containerRef.current || !window.TradingView) return;

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
          container_id: widgetIdRef.current,
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

  const container = (
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

  const portalRoot = typeof document !== 'undefined' ? document.getElementById('tv-root') : null;
  return portalRoot ? createPortal(container, portalRoot) : container;
};

export default TradingViewChart;
