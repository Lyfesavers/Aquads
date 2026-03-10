/**
 * Discord bot service - mirrors Telegram bot features.
 * Kept separate from telegramService; uses same DB models (User, TwitterRaid, FacebookRaid, Ad, etc.).
 * Requires: DISCORD_BOT_TOKEN, DISCORD_APPLICATION_ID. Optional: DISCORD_BOT_DISABLED, DISCORD_GUILD_ID.
 */

const {
  Client,
  GatewayIntentBits,
  ChannelType,
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  REST,
  Routes,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  PermissionFlagsBits
} = require('discord.js');
const axios = require('axios');
const User = require('../models/User');
const TwitterRaid = require('../models/TwitterRaid');
const FacebookRaid = require('../models/FacebookRaid');
const Ad = require('../models/Ad');
const BotSettings = require('../models/BotSettings');
const path = require('path');
const fs = require('fs');

const LIFETIME_BUMP_FREE_RAID_LIMIT = 20;
const POINTS_REQUIRED_RAID = 2000;

async function checkUserHasLifetimeBumpedAd(username) {
  try {
    const ad = await Ad.findOne({
      owner: username,
      status: { $in: ['active', 'approved'] },
      isBumped: true,
      $or: [{ bumpDuration: -1 }, { bumpExpiresAt: null }]
    });
    return ad !== null;
  } catch (e) {
    return false;
  }
}

function getChainForBlockchain(blockchain) {
  const chainMap = {
    ethereum: 'ether', bsc: 'bnb', polygon: 'polygon', solana: 'solana', avalanche: 'avalanche',
    arbitrum: 'arbitrum', optimism: 'optimism', base: 'base', sui: 'sui', near: 'near', fantom: 'fantom',
    tron: 'tron', cronos: 'cronos', celo: 'celo', harmony: 'harmony', polkadot: 'polkadot', cosmos: 'cosmos',
    aptos: 'aptos', flow: 'flow', cardano: 'cardano', kaspa: 'kaspa',
    'binance smart chain': 'bnb', 'bnb chain': 'bnb', binance: 'bnb', eth: 'ether', matic: 'polygon',
    avax: 'avalanche', ftm: 'fantom', arb: 'arbitrum', op: 'optimism'
  };
  return chainMap[(blockchain || '').toLowerCase().trim()] || 'ether';
}

const conversationStates = new Map();

function setState(userId, state) {
  conversationStates.set(userId, state);
}
function getState(userId) {
  return conversationStates.get(userId);
}
function clearState(userId) {
  conversationStates.delete(userId);
}

let discordClient = null;

function reply(interaction, content, ephemeral = true) {
  const opts = { ephemeral: !!ephemeral };
  if (typeof content === 'string') {
    return interaction.reply({ content, ...opts }).catch(e => console.error('Discord reply error:', e.message));
  }
  return interaction.reply({ ...content, ...opts }).catch(e => console.error('Discord reply error:', e.message));
}

function replyEmbed(interaction, title, description, ephemeral = true) {
  const embed = new EmbedBuilder().setTitle(title).setDescription(description).setColor(0x00bfff);
  return interaction.reply({ embeds: [embed], ephemeral }).catch(e => console.error('Discord reply error:', e.message));
}

function getSlashCommands() {
  return [
    new SlashCommandBuilder().setName('start').setDescription('Start the Aquads bot'),
    new SlashCommandBuilder().setName('link').setDescription('Link your Aquads account')
      .addStringOption(o => o.setName('username').setDescription('Your Aquads username').setRequired(true)),
    new SlashCommandBuilder().setName('help').setDescription('Show help menu'),
    new SlashCommandBuilder().setName('twitter').setDescription('Set or view Twitter username')
      .addStringOption(o => o.setName('username').setDescription('Your Twitter username (optional to just view)')),
    new SlashCommandBuilder().setName('facebook').setDescription('Set or view Facebook username')
      .addStringOption(o => o.setName('username').setDescription('Your Facebook username (optional to just view)')),
    new SlashCommandBuilder().setName('raids').setDescription('List available Twitter & Facebook raids'),
    new SlashCommandBuilder().setName('complete').setDescription('Submit raid completion')
      .addStringOption(o => o.setName('raid_id').setDescription('Raid ID (from /raids)').setRequired(true))
      .addStringOption(o => o.setName('username').setDescription('Your Twitter or Facebook username').setRequired(true))
      .addStringOption(o => o.setName('post_url').setDescription('Tweet or post URL').setRequired(true)),
    new SlashCommandBuilder().setName('bubbles').setDescription('Top 10 bumped bubbles'),
    new SlashCommandBuilder().setName('mybubble').setDescription('Your project bubbles with vote buttons'),
    new SlashCommandBuilder().setName('createraid').setDescription('Create a Twitter raid')
      .addStringOption(o => o.setName('tweet_url').setDescription('Tweet URL').setRequired(true)),
    new SlashCommandBuilder().setName('cancelraid').setDescription('Cancel a raid you created')
      .addStringOption(o => o.setName('url').setDescription('Tweet or Facebook post URL').setRequired(true)),
    new SlashCommandBuilder().setName('raidin').setDescription('Enable community raids in this server'),
    new SlashCommandBuilder().setName('raidout').setDescription('Disable community raids in this server'),
    new SlashCommandBuilder().setName('setbranding').setDescription('Set custom branding (upload image after)'),
    new SlashCommandBuilder().setName('removebranding').setDescription('Remove custom branding'),
    new SlashCommandBuilder().setName('boostvote').setDescription('Boost your bubble with votes + members'),
    new SlashCommandBuilder().setName('cancel').setDescription('Cancel current operation')
  ].map(c => c.toJSON());
}

async function handleStart(interaction) {
  const discordUserId = interaction.user.id;
  const existingUser = await User.findOne({ discordId: discordUserId });
  if (existingUser) {
    return handleHelp(interaction);
  }
  const embed = new EmbedBuilder()
    .setTitle('Welcome to Aquads Bot')
    .setDescription(
      'Link your Aquads account to use raids, bubbles, and earn points.\n\n' +
      '**Step 1:** Use `/link your_aquads_username`\n' +
      '**Step 2:** Set Twitter: `/twitter your_twitter`\n' +
      '**Step 3:** Use `/raids` to see available raids and earn points!\n\n' +
      'Create an account at https://aquads.xyz if you don\'t have one.'
    )
    .setColor(0x00bfff)
    .setURL('https://aquads.xyz');
  return interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleLink(interaction) {
  const discordUserId = interaction.user.id;
  const aquadsUsername = interaction.options.getString('username', true).trim();
  const existingLinked = await User.findOne({ discordId: discordUserId });
  if (existingLinked) {
    return reply(interaction, `❌ Your Discord is already linked to: **${existingLinked.username}**. Contact support to change.`, true);
  }
  const user = await User.findOne({ username: aquadsUsername });
  if (!user) {
    return reply(interaction, `❌ User **${aquadsUsername}** not found. Check your username.`, true);
  }
  if (user.discordId) {
    return reply(interaction, `❌ Account **${aquadsUsername}** is already linked to another Discord. Contact support.`, true);
  }
  user.discordId = discordUserId;
  await user.save();
  return reply(
    interaction,
    `✅ **Account linked!**\n\nYour Discord is now linked to **${aquadsUsername}**.\n\n` +
    '• `/twitter your_username` – Set Twitter for raids\n' +
    '• `/raids` – View and complete raids\n' +
    '• Earn points and claim rewards at https://aquads.xyz',
    true
  );
}

async function handleHelp(interaction) {
  const discordUserId = interaction.user.id;
  const user = await User.findOne({ discordId: discordUserId });
  let profileSection = '';
  if (user) {
    const tw = user.twitterUsername ? `✅ @${user.twitterUsername}` : '❌ Not set';
    const fb = user.facebookUsername ? `✅ @${user.facebookUsername}` : '❌ Not set';
    const bumped = await Ad.findOne({ owner: user.username, isBumped: true, status: { $in: ['active', 'approved'] } }).select('customBrandingImage');
    const branding = bumped?.customBrandingImage ? '✅ Set' : '❌ Not set';
    profileSection = `**${user.username}** | 💰 ${user.points || 0} pts\n🐦 Twitter: ${tw}\n📘 Facebook: ${fb}\n🎨 Branding: ${branding}\n\n`;
  }
  const embed = new EmbedBuilder()
    .setTitle('🤖 Aquads Bot')
    .setDescription(profileSection + 'Choose a category:')
    .setColor(0x00bfff);
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('help_account').setLabel('Account Setup').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('help_raids').setLabel('Raids').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('help_bubbles').setLabel('Bubbles').setStyle(ButtonStyle.Primary)
  );
  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('help_branding').setLabel('Branding').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('help_quickstart').setLabel('Quick Start').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('help_all').setLabel('All Commands').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setLabel('Visit Website').setStyle(ButtonStyle.Link).setURL('https://aquads.xyz')
  );
  return interaction.reply({ embeds: [embed], components: [row1, row2], ephemeral: true });
}

