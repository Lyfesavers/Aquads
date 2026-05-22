import React from 'react';

/** Shared SVG shell — icons inherit `currentColor` from accent on the public page. */
function Svg({ className, style, children }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

const S = {
  sw: 1.65,
  cap: 'round',
  join: 'round'
};

export const IconAuto = (p) => (
  <Svg {...p}>
    <path d="M12 3v3M12 18v3M3 12h3M18 12h3" stroke="currentColor" strokeWidth={S.sw} strokeLinecap={S.cap} />
    <path d="M8.5 8.5l2 2M13.5 13.5l2 2M15.5 8.5l-2 2M10.5 13.5l-2 2" stroke="currentColor" strokeWidth={S.sw} strokeLinecap={S.cap} />
    <circle cx="12" cy="12" r="3.25" stroke="currentColor" strokeWidth={S.sw} />
  </Svg>
);

export const IconLink = (p) => (
  <Svg {...p}>
    <path d="M10.2 13.8a3.6 3.6 0 0 0 5.1 0l2.2-2.2a3.6 3.6 0 0 0-5.1-5.1L11.4 7.5" stroke="currentColor" strokeWidth={S.sw} strokeLinecap={S.cap} />
    <path d="M13.8 10.2a3.6 3.6 0 0 0-5.1 0L6.5 12.4a3.6 3.6 0 0 0 5.1 5.1l1-1" stroke="currentColor" strokeWidth={S.sw} strokeLinecap={S.cap} />
  </Svg>
);

export const IconWebsite = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth={S.sw} />
    <path d="M3.8 12h16.4M12 3.5c2.2 2.4 3.4 5.6 3.4 8.5s-1.2 6.1-3.4 8.5c-2.2-2.4-3.4-5.6-3.4-8.5S9.8 5.9 12 3.5z" stroke="currentColor" strokeWidth={S.sw} strokeLinecap={S.cap} />
  </Svg>
);

export const IconHome = (p) => (
  <Svg {...p}>
    <path d="M4 10.5 12 4l8 6.5V19a1.5 1.5 0 0 1-1.5 1.5H15v-5.5H9V20.5H5.5A1.5 1.5 0 0 1 4 19v-8.5z" stroke="currentColor" strokeWidth={S.sw} strokeLinejoin={S.join} />
  </Svg>
);

export const IconShop = (p) => (
  <Svg {...p}>
    <path d="M5 9.5 6.6 4.8h10.8L19 9.5" stroke="currentColor" strokeWidth={S.sw} strokeLinecap={S.cap} strokeLinejoin={S.join} />
    <path d="M6 9.5V18a1.5 1.5 0 0 0 1.5 1.5h9A1.5 1.5 0 0 0 18 18V9.5" stroke="currentColor" strokeWidth={S.sw} />
    <path d="M9 12.5v4.5M15 12.5v4.5" stroke="currentColor" strokeWidth={S.sw} strokeLinecap={S.cap} />
  </Svg>
);

export const IconMarketplace = (p) => (
  <Svg {...p}>
    <rect x="4" y="7" width="16" height="12" rx="2.2" stroke="currentColor" strokeWidth={S.sw} />
    <path d="M8 7V6a4 4 0 0 1 8 0v1" stroke="currentColor" strokeWidth={S.sw} strokeLinecap={S.cap} />
    <path d="M8.5 12h7" stroke="currentColor" strokeWidth={S.sw} strokeLinecap={S.cap} />
  </Svg>
);

export const IconPortfolio = (p) => (
  <Svg {...p}>
    <rect x="4" y="6" width="16" height="13" rx="2" stroke="currentColor" strokeWidth={S.sw} />
    <path d="M8 6V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v1" stroke="currentColor" strokeWidth={S.sw} />
    <path d="M8.5 11h7M8.5 14.5h4.5" stroke="currentColor" strokeWidth={S.sw} strokeLinecap={S.cap} />
  </Svg>
);

export const IconBlog = (p) => (
  <Svg {...p}>
    <rect x="5" y="4" width="14" height="16" rx="2" stroke="currentColor" strokeWidth={S.sw} />
    <path d="M8.5 9h7M8.5 12h7M8.5 15h4.5" stroke="currentColor" strokeWidth={S.sw} strokeLinecap={S.cap} />
  </Svg>
);

