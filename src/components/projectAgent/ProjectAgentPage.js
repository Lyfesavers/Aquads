import React from 'react';
import { Link, useParams } from 'react-router-dom';
import ProjectAgentPanel from './ProjectAgentPanel';
import './ProjectAgent.css';

export default function ProjectAgentPage({ currentUser }) {
  const { adId } = useParams();

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