async function handleTwitter(interaction) {
  const discordUserId = interaction.user.id;
  const user = await User.findOne({ discordId: discordUserId });
  if (!user) {
    return reply(interaction, '❌ Link your account first: `/link your_username`\n\nhttps://aquads.xyz', true);
  }
  const newUsername = interaction.options.getString('username');
  if (!newUsername) {
    const tw = user.twitterUsername ? `@${user.twitterUsername}` : 'Not set';
    return reply(interaction, `📱 Twitter username: **${tw}**\n\nTo change: \`/twitter your_username\``, true);
  }
  const clean = newUsername.replace('@', '').trim();
  if (!/^[a-zA-Z0-9_]{1,15}$/.test(clean)) {
    return reply(interaction, '❌ Invalid Twitter username. Use letters, numbers, underscores only (max 15).', true);
  }
  user.twitterUsername = clean;
  await user.save();
  return reply(interaction, `✅ Twitter username set: **@${clean}**\n\nUsed for all future raids.`, true);
}

async function handleFacebook(interaction) {
  const discordUserId = interaction.user.id;
  const user = await User.findOne({ discordId: discordUserId });
  if (!user) {
    return reply(interaction, '❌ Link your account first: `/link your_username`\n\nhttps://aquads.xyz', true);
  }
  const newUsername = interaction.options.getString('username');
  if (!newUsername) {
    const fb = user.facebookUsername ? `@${user.facebookUsername}` : 'Not set';
    return reply(interaction, `📱 Facebook username: **${fb}**\n\nTo change: \`/facebook your_username\``, true);
  }
  const clean = newUsername.replace('@', '').trim();
  if (clean.length < 1 || clean.length > 50) {
    return reply(interaction, '❌ Invalid Facebook username.', true);
  }
  user.facebookUsername = clean;
  await user.save();
  return reply(interaction, `✅ Facebook username set: **@${clean}**`, true);
}

async function handleRaids(interaction) {
  const discordUserId = interaction.user.id;
  const user = await User.findOne({ discordId: discordUserId });
  if (!user) {
    return reply(interaction, '❌ Link your account first: `/link your_username`\n\nhttps://aquads.xyz', true);
  }
  const twitterRaids = await TwitterRaid.find({ active: true }).sort({ createdAt: -1 }).limit(10).lean();
  const facebookRaids = await FacebookRaid.find({ active: true }).sort({ createdAt: -1 }).limit(10).lean();
  const allRaids = [
    ...twitterRaids.map(r => ({ ...r, platform: 'Twitter' })),
    ...facebookRaids.map(r => ({ ...r, platform: 'Facebook' }))
  ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
  const activeRaids = allRaids.filter(r => new Date(r.createdAt) > twoDaysAgo);
  const availableRaids = activeRaids.filter(raid => {
    const completed = raid.completions?.some(c => c.userId && c.userId.toString() === user._id.toString());
    return !completed;
  });
  if (availableRaids.length === 0) {
    return reply(interaction, '📭 No active raids available for you right now. Check back later!\n\nhttps://aquads.xyz', true);
  }
  const lines = [];
  const components = [];
  for (let i = 0; i < Math.min(availableRaids.length, 5); i++) {
    const raid = availableRaids[i];
    const platform = raid.platform || (raid.tweetUrl ? 'Twitter' : 'Facebook');
    const postUrl = raid.tweetUrl || raid.postUrl || '';
    lines.push(`**${i + 1}. ${raid.title}**\n📱 ${platform} | 💰 ${raid.points} pts\n🔗 ${postUrl}`);
    components.push(
      new ButtonBuilder()
        .setCustomId(`complete_${raid._id}`)
        .setLabel(`Complete #${i + 1}`)
        .setStyle(ButtonStyle.Success)
    );
  }
  const row = new ActionRowBuilder().addComponents(components.slice(0, 5));
  const embed = new EmbedBuilder()
    .setTitle('🚀 Available Raids')
    .setDescription(lines.join('\n\n') + `\n\n📊 ${availableRaids.length} raids available. Click a button to complete (you\'ll be asked for username & post URL).`)
    .setColor(0x00bfff)
    .setURL('https://aquads.xyz');
  return interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
}

async function handleCompleteFromModal(interaction, raidId, username, postUrl, isModalSubmit = false) {
  if (isModalSubmit) await interaction.deferReply({ ephemeral: true }).catch(() => {});
  const respond = (content) => isModalSubmit ? interaction.editReply({ content }).catch(() => {}) : reply(interaction, content, true);
  const discordUserId = interaction.user.id;
  const user = await User.findOne({ discordId: discordUserId });
  if (!user) {
    return respond('❌ Link your account first: `/link your_username`');
  }
  let raid = await TwitterRaid.findById(raidId);
  let platform = 'Twitter';
  let usernameField = 'twitterUsername';
  let postUrlField = 'tweetUrl';
  let postIdField = 'tweetId';
  if (!raid) {
    raid = await FacebookRaid.findById(raidId);
    if (raid) {
      platform = 'Facebook';
      usernameField = 'facebookUsername';
      postUrlField = 'postUrl';
      postIdField = 'postId';
    }
  }
  if (!raid || !raid.active) {
    return respond('❌ Raid not found or no longer active.');
  }
  const alreadyDone = raid.completions?.some(c => c.userId && c.userId.toString() === user._id.toString());
  if (alreadyDone) {
    return respond('❌ You have already completed this raid.');
  }
  const cleanUsername = (username || '').trim().replace('@', '');
  if (!/^[a-zA-Z0-9_]{1,15}$/.test(cleanUsername)) {
    return respond(`❌ Invalid ${platform} username.`);
  }
  let postId = null;
  const urlToCheck = postUrl || raid[platform === 'Twitter' ? 'tweetUrl' : 'postUrl'];
  if (platform === 'Twitter') {
    const m = urlToCheck.match(/\/status\/(\d+)/);
    if (!m) return respond('❌ Invalid tweet URL.');
    postId = m[1];
  } else {
    const m = urlToCheck.match(/\/posts\/(\d+)/) || urlToCheck.match(/\/permalink\/(\d+)/) ||
      urlToCheck.match(/\/share\/p\/([a-zA-Z0-9]+)/) || urlToCheck.match(/\/share\/v\/([a-zA-Z0-9]+)/) ||
      urlToCheck.match(/story\.php\?story_fbid=(\d+)/) || urlToCheck.match(/photo\.php\?fbid=(\d+)/);
    if (!m) return respond('❌ Invalid Facebook URL.');
    postId = m[1];
  }
  const completion = {
    userId: user._id,
    [usernameField]: cleanUsername,
    [postUrlField]: postUrl || raid[postUrlField],
    [postIdField]: postId,
    verificationCode: 'aquads.xyz',
    verificationMethod: 'manual',
    verified: true,
    approvalStatus: 'pending',
    approvedBy: null,
    approvedAt: null,
    rejectionReason: null,
    pointsAwarded: false,
    ipAddress: 'discord_bot',
    verificationNote: 'Submitted via Discord bot',
    iframeVerified: false,
    iframeInteractions: 0,
    completedAt: new Date()
  };
  raid.completions.push(completion);
  await raid.save();
  await User.findByIdAndUpdate(user._id, { lastActivity: new Date() });
  const telegramService = require('./telegramService');
  telegramService.sendRaidCompletionNotification({
    userId: user._id.toString(),
    raidId: raid._id.toString(),
    raidTitle: raid.title,
    platform,
    points: raid.points || 20
  }).catch(() => {});
  return respond(`✅ **${platform} Raid submitted!**\n\n📝 @${cleanUsername}\n💰 ${raid.points} points\n⏳ Pending admin approval.\n\nTrack at https://aquads.xyz`);
}

async function handleCompleteSlash(interaction) {
  const raidId = interaction.options.getString('raid_id', true).replace(/[\[\]]/g, '');
  const username = interaction.options.getString('username', true);
  const postUrl = interaction.options.getString('post_url', true);
  if (!/^[0-9a-fA-F]{24}$/.test(raidId)) {
    return reply(interaction, '❌ Invalid raid ID. Use `/raids` to get the correct ID.', true);
  }
  return handleCompleteFromModal(interaction, raidId, username, postUrl);
}

async function handleBubbles(interaction) {
  const discordUserId = interaction.user.id;
  const user = await User.findOne({ discordId: discordUserId });
  let userBranding = null;
  if (user) {
    const ad = await Ad.findOne({
      owner: user.username,
      isBumped: true,
      status: { $in: ['active', 'approved'] },
      customBrandingImage: { $ne: null }
    }).select('customBrandingImage');
    if (ad?.customBrandingImage) userBranding = ad.customBrandingImage;
  }
  const bumpedBubbles = await Ad.find({ isBumped: true, status: { $in: ['active', 'approved'] } })
    .select('title logo url bullishVotes bearishVotes owner pairAddress contractAddress blockchain')
    .sort({ bullishVotes: -1 })
    .limit(10)
    .lean();
  if (bumpedBubbles.length === 0) {
    return reply(interaction, '📭 No bumped bubbles right now.\n\nhttps://aquads.xyz', true);
  }
  const lines = bumpedBubbles.map((b, i) => {
    const r = i + 1;
    const emoji = r === 1 ? '🥇' : r === 2 ? '🥈' : r === 3 ? '🥉' : '🔸';
    const addr = b.pairAddress || b.contractAddress;
    const chain = getChainForBlockchain(b.blockchain);
    const chartUrl = addr ? `https://aquads.xyz/aquaswap?token=${encodeURIComponent(addr.trim())}&blockchain=${encodeURIComponent(b.blockchain || 'ethereum')}` : null;
    const titlePart = chartUrl ? `[${b.title}](${chartUrl})` : b.title;
    return `${emoji} #${r}: 🚀 ${titlePart}\n📈 Bullish: ${b.bullishVotes} | 📉 Bearish: ${b.bearishVotes}`;
  });
  const embed = new EmbedBuilder()
    .setTitle('🔥 Top 10 Bubbles')
    .setDescription(lines.join('\n\n') + '\n\n🌐 https://aquads.xyz')
    .setColor(0x00bfff)
    .setURL('https://aquads.xyz');
  return interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleMyBubble(interaction) {
  const discordUserId = interaction.user.id;
  const user = await User.findOne({ discordId: discordUserId });
  if (!user) {
    return reply(interaction, '❌ Link your account first: `/link your_username`\n\nhttps://aquads.xyz', true);
  }
  const userProjects = await Ad.find({ owner: user.username, status: { $in: ['active', 'approved'] } })
    .sort({ createdAt: -1 })
    .limit(5)
    .lean();
  if (userProjects.length === 0) {
    return reply(interaction, `📭 No projects found for **${user.username}**.\n\nhttps://aquads.xyz`, true);
  }
  const allBubbles = await Ad.find({ isBumped: true, status: { $in: ['active', 'approved'] } })
    .sort({ bullishVotes: -1 })
    .select('_id bullishVotes')
    .lean();
  const embeds = [];
  const components = [];
  for (const project of userProjects) {
    const rank = allBubbles.findIndex(b => b._id.toString() === project._id.toString()) + 1;
    const rankEmoji = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '🔸';
    const tokenAddress = project.pairAddress || project.contractAddress;
    const viewUrl = tokenAddress && project.blockchain
      ? `https://www.aquads.xyz/aquaswap?blockchain=${encodeURIComponent(project.blockchain)}&token=${encodeURIComponent(tokenAddress.trim())}`
      : 'https://www.aquads.xyz/aquaswap';
    const embed = new EmbedBuilder()
      .setTitle(`🚀 ${project.title}`)
      .setDescription(
        `🏆 Rank: ${rankEmoji} #${rank}\n` +
        `📊 👍 ${project.bullishVotes || 0} | 👎 ${project.bearishVotes || 0}\n` +
        `🔗 ${project.url || 'N/A'}\n` +
        `⛓️ ${project.blockchain || 'Ethereum'}`
      )
      .setColor(0x00bfff)
      .setURL(viewUrl);
    embeds.push(embed);
    const projectId = project._id.toString();
    components.push(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`vote_bullish_${projectId}`).setLabel('👍 Bullish').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`vote_bearish_${projectId}`).setLabel('👎 Bearish').setStyle(ButtonStyle.Danger)
      )
    );
  }
  components.push(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setLabel('View on Aquads').setStyle(ButtonStyle.Link).setURL('https://aquads.xyz/aquaswap')
    )
  );
  return interaction.reply({ embeds, components, ephemeral: true });
}

