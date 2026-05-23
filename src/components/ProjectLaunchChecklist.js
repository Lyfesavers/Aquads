import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { FaTimes, FaCheck, FaCopy, FaExternalLinkAlt } from 'react-icons/fa';
import { updateAdLaunchChecklist } from '../services/api';

export const LAUNCH_CHECKLIST_STEP_IDS = [
  'telegram_bot',
  'discord_bot',
  'chart_link',
  'deep_dive_form',
  'share_blog',
  'link_in_bio',
  'link_in_bio_socials',
  'aquapay',
  'mintfunnel_credit',
  'skipper_posts',
  'daily_raids',
  'free_ama',
  'x_spaces',
  'banner_ad',
  'chrome_extension'
];

const TELEGRAM_BOT_URL = 'https://t.me/aquadsbumpbot';
const FREE_AMA_URL = 'https://t.me/+6rJbDLqdMxA3ZTUx';
const DISCORD_BOT_INVITE = 'https://discord.com/oauth2/authorize?client_id=1481005410465874112&permissions=2251801961425920&integration_type=0&scope=bot+applications.commands';
const MINTFUNNEL_URL = 'https://app.mintfunnel.co?ref=KA3IIME5';
const CHROME_EXTENSION_URL = 'https://chromewebstore.google.com/detail/ofppakgepmejdbfajgmbjlgoighgbpfd?utm_source=item-share-cb';

const buildChartUrl = (ad) => {
  if (ad?.pairAddress && ad?.blockchain) {
    return `https://aquads.xyz/share/aquaswap?token=${encodeURIComponent(ad.pairAddress.trim())}&blockchain=${encodeURIComponent(ad.blockchain)}`;
  }
  return null;
};

const openMintFunnel = () => {
  const popup = window.open(
    MINTFUNNEL_URL,
    'mintfunnel-platform',
    'width=' + window.screen.width + ',height=' + window.screen.height + ',scrollbars=yes,resizable=yes,status=yes,location=yes,toolbar=no,menubar=no,directories=no'
  );
  if (!popup) {
    window.open(MINTFUNNEL_URL, '_blank', 'noopener,noreferrer');
  }
};

