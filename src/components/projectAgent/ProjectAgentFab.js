import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { fetchProjectAgentEligible } from '../../services/projectAgentApi';
import ProjectAgentPanel from './ProjectAgentPanel';
import {
  SKIPPER_AGENT_FAB_TITLE,
  SKIPPER_AGENT_NAME,
  SKIPPER_AGENT_SHORT
} from './projectAgentBrand';
import { getSkipperSessionKey } from './projectAgentSession';
import './ProjectAgent.css';

function SkipperFabIcon() {
  return (
    <img
      src="/Skipper logo.svg"
      alt=""
      className="project-agent-fab-icon"
      aria-hidden
    />
  );
}

export default function ProjectAgentFab({ currentUser }) {
  const navigate = useNavigate();
  const location = useLocation();
  const sessionKey = getSkipperSessionKey(currentUser);
  const [showFab, setShowFab] = useState(false);
  const [open, setOpen] = useState(false);
  const onFullPage = location.pathname.startsWith('/project-agent');

  useEffect(() => {
    setOpen(false);
  }, [sessionKey]);

  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    const token = currentUser?.token;
    if (!token) {
      setShowFab(false);
      return undefined;
    }

    let cancelled = false;

    const checkAccess = async () => {
      try {
        const data = await fetchProjectAgentEligible(token);
        if (cancelled) return;
        if (data.code === 'EMAIL_VERIFICATION_REQUIRED' || data.hasAccess === false) {
          setShowFab(false);
          return;
        }
        setShowFab(true);
      } catch {
        // Transient network/auth errors — do not permanently hide; retry on focus.
      }
    };

    checkAccess();

    const recheck = () => {
      if (!cancelled) checkAccess();
    };

    const onVisible = () => {
      if (document.visibilityState === 'visible') recheck();
    };

    window.addEventListener('focus', recheck);
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      cancelled = true;
      window.removeEventListener('focus', recheck);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [sessionKey, currentUser?.token, currentUser?.emailVerified]);

  if (!showFab || onFullPage) return null;

  return (
    <>
      {!open && (
        <button
          type="button"
          className="project-agent-fab"
          onClick={() => setOpen(true)}
          aria-label={`Open ${SKIPPER_AGENT_NAME}`}
          title={SKIPPER_AGENT_FAB_TITLE}
        >
          <span className="project-agent-fab-glow" aria-hidden />
          <SkipperFabIcon />
          <span className="project-agent-fab-label">
            <span className="project-agent-fab-name">{SKIPPER_AGENT_SHORT}</span>
            <span className="project-agent-fab-role">Agent</span>
          </span>
        </button>
      )}

      {open && (
        <>
          <div
            className="project-agent-drawer-backdrop"
            role="presentation"
            onClick={() => setOpen(false)}
          />
          <div
            className="project-agent-drawer"
            role="dialog"
            aria-modal="true"
            aria-label={SKIPPER_AGENT_NAME}
          >
            <ProjectAgentPanel
              key={sessionKey || 'guest'}
              currentUser={currentUser}
              compact
              onClose={() => setOpen(false)}
              onExpand={(session) => {
                setOpen(false);
                const ad = session?.adId ? encodeURIComponent(session.adId) : '';
                const thread = session?.threadId
                  ? encodeURIComponent(String(session.threadId))
                  : '';
                const path = ad
                  ? `/project-agent/${ad}${thread ? `?thread=${thread}` : ''}`
                  : '/project-agent';
                navigate(path, { state: { projectAgentSession: session } });
              }}
            />
          </div>
        </>
      )}
    </>
  );
}
