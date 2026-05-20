import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchProjectAgentEligible } from '../../services/projectAgentApi';
import ProjectAgentPanel from './ProjectAgentPanel';
import {
  SKIPPER_AGENT_FAB_TITLE,
  SKIPPER_AGENT_NAME,
  SKIPPER_AGENT_SHORT
} from './projectAgentBrand';
import './ProjectAgent.css';

function SkipperFabIcon() {
  return (
    <svg
      className="project-agent-fab-icon"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.75" />
      <circle cx="12" cy="12" r="2.25" fill="currentColor" />
      <path
        d="M12 3v2.25M12 18.75V21M3 12h2.25M18.75 12H21M5.5 5.5l1.6 1.6M16.9 16.9l1.6 1.6M5.5 18.5l1.6-1.6M16.9 7.1l1.6-1.6"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function ProjectAgentFab({ currentUser }) {
  const navigate = useNavigate();
  const [showFab, setShowFab] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!currentUser?.token) {
      setShowFab(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const { hasAccess } = await fetchProjectAgentEligible(currentUser.token);
        if (!cancelled) setShowFab(!!hasAccess);
      } catch {
        if (!cancelled) setShowFab(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [currentUser?.token]);

  if (!showFab) return null;

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
              currentUser={currentUser}
              compact
              onClose={() => setOpen(false)}
              onExpand={() => {
                setOpen(false);
                navigate('/project-agent');
              }}
            />
          </div>
        </>
      )}
    </>
  );
}