export const IconNewsletter = (p) => (
  <Svg {...p}>
    <rect x="3.5" y="6.5" width="17" height="11" rx="2" stroke="currentColor" strokeWidth={S.sw} />
    <path d="M4.5 8.5 12 13l7.5-4.5" stroke="currentColor" strokeWidth={S.sw} strokeLinejoin={S.join} />
  </Svg>
);

export const IconBook = (p) => (
  <Svg {...p}>
    <path d="M6 5.5h5.5a2 2 0 0 1 2 2V19l-7.5-4V5.5z" stroke="currentColor" strokeWidth={S.sw} strokeLinejoin={S.join} />
    <path d="M18 5.5h-5.5a2 2 0 0 0-2 2V19l7.5-4V5.5z" stroke="currentColor" strokeWidth={S.sw} strokeLinejoin={S.join} />
  </Svg>
);

export const IconVideo = (p) => (
  <Svg {...p}>
    <rect x="3.5" y="6.5" width="13.5" height="11" rx="2" stroke="currentColor" strokeWidth={S.sw} />
    <path d="M17 10.5l4-2.2v7.4l-4-2.2v-3z" stroke="currentColor" strokeWidth={S.sw} strokeLinejoin={S.join} />
  </Svg>
);

export const IconPodcast = (p) => (
  <Svg {...p}>
    <rect x="8" y="4" width="8" height="11" rx="4" stroke="currentColor" strokeWidth={S.sw} />
    <path d="M12 15v2.5M9 20h6" stroke="currentColor" strokeWidth={S.sw} strokeLinecap={S.cap} />
    <path d="M6.5 11.5a5.5 5.5 0 0 0 11 0" stroke="currentColor" strokeWidth={S.sw} strokeLinecap={S.cap} />
  </Svg>
);

export const IconMusic = (p) => (
  <Svg {...p}>
    <path d="M10 18.5V6.5l7-2v12" stroke="currentColor" strokeWidth={S.sw} strokeLinecap={S.cap} strokeLinejoin={S.join} />
    <circle cx="8" cy="18.5" r="2.2" stroke="currentColor" strokeWidth={S.sw} />
    <circle cx="15" cy="16.5" r="2.2" stroke="currentColor" strokeWidth={S.sw} />
  </Svg>
);

export const IconGallery = (p) => (
  <Svg {...p}>
    <rect x="3.5" y="5.5" width="17" height="13" rx="2" stroke="currentColor" strokeWidth={S.sw} />
    <path d="M7.5 15.5 10.5 12l2.5 2.5L16 11.5l3.5 4" stroke="currentColor" strokeWidth={S.sw} strokeLinejoin={S.join} />
    <circle cx="9" cy="9.5" r="1.2" fill="currentColor" />
  </Svg>
);

export const IconLive = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth={S.sw} />
    <circle cx="12" cy="12" r="3" fill="currentColor" />
    <path d="M18.5 5.5 19.8 4.2M5.5 5.5 4.2 4.2" stroke="currentColor" strokeWidth={S.sw} strokeLinecap={S.cap} />
  </Svg>
);

export const IconCalendar = (p) => (
  <Svg {...p}>
    <rect x="4" y="5.5" width="16" height="14" rx="2" stroke="currentColor" strokeWidth={S.sw} />
    <path d="M8 4v3M16 4v3M4 10h16" stroke="currentColor" strokeWidth={S.sw} strokeLinecap={S.cap} />
    <rect x="8" y="13" width="3" height="3" rx="0.6" fill="currentColor" />
  </Svg>
);

export const IconBooking = (p) => (
  <Svg {...p}>
    <rect x="4" y="5" width="16" height="15" rx="2" stroke="currentColor" strokeWidth={S.sw} />
    <path d="M8 3.5v3M16 3.5v3M4 10h16" stroke="currentColor" strokeWidth={S.sw} strokeLinecap={S.cap} />
    <path d="M8.5 14.5h7M8.5 17h4.5" stroke="currentColor" strokeWidth={S.sw} strokeLinecap={S.cap} />
  </Svg>
);

export const IconMap = (p) => (
  <Svg {...p}>
    <path d="M9.5 4.5 4.5 6.5v13l5-2 5.5 2 5-2V5.5l-5.5-2-5 2z" stroke="currentColor" strokeWidth={S.sw} strokeLinejoin={S.join} />
    <circle cx="12" cy="10.5" r="2" stroke="currentColor" strokeWidth={S.sw} />
  </Svg>
);

