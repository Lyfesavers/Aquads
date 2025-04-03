import React from 'react';
import ReactDOM from 'react-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

ReactDOM.render(
  <App />,
  document.getElementById('root')
);

// Only report web vitals in non-production environments
if (process.env.NODE_ENV !== 'production') {
  // Delay non-critical operations
  setTimeout(() => {
    reportWebVitals();
  }, 3000);
}
