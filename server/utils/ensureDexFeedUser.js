const bcrypt = require('bcrypt');
const User = require('../models/User');
const { DEX_FEED_OWNER_USERNAME } = require('../constants/dexFeed');

async function ensureDexFeedUser() {
  const username = DEX_FEED_OWNER_USERNAME;
  if (!username) {
    throw new Error('DEX_FEED_OWNER_USERNAME is empty');
  }

  let user = await User.findOne({ username }).select('_id username').lean();
  if (user) return user;

  const password = bcrypt.hashSync(
    `dex-feed-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    10
  );

  user = await User.create({
    username,
    password,
    userType: 'project',
    emailVerified: false,
    isAdmin: false,
    image: 'https://i.imgur.com/6VBx3io.png'
  });

  console.log(`[DexFeed] Created system user "${username}"`);
  return user;
}

module.exports = { ensureDexFeedUser };
