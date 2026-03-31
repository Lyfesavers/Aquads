/**
 * Link-in-bio button appearance: shape + fill combine; translucent is optional.
 * Legacy single field linkInBioButtonStyle maps here when new fields are absent.
 */

const LEGACY_STYLE_MAP = {
  rounded: { shape: 'rounded', fill: 'bordered', translucent: false },
  pill: { shape: 'pill', fill: 'bordered', translucent: false },
  minimal: { shape: 'rounded', fill: 'minimal', translucent: false },
  bordered: { shape: 'rounded', fill: 'bordered', translucent: false },
  filled: { shape: 'rounded', fill: 'filled', translucent: false }
};

function lookToLegacyStyle(shape, fill) {
  if (fill === 'filled') return 'filled';
  if (fill === 'minimal') return 'minimal';
  if (shape === 'pill') return 'pill';
  return 'rounded';
}

function resolveLinkInBioButtonLook(user) {
  const shapeOk = user.linkInBioButtonShape === 'rounded' || user.linkInBioButtonShape === 'pill';
  const fillOk = ['filled', 'minimal', 'bordered'].includes(user.linkInBioButtonFill);
  if (shapeOk && fillOk) {
    return {
      shape: user.linkInBioButtonShape,
      fill: user.linkInBioButtonFill,
      translucent: user.linkInBioButtonTranslucent === true
    };
  }
  const legacy = String(user.linkInBioButtonStyle || 'rounded').toLowerCase();
  return LEGACY_STYLE_MAP[legacy] || LEGACY_STYLE_MAP.rounded;
}

module.exports = { resolveLinkInBioButtonLook, lookToLegacyStyle, LEGACY_STYLE_MAP };