/** Shared raid creation from tweet URL. Returns { success, message }. Used by /createraid and by admin pasting tweet URL. */
async function doCreateRaid(user, tweetUrl, opts = {}) {
  const { guildId = null, channelId = null } = opts;
  const tweetIdMatch = tweetUrl.match(/\/status\/(\d+)/);
  if (!tweetIdMatch?.[1]) {
    return { success: false, message: '❌ Invalid Twitter URL. Use a valid tweet URL.' };
  }
  const tweetId = tweetIdMatch[1];
  const title = `Twitter Raid by @${user.username}`;
  const description = 'Help boost this tweet! Like, retweet, and comment to earn 20 points.';
  const hasLifetimeBumped = await checkUserHasLifetimeBumpedAd(user.username);
  const dailyLimit = hasLifetimeBumped ? LIFETIME_BUMP_FREE_RAID_LIMIT : 0;
  const eligibility = dailyLimit > 0 ? user.checkFreeRaidEligibility(dailyLimit) : { eligible: false };
  if (eligibility.eligible) {
    const usage = await user.useFreeRaid(dailyLimit);
    const raid = new TwitterRaid({
      tweetId,
      tweetUrl,
      title,
      description,
      points: 20,
      createdBy: user._id,
      isPaid: false,
      paymentStatus: 'approved',
      active: true,
      paidWithPoints: false,
      pointsSpent: 0
    });
    await raid.save();
    const telegramService = require('./telegramService');
    await telegramService.sendRaidNotification({
      raidId: raid._id.toString(),
      tweetUrl: raid.tweetUrl,
      points: raid.points,
      title: raid.title,
      description: raid.description,
      sourceChatId: null,
      isAdmin: false,
      discordSourceGuildId: guildId || null,
      discordSourceChannelId: channelId || null
    }).catch(() => {});
    return { success: true, message: `✅ **Free raid created!**\n\n🔗 ${tweetUrl}\n🆓 ${usage.raidsRemaining} free raids remaining today.\n\nhttps://aquads.xyz` };
  }
  if (user.points < POINTS_REQUIRED_RAID) {
    let msg = `❌ Not enough points. You have ${user.points}; need ${POINTS_REQUIRED_RAID}.`;
    if (!hasLifetimeBumped) msg += '\n\nGet a Lifetime Bump at https://aquads.xyz for 20 free raids/day.';
    return { success: false, message: msg + '\n\nEarn points: `/raids`' };
  }
  const raid = new TwitterRaid({
    tweetId,
    tweetUrl,
    title,
    description,
    points: 20,
    createdBy: user._id,
    isPaid: false,
    paymentStatus: 'approved',
    active: true,
    paidWithPoints: true,
    pointsSpent: POINTS_REQUIRED_RAID
  });
  user.points -= POINTS_REQUIRED_RAID;
  user.pointsHistory = user.pointsHistory || [];
  user.pointsHistory.push({
    amount: -POINTS_REQUIRED_RAID,
    reason: 'Created Twitter raid via Discord',
    socialRaidId: raid._id.toString(),
    createdAt: new Date()
  });
  await Promise.all([raid.save(), user.save()]);
  const telegramService = require('./telegramService');
  await telegramService.sendRaidNotification({
    raidId: raid._id.toString(),
    tweetUrl: raid.tweetUrl,
    points: raid.points,
    title: raid.title,
    description: raid.description,
    sourceChatId: null,
    isAdmin: false,
    discordSourceGuildId: guildId || null,
    discordSourceChannelId: channelId || null
  }).catch(() => {});
  return { success: true, message: `✅ **Raid created!**\n\n🔗 ${tweetUrl}\n💰 ${POINTS_REQUIRED_RAID} points deducted. Remaining: ${user.points}\n\nhttps://aquads.xyz` };
}

async function handleCreateRaid(interaction) {
  const discordUserId = interaction.user.id;
  const user = await User.findOne({ discordId: discordUserId });
  if (!user) {
    return reply(interaction, '❌ Link your account first: `/link your_username`\n\nhttps://aquads.xyz', true);
  }
  const tweetUrl = interaction.options.getString('tweet_url', true).trim();
  const result = await doCreateRaid(user, tweetUrl, { guildId: interaction.guildId || null, channelId: interaction.channelId || null });
  return reply(interaction, result.message, true);
}

