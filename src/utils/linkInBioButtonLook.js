/** Mirrors server/utils/linkInBioButtonLook.js for dashboard + public page. */

export const LEGACY_STYLE_MAP = {
  rounded: { shape: 'rounded', fill: 'bordered', translucent: false },
  pill: { shape: 'pill', fill: 'bordered', translucent: false },
  minimal: { shape: 'rounded', fill: 'minimal', translucent: false },
  bordered: { shape: 'rounded', fill: 'bordered', translucent: false },
  filled: { shape: 'rounded', fill: 'filled', translucent: false }
};

export function resolveLinkInBioButtonLook(userOrPayload) {
  const u = userOrPayload || {};
  const shapeOk = u.linkInBioButtonShape === 'rounded' || u.linkInBioButtonShape === 'pill';
  const fillOk = ['filled', 'minimal', 'bordered'].includes(u.linkInBioButtonFill);
  if (shapeOk && fillOk) {
    return {
      shape: u.linkInBioButtonShape,
      fill: u.linkInBioButtonFill,
      translucent: u.linkInBioButtonTranslucent === true
    };
  }
  const legacy = String(u.linkInBioButtonStyle || 'rounded').toLowerCase();
  return LEGACY_STYLE_MAP[legacy] || LEGACY_STYLE_MAP.rounded;
}
