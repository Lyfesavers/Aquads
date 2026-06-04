const { extractSpacesUrl } = require('./xSpacesBroadcast');

/**
 * Send X Space alert using the same routing as user-created raids:
 * source group/channel + /raidin communities (/raidout = local only).
 */
async function broadcastSpacesAlert(spaceUrl, opts = {}) {
  const url = typeof spaceUrl === 'string' ? spaceUrl.trim() : '';
  if (!url || !extractSpacesUrl(url)) {
    return { ok: false, telegram: { count: 0 }, discord: { count: 0 } };
  }

  const { sourceChatId = null, discordSourceChannelId = null } = opts;

  const telegramService = require('./telegramService');
  const discordService = require('./discordService');

  const [telegram, discord] = await Promise.all([
    telegramService.sendSpacesBroadcast({ spaceUrl: url, sourceChatId }),
    discordService.sendSpacesBroadcastToChannels({ spaceUrl: url, discordSourceChannelId }),
  ]);

  const tgCount = telegram?.count ?? 0;
  const dcCount = discord?.count ?? 0;
  return {
    ok: tgCount > 0 || dcCount > 0,
    telegram: { count: tgCount },
    discord: { count: dcCount },
  };
}

module.exports = { broadcastSpacesAlert };