async function handleCancelRaid(interaction) {
  const discordUserId = interaction.user.id;
  const user = await User.findOne({ discordId: discordUserId });
  if (!user) {
    return reply(interaction, '❌ Link your account first: `/link your_username`', true);
  }
  const raidUrl = interaction.options.getString('url', true).trim();
  const isTwitter = /(?:twitter\.com|x\.com)\/[^/]+\/status\/\d+/i.test(raidUrl);
  const isFacebook = /facebook\.com|fb\.com/i.test(raidUrl);
  if (!isTwitter && !isFacebook) {
    return reply(interaction, '❌ Invalid URL. Provide a valid Twitter or Facebook post URL.', true);
  }
  let raid;
  let platform;
  if (isTwitter) {
    raid = await TwitterRaid.findOne({
      tweetUrl: { $regex: raidUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' },
      active: true
    });
    platform = 'twitter';
  } else {
    raid = await FacebookRaid.findOne({
      postUrl: { $regex: raidUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' },
      active: true
    });
    platform = 'facebook';
  }
  if (!raid) {
    return reply(interaction, '❌ Raid not found or already cancelled.', true);
  }
  if (raid.createdBy.toString() !== user._id.toString()) {
    return reply(interaction, '❌ You can only cancel raids you created.', true);
  }
  try {
    const telegramService = require('./telegramService');
    await telegramService.deleteRaidMessagesByRaidId(raid._id.toString());
  } catch (_) {}
  if (platform === 'twitter') {
    raid.active = false;
    await raid.save();
  } else {
    await FacebookRaid.findByIdAndDelete(raid._id);
  }
  const { emitRaidUpdate } = require('../socket');
  if (emitRaidUpdate) emitRaidUpdate('cancelled', { _id: raid._id.toString() }, platform);
  return reply(interaction, `✅ **Raid cancelled.**\n\n🔗 ${raidUrl}\n📱 ${platform}`, true);
}

async function handleRaidIn(interaction) {
  if (!interaction.guildId) {
    return reply(interaction, '❌ Use `/raidin` in a server channel to enable community raids.', true);
  }
  const discordUserId = interaction.user.id;
  const user = await User.findOne({ discordId: discordUserId });
  if (!user) {
    return reply(interaction, '❌ Link your account first: `/link your_username`', true);
  }
  const guildId = interaction.guildId;
  const guildSettings = await BotSettings.findOne({ key: 'discordRaidInGuilds' });
  const guilds = guildSettings?.value ? new Set(guildSettings.value) : new Set();
  guilds.add(guildId);
  await BotSettings.findOneAndUpdate(
    { key: 'discordRaidInGuilds' },
    { value: Array.from(guilds), updatedAt: new Date() },
    { upsert: true }
  );
  return reply(
    interaction,
    `✅ **Community raids enabled** for this server!\n\n• Your raids will be sent to **all other opted-in servers**.\n• You'll **receive raids** from all other opted-in servers.\n• Raid notifications go to the channel set when the bot was added.\n\nUse \`/raidout\` to disable community cross-posting (you'll still get your own raids and completion pings here).\n\nhttps://aquads.xyz`,
    true
  );
}

async function handleRaidOut(interaction) {
  if (!interaction.guildId) {
    return reply(interaction, '❌ Use `/raidout` in a server channel.', true);
  }
  const discordUserId = interaction.user.id;
  const user = await User.findOne({ discordId: discordUserId });
  if (!user) {
    return reply(interaction, '❌ Link your account first: `/link your_username`', true);
  }
  const guildId = interaction.guildId;
  const guildSettings = await BotSettings.findOne({ key: 'discordRaidInGuilds' });
  let guilds = guildSettings?.value ? new Set(guildSettings.value) : new Set();
  guilds.delete(guildId);
  await BotSettings.findOneAndUpdate(
    { key: 'discordRaidInGuilds' },
    { value: Array.from(guilds), updatedAt: new Date() },
    { upsert: true }
  );
  return reply(
    interaction,
    `✅ **Community raids disabled** for this server.\n\n• Your server will **no longer receive** raids from other opted-in servers.\n• Raids you create will **only be sent to this server**, not to other communities.\n• You still receive **completion notifications** and **your own raids** here.\n\nUse \`/raidin\` to re-enable community cross-posting.\n\nhttps://aquads.xyz`,
    true
  );
}

async function handleSetBranding(interaction) {
  const discordUserId = interaction.user.id;
  const user = await User.findOne({ discordId: discordUserId });
  if (!user) {
    return reply(interaction, '❌ Link your account first: `/link your_username`', true);
  }
  const bumped = await Ad.findOne({
    owner: user.username,
    isBumped: true,
    status: { $in: ['active', 'approved'] }
  });
  if (!bumped) {
    return reply(interaction, '❌ Custom branding is only for bumped projects. Bump at https://aquads.xyz', true);
  }
  setState(discordUserId, { action: 'waiting_branding_image', projectId: bumped._id.toString() });
  return reply(
    interaction,
    '🎨 **Upload your custom branding image**\n\n📋 Max size: 500KB · JPG or PNG · Recommended: 1920×1080 or 1080×1080\n\nThis will appear in vote notifications, `/mybubble`, and `/bubbles`.\n\n**Attach your image in your next message** in this channel (or in DMs with the bot).\n\nUse `/cancel` to abort.',
    true
  );
}

async function handleRemoveBranding(interaction) {
  const discordUserId = interaction.user.id;
  const user = await User.findOne({ discordId: discordUserId });
  if (!user) {
    return reply(interaction, '❌ Link your account first: `/link your_username`', true);
  }
  const project = await Ad.findOne({
    owner: user.username,
    isBumped: true,
    status: { $in: ['active', 'approved'] },
    customBrandingImage: { $ne: null }
  });
  if (!project) {
    return reply(interaction, "❌ You don't have any custom branding set.", true);
  }
  project.customBrandingImage = null;
  project.customBrandingImageSize = 0;
  project.customBrandingUploadedAt = null;
  await project.save();
  return reply(interaction, '✅ Custom branding removed. Default branding will be used.', true);
}

const BOOST_PACKAGES = {
  starter: { name: 'Starter', votes: 100, price: 20 },
  basic: { name: 'Basic', votes: 250, price: 40 },
  growth: { name: 'Growth', votes: 500, price: 80 },
  pro: { name: 'Pro', votes: 1000, price: 150 }
};

async function handleBoostPackageSelect(interaction, packageId) {
  const pkg = BOOST_PACKAGES[packageId];
  if (!pkg) {
    return interaction.reply({ content: '❌ Invalid package.', ephemeral: true }).catch(() => {});
  }
  const discordUserId = interaction.user.id;
  const user = await User.findOne({ discordId: discordUserId });
  if (!user) {
    return interaction.reply({ content: '❌ Link your account first: `/link your_username`', ephemeral: true }).catch(() => {});
  }
  const userBubbles = await Ad.find({ owner: user.username, status: { $in: ['active', 'approved'] } }).select('id title _id').limit(10).lean();
  if (userBubbles.length === 0) {
    return interaction.reply({ content: "❌ You don't have any bubbles to boost.", ephemeral: true }).catch(() => {});
  }
  if (userBubbles.length === 1) {
    return handleBoostBubbleSelected(interaction, packageId, userBubbles[0].id);
  }
  const embed = new EmbedBuilder()
    .setTitle(`📦 ${pkg.name} Package`)
    .setDescription(`${pkg.votes.toLocaleString()} votes + members · **$${pkg.price} USDC**\n\nWhich bubble do you want to boost?`)
    .setColor(0x00bfff);
  const rows = [];
  for (const bubble of userBubbles) {
    rows.push(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`boost_bubble_${packageId}_${bubble.id}`).setLabel(bubble.title?.slice(0, 80) || bubble.id).setStyle(ButtonStyle.Primary)
      )
    );
  }
  rows.push(new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('boost_cancel').setLabel('Cancel').setStyle(ButtonStyle.Secondary)));
  return interaction.update({ embeds: [embed], components: rows }).catch(() => interaction.reply({ embeds: [embed], components: rows, ephemeral: true }));
}

async function handleBoostBubbleSelected(interaction, packageId, bubbleId) {
  const pkg = BOOST_PACKAGES[packageId];
  if (!pkg) return;
  const discordUserId = interaction.user.id;
  const user = await User.findOne({ discordId: discordUserId });
  if (!user) return;
  const bubble = await Ad.findOne({ id: bubbleId }).select('title').lean();
  setState(discordUserId, {
    action: 'boost_waiting_invite',
    packageId,
    bubbleId,
    packageName: pkg.name,
    price: pkg.price,
    votes: pkg.votes
  });
  const embed = new EmbedBuilder()
    .setTitle(`✅ Boosting: ${bubble?.title || 'Bubble'}`)
    .setDescription(
      `📦 **${pkg.name}** · ${pkg.votes.toLocaleString()} votes · **$${pkg.price} USDC**\n\n` +
      `Send your **Telegram group link** (t.me/...) or **Discord server invite** (discord.gg/...).\n\n` +
      `Click **Enter community link** below to paste it.`
    )
    .setColor(0x00bfff);
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('boost_enter_invite').setLabel('Enter community link').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('boost_cancel').setLabel('Cancel').setStyle(ButtonStyle.Secondary)
  );
  const opts = { embeds: [embed], components: [row], ephemeral: true };
  if (interaction.update) {
    return interaction.update(opts).catch(() => interaction.reply(opts));
  }
  return interaction.reply(opts);
}

