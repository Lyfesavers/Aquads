import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaSpinner, FaCopy, FaCheck } from 'react-icons/fa';
import {
  lookupClaimableListing,
  prepareListingClaim,
  submitListingClaim
} from '../services/api';

const ClaimBubblePage = ({ currentUser, onLogin, onCreateAccount, showNotification }) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAd, setSelectedAd] = useState(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [tweetTemplate, setTweetTemplate] = useState('');
  const [tweetUrl, setTweetUrl] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [copied, setCopied] = useState(false);

  const notify = (message, type) => {
    if (showNotification) showNotification(message, type);
  };

  const handleSearch = async (e) => {
    e?.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;
    try {
      setIsSearching(true);
      setSelectedAd(null);
      setVerificationCode('');
      setTweetTemplate('');
      setCodeInput('');
      setTweetUrl('');
      setSubmitted(false);
      const data = await lookupClaimableListing(q);
      setSelectedAd(data.ad);
    } catch (error) {
      notify(error.message || 'Listing not found', 'error');
    } finally {
      setIsSearching(false);
    }
  };

  const handlePrepare = async () => {
    if (!selectedAd?.id) return;
    try {
      setIsPreparing(true);
      const data = await prepareListingClaim(selectedAd.id);
      setVerificationCode(data.verificationCode);
      setTweetTemplate(data.tweetTemplate || '');
      setCodeInput(data.verificationCode);
    } catch (error) {
      notify(error.message || 'Failed to generate code', 'error');
    } finally {
      setIsPreparing(false);
    }
  };

  const handleCopy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      notify('Could not copy to clipboard', 'error');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedAd?.id) return;
    try {
      setIsSubmitting(true);
      await submitListingClaim({
        adId: selectedAd.id,
        tweetUrl: tweetUrl.trim(),
        verificationCode: codeInput.trim()
      });
      setSubmitted(true);
      notify('Claim submitted — we will review your X post shortly', 'success');
    } catch (error) {
      notify(error.message || 'Failed to submit claim', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-black flex items-center justify-center px-4">
        <div className="text-center p-8 bg-gray-800/50 rounded-2xl border border-gray-700/50 max-w-md w-full">
          <div className="text-5xl mb-4">🔐</div>
          <h1 className="text-2xl font-bold text-white mb-2">Claim your bubble</h1>
          <p className="text-gray-400 mb-6">Log in to claim ownership of your project&apos;s Aquads listing.</p>
          <div className="flex gap-3 justify-center">
            <button onClick={onLogin} className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-medium">
              Login
            </button>
            <button onClick={onCreateAccount} className="px-6 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium">
              Create account
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-black text-white">
      <nav className="sticky top-0 z-20 bg-gray-900/90 backdrop-blur border-b border-gray-800">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/home" className="text-cyan-400 hover:text-cyan-300 text-sm font-medium">
            ← Back to map
          </Link>
          <span className="text-sm text-gray-400">@{currentUser.username}</span>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold mb-2">Claim your bubble</h1>
        <p className="text-gray-400 mb-8">
          Your project may already be listed on Aquads. Verify via X to unlock free Starter owner tools.
        </p>

        {submitted ? (
          <div className="bg-teal-900/30 border border-teal-500/40 rounded-xl p-8 text-center">
            <div className="text-4xl mb-4">✅</div>
            <h2 className="text-xl font-semibold mb-2">Claim submitted</h2>
            <p className="text-gray-300 mb-6">
              Our team will verify your X post and verification code, then transfer ownership to your account.
            </p>
            <button
              onClick={() => navigate('/dashboard/ads')}
              className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 rounded-lg font-medium"
            >
              Go to dashboard
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <form onSubmit={handleSearch} className="bg-gray-800/60 border border-gray-700 rounded-xl p-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Find your listing
              </label>
              <p className="text-xs text-gray-500 mb-3">
                Enter contract address, pair address, or listing ID
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Contract or pair address…"
                  className="flex-1 bg-gray-900 border border-gray-600 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                />
                <button
                  type="submit"
                  disabled={isSearching}
                  className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 rounded-lg disabled:opacity-50 flex items-center gap-2"
                >
                  {isSearching && <FaSpinner className="animate-spin" />}
                  Search
                </button>
              </div>
            </form>

            {selectedAd && (
              <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-6 space-y-6">
                <div className="flex items-center gap-4">
                  <img
                    src={selectedAd.logo}
                    alt={selectedAd.title}
                    className="w-14 h-14 rounded-full object-cover border border-gray-600"
                    onError={(e) => { e.target.src = 'https://placehold.co/56x56?text=?'; }}
                  />
                  <div>
                    <h2 className="text-xl font-bold">{selectedAd.title}</h2>
                    <p className="text-sm text-gray-400 capitalize">{selectedAd.blockchain}</p>
                    <p className="text-xs text-gray-500 font-mono break-all mt-1">{selectedAd.contractAddress}</p>
                  </div>
                </div>

                {!verificationCode ? (
                  <button
                    onClick={handlePrepare}
                    disabled={isPreparing}
                    className="w-full py-3 bg-teal-600 hover:bg-teal-500 rounded-lg font-medium flex items-center justify-center gap-2"
                  >
                    {isPreparing && <FaSpinner className="animate-spin" />}
                    Get verification code
                  </button>
                ) : (
                  <>
                    <div className="bg-gray-900 rounded-lg p-4 border border-teal-500/30">
                      <p className="text-sm text-gray-400 mb-2">Step 1 — Post on X with this code:</p>
                      <div className="flex items-center gap-2 mb-3">
                        <code className="text-lg font-bold text-teal-300">{verificationCode}</code>
                        <button
                          type="button"
                          onClick={() => handleCopy(verificationCode)}
                          className="p-2 text-gray-400 hover:text-white"
                          title="Copy code"
                        >
                          {copied ? <FaCheck className="text-green-400" /> : <FaCopy />}
                        </button>
                      </div>
                      {tweetTemplate && (
                        <div className="text-sm text-gray-300 bg-gray-950 rounded p-3 mb-2 break-words">
                          {tweetTemplate}
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => handleCopy(tweetTemplate || verificationCode)}
                        className="text-sm text-cyan-400 hover:text-cyan-300"
                      >
                        Copy suggested post text
                      </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Step 2 — X post URL
                        </label>
                        <input
                          type="url"
                          value={tweetUrl}
                          onChange={(e) => setTweetUrl(e.target.value)}
                          placeholder="https://x.com/yourproject/status/..."
                          required
                          className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Verification code (from your post)
                        </label>
                        <input
                          type="text"
                          value={codeInput}
                          onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                          placeholder="AQ-XXXXXX"
                          required
                          className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2.5 text-white font-mono placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 rounded-lg font-medium flex items-center justify-center gap-2"
                      >
                        {isSubmitting && <FaSpinner className="animate-spin" />}
                        Submit claim request
                      </button>
                    </form>
                  </>
                )}
              </div>
            )}

            <p className="text-xs text-gray-500 text-center">
              Only unclaimed automatic listings can be claimed. Not an endorsement — email{' '}
              <a href="mailto:info@aquads.xyz" className="text-cyan-500 hover:underline">
                info@aquads.xyz
              </a>{' '}
              to request removal. We aim to respond within 5 business days.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClaimBubblePage;
