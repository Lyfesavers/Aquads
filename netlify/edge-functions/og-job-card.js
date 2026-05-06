// Proxies the Job listing OG card image from Railway through www.aquads.xyz
// so Telegram, WhatsApp, and other strict bots get the same branded PNG as
// Twitter / Facebook (they often fail or time out on *.railway.app links).

const RAILWAY_OG = 'https://aquads-production.up.railway.app/og/job';
const FALLBACK_IMAGE = 'https://www.aquads.xyz/logo712.png';

export default async (request) => {
  const url = new URL(request.url);
  const id = url.searchParams.get('id');

  if (!id) {
    return Response.redirect(FALLBACK_IMAGE, 302);
  }

  const ogv = url.searchParams.get('ogv') || '1';
  const upstream = `${RAILWAY_OG}?id=${encodeURIComponent(id)}&ogv=${encodeURIComponent(ogv)}`;

  try {
    const upstreamRes = await fetch(upstream, {
      headers: {
        Accept: 'image/png,image/webp,image/*,*/*',
        'User-Agent': 'Aquads-OG-Proxy/1.0',
      },
    });

    if (!upstreamRes.ok) {
      return Response.redirect(FALLBACK_IMAGE, 302);
    }

    const body = await upstreamRes.arrayBuffer();
    const rawCt = upstreamRes.headers.get('content-type') || 'image/png';
    const contentType = rawCt.split(';')[0].trim();

    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        // Short CDN cache — jobs can be edited / refreshed / expired.
        'Cache-Control': 'public, max-age=600, s-maxage=600',
      },
    });
  } catch {
    return Response.redirect(FALLBACK_IMAGE, 302);
  }
};

export const config = {
  path: '/og/job-card',
};
