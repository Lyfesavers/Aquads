import React, { useState, useEffect, useCallback } from 'react';
import { FaExchangeAlt, FaLock, FaUnlock, FaSpinner, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';
import simpleswapService from '../services/simpleswapService';
import logger from '../utils/logger';
import './SimpleSwapWidget.css';

const SimpleSwapWidget = () => {
  // Tab state
  const [activeTab, setActiveTab] = useState('crypto'); // 'crypto' or 'fiat'
  
  // Currency state
  const [currencies, setCurrencies] = useState([]);
  const [cryptoCurrencies, setCryptoCurrencies] = useState([]);
  const [fiatCurrencies, setFiatCurrencies] = useState([]);
  
  // Exchange state
  const [fromCurrency, setFromCurrency] = useState('');
  const [toCurrency, setToCurrency] = useState('');
  const [amount, setAmount] = useState('');
  const [addressTo, setAddressTo] = useState('');
  const [extraIdTo, setExtraIdTo] = useState('');
  const [fixedRate, setFixedRate] = useState(false);
  const [rateInfo, setRateInfo] = useState(null);
  const [minAmount, setMinAmount] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingRate, setLoadingRate] = useState(false);
  const [error, setError] = useState(null);
  const [exchange, setExchange] = useState(null);
  const [searchFrom, setSearchFrom] = useState('');
  const [searchTo, setSearchTo] = useState('');
  const [showFromDropdown, setShowFromDropdown] = useState(false);
  const [showToDropdown, setShowToDropdown] = useState(false);

  // Popular currencies fallback list
  const FALLBACK_CRYPTO_CURRENCIES = [
    { code: 'BTC', name: 'Bitcoin', isFiat: false },
    { code: 'ETH', name: 'Ethereum', isFiat: false },
    { code: 'USDT', name: 'Tether', isFiat: false },
    { code: 'BNB', name: 'BNB', isFiat: false },
    { code: 'SOL', name: 'Solana', isFiat: false },
    { code: 'USDC', name: 'USD Coin', isFiat: false },
    { code: 'XRP', name: 'Ripple', isFiat: false },
    { code: 'ADA', name: 'Cardano', isFiat: false },
    { code: 'DOGE', name: 'Dogecoin', isFiat: false },
    { code: 'TRX', name: 'TRON', isFiat: false },
    { code: 'MATIC', name: 'Polygon', isFiat: false },
    { code: 'DOT', name: 'Polkadot', isFiat: false },
    { code: 'LTC', name: 'Litecoin', isFiat: false },
    { code: 'AVAX', name: 'Avalanche', isFiat: false },
    { code: 'LINK', name: 'Chainlink', isFiat: false },
  ];

  const FALLBACK_FIAT_CURRENCIES = [
    { code: 'USD', name: 'US Dollar', isFiat: true },
    { code: 'EUR', name: 'Euro', isFiat: true },
    { code: 'GBP', name: 'British Pound', isFiat: true },
    { code: 'JPY', name: 'Japanese Yen', isFiat: true },
    { code: 'CAD', name: 'Canadian Dollar', isFiat: true },
    { code: 'AUD', name: 'Australian Dollar', isFiat: true },
    { code: 'CHF', name: 'Swiss Franc', isFiat: true },
    { code: 'CNY', name: 'Chinese Yuan', isFiat: true },
  ];

  // Load currencies on mount
  useEffect(() => {
    loadCurrencies();
  }, []);

  // Load currencies
  const loadCurrencies = async () => {
    try {
      setLoading(true);
      setError(null);
      logger.log('Loading currencies from backend proxy...');
      
      const data = await simpleswapService.getCurrencies();
      logger.log('Received currency data:', data);
      
      if (!data) {
        setError('No data received from API. Please check backend configuration.');
        return;
      }

      // Check if response has error
      if (data.error) {
        setError(data.error);
        return;
      }

      let currencyArray = [];
      
      // Handle SimpleSwap API response format
      // Backend processes the response and returns a clean array
      // Response format can be:
      // 1. Direct array: [currency objects] - Backend already processed it
      // 2. { result: [array of currency objects], traceId: "..." } - Array format
      // 3. { result: { "eth": {...}, "btc": {...} }, traceId: "..." } - Object format
      
      if (Array.isArray(data)) {
        // Backend already processed the response and returned an array
        currencyArray = data.map(item => {
          if (typeof item === 'string') {
            return { code: item, name: item, isFiat: false };
          }
          return {
            code: (item.ticker || item.code || item.symbol || '').toUpperCase(),
            name: item.name || item.ticker || item.code || '',
            isFiat: item.isFiat || false,
            ticker: (item.ticker || item.code || item.symbol || '').toLowerCase(),
            network: item.network || '',
            image: item.image || '',
            hasExtraId: item.hasExtraId || false,
            precision: item.precision || 8,
            isAvailableFloat: item.isAvailableFloat !== undefined ? item.isAvailableFloat : true,
            isAvailableFixed: item.isAvailableFixed !== undefined ? item.isAvailableFixed : true,
            warningsFrom: item.warningsFrom || [],
            warningsTo: item.warningsTo || [],
          };
        });
      } else if (data.result) {
        if (Array.isArray(data.result)) {
          // Result is already an array (like /v3/currencies endpoint)
          currencyArray = data.result.map(item => {
            if (typeof item === 'string') {
              return { code: item, name: item, isFiat: false };
            }
            return {
              code: (item.ticker || item.code || item.symbol || '').toUpperCase(),
              name: item.name || item.ticker || item.code || '',
              isFiat: item.isFiat || false,
              ticker: (item.ticker || item.code || item.symbol || '').toLowerCase(),
              network: item.network || '',
              image: item.image || '',
              hasExtraId: item.hasExtraId || false,
              precision: item.precision || 8,
              isAvailableFloat: item.isAvailableFloat !== undefined ? item.isAvailableFloat : true,
              isAvailableFixed: item.isAvailableFixed !== undefined ? item.isAvailableFixed : true,
              warningsFrom: item.warningsFrom || [],
              warningsTo: item.warningsTo || [],
            };
          });
        } else if (typeof data.result === 'object' && !Array.isArray(data.result)) {
          // Result is an object with currency tickers as keys
          currencyArray = Object.keys(data.result).map(key => {
            const item = data.result[key];
            return {
              code: (item.ticker || key).toUpperCase(),
              name: item.name || item.ticker || key,
              isFiat: item.isFiat || false,
              ticker: (item.ticker || key).toLowerCase(),
              network: item.network || '',
              image: item.image || '',
              hasExtraId: item.hasExtraId || false,
              precision: item.precision || 8,
              isAvailableFloat: item.isAvailableFloat !== undefined ? item.isAvailableFloat : true,
              isAvailableFixed: item.isAvailableFixed !== undefined ? item.isAvailableFixed : true,
              warningsFrom: item.warningsFrom || [],
              warningsTo: item.warningsTo || [],
            };
          });
        }
      } else if (typeof data === 'object' && !Array.isArray(data)) {
        // If it's already an array
        currencyArray = data.map(item => {
          if (typeof item === 'string') {
            return { code: item, name: item, isFiat: false };
          }
          return {
            code: (item.ticker || item.code || item.symbol || item.currency || '').toUpperCase(),
            name: item.name || item.ticker || item.code || '',
            isFiat: item.isFiat || false,
            ticker: item.ticker || item.code || item.symbol || '',
            network: item.network || '',
            image: item.image || '',
            hasExtraId: item.hasExtraId || false,
            precision: item.precision || 8,
          };
        });
      } else if (typeof data === 'object') {
        // If it's an object with currency codes as keys
        currencyArray = Object.keys(data).map(key => {
          const item = data[key];
          if (typeof item === 'string') {
            return { code: key.toUpperCase(), name: item, isFiat: false };
          }
          // Handle currency object with properties (SimpleSwap format)
          return {
            code: (item.ticker || item.code || item.symbol || key).toUpperCase(),
            name: item.name || item.ticker || item.code || key,
            isFiat: item.isFiat || false,
            ticker: item.ticker || key,
            network: item.network || '',
            image: item.image || '',
            hasExtraId: item.hasExtraId || false,
            precision: item.precision || 8,
          };
        });
      }

      // Filter out invalid entries
      currencyArray = currencyArray.filter(curr => {
        if (!curr.code || curr.code.trim() === '') return false;
        // Don't filter by isAvailableFloat/isAvailableFixed - these might not be set correctly
        // The API might return currencies that are available but don't have these flags set
        return true;
      });
      
      logger.log(`Loaded ${currencyArray.length} currencies from API`);
      
      if (currencyArray.length === 0) {
        // Use fallback currencies if API fails
        logger.warn('API returned no currencies, using fallback list');
        setCurrencies([...FALLBACK_CRYPTO_CURRENCIES, ...FALLBACK_FIAT_CURRENCIES]);
        setCryptoCurrencies(FALLBACK_CRYPTO_CURRENCIES);
        setFiatCurrencies(FALLBACK_FIAT_CURRENCIES);
        setError('Using fallback currency list. SimpleSwap API may need configuration.');
      } else {
        setCurrencies(currencyArray);
        // Separate crypto and fiat currencies
        const crypto = currencyArray.filter(curr => !curr.isFiat);
        const fiat = currencyArray.filter(curr => curr.isFiat);
        
        logger.log(`Separated currencies: ${crypto.length} crypto, ${fiat.length} fiat`);
        
        // Clear any previous errors since we successfully loaded currencies
        setError(null);
        setCryptoCurrencies(crypto.length > 0 ? crypto : FALLBACK_CRYPTO_CURRENCIES);
        setFiatCurrencies(fiat.length > 0 ? fiat : FALLBACK_FIAT_CURRENCIES);
        logger.log(`Loaded ${crypto.length} crypto and ${fiat.length} fiat currencies`);
      }
    } catch (err) {
      logger.error('Failed to load currencies from API:', err);
      // Use fallback currencies so widget still works
      logger.warn('Using fallback currency list due to API error');
      setCurrencies([...FALLBACK_CRYPTO_CURRENCIES, ...FALLBACK_FIAT_CURRENCIES]);
      setCryptoCurrencies(FALLBACK_CRYPTO_CURRENCIES);
      setFiatCurrencies(FALLBACK_FIAT_CURRENCIES);
      
      const errorMessage = err.response?.data?.error || err.message || 'Failed to load currencies';
      if (errorMessage.includes('404') || errorMessage.includes('Not Found')) {
        setError('SimpleSwap API endpoints not found. Using fallback currencies. Please check SimpleSwap API documentation for correct endpoint format or contact SimpleSwap support.');
      } else if (errorMessage.includes('CORS')) {
        setError('CORS error. Using fallback currencies.');
      } else {
        setError(`API error: ${errorMessage}. Using fallback currencies.`);
      }
    } finally {
      setLoading(false);
    }
  };

  // Get minimum amount when currencies change
  useEffect(() => {
    if (fromCurrency && toCurrency) {
      loadMinAmount();
    }
  }, [fromCurrency, toCurrency]);

  // Load minimum amount
  const loadMinAmount = async () => {
    try {
      const data = await simpleswapService.getMinAmount(fromCurrency, toCurrency);
      if (data && data.min_amount) {
        setMinAmount(data.min_amount);
      }
    } catch (err) {
      logger.error('Failed to load min amount:', err);
    }
  };

  // Get exchange rate when amount or currencies change
  useEffect(() => {
    if (fromCurrency && toCurrency && amount && parseFloat(amount) > 0) {
      const delayTimer = setTimeout(() => {
        loadExchangeRate();
      }, 500); // Debounce

      return () => clearTimeout(delayTimer);
    } else {
      setRateInfo(null);
    }
  }, [fromCurrency, toCurrency, amount, fixedRate]);

  // Auto-refresh exchange rate every 30 seconds when rate info exists
  useEffect(() => {
    if (fromCurrency && toCurrency && amount && parseFloat(amount) > 0 && rateInfo) {
      const interval = setInterval(() => {
        loadExchangeRate();
      }, 30000); // Refresh every 30 seconds

      return () => clearInterval(interval);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromCurrency, toCurrency, amount, fixedRate, rateInfo]);

  // Load exchange rate
  const loadExchangeRate = async () => {
    if (!fromCurrency || !toCurrency || !amount || parseFloat(amount) <= 0) {
      return;
    }

    try {
      setLoadingRate(true);
      setError(null);
      const data = await simpleswapService.getExchangeRate(
        fromCurrency,
        toCurrency,
        parseFloat(amount),
        fixedRate
      );
      setRateInfo(data);
    } catch (err) {
      logger.error('Failed to load exchange rate:', err);
      setError('Failed to get exchange rate. Please check your inputs.');
      setRateInfo(null);
    } finally {
      setLoadingRate(false);
    }
  };

  // Handle exchange creation
  const handleCreateExchange = async () => {
    if (!fromCurrency || !toCurrency || !amount || !addressTo) {
      setError('Please fill in all required fields');
      return;
    }

    if (minAmount && parseFloat(amount) < parseFloat(minAmount)) {
      setError(`Minimum amount is ${minAmount} ${fromCurrency}`);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const exchangeData = {
        currency_from: fromCurrency,
        currency_to: toCurrency,
        address_to: addressTo,
        amount: parseFloat(amount),
        fixed: fixedRate,
      };

      if (extraIdTo) {
        exchangeData.extra_id_to = extraIdTo;
      }

      const data = await simpleswapService.createExchange(exchangeData);
      setExchange(data);
    } catch (err) {
      logger.error('Failed to create exchange:', err);
      setError(err.response?.data?.message || err.message || 'Failed to create exchange. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Filter currencies for dropdown based on active tab
  const filteredCurrencies = useCallback((search, isFrom = true) => {
    let currencyList = [];
    
    if (activeTab === 'fiat') {
      // Fiat tab: Buy crypto with fiat (from=fiat, to=crypto) OR Sell crypto for fiat (from=crypto, to=fiat)
      // For simplicity, we'll allow both directions - user can swap if needed
      currencyList = isFrom ? fiatCurrencies : cryptoCurrencies;
    } else {
      // Crypto tab: Crypto to crypto exchange
      currencyList = cryptoCurrencies;
    }
    
    // If no currencies loaded yet, use fallback
    if (currencyList.length === 0) {
      if (activeTab === 'fiat') {
        currencyList = isFrom ? FALLBACK_FIAT_CURRENCIES : FALLBACK_CRYPTO_CURRENCIES;
      } else {
        currencyList = FALLBACK_CRYPTO_CURRENCIES;
      }
    }
    
    if (!search) return currencyList;
    const searchLower = search.toLowerCase();
    return currencyList.filter((curr) => {
      const code = curr?.code || curr?.ticker || curr?.symbol || String(curr) || '';
      const name = curr?.name || code;
      return (
        code.toLowerCase().includes(searchLower) ||
        name.toLowerCase().includes(searchLower)
      );
    });
  }, [activeTab, cryptoCurrencies, fiatCurrencies]);

  // Swap currencies
  const swapCurrencies = () => {
    const temp = fromCurrency;
    setFromCurrency(toCurrency);
    setToCurrency(temp);
    setRateInfo(null);
  };

  if (exchange) {
    return (
      <div className="simpleswap-widget">
        <div className="exchange-success">
          <FaCheckCircle className="success-icon" />
          <h3>Exchange Created Successfully!</h3>
          <div className="exchange-details">
            <p><strong>Exchange ID:</strong> {exchange.id || exchange.exchange_id}</p>
            <p><strong>Send:</strong> {amount} {fromCurrency}</p>
            <p><strong>Receive:</strong> {rateInfo?.amount_to || 'Calculating...'} {toCurrency}</p>
            {exchange.address_from && (
              <div className="payment-address">
                <p><strong>Send to this address:</strong></p>
                <code>{exchange.address_from}</code>
              </div>
            )}
          </div>
          <button
            className="new-exchange-btn"
            onClick={() => {
              setExchange(null);
              setAmount('');
              setAddressTo('');
              setExtraIdTo('');
              setRateInfo(null);
            }}
          >
            Create New Exchange
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="simpleswap-widget">
      {/* Tab Navigation */}
      <div className="widget-tabs">
        <button
          className={`tab-button ${activeTab === 'crypto' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('crypto');
            setFromCurrency('');
            setToCurrency('');
            setAmount('');
            setRateInfo(null);
          }}
        >
          <FaExchangeAlt /> Crypto Exchange
        </button>
        <button
          className={`tab-button ${activeTab === 'fiat' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('fiat');
            setFromCurrency('');
            setToCurrency('');
            setAmount('');
            setRateInfo(null);
          }}
        >
          💳 Buy/Sell Crypto
        </button>
      </div>

      <div className="widget-content">
        {/* From Currency */}
        <div className="currency-section">
          <label className="section-label">You Send</label>
          <div className="currency-input-group">
            <div className="currency-select-wrapper">
              {fromCurrency && (() => {
                const selectedCurrency = currencies.find(c => c.code === fromCurrency);
                return (
                  <div className="currency-select-display" onClick={() => setShowFromDropdown(true)}>
                    {selectedCurrency?.image && (
                      <img 
                        src={selectedCurrency.image} 
                        alt={selectedCurrency.name}
                        className="currency-select-logo"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    )}
                    {!selectedCurrency?.image && (
                      <div className="currency-select-logo-placeholder">
                        {fromCurrency.substring(0, 2)}
                      </div>
                    )}
                    <span className="currency-select-code">{fromCurrency}</span>
                    <span className="currency-select-arrow">▼</span>
                  </div>
                );
              })()}
              {!fromCurrency && (
                <input
                  type="text"
                  className="currency-search"
                  placeholder="Search currency..."
                  value={searchFrom}
                  onChange={(e) => setSearchFrom(e.target.value)}
                  onFocus={() => setShowFromDropdown(true)}
                  onBlur={() => setTimeout(() => setShowFromDropdown(false), 200)}
                />
              )}
              {showFromDropdown && (
                <div className="currency-dropdown">
                  <div className="currency-dropdown-search">
                    <input
                      type="text"
                      className="currency-dropdown-search-input"
                      placeholder="Search currencies..."
                      value={searchFrom}
                      onChange={(e) => setSearchFrom(e.target.value)}
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  <div className="currency-dropdown-list">
                    {filteredCurrencies(searchFrom, true).slice(0, 20).map((curr, index) => {
                    const code = curr?.code || curr?.ticker || curr?.symbol || String(curr) || '';
                    const name = curr?.name || code;
                    const image = curr?.image || '';
                    const network = curr?.network || '';
                    const key = code || `currency-${index}`;
                    const selectedFrom = fromCurrency === code;
                    
                    return (
                      <div
                        key={key}
                        className={`currency-option ${selectedFrom ? 'selected' : ''}`}
                        onClick={() => {
                          if (code) {
                            setFromCurrency(code);
                            setSearchFrom('');
                            setShowFromDropdown(false);
                            setRateInfo(null);
                          }
                        }}
                      >
                        {image && (
                          <img 
                            src={image} 
                            alt={name}
                            className="currency-logo"
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                        )}
                        {!image && (
                          <div className="currency-logo-placeholder">
                            {code.substring(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div className="currency-info">
                          <span className="currency-code">{code}</span>
                          <span className="currency-name">{name}</span>
                        </div>
                        {network && (
                          <span className="currency-network">{network}</span>
                        )}
                        {selectedFrom && (
                          <span className="currency-check">✓</span>
                        )}
                      </div>
                    );
                  })}
                  </div>
                </div>
              )}
            </div>
            <input
              type="number"
              className="amount-input"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min={minAmount || 0}
              step="any"
            />
          </div>
          {fromCurrency && (() => {
            const selectedCurrency = currencies.find(c => c.code === fromCurrency);
            return (
              <div className="selected-currency-display">
                {selectedCurrency?.image && (
                  <img 
                    src={selectedCurrency.image} 
                    alt={selectedCurrency.name}
                    className="selected-currency-logo"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                )}
                <div className="selected-currency-info">
                  <span className="selected-currency-code">{fromCurrency}</span>
                  {selectedCurrency?.name && (
                    <span className="selected-currency-name">{selectedCurrency.name}</span>
                  )}
                  {selectedCurrency?.network && (
                    <span className="selected-currency-network">{selectedCurrency.network}</span>
                  )}
                </div>
              </div>
            );
          })()}
          {minAmount && (
            <div className="min-amount">
              <span className="min-amount-label">Minimum:</span>
              <span className="min-amount-value">{minAmount} {fromCurrency}</span>
            </div>
          )}
          {fromCurrency && (() => {
            const selectedCurrency = currencies.find(c => c.code === fromCurrency);
            if (selectedCurrency?.warningsFrom && selectedCurrency.warningsFrom.length > 0) {
              return (
                <div className="currency-warning">
                  <FaExclamationTriangle /> {selectedCurrency.warningsFrom[0]}
                </div>
              );
            }
            return null;
          })()}
        </div>

        {/* Swap Button */}
        <div className="swap-button-container">
          <button className="swap-button" onClick={swapCurrencies}>
            <FaExchangeAlt />
          </button>
        </div>

        {/* To Currency */}
        <div className="currency-section">
          <label className="section-label">You Get</label>
          <div className="currency-select-wrapper">
            {toCurrency && (() => {
              const selectedCurrency = currencies.find(c => c.code === toCurrency);
              return (
                <div className="currency-select-display" onClick={() => setShowToDropdown(true)}>
                  {selectedCurrency?.image && (
                    <img 
                      src={selectedCurrency.image} 
                      alt={selectedCurrency.name}
                      className="currency-select-logo"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  )}
                  {!selectedCurrency?.image && (
                    <div className="currency-select-logo-placeholder">
                      {toCurrency.substring(0, 2)}
                    </div>
                  )}
                  <span className="currency-select-code">{toCurrency}</span>
                  <span className="currency-select-arrow">▼</span>
                </div>
              );
            })()}
            {!toCurrency && (
              <input
                type="text"
                className="currency-search"
                placeholder="Search currency..."
                value={searchTo}
                onChange={(e) => setSearchTo(e.target.value)}
                onFocus={() => setShowToDropdown(true)}
                onBlur={() => setTimeout(() => setShowToDropdown(false), 200)}
              />
            )}
            {showToDropdown && (
              <div className="currency-dropdown">
                <div className="currency-dropdown-search">
                  <input
                    type="text"
                    className="currency-dropdown-search-input"
                    placeholder="Search currencies..."
                    value={searchTo}
                    onChange={(e) => setSearchTo(e.target.value)}
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                <div className="currency-dropdown-list">
                  {filteredCurrencies(searchTo, false).slice(0, 20).map((curr, index) => {
                  const code = curr?.code || curr?.ticker || curr?.symbol || String(curr) || '';
                  const name = curr?.name || code;
                  const image = curr?.image || '';
                  const network = curr?.network || '';
                  const key = code || `currency-${index}`;
                  const selectedTo = toCurrency === code;
                  
                  return (
                    <div
                      key={key}
                      className={`currency-option ${selectedTo ? 'selected' : ''}`}
                      onClick={() => {
                        if (code) {
                          setToCurrency(code);
                          setSearchTo('');
                          setShowToDropdown(false);
                          setRateInfo(null);
                        }
                      }}
                    >
                      {image && (
                        <img 
                          src={image} 
                          alt={name}
                          className="currency-logo"
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      )}
                      {!image && (
                        <div className="currency-logo-placeholder">
                          {code.substring(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div className="currency-info">
                        <span className="currency-code">{code}</span>
                        <span className="currency-name">{name}</span>
                      </div>
                      {network && (
                        <span className="currency-network">{network}</span>
                      )}
                      {selectedTo && (
                        <span className="currency-check">✓</span>
                      )}
                    </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          {toCurrency && (() => {
            const selectedCurrency = currencies.find(c => c.code === toCurrency);
            return (
              <div className="selected-currency-display">
                {selectedCurrency?.image && (
                  <img 
                    src={selectedCurrency.image} 
                    alt={selectedCurrency.name}
                    className="selected-currency-logo"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                )}
                <div className="selected-currency-info">
                  <span className="selected-currency-code">{toCurrency}</span>
                  {selectedCurrency?.name && (
                    <span className="selected-currency-name">{selectedCurrency.name}</span>
                  )}
                  {selectedCurrency?.network && (
                    <span className="selected-currency-network">{selectedCurrency.network}</span>
                  )}
                </div>
              </div>
            );
          })()}
          {toCurrency && (() => {
            const selectedCurrency = currencies.find(c => c.code === toCurrency);
            if (selectedCurrency?.warningsTo && selectedCurrency.warningsTo.length > 0) {
              return (
                <div className="currency-warning">
                  <FaExclamationTriangle /> {selectedCurrency.warningsTo[0]}
                </div>
              );
            }
            return null;
          })()}
          {rateInfo && (
            <div className="rate-info">
              {loadingRate ? (
                <div className="rate-loading">
                  <FaSpinner className="spinner" />
                  <span>Calculating rate...</span>
                </div>
              ) : (
                <>
                  <div className="rate-main">
                    <div className="rate-amount">
                      {rateInfo.amount_to || rateInfo.estimated_amount || 'Calculating...'} {toCurrency}
                    </div>
                    {rateInfo.rate && (
                      <div className="rate-per-unit">
                        1 {fromCurrency} = {parseFloat(rateInfo.rate).toFixed(8)} {toCurrency}
                      </div>
                    )}
                  </div>
                  <div className="rate-details">
                    <div className="rate-type">
                      {fixedRate ? (
                        <>
                          <FaLock /> Fixed Rate
                        </>
                      ) : (
                        <>
                          <FaUnlock /> Floating Rate
                        </>
                      )}
                    </div>
                    {rateInfo.estimated_time && (
                      <div className="rate-time">
                        Est. time: {rateInfo.estimated_time}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Rate Type Toggle */}
        <div className="rate-type-toggle">
          <label>
            <input
              type="checkbox"
              checked={fixedRate}
              onChange={(e) => setFixedRate(e.target.checked)}
            />
            <span>Use Fixed Rate</span>
          </label>
        </div>

        {/* Recipient Address */}
        <div className="address-section">
          <label className="section-label">Recipient Address *</label>
          <input
            type="text"
            className="address-input"
            placeholder={`Enter ${toCurrency} address`}
            value={addressTo}
            onChange={(e) => setAddressTo(e.target.value)}
          />
        </div>

        {/* Extra ID (for some currencies like XRP, XLM) */}
        {toCurrency && ['XRP', 'XLM', 'EOS', 'BTS'].includes(toCurrency.toUpperCase()) && (
          <div className="address-section">
            <label className="section-label">Destination Tag / Memo (if required)</label>
            <input
              type="text"
              className="address-input"
              placeholder="Optional"
              value={extraIdTo}
              onChange={(e) => setExtraIdTo(e.target.value)}
            />
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="error-message">
            <FaExclamationTriangle /> {error}
          </div>
        )}

        {/* Create Exchange Button */}
        <button
          className="create-exchange-btn"
          onClick={handleCreateExchange}
          disabled={loading || !fromCurrency || !toCurrency || !amount || !addressTo}
        >
          {loading ? (
            <>
              <FaSpinner className="spinner" /> Creating Exchange...
            </>
          ) : (
            'Create Exchange'
          )}
        </button>

        {/* Loading State */}
        {loading && currencies.length === 0 && (
          <div className="loading-state">
            <FaSpinner className="spinner" />
            <p>Loading currencies...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SimpleSwapWidget;

