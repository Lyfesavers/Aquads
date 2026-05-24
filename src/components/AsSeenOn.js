import React from 'react';
import { motion } from 'framer-motion';

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
    heightClass: 'h-9 md:h-11',
  },
  {
    id: 'bitcolumnist',
    name: 'Bitcolumnist',
    logo: '/Bitcolumnist-Logo-Dark-BG.webp',
    url: 'https://bitcolumnist.com/release/aquads-launches-post-launch-growth-stack-to-close-the-30-day-gap-for-crypto-projects-already-live-on-chain/',
    alt: 'Aquads featured on Bitcolumnist',
    heightClass: 'h-7 md:h-9',
  },
];

const AsSeenOn = () => {
  if (!PRESS_LOGOS.length) return null;

  return (
    <section
      className="relative w-full px-4 md:px-6 py-8 md:py-12"
      aria-label="Press and media coverage"
    >
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm px-4 md:px-8 py-5 md:py-6"
        >
          <div className="flex flex-col md:flex-row items-center justify-center md:justify-between gap-4 md:gap-8">
            <div className="text-center md:text-left shrink-0">
              <p className="text-[10px] md:text-xs tracking-[0.25em] uppercase text-gray-400 font-semibold">
                As Seen On
              </p>
              <p className="text-[10px] md:text-xs text-gray-500 mt-1 hidden md:block">
                Press &amp; media coverage
              </p>
            </div>

            <div className="flex-1 w-full">
              <ul className="flex flex-wrap items-center justify-center md:justify-end gap-x-8 md:gap-x-10 gap-y-4">
                {PRESS_LOGOS.map((item) => (
                  <li key={item.id}>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Read article on ${item.name}`}
                      className="group inline-flex items-center"
                    >
                      <img
                        src={item.logo}
                        alt={item.alt || item.name}
                        loading="lazy"
                        decoding="async"
                        className={`${item.heightClass || 'h-8 md:h-10'} w-auto max-w-[180px] md:max-w-[220px] object-contain opacity-70 grayscale transition duration-300 ease-out group-hover:opacity-100 group-hover:grayscale-0 group-hover:scale-105`}
                      />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default AsSeenOn;
