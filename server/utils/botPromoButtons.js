/**
 * Shared promo inline buttons for Telegram + Discord bot notifications.
 */

const AQUADS_HOME_URL = 'https://www.aquads.xyz/home';

const BOT_PROMO_BUTTONS = {
  listProject: { label: '📋 List Your Project FREE!', url: AQUADS_HOME_URL },
  hireExpert: { label: '👨‍💼 Hire an Expert', url: 'https://aquads.xyz/marketplace' },
  hyperspace: { label: '🚀 X Space Trender', url: 'https://aquads.xyz/hyperspace' },
};

const LIST_PROJECT_BUTTON_ROW = [
  { text: BOT_PROMO_BUTTONS.listProject.label, url: BOT_PROMO_BUTTONS.listProject.url },
];

const HIRE_EXPERT_BUTTON_ROW = [
  { text: BOT_PROMO_BUTTONS.hireExpert.label, url: BOT_PROMO_BUTTONS.hireExpert.url },
];

const HYPERSPACE_BUTTON_ROW = [
  { text: BOT_PROMO_BUTTONS.hyperspace.label, url: BOT_PROMO_BUTTONS.hyperspace.url },
];

function getDefaultTelegramPromoKeyboard() {
  return {
    inline_keyboard: [LIST_PROJECT_BUTTON_ROW, HIRE_EXPERT_BUTTON_ROW, HYPERSPACE_BUTTON_ROW],
  };
}

/** Append List Project + HyperSpace to a custom keyboard (e.g. Complete Raid, Join Raids). */
function addPromoButtonsToTelegramKeyboard(keyboard) {
  if (!keyboard || !keyboard.inline_keyboard) {
    return getDefaultTelegramPromoKeyboard();
  }
  const rows = keyboard.inline_keyboard;
  const hasList = rows.some((row) =>
    row.some((btn) => btn.url === BOT_PROMO_BUTTONS.listProject.url)
  );
  const withoutHyper = rows.filter(
    (row) => !row.some((btn) => btn.url === BOT_PROMO_BUTTONS.hyperspace.url)
  );
  const base = hasList ? withoutHyper : [LIST_PROJECT_BUTTON_ROW, ...withoutHyper];
  const hasHire = base.some((row) =>
    row.some((btn) => btn.url === BOT_PROMO_BUTTONS.hireExpert.url)
  );
  const withHire = hasHire ? base : [...base, HIRE_EXPERT_BUTTON_ROW];
  return { inline_keyboard: [...withHire, HYPERSPACE_BUTTON_ROW] };
}

function buildDiscordPromoComponents(discordUi) {
  const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = discordUi;
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel(BOT_PROMO_BUTTONS.listProject.label)
        .setStyle(ButtonStyle.Link)
        .setURL(BOT_PROMO_BUTTONS.listProject.url)
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel(BOT_PROMO_BUTTONS.hireExpert.label)
        .setStyle(ButtonStyle.Link)
        .setURL(BOT_PROMO_BUTTONS.hireExpert.url),
      new ButtonBuilder()
        .setLabel(BOT_PROMO_BUTTONS.hyperspace.label)
        .setStyle(ButtonStyle.Link)
        .setURL(BOT_PROMO_BUTTONS.hyperspace.url)
    ),
  ];
}

module.exports = {
  AQUADS_HOME_URL,
  BOT_PROMO_BUTTONS,
  LIST_PROJECT_BUTTON_ROW,
  HIRE_EXPERT_BUTTON_ROW,
  HYPERSPACE_BUTTON_ROW,
  getDefaultTelegramPromoKeyboard,
  addPromoButtonsToTelegramKeyboard,
  buildDiscordPromoComponents,
};
