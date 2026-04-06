// Netlify Edge Function to serve game metadata for social media crawlers
// Mirrors share-blog.js — intercepts /share/game/:id before it reaches the SPA

export default async (request, context) => {
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/');

  // Extract game ID from /share/game/:id
  const gameId = pathParts[pathParts.length - 1];

  if (!gameId || gameId === 'game') {
    return getDefaultResponse();
  }

  try {
    const apiResponse = await fetch(`https://aquads-production.up.railway.app/api/games/${gameId}`, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Aquads-Edge-Function/1.0'
      }
    });

    if (!apiResponse.ok) {
      console.log(`API returned ${apiResponse.status} for game ${gameId}`);
      return getDefaultResponse();
    }

    const game = await apiResponse.json();

    if (!game || !game.title) {
      return getDefaultResponse();
    }

    const description = game.description
      ? game.description.replace(/<[^>]*>/g, '').trim().slice(0, 200) + '...'
      : `Play ${game.title} on Aquads Game Hub!`;

    // Use the game banner when it is an image; fall back to the platform logo
    const imageUrl = game.bannerType === 'image' && game.bannerUrl
      ? game.bannerUrl
      : 'https://www.aquads.xyz/logo712.png';

    // Humans land on the game page; og:url points at this share URL so Facebook/Telegram
    // re-scrape the edge HTML instead of the SPA at /games/:id.
    const sharePageUrl = `https://www.aquads.xyz/share/game/${gameId}`;
    const redirectUrl = `https://www.aquads.xyz/games/${gameId}`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(game.title)} | Aquads Game Hub</title>
  <meta name="description" content="${escapeHtml(description)}">

  <!-- Twitter Card meta tags -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:site" content="@AquadsXYZ">
  <meta name="twitter:title" content="${escapeHtml(game.title)} | Aquads Game Hub">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${escapeHtml(imageUrl)}">

  <!-- Open Graph meta tags -->
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Aquads Game Hub">
  <meta property="og:url" content="${escapeHtml(sharePageUrl)}">
  <meta property="og:title" content="${escapeHtml(game.title)} | Aquads Game Hub">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:image" content="${escapeHtml(imageUrl)}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">

  <!-- Redirect to actual game page -->
  <meta http-equiv="refresh" content="0;url=${escapeHtml(redirectUrl)}">

  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 40px 20px; text-align: center; background: linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%); color: #fff; min-height: 100vh; }
    .container { max-width: 600px; margin: 0 auto; }
    h1 { color: #fbbf24; font-size: 1.5rem; line-height: 1.4; }
    p { color: #b0b0b0; line-height: 1.6; }
    a { color: #fbbf24; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="container">
    <h1>${escapeHtml(game.title)}</h1>
    <p>${escapeHtml(description)}</p>
    <p>Redirecting to game... <a href="${escapeHtml(redirectUrl)}">Click here</a> if not redirected.</p>
  </div>
</body>
</html>`;

    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    });

  } catch (error) {
    console.error('Edge function error:', error);
    return getDefaultResponse();
  }
};

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getDefaultResponse() {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Aquads Game Hub</title>
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="Aquads Game Hub - Play Web3 Games">
  <meta name="twitter:image" content="https://www.aquads.xyz/logo712.png">
  <meta property="og:title" content="Aquads Game Hub - Play Web3 Games">
  <meta property="og:image" content="https://www.aquads.xyz/logo712.png">
  <meta http-equiv="refresh" content="0;url=https://www.aquads.xyz/games">
</head>
<body>
  <p>Redirecting to Aquads Game Hub... <a href="https://www.aquads.xyz/games">Click here</a></p>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

export const config = {
  path: "/share/game/*",
};
