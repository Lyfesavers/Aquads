const https = require('https');

const PLAYLIST_ID = 'PLKHtulN0_0h8hun9lEhYHPGm4Mqophidj';

https.get(`https://www.youtube.com/playlist?list=${PLAYLIST_ID}`, {
  headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
}, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    const re = /"contentId":"([a-zA-Z0-9_-]{11})"[\s\S]*?"title":\{"content":"([^"]+)"/g;
    const seen = new Set();
    const videos = [];
    let match;
    while ((match = re.exec(data)) && videos.length < 30) {
      if (seen.has(match[1])) continue;
      seen.add(match[1]);
      videos.push({ id: match[1], title: match[2] });
    }
    console.log(JSON.stringify(videos, null, 2));
  });
}).on('error', (err) => {
  console.error(err.message);
  process.exit(1);
});
