const { getLimits } = require('./projectAgentLimits');

function getAgentMediaReplyMaxChars() {
  const n = Number(process.env.PROJECT_AGENT_AGENT_MEDIA_REPLY_MAX_CHARS);
  if (Number.isFinite(n) && n >= 400) return Math.floor(n);
  return 2400;
}

/**
 * Trim long Agent follow-ups after image/video tools so history does not train
 * fake "ready / billed / upsell" essays on the next turn.
 */
function capAgentReplyContent(content, { afterMedia = false } = {}) {
  const text = String(content || '');
  if (!text) return text;

  const maxChars = afterMedia
    ? getAgentMediaReplyMaxChars()
    : Math.min(12000, getLimits().maxUserMessageChars);

  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars)}\n\n…[reply trimmed for chat length]`;
}

module.exports = {
  capAgentReplyContent,
  getAgentMediaReplyMaxChars
};