async function handleBoostVote(interaction) {
  const discordUserId = interaction.user.id;
  const user = await User.findOne({ discordId: discordUserId });
  if (!user) {
    return reply(interaction, '❌ Link your account first: `/link your_username`', true);
  }
  const bubbles = await Ad.find({ owner: user.username, status: { $in: ['active', 'approved'] } }).select('id title').limit(1).lean();
  if (bubbles.length === 0) {
    return reply(interaction, "❌ You don't have any bubbles to boost.\n\nList your project at https://aquads.xyz", true);
  }
  const embed = new EmbedBuilder()
    .setTitle('🗳️ Boost Your Bubble')
    .setDescription(
      'Skyrocket your ranking with guaranteed bullish votes + new members!\n\n' +
      '✅ Bullish votes added to your bubble\n' +
      '✅ New members for your Telegram group or Discord server\n\n' +
      '**Select a package below:**'
    )
    .setColor(0x00bfff)
    .setURL('https://aquads.xyz');
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('boost_pkg_starter').setLabel('🌟 100 Votes - $20').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('boost_pkg_basic').setLabel('📦 250 Votes - $40').setStyle(ButtonStyle.Primary)
  );
  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('boost_pkg_growth').setLabel('🚀 500 Votes - $80').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('boost_pkg_pro').setLabel('💎 1000 Votes - $150').setStyle(ButtonStyle.Primary)
  );
  return interaction.reply({ embeds: [embed], components: [row1, row2], ephemeral: true });
}

async function handleCancel(interaction) {
  const discordUserId = interaction.user.id;
  clearState(discordUserId);
  return reply(interaction, '❌ Operation cancelled.', true);
}

async function registerCommands(clientId, token, guildId) {
  const rest = new REST({ version: '10' }).setToken(token);
  const commands = getSlashCommands();
  if (guildId) {
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
    console.log(`✅ Discord slash commands registered in guild ${guildId}`);
  } else {
    await rest.put(Routes.applicationCommands(clientId), { body: commands });
    console.log('✅ Discord slash commands registered globally');
  }
}

