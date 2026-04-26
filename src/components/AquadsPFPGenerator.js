import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../services/api';
import './AquadsPFPGenerator.css';

const STORAGE_LIMIT_FALLBACK = 5;

export default function AquadsPFPGenerator({ currentUser, onLogin, showNotification }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [gender, setGender] = useState('male');

  // Status from /status endpoint.
  const [canGenerate, setCanGenerate] = useState(false);
  const [nextAvailableAt, setNextAvailableAt] = useState(null);
  const [cooldownActive, setCooldownActive] = useState(false);
  const [storageFull, setStorageFull] = useState(false);
  const [slotsLimit, setSlotsLimit] = useState(STORAGE_LIMIT_FALLBACK);

  // Collection (gallery) from /list endpoint. Each item is {id, traits, createdAt}.
  const [collection, setCollection] = useState([]);
  const [collectionLoading, setCollectionLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // Most-recently-generated item id (so we can highlight it after generation).
  const [lastGeneratedId, setLastGeneratedId] = useState(null);

  const slotsUsed = collection.length;

  const loadStatus = useCallback(async () => {
    if (!currentUser?.token) return;
    try {
      const res = await fetch(`${API_URL}/pfp-generator/status`, {
        headers: { Authorization: `Bearer ${currentUser.token}` }
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setCanGenerate(data.canGenerate !== false);
        setNextAvailableAt(data.nextAvailableAt || null);
        setCooldownActive(!!data.cooldownActive);
        setStorageFull(!!data.storageFull);
        if (typeof data.slotsLimit === 'number') setSlotsLimit(data.slotsLimit);
      }
    } catch {
      /* non-fatal */
    }
  }, [currentUser?.token]);

  const loadCollection = useCallback(async () => {
    if (!currentUser?.token) {
      setCollection([]);
      return;
    }
    setCollectionLoading(true);
    try {
      const res = await fetch(`${API_URL}/pfp-generator/list`, {
        headers: { Authorization: `Bearer ${currentUser.token}` }
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && Array.isArray(data.items)) {
        setCollection(data.items);
        if (typeof data.slotsLimit === 'number') setSlotsLimit(data.slotsLimit);
      }
    } catch {
      /* non-fatal */
    } finally {
      setCollectionLoading(false);
    }
  }, [currentUser?.token]);

  useEffect(() => {
    loadStatus();
    loadCollection();
  }, [loadStatus, loadCollection]);

  const generateImage = async () => {
    if (!currentUser?.token) {
      onLogin?.();
      return;
    }
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_URL}/pfp-generator/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentUser.token}`
        },
        body: JSON.stringify({ gender })
      });
      const data = await res.json().catch(() => ({}));

      if (res.status === 403 && data.code === 'STORAGE_FULL') {
        setStorageFull(true);
        if (typeof data.slotsLimit === 'number') setSlotsLimit(data.slotsLimit);
        throw new Error(data.error || 'Your collection is full. Delete one to make room.');
      }

      if (res.status === 429) {
        setCanGenerate(false);
        setCooldownActive(true);
        setNextAvailableAt(data.nextAvailableAt || null);
        throw new Error(data.error || 'Weekly limit reached');
      }

      if (!res.ok) {
        throw new Error(data.error || 'Generation failed');
      }

      if (!data.id) {
        throw new Error('Invalid response from server');
      }

      setLastGeneratedId(data.id);
      // Refresh both status and the collection so the new item appears at the
      // top of the gallery and slot/cooldown counts update.
      await Promise.all([loadStatus(), loadCollection()]);
      showNotification?.(
        'PFP generated and saved to your collection. Tap "Download" on any tile to save it.',
        'success'
      );
    } catch (err) {
      const msg = err.message || 'Error generating image';
      setError(msg);
      showNotification?.(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const deleteItem = async (item) => {
    if (!currentUser?.token || !item?.id) return;
    // eslint-disable-next-line no-alert
    const ok = window.confirm(
      'Delete this PFP from your collection? This frees up a slot but the image cannot be recovered.'
    );
    if (!ok) return;

    setDeletingId(item.id);
    try {
      const res = await fetch(`${API_URL}/pfp-generator/pfp/${item.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${currentUser.token}` }
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete');
      }
      if (lastGeneratedId === item.id) setLastGeneratedId(null);
      // Optimistically remove and then refresh from server to stay in sync.
      setCollection((prev) => prev.filter((p) => p.id !== item.id));
      await Promise.all([loadStatus(), loadCollection()]);
      showNotification?.('PFP deleted. Slot freed up.', 'success');
    } catch (err) {
      showNotification?.(err.message || 'Failed to delete PFP', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const nextLabel = useMemo(
    () =>
      nextAvailableAt
        ? new Date(nextAvailableAt).toLocaleString(undefined, {
            dateStyle: 'medium',
            timeStyle: 'short'
          })
        : null,
    [nextAvailableAt]
  );

  const buttonBlocked = loading || !currentUser?.token || !canGenerate;

  // Build a one-line explanation for why generation is blocked, if any.
  let blockedReason = '';
  if (currentUser?.token) {
    if (storageFull && cooldownActive) {
      blockedReason = `Your collection is full (${slotsLimit}/${slotsLimit}) and your weekly cooldown ends ${nextLabel || 'soon'}. Delete one and wait until then.`;
    } else if (storageFull) {
      blockedReason = `Your collection is full (${slotsLimit}/${slotsLimit}). Delete one of your saved PFPs below to generate a new one.`;
    } else if (cooldownActive && nextLabel) {
      blockedReason = `Next generation available after ${nextLabel}.`;
    }
  }

  return (
    <>
      <Helmet>
        <title>PFP Generator | Aquads</title>
        <meta name="description" content="Generate a weekly Aquads turtle mascot profile picture." />
      </Helmet>
      <div className="pfp-page">
        <header className="pfp-header">
          <div className="pfp-header-left">
            <img
              src="/Aquadsnewlogo.png"
              alt="Aquads"
              className="pfp-logo"
              onClick={() => navigate('/home')}
              onKeyDown={(e) => e.key === 'Enter' && navigate('/home')}
              role="button"
              tabIndex={0}
              title="Back to Home"
            />
          </div>
          <div className="pfp-header-center">
            <div className="pfp-title-wrap">
              <span className="pfp-title-emoji" aria-hidden>
                🐢
              </span>
              <div>
                <h1 className="pfp-title-heading">PFP Generator</h1>
                <p className="pfp-title-tagline">Aquads • Brand mascot studio</p>
              </div>
            </div>
          </div>
          <div className="pfp-header-right">
            <button type="button" className="pfp-back-btn" onClick={() => navigate('/home')}>
              ← Home
            </button>
          </div>
        </header>

        <main className="pfp-main">
          <div className="pfp-card">
            <p className="pfp-card-lead">
              Signed-in users: one free generation per rolling 7 days. Your last {slotsLimit} PFPs
              are saved here so you can re-download them anytime.
            </p>

            {currentUser?.token && (
              <div className="pfp-slots-indicator">
                <span className="pfp-slots-label">Storage</span>
                <span
                  className={`pfp-slots-count ${storageFull ? 'pfp-slots-count--full' : ''}`}
                >
                  {slotsUsed} / {slotsLimit}
                </span>
                <div className="pfp-slots-bar">
                  <div
                    className={`pfp-slots-bar-fill ${storageFull ? 'pfp-slots-bar-fill--full' : ''}`}
                    style={{ width: `${Math.min(100, (slotsUsed / slotsLimit) * 100)}%` }}
                  />
                </div>
              </div>
            )}

            {!currentUser?.token && (
              <p style={{ color: '#fbbf24', fontSize: 14, marginTop: 12 }}>
                Log in to generate your PFP.
                <button
                  type="button"
                  onClick={() => onLogin?.()}
                  style={{
                    marginLeft: 8,
                    background: 'transparent',
                    border: 'none',
                    color: '#a78bfa',
                    textDecoration: 'underline',
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                >
                  Log in
                </button>
              </p>
            )}

            {blockedReason && (
              <p className="pfp-blocked-reason">{blockedReason}</p>
            )}

            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              disabled={buttonBlocked}
              style={{
                width: '100%',
                padding: 10,
                marginTop: 10,
                borderRadius: 10,
                background: '#111',
                color: '#fff',
                border: '1px solid #7c3aed'
              }}
            >
              <option value="male">Male Turtle</option>
              <option value="female">Female Turtle</option>
            </select>

            <button
              type="button"
              onClick={generateImage}
              disabled={buttonBlocked}
              style={{
                width: '100%',
                padding: 14,
                marginTop: 10,
                borderRadius: 12,
                border: 'none',
                fontWeight: 'bold',
                cursor: buttonBlocked ? 'not-allowed' : 'pointer',
                opacity: buttonBlocked ? 0.6 : 1,
                background: 'linear-gradient(90deg,#facc15,#7c3aed)',
                color: '#000'
              }}
            >
              {loading ? 'Generating...' : 'Generate PFP'}
            </button>

            {error && <div style={{ color: '#f87171', marginTop: 10, fontSize: 14 }}>{error}</div>}

            {/* Gallery: the user's saved PFPs. Each tile pulls from /image/:id
                and downloads via /download/:id (real <a> with attachment header
                — works reliably on mobile/iOS where blob downloads are flaky). */}
            {currentUser?.token && (
              <div className="pfp-gallery-section">
                <div className="pfp-gallery-heading">
                  <h3 className="pfp-gallery-title">Your collection</h3>
                  {collection.length > 0 && (
                    <span className="pfp-gallery-hint">Tap Download to save · Tap Delete to free a slot</span>
                  )}
                </div>

                {collectionLoading && collection.length === 0 ? (
                  <p className="pfp-gallery-empty">Loading your collection...</p>
                ) : collection.length === 0 ? (
                  <p className="pfp-gallery-empty">
                    No PFPs yet. Generate one above and it will appear here.
                  </p>
                ) : (
                  <div className="pfp-gallery-grid">
                    {collection.map((item) => {
                      const imageUrl = `${API_URL}/pfp-generator/image/${item.id}`;
                      const downloadUrl = `${API_URL}/pfp-generator/download/${item.id}`;
                      const isLatest = item.id === lastGeneratedId;
                      const isDeleting = deletingId === item.id;
                      return (
                        <div
                          key={item.id}
                          className={`pfp-gallery-item ${isLatest ? 'pfp-gallery-item--latest' : ''}`}
                        >
                          {isLatest && <span className="pfp-gallery-badge">New</span>}
                          <div className="pfp-gallery-image-wrap">
                            <img
                              src={imageUrl}
                              alt={`Aquads PFP ${item.id}`}
                              className="pfp-gallery-image"
                              loading="lazy"
                            />
                          </div>
                          {item.traits && (
                            <div className="pfp-gallery-traits">
                              <span>{item.traits.gender || 'turtle'}</span>
                              {item.traits.coloredTrait && (
                                <span> · color: {item.traits.coloredTrait}</span>
                              )}
                            </div>
                          )}
                          <div className="pfp-gallery-actions">
                            <a
                              href={downloadUrl}
                              download
                              className="pfp-gallery-btn pfp-gallery-btn--download"
                            >
                              Download
                            </a>
                            <button
                              type="button"
                              onClick={() => deleteItem(item)}
                              disabled={isDeleting}
                              className="pfp-gallery-btn pfp-gallery-btn--delete"
                            >
                              {isDeleting ? 'Deleting...' : 'Delete'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
