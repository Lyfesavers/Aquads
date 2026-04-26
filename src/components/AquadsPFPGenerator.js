import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../services/api';
import './AquadsPFPGenerator.css';

function downloadBlobFromBase64(base64, mime, filename) {
  const byteChars = atob(base64);
  const bytes = new Uint8Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i += 1) {
    bytes[i] = byteChars.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type: mime || 'image/png' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function AquadsPFPGenerator({ currentUser, onLogin, showNotification }) {
  const navigate = useNavigate();
  const [imageBase64, setImageBase64] = useState('');
  const [imageMime, setImageMime] = useState('image/png');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [traits, setTraits] = useState(null);
  const [gender, setGender] = useState('male');
  const [canGenerate, setCanGenerate] = useState(true);
  const [nextAvailableAt, setNextAvailableAt] = useState(null);

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
      }
    } catch {
      /* non-fatal */
    }
  }, [currentUser?.token]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const imageSrc = imageBase64
    ? `data:${imageMime};base64,${imageBase64}`
    : '';

  const generateImage = async () => {
    if (!currentUser?.token) {
      onLogin?.();
      return;
    }
    setLoading(true);
    setError('');
    setImageBase64('');
    setTraits(null);

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

      if (res.status === 429) {
        setCanGenerate(false);
        setNextAvailableAt(data.nextAvailableAt || null);
        throw new Error(data.error || 'Weekly limit reached');
      }

      if (!res.ok) {
        throw new Error(data.error || 'Generation failed');
      }

      if (!data.imageBase64) {
        throw new Error('Invalid response from server');
      }

      setImageBase64(data.imageBase64);
      setImageMime(data.mimeType || 'image/png');
      setTraits(data.traits || null);
      await loadStatus();
      showNotification?.('PFP generated! Tap "Download PNG" below to save it.', 'success');
    } catch (err) {
      const msg = err.message || 'Error generating image';
      setError(msg);
      showNotification?.(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const onDownloadPng = () => {
    if (!imageBase64) return;
    downloadBlobFromBase64(imageBase64, imageMime || 'image/png', 'aquads-pfp.png');
  };

  const nextLabel = nextAvailableAt
    ? new Date(nextAvailableAt).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short'
      })
    : null;

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
            Signed-in users: one free generation per rolling 7 days.
          </p>

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

          {currentUser?.token && !canGenerate && !imageBase64 && nextLabel && (
            <p style={{ color: '#fbbf24', fontSize: 14, marginTop: 12 }}>
              Next generation available after {nextLabel}.
            </p>
          )}

          <select
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            disabled={!currentUser?.token || !canGenerate}
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
            disabled={loading || !currentUser?.token || !canGenerate}
            style={{
              width: '100%',
              padding: 14,
              marginTop: 10,
              borderRadius: 12,
              border: 'none',
              fontWeight: 'bold',
              cursor:
                loading || !currentUser?.token || !canGenerate ? 'not-allowed' : 'pointer',
              opacity: loading || !currentUser?.token || !canGenerate ? 0.6 : 1,
              background: 'linear-gradient(90deg,#facc15,#7c3aed)',
              color: '#000'
            }}
          >
            {loading ? 'Generating...' : 'Generate PFP'}
          </button>

          {error && <div style={{ color: '#f87171', marginTop: 10, fontSize: 14 }}>{error}</div>}

          {imageSrc && (
            <>
              <div
                style={{
                  width: 240,
                  height: 240,
                  margin: '20px auto',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  border: '4px solid #facc15'
                }}
              >
                <img src={imageSrc} alt="Generated Aquads PFP" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>

              {traits && (
                <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 10, lineHeight: 1.4 }}>
                  Shell: {traits.shell} | Accessory: {traits.accessory}
                  <br />
                  Expression: {traits.expression} | Aura: {traits.aura}
                  <br />
                  Color trait: {traits.coloredTrait}
                </div>
              )}

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                <button
                  type="button"
                  onClick={onDownloadPng}
                  style={{
                    flex: '1 1 100%',
                    padding: 14,
                    borderRadius: 10,
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    background: 'rgba(124,58,237,0.35)',
                    color: '#fff'
                  }}
                >
                  Download PNG
                </button>
              </div>
            </>
          )}
          </div>
        </main>
      </div>
    </>
  );
}