export const IconEmail = (p) => (
  <Svg {...p}>
    <rect x="3.5" y="6.5" width="17" height="11" rx="2" stroke="currentColor" strokeWidth={S.sw} />
    <path d="M4.5 8.5 12 13.5 19.5 8.5" stroke="currentColor" strokeWidth={S.sw} strokeLinejoin={S.join} />
  </Svg>
);

export const IconPhone = (p) => (
  <Svg {...p}>
    <rect x="7.5" y="3.5" width="9" height="17" rx="2.2" stroke="currentColor" strokeWidth={S.sw} />
    <circle cx="12" cy="17.5" r="0.9" fill="currentColor" />
  </Svg>
);

export const IconCommunity = (p) => (
  <Svg {...p}>
    <circle cx="9" cy="9" r="2.6" stroke="currentColor" strokeWidth={S.sw} />
    <circle cx="16.5" cy="10" r="2.2" stroke="currentColor" strokeWidth={S.sw} />
    <path d="M4.5 18.5c.8-2.6 2.8-4 4.5-4s3.7 1.4 4.5 4M13.5 18.5c.5-1.8 1.8-3 3.5-3s3 1.2 3.5 3" stroke="currentColor" strokeWidth={S.sw} strokeLinecap={S.cap} />
  </Svg>
);

export const IconChat = (p) => (
  <Svg {...p}>
    <path d="M5 6.5h14a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H10l-4.5 3v-3H5a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2z" stroke="currentColor" strokeWidth={S.sw} strokeLinejoin={S.join} />
    <path d="M8.5 11h7M8.5 13.5h4" stroke="currentColor" strokeWidth={S.sw} strokeLinecap={S.cap} />
  </Svg>
);

export const IconTip = (p) => (
  <Svg {...p}>
    <path d="M12 4v2.5M8.5 6.5h7" stroke="currentColor" strokeWidth={S.sw} strokeLinecap={S.cap} />
    <path d="M9 8.5h6l-1 10.5H10L9 8.5z" stroke="currentColor" strokeWidth={S.sw} strokeLinejoin={S.join} />
    <path d="M10 14.5h4" stroke="currentColor" strokeWidth={S.sw} strokeLinecap={S.cap} />
  </Svg>
);

export const IconWallet = (p) => (
  <Svg {...p}>
    <rect x="3.5" y="7" width="17" height="11" rx="2.2" stroke="currentColor" strokeWidth={S.sw} />
    <path d="M3.5 10.5h17" stroke="currentColor" strokeWidth={S.sw} />
    <circle cx="16.5" cy="13.5" r="1.2" fill="currentColor" />
  </Svg>
);

export const IconCrypto = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth={S.sw} />
    <path d="M9.5 8.5h4a2 2 0 0 1 0 4h-3a2 2 0 0 0 0 4h4.5" stroke="currentColor" strokeWidth={S.sw} strokeLinecap={S.cap} />
    <path d="M12 6.5v11" stroke="currentColor" strokeWidth={S.sw} strokeLinecap={S.cap} />
  </Svg>
);

export const IconSwap = (p) => (
  <Svg {...p}>
    <path d="M7 8.5h10l-2.2-2.2M17 15.5H7l2.2 2.2" stroke="currentColor" strokeWidth={S.sw} strokeLinecap={S.cap} strokeLinejoin={S.join} />
  </Svg>
);

export const IconNft = (p) => (
  <Svg {...p}>
    <path d="M12 3.5 18.5 7v10L12 20.5 5.5 17V7L12 3.5z" stroke="currentColor" strokeWidth={S.sw} strokeLinejoin={S.join} />
    <path d="M12 8.5 15 10v4l-3 1.5L9 14v-4l3-1.5z" stroke="currentColor" strokeWidth={S.sw} strokeLinejoin={S.join} />
  </Svg>
);

export const IconGames = (p) => (
  <Svg {...p}>
    <rect x="4" y="8" width="16" height="9" rx="4.5" stroke="currentColor" strokeWidth={S.sw} />
    <path d="M10 11.5v4M8 13.5h4" stroke="currentColor" strokeWidth={S.sw} strokeLinecap={S.cap} />
    <circle cx="16.5" cy="12" r="0.9" fill="currentColor" />
    <circle cx="18.3" cy="13.8" r="0.9" fill="currentColor" />
  </Svg>
);

export const IconMobileApp = (p) => (
  <Svg {...p}>
    <rect x="7" y="3" width="10" height="18" rx="2.2" stroke="currentColor" strokeWidth={S.sw} />
    <circle cx="12" cy="17.5" r="0.8" fill="currentColor" />
    <rect x="9.5" y="6" width="5" height="7" rx="1" stroke="currentColor" strokeWidth={S.sw} />
  </Svg>
);