async function startBot() {
  const token = process.env.DISCORD_BOT_TOKEN;
  const disabled = process.env.DISCORD_BOT_DISABLED === 'true';
  const appId = process.env.DISCORD_APPLICATION_ID;
  const guildId = process.env.DISCORD_GUILD_ID || null;
  if (!token || disabled) {
    console.log('⚠️ Discord bot disabled or no token set');
    return false;
  }
  if (!appId) {
    console.log('⚠️ Discord bot: DISCORD_APPLICATION_ID not set; slash commands may not register');
  }
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.DirectMessages,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent
    ]
  });
  discordClient = client;
  client.once('ready', async () => {
    console.log(`✅ Discord bot logged in as ${client.user.tag}`);
    if (appId) {
      try {
        await registerCommands(appId, token, guildId);
      } catch (e) {
        console.error('Discord command registration failed:', e.message);
      }
    }
  });

  client.on('guildCreate', async (guild) => {
    try {
      if (!guild.channels.cache.size) await guild.channels.fetch().catch(() => {});
      const channel = guild.systemChannel ?? guild.channels.cache.find(c => c.type === ChannelType.GuildText && c.viewable);
      if (!channel) return;
      const gid = guild.id;
      const cid = channel.id;
      const guildSettings = await BotSettings.findOne({ key: 'discordRaidInGuilds' });
      const guilds = guildSettings?.value ? new Set(guildSettings.value) : new Set();
      guilds.add(gid);
      await BotSettings.findOneAndUpdate(
        { key: 'discordRaidInGuilds' },
        { value: Array.from(guilds), updatedAt: new Date() },
        { upsert: true }
      );
      const channelSettings = await BotSettings.findOne({ key: 'discordRaidChannels' });
      let channels = Array.isArray(channelSettings?.value) ? channelSettings.value : [];
      channels = channels.filter(c => c.guildId !== gid);
      channels.push({ guildId: gid, channelId: cid });
      await BotSettings.findOneAndUpdate(
        { key: 'discordRaidChannels' },
        { value: channels, updatedAt: new Date() },
        { upsert: true }
      );
      console.log(`✅ Discord: auto-registered guild ${guild.name} (${gid}) for raid notifications in channel ${cid}`);
    } catch (e) {
      console.error('Discord guildCreate handler error:', e.message);
    }
  });

  client.on('guildDelete', async (guild) => {
    try {
      const gid = guild.id;
      const guildSettings = await BotSettings.findOne({ key: 'discordRaidInGuilds' });
      let guilds = guildSettings?.value ? new Set(guildSettings.value) : new Set();
      guilds.delete(gid);
      await BotSettings.findOneAndUpdate(
        { key: 'discordRaidInGuilds' },
        { value: Array.from(guilds), updatedAt: new Date() },
        { upsert: true }
      );
      const channelSettings = await BotSettings.findOne({ key: 'discordRaidChannels' });
      let channels = Array.isArray(channelSettings?.value) ? channelSettings.value : [];
      channels = channels.filter(c => c.guildId !== gid);
      await BotSettings.findOneAndUpdate(
        { key: 'discordRaidChannels' },
        { value: channels, updatedAt: new Date() },
        { upsert: true }
      );
      console.log(`✅ Discord: unregistered guild ${guild.name} (${gid}) after bot was removed`);
    } catch (e) {
      console.error('Discord guildDelete handler error:', e.message);
    }
  });

  client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content) return;
    const discordUserId = message.author.id;

    const state = getState(discordUserId);
    if (state?.action === 'waiting_branding_image' && message.attachments?.size > 0) {
      const attachment = message.attachments.filter(a => a.contentType?.startsWith('image/') || /\.(jpg|jpeg|png|webp)$/i.test(a.url || '')).first();
      if (!attachment) {
        await message.reply({ content: '❌ Please attach an **image** (JPG or PNG). Use `/cancel` to abort.', ephemeral: false }).catch(() => {});
        return;
      }
      try {
        const res = await axios.get(attachment.url, { responseType: 'arraybuffer', maxContentLength: 600000 });
        const imageBuffer = Buffer.from(res.data);
        const fileSize = imageBuffer.length;
        if (fileSize > 500000) {
          await message.reply({ content: '❌ Image too large! Max 500KB. Use `/cancel` to abort.', ephemeral: false }).catch(() => {});
          return;
        }
        const base64Image = imageBuffer.toString('base64');
        const mimeType = (attachment.contentType || 'image/jpeg').split(';')[0].trim() || 'image/jpeg';
        const base64WithPrefix = `data:${mimeType};base64,${base64Image}`;
        const project = await Ad.findById(state.projectId);
        if (!project) {
          clearState(discordUserId);
          await message.reply({ content: '❌ Project not found.', ephemeral: false }).catch(() => {});
          return;
        }
        project.customBrandingImage = base64WithPrefix;
        project.customBrandingImageSize = fileSize;
        project.customBrandingUploadedAt = new Date();
        await project.save();
        clearState(discordUserId);
        await message.reply({ content: `✅ **Custom branding saved!** (${(fileSize / 1024).toFixed(1)}KB)\n\nUse \`/removebranding\` to remove it.`, ephemeral: false }).catch(() => {});
      } catch (e) {
        console.error('Discord branding upload error:', e.message);
        await message.reply({ content: '❌ Failed to process image. Try a smaller file or use `/cancel`.', ephemeral: false }).catch(() => {});
      }
      return;
    }

    const tweetUrlMatch = message.content.match(/(https?:\/\/(?:www\.)?(?:twitter\.com|x\.com)\/[^/]+\/status\/\d+)/i);
    if (tweetUrlMatch && tweetUrlMatch[1]) {
      const isAdmin = message.member?.permissions?.has?.(PermissionFlagsBits.Administrator) === true;
      if (!isAdmin) return;
      const user = await User.findOne({ discordId: discordUserId });
      if (!user) {
        await message.reply({ content: '❌ Link your account first: `/link your_username`', ephemeral: false }).catch(() => {});
        return;
      }
      const tweetUrl = tweetUrlMatch[1].trim();
      const result = await doCreateRaid(user, tweetUrl, { guildId: message.guildId || null, channelId: message.channelId || null });
      await message.reply({ content: result.message, ephemeral: false }).catch(() => {});
    }
  });

  client.on('interactionCreate', async (interaction) => {
    try {
      if (interaction.isChatInputCommand()) {
        const name = interaction.commandName;
        // In server channels, only allow /bubbles, /raidin, /raidout (like Telegram). Redirect rest to DMs to keep channel clean.
        const allowedInChannel = ['bubbles', 'raidin', 'raidout'];
        if (interaction.guildId && !allowedInChannel.includes(name)) {
          const dmHint = 'Right‑click my name → **Message**, or open the app and start a DM with me.';
          return reply(interaction,
            `💬 **Use commands in a DM with me** to keep this channel clean.\n\n` +
            `🤖 ${dmHint}\n\n` +
            `Then use \`/${name}\` there. Raid/vote notifications and bubbles will still post here.\n\n🌐 https://aquads.xyz`,
            true
          );
        }
        if (name === 'start') return handleStart(interaction);
        if (name === 'link') return handleLink(interaction);
        if (name === 'help') return handleHelp(interaction);
        if (name === 'twitter') return handleTwitter(interaction);
        if (name === 'facebook') return handleFacebook(interaction);
        if (name === 'raids') return handleRaids(interaction);
        if (name === 'complete') return handleCompleteSlash(interaction);
        if (name === 'bubbles') return handleBubbles(interaction);
        if (name === 'mybubble') return handleMyBubble(interaction);
        if (name === 'createraid') return handleCreateRaid(interaction);
        if (name === 'cancelraid') return handleCancelRaid(interaction);
        if (name === 'raidin') return handleRaidIn(interaction);
        if (name === 'raidout') return handleRaidOut(interaction);
        if (name === 'setbranding') return handleSetBranding(interaction);
        if (name === 'removebranding') return handleRemoveBranding(interaction);
        if (name === 'boostvote') return handleBoostVote(interaction);
        if (name === 'cancel') return handleCancel(interaction);
      }
      if (interaction.isButton()) {
        const customId = interaction.customId;
        if (customId === 'help_account') {
          const embed = new EmbedBuilder()
            .setTitle('🔗 Account Setup')
            .setDescription(
              '• `/link USERNAME` – Connect Discord to Aquads\n' +
              '• `/twitter USERNAME` – Set Twitter for raids\n' +
              '• `/facebook USERNAME` – Set Facebook for raids\n\n' +
              'Create account at https://aquads.xyz'
            )
            .setColor(0x00bfff);
          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('help_menu').setLabel('◀️ Back').setStyle(ButtonStyle.Secondary)
          );
          return interaction.update({ embeds: [embed], components: [row] });
        }
        if (customId === 'help_raids') {
          const embed = new EmbedBuilder()
            .setTitle('💰 Raids')
            .setDescription(
              '• `/raids` – List available raids\n' +
              '• `/complete raid_id username post_url` – Submit completion\n' +
              '• Or click **Complete** on a raid and fill the form\n\n' +
              'Earn points at https://aquads.xyz'
            )
            .setColor(0x00bfff);
          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('help_menu').setLabel('◀️ Back').setStyle(ButtonStyle.Secondary)
          );
          return interaction.update({ embeds: [embed], components: [row] });
        }
        if (customId === 'help_bubbles') {
          const embed = new EmbedBuilder()
            .setTitle('📊 Bubbles')
            .setDescription('• `/bubbles` – Top 10 bumped bubbles\n• `/mybubble` – Your projects with vote info\n\nhttps://aquads.xyz')
            .setColor(0x00bfff);
          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('help_menu').setLabel('◀️ Back').setStyle(ButtonStyle.Secondary)
          );
          return interaction.update({ embeds: [embed], components: [row] });
        }
        if (customId === 'help_branding') {
          const embed = new EmbedBuilder()
            .setTitle('🎨 Custom Branding')
            .setDescription(
              'FREE for all bumped projects.\n\n' +
              '• `/setbranding` – Then attach your image in the next message\n' +
              '• `/removebranding` – Remove custom branding\n\n' +
              'Your image appears in vote notifications, /mybubble, and /bubbles.\n\n' +
              'Bump your project at https://aquads.xyz'
            )
            .setColor(0x00bfff)
            .setURL('https://aquads.xyz');
          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('help_menu').setLabel('◀️ Back').setStyle(ButtonStyle.Secondary)
          );
          return interaction.update({ embeds: [embed], components: [row] });
        }
        if (customId === 'help_quickstart') {
          const embed = new EmbedBuilder()
            .setTitle('🚀 Quick Start')
            .setDescription(
              '1️⃣ **Link:** `/link your_aquads_username` (create account at aquads.xyz first)\n\n' +
              '2️⃣ **Socials:** `/twitter your_twitter` and `/facebook your_facebook`\n\n' +
              '3️⃣ **Earn:** `/raids` – complete raids for points\n' +
              '`/mybubble` – your project · `/bubbles` – vote on projects\n\n' +
              'https://aquads.xyz'
            )
            .setColor(0x00bfff)
            .setURL('https://aquads.xyz');
          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('help_menu').setLabel('◀️ Back').setStyle(ButtonStyle.Secondary)
          );
          return interaction.update({ embeds: [embed], components: [row] });
        }
        if (customId === 'help_all') {
          const embed = new EmbedBuilder()
            .setTitle('📋 All Commands')
            .setDescription(
              '`/start` `/link` `/help` `/twitter` `/facebook`\n' +
              '`/raids` `/complete` `/bubbles` `/mybubble`\n' +
              '`/createraid` `/cancelraid` `/raidin` `/raidout`\n' +
              '`/setbranding` `/removebranding` `/boostvote` `/cancel`'
            )
            .setColor(0x00bfff);
          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('help_menu').setLabel('◀️ Back').setStyle(ButtonStyle.Secondary)
          );
          return interaction.update({ embeds: [embed], components: [row] });
        }
        if (customId === 'help_menu') {
          const discordUserId = interaction.user.id;
          const user = await User.findOne({ discordId: discordUserId });
          let profileSection = '';
          if (user) {
            const tw = user.twitterUsername ? `✅ @${user.twitterUsername}` : '❌ Not set';
            const fb = user.facebookUsername ? `✅ @${user.facebookUsername}` : '❌ Not set';
            const bumped = await Ad.findOne({ owner: user.username, isBumped: true, status: { $in: ['active', 'approved'] } }).select('customBrandingImage');
            const branding = bumped?.customBrandingImage ? '✅ Set' : '❌ Not set';
            profileSection = `**${user.username}** | 💰 ${user.points || 0} pts\n🐦 Twitter: ${tw}\n📘 Facebook: ${fb}\n🎨 Branding: ${branding}\n\n`;
          }
          const embed = new EmbedBuilder()
            .setTitle('🤖 Aquads Bot')
            .setDescription(profileSection + 'Choose a category:')
            .setColor(0x00bfff);
          const row1 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('help_account').setLabel('Account Setup').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('help_raids').setLabel('Raids').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('help_bubbles').setLabel('Bubbles').setStyle(ButtonStyle.Primary)
          );
          const row2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('help_branding').setLabel('Branding').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('help_quickstart').setLabel('Quick Start').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('help_all').setLabel('All Commands').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setLabel('Visit Website').setStyle(ButtonStyle.Link).setURL('https://aquads.xyz')
          );
          return interaction.update({ embeds: [embed], components: [row1, row2] });
        }
        if (customId.startsWith('complete_')) {
          const raidId = customId.replace('complete_', '');
          const modal = new ModalBuilder()
            .setCustomId(`complete_modal_${raidId}`)
            .setTitle('Complete Raid');
          modal.addComponents(
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId('username')
                .setLabel('Twitter or Facebook username')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('your_username')
                .setRequired(true)
            ),
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId('post_url')
                .setLabel('Tweet or post URL')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('https://twitter.com/... or https://facebook.com/...')
                .setRequired(true)
            )
          );
          return interaction.showModal(modal);
        }
        if (customId.startsWith('vote_bullish_') || customId.startsWith('vote_bearish_')) {
          const voteType = customId.startsWith('vote_bullish_') ? 'bullish' : 'bearish';
          const projectId = customId.replace('vote_bullish_', '').replace('vote_bearish_', '');
          const discordUserId = interaction.user.id;
          const user = await User.findOne({ discordId: discordUserId });
          if (!user) {
            return interaction.reply({ content: '❌ Link your account first: `/link your_username`', ephemeral: true }).catch(() => {});
          }
          const telegramService = require('./telegramService');
          const result = await telegramService.processVoteByUser(user, projectId, voteType);
          return interaction.reply({ content: result.message, ephemeral: true }).catch(() => {});
        }
        if (customId === 'boost_enter_invite') {
          const state = getState(interaction.user.id);
          if (!state || state.action !== 'boost_waiting_invite') {
            return interaction.reply({ content: '❌ Session expired. Use `/boostvote` to start again.', ephemeral: true }).catch(() => {});
          }
          const modal = new ModalBuilder()
            .setCustomId('boost_invite_modal')
            .setTitle('Community link');
          modal.addComponents(
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId('link')
                .setLabel('Telegram group or Discord server invite')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('https://t.me/... or https://discord.gg/...')
                .setRequired(true)
            )
          );
          return interaction.showModal(modal);
        }
        if (customId === 'boost_submit_tx') {
          const state = getState(interaction.user.id);
          if (!state || state.action !== 'boost_waiting_tx') {
            return interaction.reply({ content: '❌ Session expired. Use `/boostvote` to start again.', ephemeral: true }).catch(() => {});
          }
          const modal = new ModalBuilder()
            .setCustomId('boost_tx_modal')
            .setTitle('TX signature');
          modal.addComponents(
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId('tx')
                .setLabel('Transaction signature / hash')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('Paste your TX after payment')
                .setRequired(true)
            )
          );
          return interaction.showModal(modal);
        }
        if (customId.startsWith('boost_pkg_')) {
          return handleBoostPackageSelect(interaction, customId.replace('boost_pkg_', ''));
        }
        if (customId.startsWith('boost_bubble_')) {
          const rest = customId.replace('boost_bubble_', '');
          const idx = rest.indexOf('_');
          const packageId = idx >= 0 ? rest.slice(0, idx) : rest;
          const bubbleId = idx >= 0 ? rest.slice(idx + 1) : rest;
          return handleBoostBubbleSelected(interaction, packageId, bubbleId);
        }
        if (customId === 'boost_cancel') {
          clearState(interaction.user.id);
          return interaction.update({ content: '❌ Vote boost cancelled. Use `/boostvote` to start again.', embeds: [], components: [] }).catch(() => interaction.reply({ content: '❌ Cancelled.', ephemeral: true }));
        }
      }
      if (interaction.isModalSubmit()) {
        if (interaction.customId.startsWith('complete_modal_')) {
          const raidId = interaction.customId.replace('complete_modal_', '');
          const username = interaction.fields.getTextInputValue('username');
          const postUrl = interaction.fields.getTextInputValue('post_url');
          return handleCompleteFromModal(interaction, raidId, username, postUrl, true);
        }
        if (interaction.customId === 'boost_invite_modal') {
          const link = interaction.fields.getTextInputValue('link').trim();
          const discordUserId = interaction.user.id;
          const state = getState(discordUserId);
          if (!state || state.action !== 'boost_waiting_invite') {
            return interaction.reply({ content: '❌ Session expired. Use `/boostvote` to start again.', ephemeral: true }).catch(() => {});
          }
          const isTg = /t\.me\/|telegram\.me\//i.test(link);
          const isDiscord = /discord\.gg\/|discord\.com\/invite\//i.test(link);
          if (!isTg && !isDiscord) {
            return interaction.reply({ content: '❌ Send a valid Telegram group link (t.me/...) or Discord server invite (discord.gg/...).', ephemeral: true }).catch(() => {});
          }
          const packages = { starter: { name: 'Starter', votes: 100, price: 20 }, basic: { name: 'Basic', votes: 250, price: 40 }, growth: { name: 'Growth', votes: 500, price: 80 }, pro: { name: 'Pro', votes: 1000, price: 150 } };
          const pkg = packages[state.packageId];
          const bubble = await Ad.findOne({ id: state.bubbleId }).select('title').lean();
          setState(discordUserId, { action: 'boost_waiting_tx', packageId: state.packageId, bubbleId: state.bubbleId, packageName: pkg.name, price: pkg.price, votes: pkg.votes, inviteLink: link, isDiscordLink: isDiscord });
          const embed = new EmbedBuilder()
            .setTitle(`✅ Boosting: ${bubble?.title || 'Bubble'}`)
            .setDescription(
              `📦 **${pkg.name}** · ${pkg.votes.toLocaleString()} votes · **$${pkg.price} USDC**\n\n` +
              `🔗 ${link}\n\n` +
              `**💳 Send $${pkg.price} USDC** (pick one chain):\n` +
              `• **Solana:** \`F4HuQfUx5zsuQpxca4KQfU6uZPYtRp3Y7HYVGsuHdYVf\`\n` +
              `• **Ethereum:** \`0xA1ec6B1df5367a41Ff9EadEF7EC4cC25C0ff7358\`\n` +
              `• **Base:** \`0xA1ec6B1df5367a41Ff9EadEF7EC4cC25C0ff7358\`\n` +
              `• **Sui:** \`0xdadea3003856d304535c3f1b6d5670ab07a8e71715c7644bf230dd3a4ba7d13a\`\n\n` +
              `After payment, click **I've paid - Submit TX** and paste your transaction signature.`
            )
            .setColor(0x00bfff);
          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('boost_submit_tx').setLabel("I've paid - Submit TX").setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('boost_cancel').setLabel('Cancel').setStyle(ButtonStyle.Secondary)
          );
          return interaction.reply({ embeds: [embed], components: [row], ephemeral: true }).catch(() => {});
        }
        if (interaction.customId === 'boost_tx_modal') {
          const txSignature = interaction.fields.getTextInputValue('tx').trim();
          const discordUserId = interaction.user.id;
          const state = getState(discordUserId);
          if (!state || state.action !== 'boost_waiting_tx' || txSignature.length < 20) {
            return interaction.reply({ content: '❌ Invalid or expired. Use `/boostvote` and paste a valid TX signature (after payment).', ephemeral: true }).catch(() => {});
          }
          const user = await User.findOne({ discordId: discordUserId });
          if (!user) {
            clearState(discordUserId);
            return interaction.reply({ content: '❌ User not found.', ephemeral: true }).catch(() => {});
          }
          const VoteBoost = require('../models/VoteBoost');
          const voteBoost = new VoteBoost({
            adId: state.bubbleId,
            owner: user.username,
            txSignature,
            packageName: state.packageName,
            votesToAdd: state.votes,
            price: state.price,
            status: 'pending',
            paymentChain: 'Unknown',
            chainSymbol: 'USDC',
            telegramGroupLink: state.isDiscordLink ? null : state.inviteLink,
            discordInviteLink: state.isDiscordLink ? state.inviteLink : null
          });
          await voteBoost.save();
          clearState(discordUserId);
          const bubble = await Ad.findOne({ id: state.bubbleId }).select('title').lean();
          const { emitVoteBoostUpdate } = require('../socket');
          if (emitVoteBoostUpdate) emitVoteBoostUpdate('create', voteBoost, bubble);
          const msg = `✅ **Vote boost submitted!**\n\n📦 ${state.packageName} · ${state.votes.toLocaleString()} votes · $${state.price} USDC\n🔗 ${bubble?.title || state.bubbleId}\n\n⏳ Awaiting admin approval.`;
          return interaction.reply({ content: msg, ephemeral: true }).catch(() => {});
        }
      }
    } catch (err) {
      console.error('Discord interaction error:', err);
      try {
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({ content: '❌ Something went wrong. Try again.', ephemeral: true }).catch(() => {});
        } else {
          await interaction.reply({ content: '❌ Something went wrong. Try again.', ephemeral: true }).catch(() => {});
        }
      } catch (_) {}
    }
  });
  try {
    await client.login(token);
    return true;
  } catch (e) {
    console.error('Discord login failed:', e.message);
    return false;
  }
}

