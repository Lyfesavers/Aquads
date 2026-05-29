import React from 'react';
import './AsSeenOn.css';

// Press / media mentions strip.
// To add a new outlet: drop the logo file into /public and append an entry below.
// - heightClass: tune so the visible wordmark looks the same optical height as the others
//   (compensate for empty padding baked into the source image).
// - invertOnDark: set true for logos with white/light backgrounds or dark-only ink —
//   applies CSS invert so the logo reads as white-on-transparent over our dark page.
// - dofollow: defaults to false. Press / PR placements use rel="nofollow sponsored"
//   (SEO best practice — preserves our link equity, avoids paid-link-scheme penalty).
//   Set dofollow: true only for *earned* editorial coverage from a high-authority
//   outlet we explicitly want to vouch for (e.g. Cointelegraph, TechCrunch).
//
// ORDER MATTERS for the seamless marquee loop. Two identical groups sit side
// by side; the seam falls between index N-1 (last) and index 0 (first of the
// duplicate group). Two visually wide / minimally-padded wordmarks meeting
// at the seam read as "too close" even when the math is even (because the
// breathing room comes from each logo file's own internal whitespace).
// Rule of thumb: keep narrow / padded logos at index 0 and the last index
// so the seam always lands between two logos that bring their own breathing
// room, and spread the wide wordmarks through the middle.
const PRESS_LOGOS = [
  {
    id: 'bitget',
    name: 'Bitget',
    logo: '/bitget.png',
    url: 'https://www.bitget.com/amp/news/detail/12560605425522',
    alt: 'Aquads featured on Bitget News',
    heightClass: 'h-6 md:h-8',
  },
  {
    id: 'mintfunnel',
    name: 'Mintfunnel',
    logo: '/Mintfunnel-Logo-Dark-350-1-r8rn1gxsqs7pcj7dypmjmf6t9g4s1ss44pk8sp3no0.webp',
    url: 'https://news.mintfunnel.co/aquads-launches-post-launch-growth-stack-for-crypto-projects-already-live-on-chain/',
    alt: 'Aquads featured on Mintfunnel Newsroom',
    heightClass: 'h-7 md:h-9',
  },
  {
    id: 'thebittimes',
    name: 'TheBitTimes',
    logo: '/bittimes.webp',
    url: 'https://thebittimes.com/aquads-launches-post-launch-growth-stack-for-crypto-projects-already-live-on-chain-tbt126930.html',
    alt: 'Aquads featured on TheBitTimes',
    // Source file has a lot of empty padding — push the rendered height up so the
    // wordmark itself matches the optical size of the other logos.
    heightClass: 'h-10 md:h-14',
  },
  {
    id: 'blocktelegraph',
    name: 'BlockTelegraph',
    logo: '/blocktelegraph-logo-600x131.png',
    url: 'https://blocktelegraph.io/aquads-launches-post-launch-growth-stack-for-crypto-projects-already-live-on-chain/',
    alt: 'Aquads featured on BlockTelegraph',
    heightClass: 'h-7 md:h-9',
  },
  {
    id: 'timestabloid',
    name: 'Times Tabloid',
    logo: '/Times-Tabloid-Header-Mobile.png',
    url: 'https://timestabloid.com/aquads-launches-post-launch-growth-stack-for-crypto-projects/',
    alt: 'Aquads featured on Times Tabloid',
    heightClass: 'h-8 md:h-10',
  },
  {
    id: 'bitcolumnist',
    name: 'Bitcolumnist',
    logo: '/Bitcolumnist-Logo-Dark-BG.webp',
    url: 'https://bitcolumnist.com/release/aquads-launches-post-launch-growth-stack-to-close-the-30-day-gap-for-crypto-projects-already-live-on-chain/',
    alt: 'Aquads featured on Bitcolumnist',
    heightClass: 'h-5 md:h-7',
  },
  {
    id: 'mexc',
    name: 'MEXC',
    logo: '/mexc-global-logo-png_seeklogo-463569.png',
    url: 'https://www.mexc.com/news/1109803',
    alt: 'Aquads featured on MEXC',
    // Source file is near-square with significant padding around the wordmark,
    // so the rendered height must be pushed well above the others for the visible
    // logo to match their optical size.
    heightClass: 'h-20 md:h-28',
    // PNG ships with a white background and black wordmark — invert so the white
    // drops out and the wordmark reads as white-on-transparent over the dark page.
    invertOnDark: true,
  },
  {
    id: 'intellectia',
    name: 'Intellectia.AI',
    logo: '/intellectia.png',
    url: 'https://intellectia.ai/news/crypto/aquads-launches-postlaunch-growth-stack-for-live-crypto-projects',
    alt: 'Aquads featured on Intellectia.AI',
    heightClass: 'h-6 md:h-8',
  },
  {
    id: 'coinmarketcap',
    name: 'CoinMarketCap',
    // Filename has a space — URL-encode it so the asset path resolves correctly.
    logo: '/CMC%20logo.png',
    url: 'https://coinmarketcap.com/community/articles/6a1292b57576cb3a3d682843/',
    alt: 'Aquads featured on CoinMarketCap',
    heightClass: 'h-7 md:h-9',
  },
];

