import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FaRocket, FaClock, FaBullhorn, FaExternalLinkAlt, FaImage, FaTimes, FaCheckCircle } from 'react-icons/fa';
import { API_URL } from '../services/api';

const DURATION_OPTIONS = [
  { key: 'day', label: '24 Hours', durationMs: 24 * 60 * 60 * 1000 },
  { key: 'threeDays', label: '3 Days', durationMs: 3 * 24 * 60 * 60 * 1000 },
  { key: 'sevenDays', label: '7 Days', durationMs: 7 * 24 * 60 * 60 * 1000 }
];

const POLL_INTERVAL = 5000;
const POLL_TIMEOUT = 5 * 60 * 1000;

const CreateLinkBioAdModal = ({ onClose, targetUsername, aquaPaySlug, pricing }) => {
  const [selectedDuration, setSelectedDuration] = useState(DURATION_OPTIONS[0]);
  const [adData, setAdData] = useState({ title: '', gif: '', url: '' });
  const [previewUrl, setPreviewUrl] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState('form');
  const [createdAdId, setCreatedAdId] = useState(null);
  const [popupClosed, setPopupClosed] = useState(false);
  const popupRef = useRef(null);
  const pollStartRef = useRef(null);

  const getPrice = (key) => {
    if (!pricing) return 0;
    return pricing[key] || 0;
  };

  const validateImageUrl = async (url) => {
    try {
      const response = await fetch(url);
      const contentType = response.headers.get('content-type');
      return contentType && contentType.startsWith('image/');
    } catch {
      return false;
    }
  };

  const handleGifChange = async (e) => {
    const url = e.target.value;
    setAdData(prev => ({ ...prev, gif: url }));
    if (url) {
      const isValid = await validateImageUrl(url);
      if (isValid) {
        setPreviewUrl(url);
        setError('');
      } else {
        setPreviewUrl('');
        setError('Please enter a valid image URL');
      }
    } else {
      setPreviewUrl('');
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!adData.title || !adData.gif || !adData.url) {
      setError('Please fill in all fields');
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      const response = await fetch(`${API_URL}/link-bio-ads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: adData.title,
          gif: adData.gif,
          url: adData.url,
          targetUsername,
          durationKey: selectedDuration.key
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create ad');
      }

      const result = await response.json();
      const price = getPrice(selectedDuration.key);
      const paySlug = result.aquaPaySlug || aquaPaySlug;
      const aquaPayUrl = `https://aquads.xyz/pay/${paySlug}?amount=${price}&linkBioAdId=${result._id}`;

      setCreatedAdId(result._id);
      pollStartRef.current = Date.now();
      popupRef.current = window.open(aquaPayUrl, '_blank');
      setStep('waiting');
    } catch (err) {
      setError(err.message || 'Failed to create ad');
    } finally {
      setSubmitting(false);
    }
  };

  const checkAdActive = useCallback(async () => {
    if (!createdAdId || !targetUsername) return false;
    try {
      const res = await fetch(`${API_URL}/link-bio-ads/active/${encodeURIComponent(targetUsername)}`);
      if (res.ok) {
        const ads = await res.json();
        return Array.isArray(ads) && ads.some(ad => ad._id === createdAdId);
      }
    } catch (_) {}
    return false;
  }, [createdAdId, targetUsername]);

  useEffect(() => {
    if (step !== 'waiting') return;

    const popupCheck = setInterval(() => {
      if (popupRef.current && popupRef.current.closed) {
        setPopupClosed(true);
      }
    }, 1000);

    const adPoll = setInterval(async () => {
      const isActive = await checkAdActive();
      if (isActive) {
        setStep('success');
      } else if (Date.now() - pollStartRef.current > POLL_TIMEOUT) {
        setStep('timeout');
      }
    }, POLL_INTERVAL);

    return () => {
      clearInterval(popupCheck);
      clearInterval(adPoll);
    };
  }, [step, checkAdActive]);

  useEffect(() => {
    if (step !== 'success') return;
    const timer = setTimeout(() => onClose(), 6000);
    return () => clearTimeout(timer);
  }, [step, onClose]);

  if (step === 'success') {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ fontFamily: "'DM Sans', sans-serif" }}>
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
        <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#0f1320]/95 backdrop-blur-xl shadow-2xl p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
            <FaCheckCircle className="text-green-400 text-3xl" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2" style={{ fontFamily: "'Syne', sans-serif" }}>
            Payment Confirmed!
          </h2>
          <p className="text-slate-300 text-sm mb-1">
            Your ad is now live on <span className="text-cyan-400 font-semibold">@{targetUsername}</span>'s page.
          </p>
          <p className="text-slate-500 text-xs mb-6">
            It will appear on the page within a few seconds.
          </p>
          <button
            onClick={onClose}
            className="px-8 py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-white font-bold transition-all shadow-lg shadow-green-500/20"
          >
            Done
          </button>
          <p className="text-slate-600 text-xs mt-3">Auto-closing in a few seconds...</p>
        </div>
      </div>
    );
  }

  if (step === 'waiting' || step === 'timeout') {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ fontFamily: "'DM Sans', sans-serif" }}>
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
        <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#0f1320]/95 backdrop-blur-xl shadow-2xl p-8 text-center">
          {step === 'timeout' ? (
            <>
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-yellow-500/20 flex items-center justify-center">
                <FaClock className="text-yellow-400 text-2xl" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2" style={{ fontFamily: "'Syne', sans-serif" }}>
                Payment Timed Out
              </h2>
              <p className="text-slate-300 text-sm mb-4">
                We didn't detect a payment yet. If you completed the payment, your ad will still activate automatically once confirmed on-chain.
              </p>
              <button
                onClick={onClose}
                className="px-8 py-3 rounded-xl bg-white/10 border border-white/10 hover:bg-white/15 text-white font-medium transition-all"
              >
                Close
              </button>
            </>
          ) : (
            <>
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-cyan-500/10 flex items-center justify-center">
                <div className="w-8 h-8 border-3 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2" style={{ fontFamily: "'Syne', sans-serif" }}>
                Waiting for Payment
              </h2>
              <p className="text-slate-300 text-sm mb-2">
                Complete your payment in the AquaPay window.
              </p>
              <p className="text-slate-500 text-xs mb-6">
                Your ad will activate automatically once the crypto payment is confirmed on-chain.
              </p>

              {popupClosed && (
                <div className="mb-4 p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                  <p className="text-cyan-300 text-sm">
                    Payment window closed. Checking for confirmation...
                  </p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    const price = getPrice(selectedDuration.key);
                    const paySlug = aquaPaySlug;
                    const aquaPayUrl = `https://aquads.xyz/pay/${paySlug}?amount=${price}&linkBioAdId=${createdAdId}`;
                    popupRef.current = window.open(aquaPayUrl, '_blank');
                    setPopupClosed(false);
                  }}
                  className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 transition-colors font-medium text-sm"
                >
                  Reopen Payment
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 transition-colors font-medium text-sm"
                >
                  Close
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-[#0f1320]/95 backdrop-blur-xl shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#0f1320]/95 backdrop-blur-xl">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2" style={{ fontFamily: "'Syne', sans-serif" }}>
              <FaBullhorn className="text-cyan-400" />
              Advertise on this page
            </h2>
            <p className="text-slate-400 text-xs mt-0.5">Your ad will appear on <span className="text-cyan-400 font-medium">@{targetUsername}</span>'s page</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
            <FaTimes className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Duration Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
              <FaClock className="text-cyan-400" /> Select Duration
            </label>
            <div className="grid grid-cols-3 gap-2">
              {DURATION_OPTIONS.map((opt) => {
                const price = getPrice(opt.key);
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setSelectedDuration(opt)}
                    className={`p-3 rounded-xl border-2 transition-all text-center ${
                      selectedDuration.key === opt.key
                        ? 'border-cyan-500 bg-cyan-500/15 shadow-lg shadow-cyan-500/10'
                        : 'border-white/10 hover:border-cyan-500/40 hover:bg-white/5'
                    }`}
                  >
                    <div className="text-white font-semibold text-sm">{opt.label}</div>
                    <div className="text-cyan-400 font-bold text-lg mt-0.5">${price}</div>
                    {selectedDuration.key === opt.key && (
                      <div className="text-cyan-300 text-[10px] mt-0.5">Selected</div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Banner Title */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Banner Title</label>
            <input
              type="text"
              value={adData.title}
              onChange={(e) => setAdData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Your banner title"
              maxLength={100}
              required
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>

          {/* Banner Image URL */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
              <FaImage className="text-cyan-400" /> Banner Image URL
              <span className="text-cyan-400/60 text-xs">(1280×200px)</span>
            </label>
            <input
              type="text"
              value={adData.gif}
              onChange={handleGifChange}
              placeholder="https://example.com/banner.gif"
              required
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
            />
            <p className="mt-1 text-xs text-slate-500">Supports GIF, PNG, or JPG. Recommended 1280×200px.</p>
            {previewUrl && (
              <div className="mt-3 rounded-full overflow-hidden border border-cyan-500/30">
                <img
                  src={previewUrl}
                  alt="Banner preview"
                  className="w-full h-auto object-cover"
                  style={{ maxHeight: '80px' }}
                  onError={() => { setPreviewUrl(''); setError('Failed to load image'); }}
                />
              </div>
            )}
          </div>

          {/* Landing URL */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
              <FaExternalLinkAlt className="text-cyan-400" /> Landing Page URL
            </label>
            <input
              type="url"
              value={adData.url}
              onChange={(e) => setAdData(prev => ({ ...prev, url: e.target.value }))}
              placeholder="https://yourproject.com"
              required
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm flex items-center gap-1.5">
              <span>!</span> {error}
            </p>
          )}

          {/* Payment Summary */}
          <div className="p-4 rounded-xl bg-cyan-500/5 border border-cyan-500/20">
            <div className="flex justify-between items-center mb-2">
              <span className="text-slate-400 text-sm">Duration</span>
              <span className="text-white font-medium">{selectedDuration.label}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400 text-sm">Total</span>
              <span className="text-cyan-400 font-bold text-xl">${getPrice(selectedDuration.key)} USDC</span>
            </div>
            <p className="text-slate-500 text-xs mt-2">
              Payment goes directly to @{targetUsername} via AquaPay. Your ad activates instantly upon payment confirmation.
            </p>
          </div>

          {/* Submit */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <FaRocket className="text-sm" />
                  Pay with Crypto
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateLinkBioAdModal;
