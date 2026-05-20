import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
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
      <ProjectAgentPanel
        currentUser={currentUser}
        initialAdId={adId || null}
        onExpand={null}
        showBackLink
      />
    </div>
  );
}