const ProjectLaunchChecklist = ({ ad, onTabSelect, onOpenDeepDive, showNotification, embedded = false }) => {
  const checklist = ad?.launchChecklist || {};
  const [completedSteps, setCompletedSteps] = useState(checklist.completedSteps || []);
  const [dismissed, setDismissed] = useState(!!checklist.dismissedAt);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const chartUrl = buildChartUrl(ad);

  useEffect(() => {
    const lc = ad?.launchChecklist || {};
    setCompletedSteps(lc.completedSteps || []);
    setDismissed(!!lc.dismissedAt);
  }, [ad?.id, ad?.launchChecklist]);

  const persist = useCallback(async (payload) => {
    if (!ad?.id) return;
    setSaving(true);
    try {
      await updateAdLaunchChecklist(ad.id, payload);
    } catch {
      if (typeof showNotification === 'function') {
        showNotification('Could not save checklist — try again', 'error');
      }
    } finally {
      setSaving(false);
    }
  }, [ad?.id, showNotification]);

  const toggleStep = (stepId) => {
    const next = completedSteps.includes(stepId)
      ? completedSteps.filter(s => s !== stepId)
      : [...completedSteps, stepId];
    setCompletedSteps(next);
    persist({ completedSteps: next });
  };

  const handleDismiss = () => {
    setDismissed(true);
    persist({ dismiss: true });
  };

  const handleCopyChartUrl = () => {
    const url = chartUrl || 'https://aquads.xyz';
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      if (typeof showNotification === 'function') {
        showNotification('Chart link copied!', 'success');
      }
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const buildSteps = () => {
    const allSteps = [
      {
        id: 'telegram_bot',
        group: 'Community bots',
        title: 'Add the Telegram bot to your group',
        description: '@aquadsbumpbot — free raids, trending, vote boosts, and custom branding.',
        action: { type: 'link', label: 'Open bot', href: TELEGRAM_BOT_URL }
      },
      {
        id: 'discord_bot',
        group: 'Community bots',
        title: 'Add the Discord bot to your server',
        description: 'Mirror votes, run raids, and keep your community synced with Aquads.',
        action: { type: 'link', label: 'Invite bot', href: DISCORD_BOT_INVITE }
      },
      {
        id: 'chart_link',
        group: 'Website & traffic',
        title: 'Add a buy button on your website',
        description: chartUrl
          ? 'Link to your AquaSwap chart with rich preview cards on X, Telegram, and Discord (/share/aquaswap).'
          : 'Add a button on your site that links to your Aquads listing and AquaSwap chart.',
        action: chartUrl
          ? { type: 'copy', label: copied ? 'Copied!' : 'Copy chart link', onClick: handleCopyChartUrl }
          : { type: 'link', label: 'Open AquaSwap', href: '/aquaswap' }
      },
      {
        id: 'deep_dive_form',
        group: 'Your listing',
        title: 'Complete your chart deep dive form',
        description: 'Add about, mission, team, and milestones — shown on your AquaSwap chart page.',
        action: {
          type: 'button',
          label: 'Edit deep dive',
          onClick: () => onOpenDeepDive?.(ad)
        }
      },
      {
        id: 'share_blog',
        group: 'Website & traffic',
        title: 'Share the blog article we publish about you',
        description: 'When your PR article goes live, share it across X, Telegram, and Discord.',
        action: { type: 'link', label: 'Browse articles', href: '/learn', internal: true }
      },
      {
        id: 'link_in_bio',
        group: 'Profile & links',
        title: 'Set up your link-in-bio page',
        description: 'One Aquads link for all your socials, chart, and payment links.',
        action: { type: 'tab', label: 'Open link in bio', tab: 'linkinbio' }
      },
      {
        id: 'link_in_bio_socials',
        group: 'Profile & links',
        title: 'Add your link-in-bio to socials & website',
        description: 'Put your aquads.xyz/links URL in your X bio, Telegram about, and site footer.',
        action: null
      },
      {
        id: 'aquapay',
        group: 'Payments',
        title: 'Set up AquaPay',
        description: 'Accept crypto payments and tips with a shareable payment link.',
        action: { type: 'tab', label: 'Configure AquaPay', tab: 'aquapay' }
      },
      {
        id: 'mintfunnel_credit',
        group: 'Paid growth',
        title: 'Claim your free $50 ad spend credit',
        description: 'Use the Paid Ads button — sign up on MintFunnel as Advertiser for $50 credit.',
        action: { type: 'button', label: 'Open MintFunnel', onClick: openMintFunnel }
      },
      {
        id: 'skipper_posts',
        group: 'Content',
        title: 'Create your first 5 posts with Skipper',
        description: 'Use your $5 Skipper credit to draft posts and articles for X and your blog.',
        action: { type: 'link', label: 'Open Skipper', href: '/project-agent', internal: true }
      },
      {
        id: 'daily_raids',
        group: 'Engagement',
        title: 'Set up daily raids (2–5 per day)',
        description: 'Keep momentum with Twitter and Facebook raids via the bots — free daily quota with a lifetime bump.',
        action: { type: 'link', label: 'Raid setup guide', href: '/telegram-bot', internal: true }
      },
      {
        id: 'free_ama',
        group: 'Your listing',
        title: 'Claim your free AMA session',
        description: 'Book a complimentary AMA with the Aquads team on Telegram (included with Premium listings).',
        action: { type: 'link', label: 'Book free AMA', href: FREE_AMA_URL },
        premiumOnly: true
      },
      {
        id: 'x_spaces',
        group: 'Engagement',
        title: 'Host X Spaces weekly',
        description: 'Talk chart, roadmap, and community — pin your AquaSwap link in the Space description.',
        action: { type: 'link', label: 'X Spaces', href: 'https://x.com/i/spaces' }
      },
      {
        id: 'banner_ad',
        group: 'Ads & tools',
        title: 'Create your free banner ad',
        description: 'Get a rotating homepage banner — included with your listing after approval.',
        action: { type: 'link', label: 'Go to home', href: '/home', internal: true }
      },
      {
        id: 'chrome_extension',
        group: 'Ads & tools',
        title: 'Install the AquaSwap Chrome extension',
        description: 'Swap tokens from any webpage and earn Aquads points on qualifying swaps.',
        action: { type: 'link', label: 'Install extension', href: CHROME_EXTENSION_URL }
      }
    ];

    return allSteps.filter(step => !step.premiumOnly || ad?.listingTier !== 'starter');
  };

  const steps = buildSteps();
  const totalSteps = steps.length;
  const completedCount = steps.filter(step => completedSteps.includes(step.id)).length;
  const allComplete = totalSteps > 0 && completedCount >= totalSteps;

  if (!ad || dismissed || allComplete) {
    return null;
  }

  const groups = [...new Set(steps.map(s => s.group))];

  const renderAction = (action) => {
    if (!action) return null;
    const btnClass = 'inline-flex items-center gap-1.5 text-xs font-medium text-cyan-400 hover:text-cyan-300 transition-colors shrink-0';

    if (action.type === 'copy' || action.type === 'button') {
      return (
        <button type="button" onClick={action.onClick} className={btnClass}>
          {action.type === 'copy' && (copied ? <FaCheck className="text-green-400" /> : <FaCopy />)}
          {action.label}
        </button>
      );
    }
    if (action.type === 'tab') {
      return (
        <button type="button" onClick={() => onTabSelect?.(action.tab)} className={btnClass}>
          {action.label} →
        </button>
      );
    }
    if (action.internal) {
      return (
        <Link to={action.href} className={btnClass}>
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
    <div className={`bg-gradient-to-br from-gray-800 to-gray-800/80 overflow-hidden ${
      embedded
        ? 'border-t border-cyan-500/20'
        : 'border border-cyan-500/20 rounded-xl'
    }`}>
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
            Launch checklist
            {!embedded && (
              <span className="text-gray-400 font-normal text-base ml-2">— {ad.title}</span>
            )}
          </h3>
          <p className="text-sm text-gray-400 mt-1">
            Complete these steps to get the most out of Aquads. Check off each item when you&apos;re done.
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
        {groups.map(group => (
          <div key={group}>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">{group}</p>
            <ul className="space-y-2">
              {steps.filter(s => s.group === group).map(step => {
                const done = completedSteps.includes(step.id);
                return (
                  <li
                    key={step.id}
                    className={`flex items-start gap-3 rounded-lg p-3 transition-colors ${
                      done ? 'bg-green-900/15 border border-green-500/20' : 'bg-gray-700/40 border border-transparent hover:border-gray-600/40'
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
                        <p className={`text-sm font-medium ${done ? 'text-gray-400 line-through' : 'text-white'}`}>
                          {step.title}
                        </p>
                        {renderAction(step.action)}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{step.description}</p>
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

export default ProjectLaunchChecklist;