export const IconExtension = (p) => (
  <Svg {...p}>
    <path d="M8.5 4.5h7l2.5 2.5v10l-2.5 2.5h-7L6 17V7l2.5-2.5z" stroke="currentColor" strokeWidth={S.sw} strokeLinejoin={S.join} />
    <path d="M9.5 12h5M12 9.5v5" stroke="currentColor" strokeWidth={S.sw} strokeLinecap={S.cap} />
  </Svg>
);

export const IconCode = (p) => (
  <Svg {...p}>
    <path d="M8.5 8 5.5 12l3 4M15.5 8l3 4-3 4" stroke="currentColor" strokeWidth={S.sw} strokeLinecap={S.cap} strokeLinejoin={S.join} />
    <path d="M11 18.5h2" stroke="currentColor" strokeWidth={S.sw} strokeLinecap={S.cap} />
  </Svg>
);

export const IconAnalytics = (p) => (
  <Svg {...p}>
    <path d="M5 18.5V10M10 18.5V6.5M15 18.5v-5M20 18.5V9" stroke="currentColor" strokeWidth={S.sw} strokeLinecap={S.cap} />
    <path d="M4 18.5h16" stroke="currentColor" strokeWidth={S.sw} strokeLinecap={S.cap} />
  </Svg>
);

export const IconLaunch = (p) => (
  <Svg {...p}>
    <path d="M12 4.5c2.5 3.5 4 7.2 4 11a4 4 0 0 1-8 0c0-3.8 1.5-7.5 4-11z" stroke="currentColor" strokeWidth={S.sw} strokeLinejoin={S.join} />
    <path d="M10 14.5h4M12 12.5v4" stroke="currentColor" strokeWidth={S.sw} strokeLinecap={S.cap} />
    <path d="M8.5 19.5h7" stroke="currentColor" strokeWidth={S.sw} strokeLinecap={S.cap} />
  </Svg>
);

export const IconFeatured = (p) => (
  <Svg {...p}>
    <path d="M12 4.5 14.2 9.8 20 10.5l-4.5 3.7 1.4 5.5L12 17.2 7.1 19.7l1.4-5.5L4 10.5l5.8-.7L12 4.5z" stroke="currentColor" strokeWidth={S.sw} strokeLinejoin={S.join} />
  </Svg>
);

export const IconFavorite = (p) => (
  <Svg {...p}>
    <path d="M12 19.5s-6.5-4-6.5-8.5a3.7 3.7 0 0 1 6.5-2.3A3.7 3.7 0 0 1 18.5 11c0 4.5-6.5 8.5-6.5 8.5z" stroke="currentColor" strokeWidth={S.sw} strokeLinejoin={S.join} />
  </Svg>
);

export const IconGift = (p) => (
  <Svg {...p}>
    <rect x="4" y="10" width="16" height="9.5" rx="1.5" stroke="currentColor" strokeWidth={S.sw} />
    <path d="M12 10v9.5M4 13.5h16" stroke="currentColor" strokeWidth={S.sw} />
    <path d="M12 10c-2.2 0-3.5-1-3.5-2.4S9.8 5 12 5s3.5 1 3.5 2.6S14.2 10 12 10z" stroke="currentColor" strokeWidth={S.sw} />
  </Svg>
);

export const IconPromo = (p) => (
  <Svg {...p}>
    <path d="M5 9.5h11.5a2.5 2.5 0 0 0 0-5H8.5" stroke="currentColor" strokeWidth={S.sw} strokeLinecap={S.cap} />
    <path d="M5 9.5v8.5h11.5a2.5 2.5 0 1 0 0-5H5" stroke="currentColor" strokeWidth={S.sw} strokeLinejoin={S.join} />
    <path d="M18.5 8v11" stroke="currentColor" strokeWidth={S.sw} strokeLinecap={S.cap} />
  </Svg>
);

export const IconAward = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="10" r="5" stroke="currentColor" strokeWidth={S.sw} />
    <path d="M9.5 14.5 8.5 19.5M14.5 14.5l1 5M8.5 19.5h7" stroke="currentColor" strokeWidth={S.sw} strokeLinecap={S.cap} />
  </Svg>
);

