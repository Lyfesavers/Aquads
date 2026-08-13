const VIDEO_EXT = /\.(mp4|webm|m4v|mov)$/i;
const IMAGE_EXT = /\.(webp|png|jpe?g|apng)$/i;
const GIF_EXT = /\.gif$/i;

function mediaPathname(url) {
  if (!url || typeof url !== 'string') return '';
  try {
    return decodeURIComponent(new URL(url.trim()).pathname);
  } catch (_) {
    return url.trim().split('?')[0].split('#')[0];
  }
}

export function isBannerVideoUrl(url) {
  return VIDEO_EXT.test(mediaPathname(url));
}

export function isBannerImageUrl(url) {
  return IMAGE_EXT.test(mediaPathname(url));
}

export function isBannerGifUrl(url) {
  return GIF_EXT.test(mediaPathname(url));
}

export function isAllowedBannerMediaUrl(url) {
  return isBannerVideoUrl(url) || isBannerImageUrl(url);
}

export function preloadBannerMedia(url) {
  if (!url || typeof window === 'undefined') return;
  if (isBannerVideoUrl(url)) {
    const video = document.createElement('video');
    video.preload = 'auto';
    video.muted = true;
    video.playsInline = true;
    video.src = url;
    video.load();
    return;
  }
  const img = new Image();
  img.src = url;
}
