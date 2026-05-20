import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchProjectAgentEligible } from '../../services/projectAgentApi';
import ProjectAgentPanel from './ProjectAgentPanel';
import './ProjectAgent.css';

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
      <button
        type="button"
        className="project-agent-fab"
        onClick={() => setOpen(true)}
        aria-label="Open Aquads Project Agent"
        title="Project Agent (Premium listings)"
      >
        <span>AI</span>
        <span>Agent</span>
      </button>

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
            aria-label="Project Agent"
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
