import React from 'react';
import './AsSeenOn.css';

// Press / media mentions strip.
// To add a new outlet: drop the logo file into /public and append an entry below.
// Keep logos roughly the same vertical mass; the strip auto-sizes them by height.
const PRESS_LOGOS = [
  {
    id: 'mintfunnel',
    name: 'Mintfunnel',
    logo: '/Mintfunnel-Logo-Dark-350-1-r8rn1gxsqs7pcj7dypmjmf6t9g4s1ss44pk8sp3no0.webp',
    url: 'https://news.mintfunnel.co/aquads-launches-post-launch-growth-stack-for-crypto-projects-already-live-on-chain/',
    alt: 'Aquads featured on Mintfunnel Newsroom',
    // Optional per-logo height override (Tailwind class). Defaults to h-8 md:h-10.
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
    heightClass: 'h-6 md:h-8',
  },
  {
    id: 'timestabloid',
    name: 'Times Tabloid',
    logo: '/Times-Tabloid-for-Cryptocurrency-and-Blockchain.png',
    url: 'https://timestabloid.com/aquads-launches-post-launch-growth-stack-for-crypto-projects/',
    alt: 'Aquads featured on Times Tabloid',
    heightClass: 'h-7 md:h-9',
  },
];

const LogoItem = ({ item }) => (
  <a
    href={item.url}
    target="_blank"
    rel="noopener noreferrer"
    aria-label={`Read article on ${item.name}`}
    className="group inline-flex items-center shrink-0"
  >
    <img
      src={item.logo}
      alt={item.alt || item.name}
      loading="lazy"
      decoding="async"
      className={`${item.heightClass || 'h-6 md:h-8'} w-auto max-w-[160px] md:max-w-[200px] object-contain opacity-70 grayscale transition duration-300 ease-out group-hover:opacity-100 group-hover:grayscale-0`}
    />
  </a>
);

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
        style={{ '--as-seen-duration': `${durationSeconds}s` }}
      >
        <div className="as-seen-marquee__track">
          <ul className="as-seen-marquee__group list-none m-0 p-0">
            {PRESS_LOGOS.map((item) => (
              <li key={item.id}>
                <LogoItem item={item} />
              </li>
            ))}
          </ul>
          <ul
            className="as-seen-marquee__group list-none m-0 p-0"
            aria-hidden="true"
          >
            {PRESS_LOGOS.map((item) => (
              <li key={`dup-${item.id}`}>
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