// ---- Notifications (mirror Telegram: new raids, completions, votes, top bubbles) ----
// Telegram: activeGroups = all groups with bot (get completions + admin raids). raidCrossPostingGroups = /raidin only (get user raids + send theirs to others).
// Discord: discordRaidChannels = all servers with bot (like activeGroups). discordRaidInGuilds = /raidin only (community cross-posting).
// Videos/branding: same as Telegram — raid/completion/trend use video files; vote uses custom branding image if set, else default vote video.

const PUBLIC_DIR = path.join(__dirname, '../../public');
const VIDEO_RAID = path.join(PUBLIC_DIR, 'timeraid.mp4');
const VIDEO_RAID_COMPLETION = path.join(PUBLIC_DIR, 'Just Raided.mp4');
const VIDEO_VOTE = path.join(PUBLIC_DIR, 'New_vote.mp4');
const VIDEO_TOP_BUBBLES = path.join(PUBLIC_DIR, 'TRENDINGLIST.mp4');

async function sendToChannel(channelId, payload) {
  if (!channelId || !discordClient?.isReady()) return false;
  try {
    const channel = await discordClient.channels.fetch(channelId).catch(() => null);
    if (!channel) return false;
    await channel.send(payload);
    return true;
  } catch (e) {
    console.error('Discord sendToChannel error:', e.message);
    return false;
  }
}

/** All servers that have the bot (get completion pings and admin raids). */
async function getDiscordRaidChannelIds() {
  const ids = new Set();
  const defaultId = process.env.DISCORD_RAID_CHANNEL_ID;
  if (defaultId) ids.add(defaultId);
  const settings = await BotSettings.findOne({ key: 'discordRaidChannels' }).lean();
  const list = Array.isArray(settings?.value) ? settings.value : [];
  list.forEach(c => { if (c && c.channelId) ids.add(c.channelId); });
  return Array.from(ids);
}

