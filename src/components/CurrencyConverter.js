import React, { useState, useEffect, useCallback, useRef } from 'react';
import './CurrencyConverter.css';

// Crypto currencies with their CoinGecko IDs
const CRYPTO_CURRENCIES = [
  { code: 'BTC', name: 'Bitcoin', id: 'bitcoin', icon: '₿' },
  { code: 'ETH', name: 'Ethereum', id: 'ethereum', icon: 'Ξ' },
  { code: 'SOL', name: 'Solana', id: 'solana', icon: '◎' },
  { code: 'BNB', name: 'BNB', id: 'binancecoin', icon: '🔶' },
  { code: 'XRP', name: 'XRP', id: 'ripple', icon: '✕' },
  { code: 'ADA', name: 'Cardano', id: 'cardano', icon: '₳' },
  { code: 'DOGE', name: 'Dogecoin', id: 'dogecoin', icon: '🐕' },
  { code: 'AVAX', name: 'Avalanche', id: 'avalanche-2', icon: '🔺' },
  { code: 'DOT', name: 'Polkadot', id: 'polkadot', icon: '●' },
  { code: 'MATIC', name: 'Polygon', id: 'matic-network', icon: '⬡' },
  { code: 'SHIB', name: 'Shiba Inu', id: 'shiba-inu', icon: '🐕' },
  { code: 'LTC', name: 'Litecoin', id: 'litecoin', icon: 'Ł' },
  { code: 'LINK', name: 'Chainlink', id: 'chainlink', icon: '⬡' },
  { code: 'UNI', name: 'Uniswap', id: 'uniswap', icon: '🦄' },
  { code: 'ATOM', name: 'Cosmos', id: 'cosmos', icon: '⚛' },
  { code: 'PEPE', name: 'Pepe', id: 'pepe', icon: '🐸' },
  { code: 'ARB', name: 'Arbitrum', id: 'arbitrum', icon: '🔵' },
  { code: 'OP', name: 'Optimism', id: 'optimism', icon: '🔴' },
  { code: 'SUI', name: 'Sui', id: 'sui', icon: '💧' },
  { code: 'APT', name: 'Aptos', id: 'aptos', icon: '🔷' },
];

// Fiat currencies
const FIAT_CURRENCIES = [
  { code: 'USD', name: 'US Dollar', icon: '$', symbol: '$' },
  { code: 'EUR', name: 'Euro', icon: '€', symbol: '€' },
  { code: 'GBP', name: 'British Pound', icon: '£', symbol: '£' },
  { code: 'JPY', name: 'Japanese Yen', icon: '¥', symbol: '¥' },
  { code: 'AUD', name: 'Australian Dollar', icon: 'A$', symbol: 'A$' },
  { code: 'CAD', name: 'Canadian Dollar', icon: 'C$', symbol: 'C$' },
  { code: 'CHF', name: 'Swiss Franc', icon: 'Fr', symbol: 'CHF' },
  { code: 'CNY', name: 'Chinese Yuan', icon: '¥', symbol: '¥' },
  { code: 'INR', name: 'Indian Rupee', icon: '₹', symbol: '₹' },
  { code: 'KRW', name: 'South Korean Won', icon: '₩', symbol: '₩' },
  { code: 'SGD', name: 'Singapore Dollar', icon: 'S$', symbol: 'S$' },
  { code: 'HKD', name: 'Hong Kong Dollar', icon: 'HK$', symbol: 'HK$' },
  { code: 'NZD', name: 'New Zealand Dollar', icon: 'NZ$', symbol: 'NZ$' },
  { code: 'SEK', name: 'Swedish Krona', icon: 'kr', symbol: 'kr' },
  { code: 'MXN', name: 'Mexican Peso', icon: '$', symbol: 'MX$' },
  { code: 'BRL', name: 'Brazilian Real', icon: 'R$', symbol: 'R$' },
  { code: 'AED', name: 'UAE Dirham', icon: 'د.إ', symbol: 'AED' },
  { code: 'TRY', name: 'Turkish Lira', icon: '₺', symbol: '₺' },
  { code: 'RUB', name: 'Russian Ruble', icon: '₽', symbol: '₽' },
  { code: 'ZAR', name: 'South African Rand', icon: 'R', symbol: 'R' },
  { code: 'NGN', name: 'Nigerian Naira', icon: '₦', symbol: '₦' },
  { code: 'PHP', name: 'Philippine Peso', icon: '₱', symbol: '₱' },
  { code: 'THB', name: 'Thai Baht', icon: '฿', symbol: '฿' },
  { code: 'IDR', name: 'Indonesian Rupiah', icon: 'Rp', symbol: 'Rp' },
  { code: 'PLN', name: 'Polish Zloty', icon: 'zł', symbol: 'zł' },
];

