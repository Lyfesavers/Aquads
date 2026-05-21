const jwt = require('jsonwebtoken');

/**
 * Verify JWT from socket handshake and ensure it matches the claimed user id.
 * @param {import('socket.io').Socket} socket
 * @param {string} claimedUserId
 * @returns {{ userId: string, username?: string } | null}
 */
function verifySocketUserId(socket, claimedUserId) {
  try {
    const token = socket.handshake.auth?.token;
    if (!token || !claimedUserId) return null;

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = String(decoded.userId || decoded._id || '');
    if (!userId || userId !== String(claimedUserId)) return null;

    return {
      userId,
      username: decoded.username ? String(decoded.username) : undefined
    };
  } catch {
    return null;
  }
}

module.exports = { verifySocketUserId };
