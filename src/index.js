import React from 'react';
import ReactDOM from 'react-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// Delay non-critical resources to improve initial performance
if ('requestIdleCallback' in window) {
  window.requestIdleCallback(() => {
    // Load non-critical resources when browser is idle
    import('./utils/analytics').catch(err => console.log('Analytics module failed to load', err));
  });
} else {
  // Fallback for browsers not supporting requestIdleCallback
  setTimeout(() => {
    import('./utils/analytics').catch(err => console.log('Analytics module failed to load', err));
  }, 2000);
}

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root')
);

// Delay non-critical operations
const reportWebVitalsWithDelay = () => {
  setTimeout(() => {
    reportWebVitals();
  }, 3000);
};

reportWebVitalsWithDelay();