export const IconSettings = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="2.6" stroke="currentColor" strokeWidth={S.sw} />
    <path d="M12 4.5v2M12 17.5v2M4.5 12h2M17.5 12h2M6.8 6.8l1.4 1.4M15.8 15.8l1.4 1.4M17.2 6.8l-1.4 1.4M8.2 15.8l-1.4 1.4" stroke="currentColor" strokeWidth={S.sw} strokeLinecap={S.cap} />
  </Svg>
);

export const IconDownload = (p) => (
  <Svg {...p}>
    <path d="M12 4.5v9" stroke="currentColor" strokeWidth={S.sw} strokeLinecap={S.cap} />
    <path d="M8.5 11 12 14.5 15.5 11" stroke="currentColor" strokeWidth={S.sw} strokeLinecap={S.cap} strokeLinejoin={S.join} />
    <path d="M5.5 18.5h13" stroke="currentColor" strokeWidth={S.sw} strokeLinecap={S.cap} />
  </Svg>
);

export const IconSignup = (p) => (
  <Svg {...p}>
    <rect x="5" y="4.5" width="14" height="15" rx="2" stroke="currentColor" strokeWidth={S.sw} />
    <path d="M9 9.5h6M9 12.5h6M9 15.5h3.5" stroke="currentColor" strokeWidth={S.sw} strokeLinecap={S.cap} />
    <path d="M15.5 15.5 17 17l2.5-3" stroke="currentColor" strokeWidth={S.sw} strokeLinecap={S.cap} strokeLinejoin={S.join} />
  </Svg>
);

export const IconTicket = (p) => (
  <Svg {...p}>
    <path d="M5 8.5h14v7H5a2 2 0 0 1 0-4 2 2 0 0 1 0-4z" stroke="currentColor" strokeWidth={S.sw} strokeLinejoin={S.join} />
    <path d="M10.5 8.5v7" stroke="currentColor" strokeWidth={S.sw} strokeDasharray="1.5 2" />
  </Svg>
);

export const IconLearn = (p) => (
  <Svg {...p}>
    <path d="M4.5 8.5 12 5l7.5 3.5L12 12 4.5 8.5z" stroke="currentColor" strokeWidth={S.sw} strokeLinejoin={S.join} />
    <path d="M7 10.5V15c0 1.2 2.2 2.5 5 2.5s5-1.3 5-2.5v-4.5" stroke="currentColor" strokeWidth={S.sw} strokeLinecap={S.cap} />
  </Svg>
);

export const IconHire = (p) => (
  <Svg {...p}>
    <path d="M7.5 11.5 10 14l6.5-6.5" stroke="currentColor" strokeWidth={S.sw} strokeLinecap={S.cap} strokeLinejoin={S.join} />
    <rect x="4" y="5" width="16" height="14" rx="2" stroke="currentColor" strokeWidth={S.sw} />
  </Svg>
);

export const IconSupport = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth={S.sw} />
    <path d="M12 8.5v4" stroke="currentColor" strokeWidth={S.sw} strokeLinecap={S.cap} />
    <circle cx="12" cy="15.8" r="0.9" fill="currentColor" />
  </Svg>
);

export const IconMenu = (p) => (
  <Svg {...p}>
    <rect x="4" y="5" width="16" height="14" rx="2" stroke="currentColor" strokeWidth={S.sw} />
    <path d="M8 9.5h8M8 12h8M8 14.5h5.5" stroke="currentColor" strokeWidth={S.sw} strokeLinecap={S.cap} />
  </Svg>
);

