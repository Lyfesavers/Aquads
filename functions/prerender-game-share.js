// Netlify Function — backup prerender for /share/game/:id
// Mirrors prerender-blog-share.js for game listings
const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  console.log('=== PRERENDER-GAME-SHARE CALLED ===');
  console.log('Full path:', event.path);

  // Extract game ID from path: /share/game/:id
  const path = event.path.split('?')[0];
  const match = path.match(/\/share\/game\/([a-zA-Z0-9]+)$/);

  if (!match) {
    console.log('No game ID found in path. Path was:', path);
    return {
      statusCode: 200,
      body: getDefaultHtml(),
      headers: { 'Content-Type': 'text/html' },
    };
  }

  const gameId = match[1];
  console.log('Game ID extracted:', gameId);

  try {
    const apiUrl = `https://aquads.onrender.com/api/games/${gameId}`;
    console.log('Fetching game from:', apiUrl);

    const response = await fetch(apiUrl, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      redirect: 'follow',
    });

    console.log('API response status:', response.status);

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('Non-JSON response received. First 500 chars:', text.substring(0, 500));
      throw new Error(`API returned non-JSON response: ${contentType}`);
    }

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const game = await response.json();

    if (!game || !game._id) {
      console.log('Game not found or invalid data');
      return {
        statusCode: 200,
        body: getDefaultHtml(),
        headers: { 'Content-Type': 'text/html' },
      };
    }

    console.log('Game found successfully:', game.title);

    const description = game.description
      ? game.description.replace(/<[^>]*>/g, '').slice(0, 200) + '...'
      : `Play ${game.title} on Aquads Game Hub!`;

    const redirectUrl = `/games/${gameId}`;
    const seoUrl = `https://www.aquads.xyz/games/${gameId}`;

    return {
      statusCode: 200,
      body: getGameHtml(game, description, seoUrl, redirectUrl),
      headers: { 'Content-Type': 'text/html' },
    };
  } catch (error) {
    console.error('Error fetching game:', error);
    return {
      statusCode: 200,
      body: getDefaultHtml(),
      headers: { 'Content-Type': 'text/html' },
    };
  }
};

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getGameHtml(game, description, seoUrl, redirectUrl) {
  const escapedTitle = escapeHtml(game.title);
  const escapedDescription = escapeHtml(description);
  const imageUrl = game.bannerType === 'image' && game.bannerUrl
    ? game.bannerUrl
    : 'https://www.aquads.xyz/logo712.png';
  const escapedImageUrl = escapeHtml(imageUrl);
  const escapedSeoUrl = escapeHtml(seoUrl);
  const escapedRedirectUrl = escapeHtml(redirectUrl);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="theme-color" content="#000000">
  <title>${escapedTitle} | Aquads Game Hub</title>
  <meta name="description" content="${escapedDescription}">

  <!-- Twitter Card meta tags -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:site" content="@AquadsXYZ">
  <meta name="twitter:title" content="${escapedTitle} | Aquads Game Hub">
  <meta name="twitter:description" content="${escapedDescription}">
  <meta name="twitter:image" content="${escapedImageUrl}">

  <!-- Open Graph meta tags -->
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Aquads Game Hub">
  <meta property="og:url" content="${escapedSeoUrl}">
  <meta property="og:title" content="${escapedTitle} | Aquads Game Hub">
  <meta property="og:description" content="${escapedDescription}">
  <meta property="og:image" content="${escapedImageUrl}">

  <link rel="canonical" href="${escapedSeoUrl}">

  <script>
    if (typeof window !== 'undefined' && window.location) {
      window.location.href = '${escapedRedirectUrl}';
    }
  </script>
</head>
<body>
  <h1>${escapedTitle}</h1>
  <p>${escapedDescription}</p>
  <p><a href="${escapedRedirectUrl}">Play the game</a></p>
  <script>
    setTimeout(function() {
      if (typeof window !== 'undefined' && window.location) {
        window.location.href = '${escapedRedirectUrl}';
      }
    }, 100);
  </script>
</body>
</html>`;
}

function getDefaultHtml() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="Play exciting Web3 games on Aquads Game Hub!">

  <!-- Twitter Card meta tags -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:site" content="@AquadsXYZ">
  <meta name="twitter:title" content="Aquads Game Hub - Play Web3 Games">
  <meta name="twitter:description" content="Play exciting Web3 games on Aquads Game Hub!">
  <meta name="twitter:image" content="https://www.aquads.xyz/logo712.png">

  <!-- Open Graph meta tags -->
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Aquads Game Hub">
  <meta property="og:url" content="https://www.aquads.xyz/games">
  <meta property="og:title" content="Aquads Game Hub - Play Web3 Games">
  <meta property="og:description" content="Play exciting Web3 games on Aquads Game Hub!">
  <meta property="og:image" content="https://www.aquads.xyz/logo712.png">

  <title>Aquads Game Hub</title>
  <script>window.location.href='/games';</script>
</head>
<body>
  <h1>Aquads Game Hub</h1>
  <p>Play exciting Web3 games on Aquads!</p>
  <script>
    setTimeout(function() {
      window.location.href = '/games';
    }, 100);
  </script>
</body>
</html>`;
}
