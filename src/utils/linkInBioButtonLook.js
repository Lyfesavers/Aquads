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
  const shapeRaw = typeof u.linkInBioButtonShape === 'string' ? u.linkInBioButtonShape.trim().toLowerCase() : '';
  const fillRaw = typeof u.linkInBioButtonFill === 'string' ? u.linkInBioButtonFill.trim().toLowerCase() : '';
  const shapeOk = shapeRaw === 'rounded' || shapeRaw === 'pill';
  const fillOk = ['filled', 'minimal', 'bordered'].includes(fillRaw);
  if (shapeOk && fillOk) {
    return {
      shape: shapeRaw,
      fill: fillRaw,
      translucent: u.linkInBioButtonTranslucent === true
    };
  }
  const legacyKey = String(u.linkInBioButtonStyle || 'rounded').toLowerCase().trim();
  const legacyLook = LEGACY_STYLE_MAP[legacyKey] || LEGACY_STYLE_MAP.rounded;
  return {
    shape: shapeOk ? shapeRaw : legacyLook.shape,
    fill: fillOk ? fillRaw : legacyLook.fill,
    translucent: u.linkInBioButtonTranslucent === true
  };
}
