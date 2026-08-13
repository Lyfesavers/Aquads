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

function isBannerVideoUrl(url) {
  return VIDEO_EXT.test(mediaPathname(url));
}

function isBannerImageUrl(url) {
  return IMAGE_EXT.test(mediaPathname(url));
}

function isBannerGifUrl(url) {
  return GIF_EXT.test(mediaPathname(url));
}

function isAllowedBannerMediaUrl(url) {
  return isBannerVideoUrl(url) || isBannerImageUrl(url);
}

module.exports = {
  isBannerVideoUrl,
  isBannerImageUrl,
  isBannerGifUrl,
  isAllowedBannerMediaUrl
};