/** Curated picker — custom Aquads-style icons for unrecognized URLs. */
export const CUSTOM_BIO_ICON_CATALOG = [
  { id: 'auto', label: 'Auto-detect', Icon: IconAuto, group: 'General' },
  { id: 'link', label: 'Generic link', Icon: IconLink, group: 'General' },
  { id: 'website', label: 'Website', Icon: IconWebsite, group: 'General' },
  { id: 'home', label: 'Home', Icon: IconHome, group: 'General' },
  { id: 'menu', label: 'Link hub', Icon: IconMenu, group: 'General' },
  { id: 'featured', label: 'Featured', Icon: IconFeatured, group: 'General' },
  { id: 'shop', label: 'Shop', Icon: IconShop, group: 'Business' },
  { id: 'marketplace', label: 'Marketplace', Icon: IconMarketplace, group: 'Business' },
  { id: 'portfolio', label: 'Portfolio', Icon: IconPortfolio, group: 'Business' },
  { id: 'hire', label: 'Hire / work', Icon: IconHire, group: 'Business' },
  { id: 'booking', label: 'Book a call', Icon: IconBooking, group: 'Business' },
  { id: 'signup', label: 'Sign up', Icon: IconSignup, group: 'Business' },
  { id: 'blog', label: 'Blog', Icon: IconBlog, group: 'Content' },
  { id: 'newsletter', label: 'Newsletter', Icon: IconNewsletter, group: 'Content' },
  { id: 'book', label: 'Read / docs', Icon: IconBook, group: 'Content' },
  { id: 'learn', label: 'Course', Icon: IconLearn, group: 'Content' },
  { id: 'video', label: 'Video', Icon: IconVideo, group: 'Media' },
  { id: 'podcast', label: 'Podcast', Icon: IconPodcast, group: 'Media' },
  { id: 'music', label: 'Music', Icon: IconMusic, group: 'Media' },
  { id: 'gallery', label: 'Gallery', Icon: IconGallery, group: 'Media' },
  { id: 'live', label: 'Go live', Icon: IconLive, group: 'Media' },
  { id: 'calendar', label: 'Events', Icon: IconCalendar, group: 'Connect' },
  { id: 'map', label: 'Location', Icon: IconMap, group: 'Connect' },
  { id: 'email', label: 'Email', Icon: IconEmail, group: 'Connect' },
  { id: 'phone', label: 'Phone', Icon: IconPhone, group: 'Connect' },
  { id: 'community', label: 'Community', Icon: IconCommunity, group: 'Connect' },
  { id: 'chat', label: 'Chat', Icon: IconChat, group: 'Connect' },
  { id: 'wallet', label: 'Wallet', Icon: IconWallet, group: 'Web3' },
  { id: 'crypto', label: 'Crypto', Icon: IconCrypto, group: 'Web3' },
  { id: 'swap', label: 'Swap', Icon: IconSwap, group: 'Web3' },
  { id: 'nft', label: 'NFT', Icon: IconNft, group: 'Web3' },
  { id: 'tip', label: 'Tip jar', Icon: IconTip, group: 'Web3' },
  { id: 'games', label: 'Games', Icon: IconGames, group: 'Product' },
  { id: 'mobile-app', label: 'Mobile app', Icon: IconMobileApp, group: 'Product' },
  { id: 'extension', label: 'Extension', Icon: IconExtension, group: 'Product' },
  { id: 'code', label: 'Developer', Icon: IconCode, group: 'Product' },
  { id: 'analytics', label: 'Analytics', Icon: IconAnalytics, group: 'Product' },
  { id: 'launch', label: 'Launch', Icon: IconLaunch, group: 'Product' },
  { id: 'gift', label: 'Gift / offer', Icon: IconGift, group: 'Promo' },
  { id: 'promo', label: 'Promo', Icon: IconPromo, group: 'Promo' },
  { id: 'award', label: 'Award', Icon: IconAward, group: 'Promo' },
  { id: 'favorite', label: 'Favorite', Icon: IconFavorite, group: 'Promo' },
  { id: 'download', label: 'Download', Icon: IconDownload, group: 'Promo' },
  { id: 'ticket', label: 'Ticket', Icon: IconTicket, group: 'Promo' },
  { id: 'support', label: 'Support', Icon: IconSupport, group: 'Promo' },
  { id: 'settings', label: 'Settings', Icon: IconSettings, group: 'Promo' }
];

export const CUSTOM_BIO_ICON_MAP = Object.fromEntries(
  CUSTOM_BIO_ICON_CATALOG.filter((item) => item.id !== 'auto').map((item) => [item.id, item.Icon])
);

/** Map old Font Awesome keys to the new custom set. */
export const LEGACY_BIO_ICON_KEY_ALIASES = {
  globe: 'website',
  store: 'shop',
  'shopping-bag': 'shop',
  gamepad: 'games',
  rocket: 'launch',
  laptop: 'mobile-app',
  chrome: 'extension',
  'puzzle-piece': 'extension',
  coins: 'crypto',
  'exchange-alt': 'swap',
  'chart-line': 'analytics',
  users: 'community',
  briefcase: 'portfolio',
  book: 'book',
  play: 'video',
  microphone: 'podcast',
  camera: 'gallery',
  image: 'gallery',
  'file-alt': 'blog',
  'map-marker-alt': 'map',
  trophy: 'award',
  heart: 'favorite',
  star: 'featured',
  bolt: 'launch',
  bullhorn: 'promo',
  cog: 'settings'
};

export const CUSTOM_BIO_ICON_IDS = Object.keys(CUSTOM_BIO_ICON_MAP);
