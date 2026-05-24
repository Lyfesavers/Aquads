import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { FaTimes, FaCheck, FaExternalLinkAlt } from 'react-icons/fa';
import {
  getFreelancerLaunchChecklist,
  updateFreelancerLaunchChecklist
} from '../services/api';

export const FREELANCER_LAUNCH_CHECKLIST_STEP_IDS = [
  'complete_cv',
  'mint_onchain_resume',
  'skill_test',
  'workshop',
  'first_service',
  'share_services',
  'browse_jobs',
  'visit_learn',
  'read_docs',
  'read_affiliate_docs'
];

// Open the user's ProfileModal at a specific tab via the App.js window-event bridge.
// Falls back to a localStorage flag so the modal opens after login if the user
// somehow lands here unauthenticated (defensive — Dashboard already requires auth).
const openProfileTab = (tab) => {
  try {
    window.dispatchEvent(
      new CustomEvent('aquads:open-profile-modal', { detail: { tab } })
    );
  } catch {
    localStorage.setItem('aquads_pending_profile_tab', tab);
  }
};

const FreelancerLaunchChecklist = ({ currentUser, showNotification }) => {
  const [completedSteps, setCompletedSteps] = useState([]);
  const [dismissed, setDismissed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load saved state on mount / user change.
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const data = await getFreelancerLaunchChecklist();
        if (cancelled) return;
        setCompletedSteps(Array.isArray(data?.completedSteps) ? data.completedSteps : []);
        setDismissed(!!data?.dismissedAt);
      } catch {
        // Silent — defaults to an empty checklist so the user can still complete steps.
      } finally {
        if (!cancelled) setLoaded(true);
      }
    };
    if (currentUser?.userId || currentUser?.token) {
      load();
    } else {
      setLoaded(true);
    }
    return () => { cancelled = true; };
  }, [currentUser?.userId, currentUser?.token]);

  const persist = useCallback(async (payload) => {
    setSaving(true);
    try {
      const data = await updateFreelancerLaunchChecklist(payload);
      if (data) {
        if (Array.isArray(data.completedSteps)) setCompletedSteps(data.completedSteps);
        if (data.dismissedAt) setDismissed(true);
      }
    } catch {
      if (typeof showNotification === 'function') {
        showNotification('Could not save checklist — try again', 'error');
      }
    } finally {
      setSaving(false);
    }
  }, [showNotification]);

  const toggleStep = (stepId) => {
    const next = completedSteps.includes(stepId)
      ? completedSteps.filter((s) => s !== stepId)
      : [...completedSteps, stepId];
    setCompletedSteps(next);
    persist({ completedSteps: next });
  };

  const handleDismiss = () => {
    setDismissed(true);
    persist({ dismiss: true });
  };

  const steps = [
    {
      id: 'complete_cv',
      group: 'Profile',
      title: 'Complete your CV',
      description: 'Add summary, education, experience, and skills — projects review your CV before booking.',
      action: {
        type: 'button',
        label: 'Edit CV',
        onClick: () => openProfileTab('cv')
      }
    },
    {
      id: 'mint_onchain_resume',
      group: 'Profile',
      title: 'Mint your on-chain resume',
      description: 'Anchor your trust score and badges as an EAS attestation on Base — verifiable, portable proof of work.',
      action: {
        type: 'button',
        label: 'Mint on-chain resume',
        onClick: () => openProfileTab('onchain')
      }
    },
    {
      id: 'skill_test',
      group: 'Profile',
      title: 'Take a skills test and earn a badge',
      description: 'Verified skill badges show up on your profile and CV — boosts trust with projects.',
      action: { type: 'link', label: 'Take a test', href: '/learn', tab: 'tests', internal: true }
    },
    {
      id: 'workshop',
      group: 'Training',
      title: 'Complete the freelancer workshop',
      description: 'Interactive freelancer training with quizzes and progress tracking on the Learn page.',
      action: { type: 'link', label: 'Open workshop', href: '/learn', tab: 'workshop', internal: true }
    },
    {
      id: 'first_service',
      group: 'Marketplace',
      title: 'List your first service',
      description: 'Publish a service in the Aquads freelancer marketplace so projects can book you.',
      action: { type: 'link', label: 'List service', href: '/marketplace?modal=list-service', internal: true }
    },
    {
      id: 'share_services',
      group: 'Marketplace',
      title: 'Share your services with 5 projects',
      description: 'Browse the bubble map and DM projects on Telegram/X with your service link.',
      action: { type: 'link', label: 'Browse projects', href: '/', internal: true }
    },
    {
      id: 'browse_jobs',
      group: 'Marketplace',
      title: 'Check out the job list',
      description: 'See open jobs posted by projects on the marketplace and apply where you fit.',
      action: { type: 'link', label: 'Open job list', href: '/marketplace?jobs=true', internal: true }
    },
    {
      id: 'visit_learn',
      group: 'Learn',
      title: 'Check out the Learn page',
      description: 'Video tutorials, market news, free courses, and Aquads how-to guides — all in one place.',
      action: { type: 'link', label: 'Open Learn', href: '/learn', tab: 'videos', internal: true }
    },
    {
      id: 'read_docs',
      group: 'Learn',
      title: 'Read the Aquads docs',
      description: 'Get a full overview of the Aquads platform — how everything fits together.',
      action: { type: 'link', label: 'Open docs', href: '/docs', internal: true }
    },
    {
      id: 'read_affiliate_docs',
      group: 'Learn',
      title: 'Read the affiliate docs',
      description: 'Earn referral commissions and points by sharing your affiliate link with projects.',
      action: { type: 'link', label: 'Affiliate docs', href: '/affiliate', internal: true }
    }
  ];

  const totalSteps = steps.length;
  const completedCount = steps.filter((s) => completedSteps.includes(s.id)).length;
  const allComplete = totalSteps > 0 && completedCount >= totalSteps;

  // Hide once dismissed or fully complete. Also wait for the initial load so we
  // don't briefly flash the checklist for users who already dismissed it.
  if (!loaded || dismissed || allComplete) {
    return null;
  }

  const groups = [...new Set(steps.map((s) => s.group))];

  // For internal-route actions we set sessionStorage so HowTo's tab persists.
  const handleInternalLinkClick = (action) => {
    if (action?.tab) {
      try {
        sessionStorage.setItem('learnActiveTab', action.tab);
      } catch {
        // ignore storage errors
      }
    }
  };

  const renderAction = (action) => {
    if (!action) return null;
    const btnClass =
      'inline-flex items-center gap-1.5 text-xs font-medium text-cyan-400 hover:text-cyan-300 transition-colors shrink-0';

    if (action.type === 'button') {
      return (
        <button type="button" onClick={action.onClick} className={btnClass}>
          {action.label}
        </button>
      );
    }
    if (action.internal) {
      return (
        <Link
          to={action.href}
          onClick={() => handleInternalLinkClick(action)}
          className={btnClass}
        >
          {action.label} <FaExternalLinkAlt className="text-[10px]" />
        </Link>
      );
    }
    return (
      <a href={action.href} target="_blank" rel="noopener noreferrer" className={btnClass}>
        {action.label} <FaExternalLinkAlt className="text-[10px]" />
      </a>
    );
  };

  return (
    <div className="bg-gradient-to-br from-gray-800 to-gray-800/80 overflow-hidden border border-cyan-500/20 rounded-xl">
      <div className="relative px-5 pt-5 pb-4 border-b border-gray-700/50">
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-300 p-1 transition-colors"
          title="Dismiss checklist"
          aria-label="Dismiss checklist"
        >
          <FaTimes />
        </button>
        <div className="pr-8">
          <h3 className="text-lg font-semibold text-white">
            Freelancer launch checklist
          </h3>
          <p className="text-sm text-gray-400 mt-1">
            Set yourself up for success on Aquads. Tick each step off as you finish — your progress is saved.
          </p>
          <div className="mt-3 flex items-center gap-3">
            <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-300"
                style={{ width: `${Math.round((completedCount / totalSteps) * 100)}%` }}
              />
            </div>
            <span className="text-xs text-gray-400 whitespace-nowrap">
              {completedCount}/{totalSteps}
            </span>
          </div>
        </div>
      </div>

      <div className="px-5 py-4 space-y-5 max-h-[480px] overflow-y-auto">
        {groups.map((group) => (
          <div key={group}>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
              {group}
            </p>
            <ul className="space-y-2">
              {steps.filter((s) => s.group === group).map((step) => {
                const done = completedSteps.includes(step.id);
                return (
                  <li
                    key={step.id}
                    className={`flex items-start gap-3 rounded-lg p-3 transition-colors ${
                      done
                        ? 'bg-green-900/15 border border-green-500/20'
                        : 'bg-gray-700/40 border border-transparent hover:border-gray-600/40'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => toggleStep(step.id)}
                      disabled={saving}
                      className={`mt-0.5 shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                        done
                          ? 'bg-green-500 border-green-500 text-white'
                          : 'border-gray-500 hover:border-cyan-400 text-transparent hover:text-cyan-400/50'
                      }`}
                      aria-label={done ? `Mark "${step.title}" incomplete` : `Mark "${step.title}" complete`}
                    >
                      {done && <FaCheck className="text-xs" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 sm:gap-3">
                        <p
                          className={`text-sm font-medium ${
                            done ? 'text-gray-400 line-through' : 'text-white'
                          }`}
                        >
                          {step.title}
                        </p>
                        {renderAction(step.action)}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                        {step.description}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FreelancerLaunchChecklist;
