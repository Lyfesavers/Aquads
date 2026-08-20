import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MobileNavButton, MobileNavDivider, MobileNavLink, MobileNavSectionLabel } from './MobileNavMenu';

const INTENT_MENUS = [
  {
    id: 'grow',
    label: 'Grow',
    intent: 'Grow a project',
    columns: [
      {
        title: 'List',
        items: [
          { label: 'Bubble map', to: '/home', blurb: 'See listed projects and tokens' },
          { label: 'PR campaigns', to: '/list-token-free#pr-campaigns', blurb: 'Press and marketing add-on packages' },
          { label: 'Claim your bubble', to: '/claim-bubble', blurb: 'Take ownership of a listing' },
        ],
      },
      {
        title: 'Marketing',
        items: [
          { label: 'Advertise', to: '/advertise', blurb: 'Site-wide banner placements' },
          { label: 'Paid Ads', action: 'paid-ads', blurb: 'Paid promotion for your listing' },
          { label: 'Bounties', to: '/bounties', blurb: 'Post a bounty to grow your project' },
          { label: 'HyperSpace', to: '/hyperspace', blurb: 'Twitter Spaces coverage' },
        ],
      },
      {
        title: 'Raids & pay',
        items: [
          { label: 'Telegram Bot', to: '/telegram-bot', blurb: 'Raids, Mini App, and Discord bot' },
          { label: 'AquaPay', to: '/aquapay', blurb: 'Payments and escrow' },
          { label: 'Partners', to: '/partner-rewards', blurb: 'Partner store and rewards' },
        ],
      },
    ],
  },
  {
    id: 'talent',
    label: 'Talent',
    intent: 'Find or hire talent',
    columns: [
      {
        title: 'Hire',
        items: [
          { label: 'Freelancer Hub', to: '/marketplace', blurb: 'Browse services and book talent' },
          { label: 'Jobs', to: '/marketplace?jobs=true', blurb: 'Post or apply to project jobs' },
          { label: 'Bounties', to: '/bounties', blurb: 'Find paid tasks to complete' },
        ],
      },
      {
        title: 'Trust',
        items: [
          { label: 'Verify user', to: '/verify-user', blurb: 'Check identity and trust' },
          { label: 'Freelancer benefits', to: '/freelancer-benefits', blurb: 'Why list a service on Aquads' },
          { label: 'Skill tests', to: '/learn?tab=tests', blurb: 'Verified badges that feed trust score' },
        ],
      },
    ],
  },
  {
    id: 'explore',
    label: 'Explore',
    intent: 'Explore Web3',
    columns: [
      {
        title: 'Discover',
        items: [
          { label: 'Tokens', to: '/home', blurb: 'Bubble map and token discovery' },
          { label: 'Game Hub', to: '/games', blurb: 'Play Aquads games' },
        ],
      },
      {
        title: 'Trade',
        items: [
          { label: 'AquaSwap', to: '/aquaswap', blurb: 'Cross-chain swap' },
          { label: 'AquaFi', to: '/aquafi', blurb: 'DeFi tools' },
        ],
      },
      {
        title: 'Data',
        items: [
          { label: 'Market news', to: '/learn?tab=news', blurb: 'Live market headlines' },
          { label: 'Wallet analyzer', to: '/wallet-analyzer', blurb: 'Inspect a wallet' },
        ],
      },
    ],
  },
  {
    id: 'learn',
    label: 'Learn',
    intent: 'Learn and resources',
    columns: [
      {
        title: 'Start here',
        items: [
          { label: 'Learn hub', to: '/learn', blurb: 'Tutorials, courses, blog, and news' },
          { label: 'Documentation', to: '/docs', blurb: 'Product and platform docs' },
        ],
      },
      {
        title: 'Go deeper',
        items: [
          { label: 'Freelancer workshop', to: '/learn?tab=workshop', blurb: 'Guided onboarding for talent' },
          { label: 'Free courses', to: '/learn?tab=free-courses', blurb: 'Structured lessons' },
          { label: 'Affiliate', to: '/affiliate', blurb: 'Earn from referrals' },
          { label: 'PFP generator', to: '/pfp-generator', blurb: 'Create a branded profile image' },
        ],
      },
    ],
  },
];

