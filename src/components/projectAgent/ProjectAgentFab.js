import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
  const [showFab, setShowFab] = useState(false);
  const [open, setOpen] = useState(false);
  const onFullPage = location.pathname.startsWith('/project-agent');

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
