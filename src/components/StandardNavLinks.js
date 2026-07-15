import React from 'react';
import { Link } from 'react-router-dom';
import { MobileNavButton, MobileNavDivider, MobileNavLink } from './MobileNavMenu';

const DESKTOP_LINK_CLASS =
  'bg-gray-700/90 hover:bg-gray-600/90 px-3 py-1.5 rounded text-sm shadow-lg hover:shadow-gray-500/30 transition-all duration-300 backdrop-blur-sm text-yellow-400';

/**
 * Shared primary + secondary nav links used across Aquads page headers.
 * Mobile styling matches the home page (App.js) dropdown.
 */
export function StandardMobileNavLinks({
  onNavigate,
  openMintFunnelPlatform,
  includeHome = true,
  includeBenefits = false,
  homeLabel = 'Home',
  marketplaceLabel = 'Freelancer Hub',
}) {
  const close = () => onNavigate?.();

  return (
    <>
      {includeHome && (
        <MobileNavLink to="/home" onClick={close} icon="🏠" label={homeLabel} className="hover:bg-cyan-500/10" />
      )}
      <MobileNavLink
        to="/marketplace"
        onClick={close}
        icon="👥"
        label={marketplaceLabel}
        className="hover:bg-purple-500/10"
      />
      <MobileNavLink to="/games" onClick={close} icon="🎮" label="GameHub" />
      <MobileNavLink to="/bounties" onClick={close} icon="🏆" label="Bounties" />
      <MobileNavButton
        onClick={() => {
          openMintFunnelPlatform?.();
          close();
        }}
        icon="📢"
        label="Paid Ads"
      />
      <MobileNavLink to="/learn" onClick={close} icon="📚" label="Learn" />
      <MobileNavLink to="/list-token-free" onClick={close} icon="✨" label="List token free" />
      <MobileNavLink
        to="/claim-bubble"
        onClick={close}
        icon="🫧"
        label="Claim your bubble"
        className="hover:bg-teal-500/10"
      />
      {includeBenefits && (
        <MobileNavLink to="/freelancer-benefits" onClick={close} icon="💼" label="Benefits" />
      )}
      <MobileNavDivider />
      <MobileNavLink to="/aquafi" onClick={close} icon="💧" label="AquaFi" />
      <MobileNavLink to="/aquaswap" onClick={close} icon="💱" label="AquaSwap" />
      <MobileNavLink to="/partner-rewards" onClick={close} icon="🎁" label="Partners" />
      <MobileNavLink to="/telegram-bot" onClick={close} icon="🤖" label="Telegram Bot" />
      <MobileNavLink to="/aquapay" onClick={close} icon="💸" label="AquaPay" />
      <MobileNavLink to="/hyperspace" onClick={close} icon="🚀" label="HyperSpace" />
    </>
  );
}

export function StandardDesktopNavLinks({
  openMintFunnelPlatform,
  linkClassName = DESKTOP_LINK_CLASS,
  includeHome = false,
  includeBenefits = false,
  homeLabel = 'Home',
  marketplaceLabel = 'Freelancer',
  showMarketplace = true,
}) {
  return (
    <>
      {includeHome && (
        <Link to="/home" className={linkClassName}>
          {homeLabel}
        </Link>
      )}
      {showMarketplace && (
        <Link to="/marketplace" className={linkClassName}>
          {marketplaceLabel}
        </Link>
      )}
      <Link to="/games" className={linkClassName}>
        Games
      </Link>
      <Link to="/bounties" className={linkClassName}>
        Bounties
      </Link>
      <button type="button" onClick={openMintFunnelPlatform} className={linkClassName}>
        Paid Ads
      </button>
      <Link to="/learn" className={linkClassName}>
        Learn
      </Link>
      <Link to="/list-token-free" className={linkClassName}>
        List token free
      </Link>
      <Link to="/claim-bubble" className={linkClassName}>
        Claim bubble
      </Link>
      {includeBenefits && (
        <Link to="/freelancer-benefits" className={linkClassName}>
          Benefits
        </Link>
      )}
    </>
  );
}