const HOVER_CLOSE_MS = 160;

function itemPath(to) {
  return (to || '').split('#')[0].split('?')[0];
}

function isItemActive(pathname, search, item) {
  if (!item?.to) return false;
  const path = itemPath(item.to);
  const query = item.to.includes('?') ? item.to.slice(item.to.indexOf('?') + 1) : '';
  const pathMatch =
    pathname === path ||
    (path !== '/' && pathname.startsWith(`${path}/`)) ||
    (path === '/games' && pathname === '/aquataire');
  if (!pathMatch) return false;
  if (!query) {
    if (path === '/learn' && new URLSearchParams(search).get('tab')) return false;
    if (path === '/marketplace' && new URLSearchParams(search).get('jobs') === 'true') return false;
    return true;
  }
  const needed = new URLSearchParams(query);
  const current = new URLSearchParams(search);
  for (const [key, value] of needed.entries()) {
    if (current.get(key) !== value) return false;
  }
  return true;
}

function isMenuActive(pathname, search, menu) {
  return menu.columns.some((column) =>
    column.items.some((item) => isItemActive(pathname, search, item))
  );
}

function Chevron({ open }) {
  return (
    <svg
      className={`h-3.5 w-3.5 opacity-70 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
      fill="currentColor"
      viewBox="0 0 20 20"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function MegaItem({ item, onNavigate, openMintFunnelPlatform, active }) {
  const className = `block w-full rounded-xl px-3 py-2.5 text-left transition-colors ${
    active ? 'bg-white/5' : 'hover:bg-white/5'
  }`;
  const body = (
    <>
      <span className={`block text-sm font-medium ${active ? 'text-cyan-300' : 'text-white'}`}>
        {item.label}
      </span>
      <span className="mt-0.5 block text-xs leading-snug text-gray-400">{item.blurb}</span>
    </>
  );

  if (item.action === 'paid-ads') {
    return (
      <button
        type="button"
        className={className}
        onClick={() => {
          openMintFunnelPlatform?.();
          onNavigate?.();
        }}
      >
        {body}
      </button>
    );
  }

  return (
    <Link to={item.to} className={className} onClick={onNavigate}>
      {body}
    </Link>
  );
}

/**
 * Shared primary nav used across Aquads product page headers.
 * Desktop: intent mega-menus + one List token CTA.
 * Mobile: the same groups inside the existing hamburger.
 */
export function StandardDesktopNavLinks({
  openMintFunnelPlatform,
  // Retained so existing call sites keep compiling; the full intent map is always shown.
  linkClassName,
  includeHome,
  includeBenefits,
  homeLabel,
  marketplaceLabel,
  showMarketplace,
}) {
  void linkClassName;
  void includeHome;
  void includeBenefits;
  void homeLabel;
  void marketplaceLabel;
  void showMarketplace;

  const { pathname, search } = useLocation();
  const [openMenu, setOpenMenu] = useState(null);
  const wrapRef = useRef(null);
  const closeTimer = useRef(null);

  const clearCloseTimer = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

  const scheduleClose = () => {
    clearCloseTimer();
    closeTimer.current = setTimeout(() => setOpenMenu(null), HOVER_CLOSE_MS);
  };

  useEffect(() => () => clearCloseTimer(), []);

  useEffect(() => {
    setOpenMenu(null);
  }, [pathname, search]);

  useEffect(() => {
    const onPointerDown = (event) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target)) {
        setOpenMenu(null);
      }
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpenMenu(null);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  const activeMenu = INTENT_MENUS.find((menu) => menu.id === openMenu);

  return (
    <div
      ref={wrapRef}
      className={`relative hidden items-center gap-0.5 md:flex ${openMenu ? 'z-[200050]' : ''}`}
      onMouseLeave={scheduleClose}
      onMouseEnter={clearCloseTimer}
    >
      {INTENT_MENUS.map((menu) => {
        const active = isMenuActive(pathname, search, menu);
        const open = openMenu === menu.id;
        return (
          <button
            key={menu.id}
            type="button"
            aria-expanded={open}
            aria-haspopup="true"
            onClick={() => setOpenMenu(open ? null : menu.id)}
            onMouseEnter={() => {
              clearCloseTimer();
              setOpenMenu(menu.id);
            }}
            className={`inline-flex items-center gap-1 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors lg:px-3 ${
              open || active
                ? 'bg-white/5 text-white'
                : 'text-gray-300 hover:bg-white/5 hover:text-white'
            }`}
          >
            {menu.label}
            <Chevron open={open} />
          </button>
        );
      })}

      {activeMenu && (
        <div
          className="absolute right-0 top-full z-[200050] w-[min(42rem,calc(100vw-2rem))] pt-2"
          onMouseEnter={clearCloseTimer}
        >
          <div
            className="overflow-hidden rounded-2xl border border-gray-700 p-4 shadow-2xl"
            style={{ backgroundColor: '#111827' }}
          >
          <div className="mb-3 px-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-cyan-400/90">
              {activeMenu.intent}
            </p>
          </div>
          <div
            className="grid gap-4"
            style={{ gridTemplateColumns: `repeat(${activeMenu.columns.length}, minmax(0, 1fr))` }}
          >
            {activeMenu.columns.map((column) => (
              <div key={column.title}>
                <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                  {column.title}
                </p>
                <div className="space-y-0.5">
                  {column.items.map((item) => (
                    <MegaItem
                      key={`${column.title}-${item.label}`}
                      item={item}
                      openMintFunnelPlatform={openMintFunnelPlatform}
                      onNavigate={() => setOpenMenu(null)}
                      active={isItemActive(pathname, search, item)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
          </div>
        </div>
      )}

      <Link
        to="/list-token-free"
        className="ml-2 inline-flex shrink-0 items-center whitespace-nowrap rounded-full bg-gradient-to-r from-cyan-500 to-teal-500 px-3.5 py-1.5 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition-all hover:from-cyan-400 hover:to-teal-400"
      >
        List token free
      </Link>
    </div>
  );
}

export function StandardMobileNavLinks({
  onNavigate,
  openMintFunnelPlatform,
  includeHome = true,
  includeBenefits = false,
  homeLabel = 'Home',
  marketplaceLabel = 'Freelancer Hub',
}) {
  void includeHome;
  void includeBenefits;
  void homeLabel;
  void marketplaceLabel;

  const close = () => onNavigate?.();
  const { pathname, search } = useLocation();

  return (
    <>
      {INTENT_MENUS.map((menu, index) => (
        <React.Fragment key={menu.id}>
          {index > 0 && <MobileNavDivider />}
          <MobileNavSectionLabel>{menu.intent}</MobileNavSectionLabel>
          {menu.columns.flatMap((column) =>
            column.items.map((item) => {
              const active = isItemActive(pathname, search, item);
              if (item.action === 'paid-ads') {
                return (
                  <MobileNavButton
                    key={`${menu.id}-${item.label}`}
                    onClick={() => {
                      openMintFunnelPlatform?.();
                      close();
                    }}
                    label={item.label}
                    className={active ? 'bg-white/5 text-white' : 'hover:bg-white/5'}
                  />
                );
              }
              return (
                <MobileNavLink
                  key={`${menu.id}-${item.label}`}
                  to={item.to}
                  onClick={close}
                  label={item.label}
                  className={active ? 'bg-white/5 text-white hover:bg-white/5' : 'hover:bg-white/5'}
                />
              );
            })
          )}
        </React.Fragment>
      ))}
    </>
  );
}
