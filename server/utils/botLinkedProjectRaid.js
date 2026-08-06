/**
 * Bot-only free-raid resolution for Telegram / Discord.
 * Website free raids stay on the caller's own account (unchanged).
 *
 * In a project-linked group/channel, TG/Discord admins draw from the
 * project owner's shared daily free-raid pool (same counter as the website).
 */

const axios = require('axios');
const { PermissionFlagsBits } = require('discord.js');
const User = require('../models/User');
const Ad = require('../models/Ad');
const { getFreeRaidDailyLimitForUsername } = require('./listingTier');

const ACTIVE_AD = { status: { $in: ['active', 'approved'] } };

async function isTelegramChatAdmin(chatId, telegramUserId) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) return false;
  try {
    const res = await axios.get(`https://api.telegram.org/bot${botToken}/getChatMember`, {
      params: { chat_id: chatId, user_id: telegramUserId },
      timeout: 10000,
    });
    if (!res.data?.ok || !res.data.result) return false;
    const status = res.data.result.status;
    return status === 'creator' || status === 'administrator';
  } catch (e) {
    console.error('getChatMember (admin check) failed:', e.message);
    return false;
  }
}

/**
 * Resolve which User's free-raid pool to debit for a bot create attempt.
 * @param {object} callerUser - Linked Aquads user creating the raid
 * @param {object} opts
 * @param {string|null} opts.telegramChatId - Group chat id when creating from TG group
 * @param {string|null} opts.discordChannelId - Channel id when creating from Discord guild
 * @param {boolean} opts.isDiscordAdmin - Caller has Discord Administrator (or is guild owner)
 * @returns {Promise<{ poolUser: object, project: object|null, fromLinkedProjectAdmin: boolean }>}
 */
async function resolveBotFreeRaidPool(callerUser, opts = {}) {
  const {
    telegramChatId = null,
    discordChannelId = null,
    isDiscordAdmin = false,
  } = opts;

  if (telegramChatId) {
    const ad = await Ad.findOne({
      telegramGroupId: String(telegramChatId),
      ...ACTIVE_AD,
    }).select('title owner telegramGroupId listingTier isBumped');
    if (ad) {
      const admin = await isTelegramChatAdmin(telegramChatId, callerUser.telegramId);
      if (admin) {
        const owner =
          ad.owner === callerUser.username
            ? callerUser
            : await User.findOne({ username: ad.owner });
        if (owner) {
          return { poolUser: owner, project: ad, fromLinkedProjectAdmin: true };
        }
      }
    }
  }

  if (discordChannelId && isDiscordAdmin) {
    const ad = await Ad.findOne({
      discordChannelId: String(discordChannelId),
      ...ACTIVE_AD,
    }).select('title owner discordChannelId discordGuildId listingTier isBumped');
    if (ad) {
      const owner =
        ad.owner === callerUser.username
          ? callerUser
          : await User.findOne({ username: ad.owner });
      if (owner) {
        return { poolUser: owner, project: ad, fromLinkedProjectAdmin: true };
      }
    }
  }

  return { poolUser: callerUser, project: null, fromLinkedProjectAdmin: false };
}

/**
 * Try to consume one free raid from the resolved pool user.
 * @returns {Promise<{ used: boolean, usage: object|null, poolUser: object, project: object|null, fromLinkedProjectAdmin: boolean, dailyLimit: number }>}
 */
async function tryConsumeBotFreeRaid(callerUser, opts = {}) {
  const resolved = await resolveBotFreeRaidPool(callerUser, opts);
  const { poolUser, project, fromLinkedProjectAdmin } = resolved;
  const dailyLimit = await getFreeRaidDailyLimitForUsername(poolUser.username);
  if (!(dailyLimit > 0)) {
    return {
      used: false,
      usage: null,
      poolUser,
      project,
      fromLinkedProjectAdmin,
      dailyLimit: 0,
    };
  }
  const eligibility = poolUser.checkFreeRaidEligibility(dailyLimit);
  if (!eligibility.eligible) {
    return {
      used: false,
      usage: null,
      poolUser,
      project,
      fromLinkedProjectAdmin,
      dailyLimit,
    };
  }
  const usage = await poolUser.useFreeRaid(dailyLimit);
  return {
    used: true,
    usage,
    poolUser,
    project,
    fromLinkedProjectAdmin,
    dailyLimit,
  };
}

function isDiscordMemberAdmin(member, guild) {
  if (!member) return false;
  const memberId = member.id || member.user?.id;
  if (guild?.ownerId && memberId && String(memberId) === String(guild.ownerId)) return true;
  try {
    return member.permissions?.has?.(PermissionFlagsBits.Administrator) === true;
  } catch (_) {
    return false;
  }
}

module.exports = {
  isTelegramChatAdmin,
  resolveBotFreeRaidPool,
  tryConsumeBotFreeRaid,
  isDiscordMemberAdmin,
};
