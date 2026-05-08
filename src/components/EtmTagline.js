import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { FaTimes } from 'react-icons/fa';
import './EtmTagline.css';

const EtmExplainerModal = ({ isOpen, onClose }) => {
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const node = (
    <div className="etm-explainer-overlay" onClick={onClose} role="presentation">
      <div
        className="etm-explainer-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="etm-explainer-title"
      >
        <div className="etm-explainer-header">
          <h2 id="etm-explainer-title" className="etm-explainer-title">
            What is ETM?
          </h2>
          <button type="button" className="etm-explainer-close" onClick={onClose} aria-label="Close">
            <FaTimes />
          </button>
        </div>
        <div className="etm-explainer-body">
          <p>
            <strong>ETM</strong> stands for <strong>Electronic Teller Machine</strong> — a digital spin on the
            idea behind an ATM: fast, self-serve access to your money.
          </p>
          <p>
            AquaSwap is your ETM for crypto: swap and move assets across chains from your browser or the AquaSwap
            extension — anytime, anywhere you&apos;re online.
          </p>
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(node, document.body);
};

const EtmTagline = ({ compact = false, className = '' }) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <p
        className={['etm-tagline', compact ? 'etm-tagline--compact' : '', className].filter(Boolean).join(' ')}
      >
        <span className="etm-tagline__lead">Your ETM</span>
        <button
          type="button"
          className="etm-tagline__help"
          onClick={() => setOpen(true)}
          aria-label="What does ETM mean?"
          title="What does ETM mean?"
        >
          ?
        </button>
        <span className="etm-tagline__tail"> — anytime, anywhere</span>
      </p>
      <EtmExplainerModal isOpen={open} onClose={() => setOpen(false)} />
    </>
  );
};

export default EtmTagline;
