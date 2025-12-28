import React from 'react';
import ReactDOM from 'react-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import '@mysten/dapp-kit/dist/index.css';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import LiFiProviders from './providers/LiFiProviders';
import Web3Provider from './components/Web3Provider';

// Detect if user is on mobile
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

ReactDOM.render(
  <React.StrictMode>
    <Web3Provider>
      <LiFiProviders>
        <App />
      </LiFiProviders>
    </Web3Provider>
  </React.StrictMode>,
  document.getElementById('root')
);

// Delay non-critical operations with longer delay on mobile
const reportWebVitalsWithDelay = () => {
  // Increase delay on mobile for better initial load performance
  const delay = isMobile ? 5000 : 3000;
  setTimeout(() => {
    reportWebVitals();
  }, delay);
};

reportWebVitalsWithDelay();
