import React, { useEffect } from 'react';
import { useLocation, useParams, useSearchParams } from 'react-router-dom';
import ProjectAgentPanel from './ProjectAgentPanel';
import './ProjectAgent.css';

export default function ProjectAgentPage({ currentUser }) {
  const { adId: routeAdId } = useParams();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const restoredSession = location.state?.projectAgentSession || null;
  const queryThreadId = searchParams.get('thread');
  const initialAdId = routeAdId || restoredSession?.adId || null;
  const initialThreadId = queryThreadId || restoredSession?.threadId || null;

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
        initialAdId={initialAdId}
        initialThreadId={initialThreadId}
        restoredSession={restoredSession}
        onExpand={null}
        showBackLink
      />
    </div>
  );
}
