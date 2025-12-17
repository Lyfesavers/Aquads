import React, { useState, useEffect, useCallback } from 'react';
import { FaExchangeAlt, FaLock, FaUnlock, FaSpinner, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';
import simpleswapService from '../services/simpleswapService';
import logger from '../utils/logger';
import './SimpleSwapWidget.css';

const SimpleSwapWidget = () => {
  const [currencies, setCurrencies] = useState([]);
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

  // Load currencies on mount
  useEffect(() => {
    loadCurrencies();
  }, []);

  // Load currencies
  const loadCurrencies = async () => {
    try {
      setLoading(true);
      const data = await simpleswapService.getCurrencies();
      if (data && typeof data === 'object') {
        // Convert object to array if needed
        const currencyArray = Array.isArray(data) ? data : Object.keys(data).map(key => ({
          code: key,
          name: data[key] || key,
        }));
        setCurrencies(currencyArray);
      }
    } catch (err) {
      logger.error('Failed to load currencies:', err);
      setError('Failed to load currencies. Please try again.');
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

  // Filter currencies for dropdown
  const filteredCurrencies = useCallback((search) => {
    if (!search) return currencies;
    const searchLower = search.toLowerCase();
    return currencies.filter(
      (curr) =>
        curr.code?.toLowerCase().includes(searchLower) ||
        curr.name?.toLowerCase().includes(searchLower)
    );
  }, [currencies]);

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
      <div className="widget-content">
        {/* From Currency */}
        <div className="currency-section">
          <label className="section-label">You Send</label>
          <div className="currency-input-group">
            <div className="currency-select-wrapper">
              <input
                type="text"
                className="currency-search"
                placeholder="Search currency..."
                value={searchFrom}
                onChange={(e) => setSearchFrom(e.target.value)}
                onFocus={() => setShowFromDropdown(true)}
                onBlur={() => setTimeout(() => setShowFromDropdown(false), 200)}
              />
              {showFromDropdown && (
                <div className="currency-dropdown">
                  {filteredCurrencies(searchFrom).slice(0, 10).map((curr) => (
                    <div
                      key={curr.code}
                      className="currency-option"
                      onClick={() => {
                        setFromCurrency(curr.code);
                        setSearchFrom('');
                        setShowFromDropdown(false);
                      }}
                    >
                      <span className="currency-code">{curr.code}</span>
                      <span className="currency-name">{curr.name}</span>
                    </div>
                  ))}
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
          {fromCurrency && (
            <div className="selected-currency">
              Selected: <strong>{fromCurrency}</strong>
            </div>
          )}
          {minAmount && (
            <div className="min-amount">
              Minimum: {minAmount} {fromCurrency}
            </div>
          )}
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
            <input
              type="text"
              className="currency-search"
              placeholder="Search currency..."
              value={searchTo}
              onChange={(e) => setSearchTo(e.target.value)}
              onFocus={() => setShowToDropdown(true)}
              onBlur={() => setTimeout(() => setShowToDropdown(false), 200)}
            />
            {showToDropdown && (
              <div className="currency-dropdown">
                {filteredCurrencies(searchTo).slice(0, 10).map((curr) => (
                  <div
                    key={curr.code}
                    className="currency-option"
                    onClick={() => {
                      setToCurrency(curr.code);
                      setSearchTo('');
                      setShowToDropdown(false);
                    }}
                  >
                    <span className="currency-code">{curr.code}</span>
                    <span className="currency-name">{curr.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          {toCurrency && (
            <div className="selected-currency">
              Selected: <strong>{toCurrency}</strong>
            </div>
          )}
          {rateInfo && (
            <div className="rate-info">
              {loadingRate ? (
                <FaSpinner className="spinner" />
              ) : (
                <>
                  <div className="rate-amount">
                    {rateInfo.amount_to || rateInfo.estimated_amount || 'Calculating...'} {toCurrency}
                  </div>
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

