// Proxies the Aquads OG card image from Railway through www.aquads.xyz so Telegram,
// WhatsApp, and other strict fetchers get the same branded PNG as Twitter (they often
// fail or time out on *.railway.app direct links).

const RAILWAY_OG = 'https://aquads-production.up.railway.app/og/aquaswap';
const FALLBACK_IMAGE = 'https://www.aquads.xyz/logo712.png';

export default async (request) => {
  const url = new URL(request.url);
  const token = url.searchParams.get('token');
  const blockchain = url.searchParams.get('blockchain');

  if (!token || !blockchain) {
    return Response.redirect(FALLBACK_IMAGE, 302);
  }

  const ogv = url.searchParams.get('ogv') || '3';
  const upstream = `${RAILWAY_OG}?token=${encodeURIComponent(token)}&blockchain=${encodeURIComponent(blockchain)}&ogv=${encodeURIComponent(ogv)}`;

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
        'Cache-Control': 'public, max-age=300, s-maxage=300',
      },
    });
  } catch {
    return Response.redirect(FALLBACK_IMAGE, 302);
  }
};

export const config = {
  path: '/og/aquaswap-card',
};
