import React from 'react';
import './AsSeenOn.css';

// Press / media mentions strip.
// To add a new outlet: drop the logo file into /public and append an entry below.
// - heightClass: tune so the visible wordmark looks the same optical height as the others
//   (compensate for empty padding baked into the source image).
// - invertOnDark: set true for logos with white/light backgrounds or dark-only ink —
//   applies CSS invert so the logo reads as white-on-transparent over our dark page.
const PRESS_LOGOS = [
  {
    id: 'mintfunnel',
    name: 'Mintfunnel',
    logo: '/Mintfunnel-Logo-Dark-350-1-r8rn1gxsqs7pcj7dypmjmf6t9g4s1ss44pk8sp3no0.webp',
    url: 'https://news.mintfunnel.co/aquads-launches-post-launch-growth-stack-for-crypto-projects-already-live-on-chain/',
    alt: 'Aquads featured on Mintfunnel Newsroom',
    heightClass: 'h-7 md:h-9',
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
    id: 'timestabloid',
    name: 'Times Tabloid',
    logo: '/Times-Tabloid-for-Cryptocurrency-and-Blockchain.png',
    url: 'https://timestabloid.com/aquads-launches-post-launch-growth-stack-for-crypto-projects/',
    alt: 'Aquads featured on Times Tabloid',
    heightClass: 'h-7 md:h-9',
    // PNG ships with a white background — invert so the white drops to black
    // (matches the page) and the dark wordmark shows as white. Color hover is
    // disabled for inverted logos since inverted hues look broken.
    invertOnDark: true,
  },
];

const LogoItem = ({ item }) => {
  const baseClass = `${item.heightClass || 'h-6 md:h-8'} w-auto max-w-[160px] md:max-w-[200px] object-contain transition duration-300 ease-out`;
  // Inverted logos stay inverted on hover (color-flipped versions look wrong).
  const colorClass = item.invertOnDark
    ? 'invert grayscale opacity-70 group-hover:opacity-100'
    : 'opacity-70 grayscale group-hover:opacity-100 group-hover:grayscale-0';

  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Read article on ${item.name}`}
      className="group inline-flex items-center justify-center"
    >
      <img
        src={item.logo}
        alt={item.alt || item.name}
        loading="lazy"
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
          <ul className="as-seen-marquee__group list-none m-0 p-0">
            {PRESS_LOGOS.map((item) => (
              <li key={item.id} className="as-seen-marquee__cell">
                <LogoItem item={item} />
              </li>
            ))}
          </ul>
          <ul
            className="as-seen-marquee__group list-none m-0 p-0"
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
