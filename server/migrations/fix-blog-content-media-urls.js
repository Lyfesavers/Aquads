/**
 * Repair blog body content after DO Spaces migration.
 *
 * Fixes inline <img> / markdown refs that still point at Railway /api/blogs/media/:id
 * or malformed double-URL strings from an incomplete path-only replace.
 *
 * Usage (from server/):
 *   node migrations/fix-blog-content-media-urls.js --dry-run
 *   node migrations/fix-blog-content-media-urls.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const spaces = require('../utils/spaces');
const { normalizeBlogContentMediaUrls } = require('../utils/blogContentUrls');

const DRY_RUN = process.argv.includes('--dry-run');
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/aquads';

async function run() {
  console.log('🔧 Repair blog inline image URLs');
  if (DRY_RUN) console.log('   (dry-run — no writes)\n');

  if (!spaces.isConfigured()) {
    throw new Error('DO Spaces env vars are not configured.');
  }

  await mongoose.connect(MONGODB_URI);
  const blogs = mongoose.connection.db.collection('blogs');

  const candidates = await blogs.find({
    content: { $regex: /\/api\/blogs\/media\/[a-f0-9]{24}|https?:\/\/[^\s"']+?https:\/\//i }
  }).toArray();

  let repaired = 0;
  let skipped = 0;

  for (const blog of candidates) {
    const normalized = normalizeBlogContentMediaUrls(blog.content);
    if (normalized === blog.content) {
      skipped++;
      continue;
    }

    if (DRY_RUN) {
      console.log(`   would repair blog ${blog._id}: ${blog.title || '(untitled)'}`);
    } else {
      await blogs.updateOne({ _id: blog._id }, { $set: { content: normalized } });
      console.log(`   repaired blog ${blog._id}: ${blog.title || '(untitled)'}`);
    }
    repaired++;
  }

  console.log(`\n📊 Summary: ${repaired} repaired, ${skipped} unchanged (${candidates.length} scanned)`);
  console.log(DRY_RUN ? '\n✅ Dry-run complete.' : '\n✅ Repair complete.');
}

if (require.main === module) {
  run()
    .catch((err) => {
      console.error('\n❌ Repair failed:', err);
      process.exit(1);
    })
    .finally(async () => {
      await mongoose.connection.close().catch(() => {});
    });
}

module.exports = run;
