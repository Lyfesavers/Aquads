/**
 * Shared HTML → plain text formatting for RSS-sourced jobs.
 * CryptoJobsList-specific stripping runs only when source === 'cryptojobslist'.
 */

function cleanHTML(html, options = {}) {
  const source = options.source || 'generic';
  if (!html) return '';

  let text = html;

  if (source === 'cryptojobslist') {
    text = text.replace(/<img[^>]*class=['"]?webfeedsFeaturedVisual['"]?[^>]*\/?>/gi, '');
    text = text.replace(/<p>\s*Tags\s*:[\s\S]*?(?=<p[\s>]|<h[1-6]|<div|<ul|<ol|$)/gi, '');
    text = text.replace(/Tags\s*:\s*(?:<a[^>]*>[^<]*<\/a>\s*[•·,|\s]*)+/gi, '');
  }

  if (source === 'weworkremotely') {
    text = text.replace(/^<img[^>]*>\s*/i, '');
  }

  text = text.replace(/>\s+</g, '> <');

  text = text.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '\n\n📌 $1\n\n');
  text = text.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '\n\n📌 $1\n\n');
  text = text.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '\n\n▸ $1\n\n');
  text = text.replace(/<h4[^>]*>(.*?)<\/h4>/gi, '\n\n▸ $1\n\n');
  text = text.replace(/<h5[^>]*>(.*?)<\/h5>/gi, '\n\n$1\n\n');
  text = text.replace(/<h6[^>]*>(.*?)<\/h6>/gi, '\n\n$1\n\n');

  text = text.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '$1');
  text = text.replace(/<b[^>]*>(.*?)<\/b>/gi, '$1');
  text = text.replace(/<em[^>]*>(.*?)<\/em>/gi, '$1');
  text = text.replace(/<i[^>]*>(.*?)<\/i>/gi, '$1');

  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<hr\s*\/?>/gi, '\n────────────────\n');
  text = text.replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gis, '\n│ $1\n');

  text = text.replace(/<ul[^>]*>/gi, '\n');
  text = text.replace(/<\/ul>/gi, '\n');
  text = text.replace(/<ol[^>]*>/gi, '\n');
  text = text.replace(/<\/ol>/gi, '\n');
  text = text.replace(/<li[^>]*>/gi, '  • ');
  text = text.replace(/<\/li>/gi, '\n');

  text = text.replace(/<\/div>/gi, '\n');
  text = text.replace(/<div[^>]*>/gi, '');
  text = text.replace(/<\/p>/gi, '\n\n');
  text = text.replace(/<p[^>]*>/gi, '');

  text = text.replace(/<\/tr>/gi, '\n');
  text = text.replace(/<\/td>/gi, ' | ');
  text = text.replace(/<\/th>/gi, ' | ');
  text = text.replace(/<table[^>]*>/gi, '\n');
  text = text.replace(/<\/table>/gi, '\n');

  text = text.replace(/<[^>]+>/g, '');

  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&#8217;/g, "'")
    .replace(/&#8216;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&#8211;/g, '–')
    .replace(/&#8212;/g, '—')
    .replace(/&#8230;/g, '...')
    .replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec))
    .replace(/&#x([0-9a-f]+);/gi, (match, hex) => String.fromCharCode(parseInt(hex, 16)));

  text = text
    .replace(/[ \t]+/g, ' ')
    .replace(/ \n/g, '\n')
    .replace(/\n /g, '\n')
    .replace(/\n{4,}/g, '\n\n\n')
    .replace(/\n{3}/g, '\n\n')
    .trim();

  return text;
}

function stripTagsFromText(text, source = 'generic') {
  if (!text) return text;

  let cleaned = text;

  if (source === 'cryptojobslist') {
    cleaned = cleaned.replace(/^Tags\s*:.*$/gm, '');
    cleaned = cleaned.replace(
      /^(?:(?:Web3|Blockchain|Cryptocurrency|Crypto|DeFi|NFT)\s+\w[\w\s]*Jobs\s*[•·]\s*)+(?:(?:Web3|Blockchain|Cryptocurrency|Crypto|DeFi|NFT)\s+\w[\w\s]*Jobs)\s*$/gm,
      ''
    );
    cleaned = cleaned.replace(/^(?:\s*#[\w\-\/\.]+[\s,]*){2,}\s*$/gm, '');
    cleaned = cleaned.replace(/(?:\n\s*#[\w\-\/\.]+[\s,]*)+\s*$/g, '');
  }

  cleaned = cleaned.replace(
    /^(?:apply\s+(?:for\s+this\s+)?(?:job|position|role)\s*(?:now|here|today)?|click\s+(?:here\s+)?to\s+apply)\s*[.!]?\s*$/gim,
    ''
  );

  cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();

  return cleaned;
}

function formatJobContent(content, source = 'generic') {
  if (!content) return '';

  let formatted = cleanHTML(content, { source });
  formatted = stripTagsFromText(formatted, source);

  const sectionPatterns = [
    { pattern: /^(about\s+(?:the\s+)?(?:role|position|job|company|us|team))[:.]?\s*/gim, replacement: '\n\n📋 $1\n' },
    { pattern: /^(responsibilities|what\s+you['']?ll\s+do|your\s+role)[:.]?\s*/gim, replacement: '\n\n📋 $1\n' },
    { pattern: /^(requirements?|qualifications?|what\s+we['']?re\s+looking\s+for|what\s+you['']?ll\s+need|must\s+have|skills?)[:.]?\s*/gim, replacement: '\n\n📋 $1\n' },
    { pattern: /^(nice\s+to\s+have|preferred|bonus\s+points?)[:.]?\s*/gim, replacement: '\n\n📋 $1\n' },
    { pattern: /^(benefits?|perks?|what\s+we\s+offer|compensation)[:.]?\s*/gim, replacement: '\n\n📋 $1\n' },
    { pattern: /^(how\s+to\s+apply|application\s+process)[:.]?\s*/gim, replacement: '\n\n📋 $1\n' },
    { pattern: /^(about\s+(?:the\s+)?company|who\s+we\s+are)[:.]?\s*/gim, replacement: '\n\n📋 $1\n' },
  ];

  for (const { pattern, replacement } of sectionPatterns) {
    formatted = formatted.replace(pattern, replacement);
  }

  formatted = formatted.replace(/^[\-\*]\s+/gm, '  • ');
  formatted = formatted.replace(/^(\d+)\.\s+/gm, '  $1. ');
  formatted = formatted.replace(/(📋[^\n]+)\n([^\n])/g, '$1\n\n$2');
  formatted = formatted.replace(/([^\n])\n(📋|📌)/g, '$1\n\n$2');

  formatted = formatted
    .replace(/\n{4,}/g, '\n\n\n')
    .replace(/\n{3}/g, '\n\n')
    .replace(/^\s+/gm, (match) => (match.length > 4 ? '    ' : match))
    .trim();

  return formatted;
}

module.exports = {
  cleanHTML,
  stripTagsFromText,
  formatJobContent,
};
