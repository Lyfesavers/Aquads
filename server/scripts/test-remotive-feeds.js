/**
 * One-off: probe Remotive category RSS feeds vs JSON API.
 * Run: node scripts/test-remotive-feeds.js
 */
const https = require('https');

function get(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { 'User-Agent': 'Aquads-FeedTest/1.0' } }, (r) => {
        let d = '';
        r.on('data', (c) => (d += c));
        r.on('end', () => resolve(d));
      })
      .on('error', reject);
  });
}

function itemLinkAndGuid(block) {
  const linkM = block.match(/<link[^>]*>([^<]*)<\/link>/i);
  const guidM = block.match(/<guid[^>]*>([^<]*)<\/guid>/i);
  return {
    link: linkM ? linkM[1].trim() : '',
    guid: guidM ? guidM[1].trim() : '',
  };
}

function splitRssItems(xml) {
  const items = [];
  const re = /<item>([\s\S]*?)<\/item>/gi;
  let m;
  while ((m = re.exec(xml)) !== null) {
    items.push(m[1]);
  }
  return items;
}

(async () => {
  const catJson = JSON.parse(await get('https://remotive.com/api/remote-jobs/categories'));
  const cats = catJson.jobs || [];

  const byGuid = new Map();
  const byLink = new Map();
  let rawItemCount = 0;

  for (const c of cats) {
    const feedUrl = `https://remotive.com/remote-jobs/${c.slug}/feed`;
    const xml = await get(feedUrl);
    const blocks = splitRssItems(xml);
    rawItemCount += blocks.length;

    for (const block of blocks) {
      const { link, guid } = itemLinkAndGuid(block);
      const key = guid || link;
      if (!key) continue;
      if (!byGuid.has(key)) {
        byGuid.set(key, { slug: c.slug, name: c.name, guid, link });
      }
    }
  }

  const apiBody = await get('https://remotive.com/api/remote-jobs');
  const api = JSON.parse(apiBody);
  const apiJobs = api.jobs || [];

  const apiLinks = new Set(apiJobs.map((j) => j.url).filter(Boolean));
  const feedLinks = new Set([...byGuid.values()].map((v) => v.link).filter(Boolean));

  let inBoth = 0;
  let onlyFeed = 0;
  let onlyApi = 0;
  for (const l of feedLinks) {
    if (apiLinks.has(l)) inBoth++;
    else onlyFeed++;
  }
  for (const l of apiLinks) {
    if (!feedLinks.has(l)) onlyApi++;
  }

  console.log('--- Remotive feed test ---');
  console.log('Categories:', cats.length);
  console.log('Total <item> across all category feeds:', rawItemCount);
  console.log('Unique jobs by guid/link across feeds:', byGuid.size);
  console.log('JSON API job count:', apiJobs.length);
  console.log('URLs in both API and merged feeds:', inBoth);
  console.log('URLs only in feeds (not in API list):', onlyFeed);
  console.log('URLs only in API (not in any feed):', onlyApi);

  if (onlyFeed > 0) {
    console.log('\nSample feed-only links:');
    let n = 0;
    for (const v of byGuid.values()) {
      if (v.link && !apiLinks.has(v.link)) {
        console.log(' ', v.link);
        if (++n >= 5) break;
      }
    }
  }

  const sample = await get(`https://remotive.com/remote-jobs/${cats[0].slug}/feed`);
  const first = splitRssItems(sample)[0];
  if (first) {
    console.log('\nFirst item fields (software-development), first 800 chars:');
    console.log(first.replace(/\s+/g, ' ').slice(0, 800));
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
