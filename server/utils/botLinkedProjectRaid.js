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
const TG_ADMIN_TIMEOUT_MS = 8000;
const TG_ADMIN_RETRIES = 3;

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isTimeoutError(e) {
  const msg = (e && e.message) || '';
  return e?.code === 'ECONNABORTED' || /timeout/i.test(msg);
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function findUserByUsername(username) {
  if (!username) return null;
  const exact = await User.findOne({ username });
  if (exact) return exact;
  return User.findOne({ username: new RegExp(`^${escapeRegex(username)}$`, 'i') });
}

/**
 * @returns {Promise<{ ok: true, isAdmin: boolean } | { ok: false, error: string }>}
 */
async function checkTelegramChatAdmin(chatId, telegramUserId) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken || telegramUserId == null || telegramUserId === '') {
    return { ok: false, error: 'missing_token_or_user' };
  }
  const uid = String(telegramUserId);
  let lastError = null;

  for (let attempt = 1; attempt <= TG_ADMIN_RETRIES; attempt++) {
    try {
      const adminsRes = await axios.get(
        `https://api.telegram.org/bot${botToken}/getChatAdministrators`,
        { params: { chat_id: chatId }, timeout: TG_ADMIN_TIMEOUT_MS }
      );
      if (adminsRes.data?.ok && Array.isArray(adminsRes.data.result)) {
        const isAdmin = adminsRes.data.result.some(
          (m) => m?.user && String(m.user.id) === uid
        );
        return { ok: true, isAdmin };
      }
      lastError = adminsRes.data?.description || 'getChatAdministrators_not_ok';
    } catch (e) {
      lastError = e.message || 'getChatAdministrators_failed';
      console.warn(
        `[botFreeRaid] getChatAdministrators attempt ${attempt}/${TG_ADMIN_RETRIES} failed:`,
        lastError
      );
      if (!isTimeoutError(e) && attempt === TG_ADMIN_RETRIES) break;
      if (attempt < TG_ADMIN_RETRIES) await sleep(400 * attempt);
      else break;
    }
  }

  // Fallback: getChatMember (also retried)
  for (let attempt = 1; attempt <= TG_ADMIN_RETRIES; attempt++) {
    try {
      const res = await axios.get(`https://api.telegram.org/bot${botToken}/getChatMember`, {
        params: { chat_id: chatId, user_id: uid },
        timeout: TG_ADMIN_TIMEOUT_MS,
      });
      if (!res.data?.ok || !res.data.result) {
        lastError = res.data?.description || 'getChatMember_not_ok';
      } else {
        const status = res.data.result.status;
        const isAdmin = status === 'creator' || status === 'administrator';
        return { ok: true, isAdmin };
      }
    } catch (e) {
      lastError = e.message || 'getChatMember_failed';
      console.error(
        `[botFreeRaid] getChatMember attempt ${attempt}/${TG_ADMIN_RETRIES} failed:`,
        lastError
      );
      if (attempt < TG_ADMIN_RETRIES) await sleep(400 * attempt);
    }
  }

  return { ok: false, error: lastError || 'telegram_admin_check_failed' };
}

/** @deprecated use checkTelegramChatAdmin — kept for simple boolean call sites */
async function isTelegramChatAdmin(chatId, telegramUserId) {
  const result = await checkTelegramChatAdmin(chatId, telegramUserId);
  return result.ok && result.isAdmin;
}

async function findAdByTelegramGroupId(telegramChatId) {
  if (telegramChatId == null || telegramChatId === '') return null;
  const idStr = String(telegramChatId);
  let ad = await Ad.findOne({
    telegramGroupId: idStr,
    ...ACTIVE_AD,
  }).select('title owner telegramGroupId listingTier isBumped status');
  if (ad) return ad;
  if (/^-?\d+$/.test(idStr)) {
    ad = await Ad.findOne({
      telegramGroupId: Number(idStr),
      ...ACTIVE_AD,
    }).select('title owner telegramGroupId listingTier isBumped status');
  }
  return ad;
}

/**
 * Resolve which User's free-raid pool to debit for a bot create attempt.
 * linkStatus:
 *   ok | not_linked | not_admin | owner_missing | admin_check_failed | dm_or_personal
 */
