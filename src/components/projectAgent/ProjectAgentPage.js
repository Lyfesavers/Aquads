import React, { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import ProjectAgentPanel from './ProjectAgentPanel';
import './ProjectAgent.css';

export default function ProjectAgentPage({ currentUser }) {
  const { adId } = useParams();

  useEffect(() => {
    const htmlPrev = document.documentElement.style.overflow;
    const bodyPrev = document.body.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = htmlPrev;
      document.body.style.overflow = bodyPrev;
    };
  }, []);

  return (
    <div className="project-agent-page">
      <nav className="project-agent-page-nav">
        <Link to="/home" className="project-agent-page-back">
          ← Back to Aquads home
        </Link>
      </nav>
      <div className="project-agent-page-inner">
        <ProjectAgentPanel
          currentUser={currentUser}
          initialAdId={adId || null}
          onExpand={null}
        />
      </div>
    </div>
  );
}