// All currencies combined
const ALL_CURRENCIES = [
  ...CRYPTO_CURRENCIES.map(c => ({ ...c, type: 'crypto' })),
  ...FIAT_CURRENCIES.map(c => ({ ...c, type: 'fiat' })),
];

// Popular conversion pairs for quick access
const POPULAR_PAIRS = [
  { from: 'BTC', to: 'USD', label: 'BTC → USD' },
  { from: 'ETH', to: 'USD', label: 'ETH → USD' },
  { from: 'SOL', to: 'USD', label: 'SOL → USD' },
  { from: 'USD', to: 'EUR', label: 'USD → EUR' },
  { from: 'EUR', to: 'GBP', label: 'EUR → GBP' },
  { from: 'PEPE', to: 'USD', label: 'PEPE → USD' },
];

const CurrencyConverter = () => {
  const [amount, setAmount] = useState('1');
  const [fromCurrency, setFromCurrency] = useState('BTC');
  const [toCurrency, setToCurrency] = useState('USD');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [cryptoPrices, setCryptoPrices] = useState({});
  const [fiatRates, setFiatRates] = useState({});
  const [lastUpdated, setLastUpdated] = useState(null);
  const [showFromDropdown, setShowFromDropdown] = useState(false);
  const [showToDropdown, setShowToDropdown] = useState(false);
  const [fromSearch, setFromSearch] = useState('');
  const [toSearch, setToSearch] = useState('');
  
  const fromDropdownRef = useRef(null);
  const toDropdownRef = useRef(null);

  // Fetch crypto prices from CoinGecko
  const fetchCryptoPrices = useCallback(async () => {
    try {
      const ids = CRYPTO_CURRENCIES.map(c => c.id).join(',');
      const currencies = FIAT_CURRENCIES.map(c => c.code.toLowerCase()).join(',');
      
      const response = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=${currencies}`
      );
      
      if (!response.ok) throw new Error('Failed to fetch crypto prices');
      
      const data = await response.json();
      setCryptoPrices(data);
      return data;
    } catch (err) {
      console.error('Error fetching crypto prices:', err);
      return null;
    }
  }, []);

  // Fetch fiat rates from Frankfurter
  const fetchFiatRates = useCallback(async () => {
    try {
      const response = await fetch('https://api.frankfurter.app/latest?from=USD');
      
      if (!response.ok) throw new Error('Failed to fetch fiat rates');
      
      const data = await response.json();
      // Add USD to rates (it's the base)
      const rates = { USD: 1, ...data.rates };
      setFiatRates(rates);
      return rates;
    } catch (err) {
      console.error('Error fetching fiat rates:', err);
      return null;
    }
  }, []);

  // Initial fetch and periodic refresh
  useEffect(() => {
    const fetchAllRates = async () => {
      setLoading(true);
      await Promise.all([fetchCryptoPrices(), fetchFiatRates()]);
      setLastUpdated(new Date());
      setLoading(false);
    };

    fetchAllRates();
    
    // Refresh rates every 60 seconds
    const interval = setInterval(fetchAllRates, 60000);
    
    return () => clearInterval(interval);
  }, [fetchCryptoPrices, fetchFiatRates]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (fromDropdownRef.current && !fromDropdownRef.current.contains(event.target)) {
        setShowFromDropdown(false);
        setFromSearch('');
      }
      if (toDropdownRef.current && !toDropdownRef.current.contains(event.target)) {
        setShowToDropdown(false);
        setToSearch('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Calculate conversion
  const calculateConversion = useCallback(() => {
    if (!amount || isNaN(parseFloat(amount))) {
      setResult(null);
      return;
    }

    const numAmount = parseFloat(amount);
    const fromCurrencyData = ALL_CURRENCIES.find(c => c.code === fromCurrency);
    const toCurrencyData = ALL_CURRENCIES.find(c => c.code === toCurrency);

    if (!fromCurrencyData || !toCurrencyData) {
      setError('Invalid currency selection');
      return;
    }

    setError(null);
    let convertedValue = null;

    // Crypto to Fiat
    if (fromCurrencyData.type === 'crypto' && toCurrencyData.type === 'fiat') {
      const cryptoData = cryptoPrices[fromCurrencyData.id];
      if (cryptoData && cryptoData[toCurrency.toLowerCase()]) {
        convertedValue = numAmount * cryptoData[toCurrency.toLowerCase()];
      }
    }
    // Fiat to Crypto
    else if (fromCurrencyData.type === 'fiat' && toCurrencyData.type === 'crypto') {
      const cryptoData = cryptoPrices[toCurrencyData.id];
      if (cryptoData && cryptoData[fromCurrency.toLowerCase()]) {
        convertedValue = numAmount / cryptoData[fromCurrency.toLowerCase()];
      }
    }
    // Crypto to Crypto
    else if (fromCurrencyData.type === 'crypto' && toCurrencyData.type === 'crypto') {
      const fromCryptoUsd = cryptoPrices[fromCurrencyData.id]?.usd;
      const toCryptoUsd = cryptoPrices[toCurrencyData.id]?.usd;
      if (fromCryptoUsd && toCryptoUsd) {
        convertedValue = (numAmount * fromCryptoUsd) / toCryptoUsd;
      }
    }
    // Fiat to Fiat
    else if (fromCurrencyData.type === 'fiat' && toCurrencyData.type === 'fiat') {
      const fromRate = fiatRates[fromCurrency];
      const toRate = fiatRates[toCurrency];
      if (fromRate && toRate) {
        // Convert through USD
        const usdAmount = numAmount / fromRate;
        convertedValue = usdAmount * toRate;
      }
    }

    if (convertedValue !== null) {
      setResult(convertedValue);
    } else {
      setError('Unable to calculate conversion');
    }
  }, [amount, fromCurrency, toCurrency, cryptoPrices, fiatRates]);

  // Recalculate when inputs change
  useEffect(() => {
    if (Object.keys(cryptoPrices).length > 0 || Object.keys(fiatRates).length > 0) {
      calculateConversion();
    }
  }, [calculateConversion, cryptoPrices, fiatRates]);

  // Swap currencies
  const handleSwap = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
  };

  // Handle popular pair click
  const handlePopularPairClick = (pair) => {
    setFromCurrency(pair.from);
    setToCurrency(pair.to);
    setAmount('1');
  };

  // Format result based on value
  const formatResult = (value) => {
    if (value === null) return '---';
    
    if (value >= 1000000) {
      return value.toLocaleString('en-US', { maximumFractionDigits: 2 });
    } else if (value >= 1) {
      return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
    } else if (value >= 0.0001) {
      return value.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 6 });
    } else {
      return value.toExponential(4);
    }
  };

  // Get currency display info
  const getCurrencyInfo = (code) => {
    return ALL_CURRENCIES.find(c => c.code === code) || { code, name: code, icon: '?' };
  };

  // Filter currencies based on search
  const filterCurrencies = (search) => {
    if (!search) return ALL_CURRENCIES;
    const searchLower = search.toLowerCase();
    return ALL_CURRENCIES.filter(c => 
      c.code.toLowerCase().includes(searchLower) || 
      c.name.toLowerCase().includes(searchLower)
    );
  };

  const fromCurrencyInfo = getCurrencyInfo(fromCurrency);
  const toCurrencyInfo = getCurrencyInfo(toCurrency);

  return (
    <div className="currency-converter-bar">
      <div className="converter-container">
        {/* Title/Icon */}
        <div className="converter-title">
          <span className="converter-icon">💱</span>
          <span className="converter-label">Convert</span>
        </div>

        {/* Amount Input */}
        <div className="converter-input-group">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Amount"
            className="converter-amount-input"
            min="0"
            step="any"
          />
        </div>

        {/* From Currency Selector */}
        <div className="converter-currency-selector" ref={fromDropdownRef}>
          <button 
            className="currency-select-btn"
            onClick={() => {
              setShowFromDropdown(!showFromDropdown);
              setShowToDropdown(false);
            }}
          >
            <span className="currency-icon">{fromCurrencyInfo.icon}</span>
            <span className="currency-code">{fromCurrency}</span>
            <span className="dropdown-arrow">▼</span>
          </button>
          
          {showFromDropdown && (
            <div className="currency-dropdown">
              <input
                type="text"
                value={fromSearch}
                onChange={(e) => setFromSearch(e.target.value)}
                placeholder="Search currency..."
                className="currency-search-input"
                autoFocus
              />
              <div className="currency-list">
                <div className="currency-group-label">Crypto</div>
                {filterCurrencies(fromSearch)
                  .filter(c => c.type === 'crypto')
                  .map(currency => (
                    <button
                      key={currency.code}
                      className={`currency-option ${currency.code === fromCurrency ? 'active' : ''}`}
                      onClick={() => {
                        setFromCurrency(currency.code);
                        setShowFromDropdown(false);
                        setFromSearch('');
                      }}
                    >
                      <span className="currency-icon">{currency.icon}</span>
                      <span className="currency-code">{currency.code}</span>
                      <span className="currency-name">{currency.name}</span>
                    </button>
                  ))}
                <div className="currency-group-label">Fiat</div>
                {filterCurrencies(fromSearch)
                  .filter(c => c.type === 'fiat')
                  .map(currency => (
                    <button
                      key={currency.code}
                      className={`currency-option ${currency.code === fromCurrency ? 'active' : ''}`}
                      onClick={() => {
                        setFromCurrency(currency.code);
                        setShowFromDropdown(false);
                        setFromSearch('');
                      }}
                    >
                      <span className="currency-icon">{currency.icon}</span>
                      <span className="currency-code">{currency.code}</span>
                      <span className="currency-name">{currency.name}</span>
                    </button>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* Swap Button */}
        <button className="converter-swap-btn" onClick={handleSwap} title="Swap currencies">
          ⇄
        </button>

        {/* To Currency Selector */}
        <div className="converter-currency-selector" ref={toDropdownRef}>
          <button 
            className="currency-select-btn"
            onClick={() => {
              setShowToDropdown(!showToDropdown);
              setShowFromDropdown(false);
            }}
          >
            <span className="currency-icon">{toCurrencyInfo.icon}</span>
            <span className="currency-code">{toCurrency}</span>
            <span className="dropdown-arrow">▼</span>
          </button>
          
          {showToDropdown && (
            <div className="currency-dropdown">
              <input
                type="text"
                value={toSearch}
                onChange={(e) => setToSearch(e.target.value)}
                placeholder="Search currency..."
                className="currency-search-input"
                autoFocus
              />
              <div className="currency-list">
                <div className="currency-group-label">Crypto</div>
                {filterCurrencies(toSearch)
                  .filter(c => c.type === 'crypto')
                  .map(currency => (
                    <button
                      key={currency.code}
                      className={`currency-option ${currency.code === toCurrency ? 'active' : ''}`}
                      onClick={() => {
                        setToCurrency(currency.code);
                        setShowToDropdown(false);
                        setToSearch('');
                      }}
                    >
                      <span className="currency-icon">{currency.icon}</span>
                      <span className="currency-code">{currency.code}</span>
                      <span className="currency-name">{currency.name}</span>
                    </button>
                  ))}
                <div className="currency-group-label">Fiat</div>
                {filterCurrencies(toSearch)
                  .filter(c => c.type === 'fiat')
                  .map(currency => (
                    <button
                      key={currency.code}
                      className={`currency-option ${currency.code === toCurrency ? 'active' : ''}`}
                      onClick={() => {
                        setToCurrency(currency.code);
                        setShowToDropdown(false);
                        setToSearch('');
                      }}
                    >
                      <span className="currency-icon">{currency.icon}</span>
                      <span className="currency-code">{currency.code}</span>
                      <span className="currency-name">{currency.name}</span>
                    </button>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* Equals Sign */}
        <span className="converter-equals">=</span>

        {/* Result Display */}
        <div className="converter-result">
          {loading ? (
            <div className="result-loading">
              <span className="loading-dot"></span>
              <span className="loading-dot"></span>
              <span className="loading-dot"></span>
            </div>
          ) : error ? (
            <span className="result-error">{error}</span>
          ) : (
            <>
              <span className="result-value">{formatResult(result)}</span>
              <span className="result-currency">{toCurrency}</span>
            </>
          )}
        </div>

        {/* Popular Pairs */}
        <div className="converter-popular">
          <span className="popular-label">Quick:</span>
          <div className="popular-pairs">
            {POPULAR_PAIRS.map((pair, index) => (
              <button
                key={index}
                className={`popular-pair-btn ${fromCurrency === pair.from && toCurrency === pair.to ? 'active' : ''}`}
                onClick={() => handlePopularPairClick(pair)}
              >
                {pair.label}
              </button>
            ))}
          </div>
        </div>

        {/* Last Updated */}
        {lastUpdated && (
          <div className="converter-updated">
            <span className="update-dot"></span>
            <span className="update-text">
              Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default CurrencyConverter;