const LogoItem = ({ item }) => {
  const baseClass = `${item.heightClass || 'h-6 md:h-8'} w-auto max-w-[160px] md:max-w-[200px] object-contain transition duration-300 ease-out`;
  // Inverted logos stay inverted on hover (color-flipped versions look wrong).
  const colorClass = item.invertOnDark
    ? 'invert grayscale opacity-70 group-hover:opacity-100'
    : 'opacity-70 grayscale group-hover:opacity-100 group-hover:grayscale-0';

  // Default to nofollow + sponsored for PR / press placements (best practice).
  // Opt-in dofollow only for genuinely earned editorial coverage.
  const relAttr = item.dofollow
    ? 'noopener noreferrer'
    : 'nofollow sponsored noopener noreferrer';

  return (
    <a
      href={item.url}
      target="_blank"
      rel={relAttr}
      aria-label={`Read article on ${item.name}`}
      className="group inline-flex items-center justify-center"
    >
      <img
        src={item.logo}
        alt={item.alt || item.name}
        // Eager (not lazy) is intentional. The marquee duplicates this
        // logo set into a second off-screen group to enable a seamless
        // infinite loop. With loading="lazy", the duplicate group's
        // images don't load until they near the viewport during the
        // first scroll cycle — and that mid-cycle load causes a tiny
        // layout reflow that shows up as a visible glitch when the
        // animation restarts. With 8 small logo files, eager load has
        // negligible perf impact and guarantees both groups render
        // pixel-identical from frame 1, which is what the seamless
        // -50% translate math depends on.
        loading="eager"
        decoding="async"
        className={`${baseClass} ${colorClass}`}
      />
    </a>
  );
};

const AsSeenOn = () => {
  if (!PRESS_LOGOS.length) return null;

  // Scale the marquee duration with the number of logos so perceived speed
  // stays roughly constant as we add more press mentions.
  const durationSeconds = Math.max(22, PRESS_LOGOS.length * 9);

  return (
    <section
      className="relative w-full py-2 md:py-2.5"
      aria-label="Press and media coverage"
    >
      <div className="text-center mb-1 md:mb-1.5 px-4">
        <p className="text-[9px] md:text-[10px] tracking-[0.3em] uppercase text-gray-500 font-semibold">
          As Seen On
        </p>
      </div>

      <div
        className="as-seen-marquee"
        style={{
          '--as-seen-duration': `${durationSeconds}s`,
          '--press-count': PRESS_LOGOS.length,
        }}
      >
        <div className="as-seen-marquee__track">
          {/*
            NOTE: do NOT add Tailwind `p-0` here. The marquee group needs
            horizontal padding (set in AsSeenOn.css → `.as-seen-marquee__group`)
            because the seam-gap math depends on it: padding-right of group 1
            + padding-left of group 2 must equal the within-group `gap`
            for every logo-to-logo gap to look identical. Tailwind's `.p-0`
            has the same selector specificity as our group rule and can win
            the cascade depending on stylesheet load order, which silently
            collapses the seam gap to 0 (BlockTelegraph and mintfunnel
            rendered visually touching). `list-none` and `m-0` are safe
            because nothing in our CSS competes with them.
          */}
          <ul className="as-seen-marquee__group list-none m-0">
            {PRESS_LOGOS.map((item) => (
              <li key={item.id} className="as-seen-marquee__cell">
                <LogoItem item={item} />
              </li>
            ))}
          </ul>
          <ul
            className="as-seen-marquee__group list-none m-0"
            aria-hidden="true"
          >
            {PRESS_LOGOS.map((item) => (
              <li key={`dup-${item.id}`} className="as-seen-marquee__cell">
                <LogoItem item={item} />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
};

export default AsSeenOn;