async function resolveBotFreeRaidPool(callerUser, opts = {}) {
  const {
    telegramChatId = null,
    telegramUserId = null,
    discordChannelId = null,
    isDiscordAdmin = false,
  } = opts;

  if (telegramChatId) {
    const ad = await findAdByTelegramGroupId(telegramChatId);
    if (!ad) {
      console.log(`[botFreeRaid] No linked project for TG chat ${telegramChatId}`);
      return {
        poolUser: callerUser,
        project: null,
        fromLinkedProjectAdmin: false,
        linkStatus: 'not_linked',
      };
    }

    const tgId = telegramUserId != null ? telegramUserId : callerUser.telegramId;
    const adminCheck = await checkTelegramChatAdmin(telegramChatId, tgId);

    // Telegram API timeout/error — do NOT treat as "not admin" (that caused false points prompts)
    if (!adminCheck.ok) {
      console.error(
        `[botFreeRaid] Admin check failed for chat ${telegramChatId} user ${tgId}: ${adminCheck.error}`
      );
      return {
        poolUser: callerUser,
        project: ad,
        fromLinkedProjectAdmin: false,
        linkStatus: 'admin_check_failed',
        adminCheckError: adminCheck.error,
      };
    }

    if (!adminCheck.isAdmin) {
      console.log(
        `[botFreeRaid] User ${tgId} is not TG admin in ${telegramChatId} (project: ${ad.title})`
      );
      return {
        poolUser: callerUser,
        project: ad,
        fromLinkedProjectAdmin: false,
        linkStatus: 'not_admin',
      };
    }

    const owner =
      ad.owner === callerUser.username
        ? callerUser
        : await findUserByUsername(ad.owner);
    if (!owner) {
      console.error(`[botFreeRaid] Owner not found for project ${ad.title} (owner="${ad.owner}")`);
      return {
        poolUser: callerUser,
        project: ad,
        fromLinkedProjectAdmin: false,
        linkStatus: 'owner_missing',
      };
    }

    console.log(
      `[botFreeRaid] TG linked admin OK — project="${ad.title}" poolOwner=@${owner.username} caller=@${callerUser.username}`
    );
    return {
      poolUser: owner,
      project: ad,
      fromLinkedProjectAdmin: true,
      linkStatus: 'ok',
    };
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
          : await findUserByUsername(ad.owner);
      if (owner) {
        console.log(
          `[botFreeRaid] Discord linked admin OK — project="${ad.title}" poolOwner=@${owner.username} caller=@${callerUser.username}`
        );
        return {
          poolUser: owner,
          project: ad,
          fromLinkedProjectAdmin: true,
          linkStatus: 'ok',
        };
      }
      return {
        poolUser: callerUser,
        project: ad,
        fromLinkedProjectAdmin: false,
        linkStatus: 'owner_missing',
      };
    }
    return {
      poolUser: callerUser,
      project: null,
      fromLinkedProjectAdmin: false,
      linkStatus: 'not_linked',
    };
  }

  return {
    poolUser: callerUser,
    project: null,
    fromLinkedProjectAdmin: false,
    linkStatus: 'dm_or_personal',
  };
}

async function tryConsumeBotFreeRaid(callerUser, opts = {}) {
  const resolved = await resolveBotFreeRaidPool(callerUser, opts);
  const { poolUser, project, fromLinkedProjectAdmin, linkStatus, adminCheckError } = resolved;

  // Don't burn personal/points flow when we couldn't verify admin due to TG API issues
  if (linkStatus === 'admin_check_failed') {
    return {
      used: false,
      usage: null,
      poolUser,
      project,
      fromLinkedProjectAdmin: false,
      linkStatus,
      adminCheckError,
      dailyLimit: 0,
    };
  }

  const dailyLimit = await getFreeRaidDailyLimitForUsername(poolUser.username);
  if (!(dailyLimit > 0)) {
    console.log(
      `[botFreeRaid] No free quota for @${poolUser.username} (limit=0, linkStatus=${linkStatus})`
    );
    return {
      used: false,
      usage: null,
      poolUser,
      project,
      fromLinkedProjectAdmin,
      linkStatus,
      dailyLimit: 0,
    };
  }
  const eligibility = poolUser.checkFreeRaidEligibility(dailyLimit);
  if (!eligibility.eligible) {
    console.log(
      `[botFreeRaid] Quota exhausted for @${poolUser.username} (used=${eligibility.raidsUsedToday}/${dailyLimit}, linkStatus=${linkStatus})`
    );
    return {
      used: false,
      usage: null,
      poolUser,
      project,
      fromLinkedProjectAdmin,
      linkStatus,
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
    linkStatus,
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
  checkTelegramChatAdmin,
  resolveBotFreeRaidPool,
  tryConsumeBotFreeRaid,
  isDiscordMemberAdmin,
  findAdByTelegramGroupId,
};
