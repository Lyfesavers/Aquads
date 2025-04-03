import React from 'react';
import ReactDOM from 'react-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

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