/** Only servers that have run /raidin (community raids: receive user-created raids from other servers). */
async function getDiscordCommunityRaidChannelIds() {
  const raidInSettings = await BotSettings.findOne({ key: 'discordRaidInGuilds' }).lean();
  const raidInGuilds = Array.isArray(raidInSettings?.value) ? raidInSettings.value : [];
  const channelSettings = await BotSettings.findOne({ key: 'discordRaidChannels' }).lean();
  const list = Array.isArray(channelSettings?.value) ? channelSettings.value : [];
  const raidInSet = new Set(raidInGuilds);
  const ids = list.filter(c => c && c.guildId && raidInSet.has(c.guildId)).map(c => c.channelId);
  return ids;
}

async function sendRaidNotificationToChannel(raidData) {
  const isAdmin = raidData.isAdmin === true;
  let channelIds;
  if (isAdmin) {
    channelIds = await getDiscordRaidChannelIds();
  } else {
    const communityIds = await getDiscordCommunityRaidChannelIds();
    const ids = new Set(communityIds);
    if (raidData.discordSourceChannelId) ids.add(raidData.discordSourceChannelId);
    channelIds = Array.from(ids);
  }
  if (channelIds.length === 0) return false;
  const isFacebook = raidData.platform === 'Facebook';
  const platformName = isFacebook ? 'Facebook Raid' : 'Twitter Raid';
  const postUrl = isFacebook ? raidData.postUrl : raidData.tweetUrl;
  const embed = new EmbedBuilder()
    .setTitle(`🚀 New ${platformName} Available!`)
    .setDescription(
      `💰 Reward: ${raidData.points || 20} points\n` +
      `🎯 Task: ${isFacebook ? 'Like, Share & Comment' : 'Like, Retweet & Comment'}\n\n` +
      `🔗 [${isFacebook ? 'Facebook Raid' : 'Tweet'}](${postUrl})\n\n` +
      `🤖 Complete via Discord: \`/raids\` then \`/complete\` or use the bot in this server.\n\n` +
      `🌐 https://aquads.xyz · Available for 48 hours!`
    )
    .setColor(0x00bfff)
    .setURL(postUrl || 'https://aquads.xyz');
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setLabel('Complete on Aquads').setStyle(ButtonStyle.Link).setURL('https://aquads.xyz'),
    new ButtonBuilder().setLabel('Hire an Expert').setStyle(ButtonStyle.Link).setURL('https://aquads.xyz/marketplace')
  );
  let files = [];
  if (raidData.creatorBrandingBuffer && Buffer.isBuffer(raidData.creatorBrandingBuffer)) {
    files = [{ attachment: raidData.creatorBrandingBuffer, name: 'branding.jpg' }];
  } else if (fs.existsSync(VIDEO_RAID)) {
    files = [VIDEO_RAID];
  }
  const payload = { embeds: [embed], components: [row], files };
  let sent = 0;
  for (const channelId of channelIds) {
    if (await sendToChannel(channelId, payload)) sent++;
  }
  return sent > 0;
}

async function sendRaidCompletionToChannel(completionData) {
  const channelIds = await getDiscordRaidChannelIds();
  const fallbackId = process.env.DISCORD_RAID_COMPLETION_CHANNEL_ID || process.env.DISCORD_RAID_CHANNEL_ID;
  if (channelIds.length === 0 && !fallbackId) return false;
  const ids = channelIds.length > 0 ? channelIds : (fallbackId ? [fallbackId] : []);
  const user = await User.findById(completionData.userId).select('username').lean();
  const username = user?.username || 'User';
  const isFacebook = completionData.platform === 'Facebook';
  const platformName = isFacebook ? 'Facebook' : 'Twitter';
  const embed = new EmbedBuilder()
    .setTitle('🎉 Someone Just Raided!')
    .setDescription(
      `${platformName} Raid\n` +
      `👤 **${username}** just completed a raid\n` +
      `💰 Reward: ${completionData.points} points\n\n` +
      `🌐 Complete more raids: use \`/raids\` in Discord or https://aquads.xyz`
    )
    .setColor(0x00bfff)
    .setURL('https://aquads.xyz');
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setLabel('Join Raids').setStyle(ButtonStyle.Link).setURL('https://aquads.xyz')
  );
  let files = [];
  if (completionData.creatorBrandingBuffer && Buffer.isBuffer(completionData.creatorBrandingBuffer)) {
    files = [{ attachment: completionData.creatorBrandingBuffer, name: 'branding.jpg' }];
  } else if (fs.existsSync(VIDEO_RAID_COMPLETION)) {
    files = [VIDEO_RAID_COMPLETION];
  }
  const payload = { embeds: [embed], components: [row], files };
  let sent = 0;
  for (const channelId of ids) {
    if (await sendToChannel(channelId, payload)) sent++;
  }
  return sent > 0;
}

async function sendVoteNotificationToChannel(project) {
  const channelId = process.env.DISCORD_VOTE_CHANNEL_ID;
  if (!channelId) return false;
  const allBubbles = await Ad.find({ isBumped: true, status: { $in: ['active', 'approved'] } })
    .sort({ bullishVotes: -1 })
    .select('_id bullishVotes')
    .lean();
  const rank = allBubbles.findIndex(b => b._id.toString() === project._id.toString()) + 1;
  const rankEmoji = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '🔸';
  const tokenAddress = project.pairAddress || project.contractAddress;
  const viewUrl = (tokenAddress && project.blockchain)
    ? `https://www.aquads.xyz/aquaswap?blockchain=${encodeURIComponent(project.blockchain)}&token=${encodeURIComponent(tokenAddress.trim())}`
    : 'https://www.aquads.xyz/aquaswap';
  const embed = new EmbedBuilder()
    .setTitle(`🎉 New Vote for ${project.title}`)
    .setDescription(
      `📊 Votes: 👍 ${project.bullishVotes || 0} | 👎 ${project.bearishVotes || 0}\n` +
      `🏆 Rank: ${rankEmoji} #${rank}\n\n` +
      `[View on Aquads](${viewUrl})`
    )
    .setColor(0x00bfff)
    .setURL(viewUrl);
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setLabel('View on Aquads').setStyle(ButtonStyle.Link).setURL(viewUrl)
  );
  let files = [];
  const hasCustomBranding = project.customBrandingImage && project.customBrandingImage.length > 0;
  if (hasCustomBranding) {
    try {
      const base64Data = project.customBrandingImage.split(',')[1];
      if (base64Data) {
        const imageBuffer = Buffer.from(base64Data, 'base64');
        files = [{ attachment: imageBuffer, name: 'branding.jpg' }];
      }
    } catch (e) {
      console.error('Discord vote notification: custom branding buffer error', e.message);
    }
  }
  if (files.length === 0 && fs.existsSync(VIDEO_VOTE)) {
    files = [VIDEO_VOTE];
  }
  return sendToChannel(channelId, { embeds: [embed], components: [row], files });
}

async function sendTopBubblesToChannel() {
  const channelId = process.env.DISCORD_BUBBLES_CHANNEL_ID;
  if (!channelId) return false;
  const bumpedBubbles = await Ad.find({ isBumped: true, status: { $in: ['active', 'approved'] } })
    .select('title bullishVotes bearishVotes pairAddress contractAddress blockchain')
    .sort({ bullishVotes: -1 })
    .limit(10)
    .lean();
  if (bumpedBubbles.length === 0) return false;
  const lines = bumpedBubbles.map((b, i) => {
    const r = i + 1;
    const emoji = r === 1 ? '🥇' : r === 2 ? '🥈' : r === 3 ? '🥉' : '🔸';
    const addr = b.pairAddress || b.contractAddress;
    const url = addr ? `https://aquads.xyz/aquaswap?token=${encodeURIComponent(addr.trim())}&blockchain=${encodeURIComponent(b.blockchain || 'ethereum')}` : null;
    return `${emoji} #${r}: **${b.title}** · 👍 ${b.bullishVotes} 👎 ${b.bearishVotes}${url ? ` · [Chart](${url})` : ''}`;
  });
  const embed = new EmbedBuilder()
    .setTitle('🔥 Top 10 Bubbles')
    .setDescription(lines.join('\n\n') + '\n\n🌐 https://aquads.xyz')
    .setColor(0x00bfff)
    .setURL('https://aquads.xyz');
  const files = fs.existsSync(VIDEO_TOP_BUBBLES) ? [VIDEO_TOP_BUBBLES] : [];
  return sendToChannel(channelId, { embeds: [embed], files });
}

module.exports = {
  startBot,
  getClient: () => discordClient,
  sendRaidNotificationToChannel,
  sendRaidCompletionToChannel,
  sendVoteNotificationToChannel,
  sendTopBubblesToChannel
};
