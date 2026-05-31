import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { fetchProjectAgentEligible } from '../../services/projectAgentApi';
import ProjectAgentPanel from './ProjectAgentPanel';
import {
  SKIPPER_AGENT_FAB_TITLE,
  SKIPPER_AGENT_NAME,
  SKIPPER_AGENT_SHORT
} from './projectAgentBrand';
import { getSkipperAuthEpoch } from './projectAgentSession';
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
  const authEpoch = getSkipperAuthEpoch(currentUser);
  const token = currentUser?.token;
  const canShowFab =
    Boolean(token) && currentUser?.emailVerified !== false;
  const [showFab, setShowFab] = useState(canShowFab);
  const [open, setOpen] = useState(false);
  const onFullPage = location.pathname.startsWith('/project-agent');

  // New account: close drawer, show FAB immediately (do not wait for eligible API).
  useEffect(() => {
    setOpen(false);
    setShowFab(canShowFab);
  }, [authEpoch, canShowFab]);

  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Only hit eligible API when the drawer opens — not on every login (main app stays fast).
  useEffect(() => {
    if (!token) {
      setShowFab(false);
      return undefined;
    }
    if (!open) {
      setShowFab(canShowFab);
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
        // Keep optimistic FAB visible while drawer is open.
      }
    };

    checkAccess();

    return () => {
      cancelled = true;
    };
  }, [authEpoch, token, open, canShowFab, currentUser?.emailVerified]);

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

      {open && token && (
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
              key={authEpoch}
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
                navigate(path, {
                  state: {
                    projectAgentSession: {
                      ...session,
                      ownerSessionKey: getSkipperAuthEpoch(currentUser)
                    }
                  }
                });
              }}
            />
          </div>
        </>
      )}
    </>
  );
}
