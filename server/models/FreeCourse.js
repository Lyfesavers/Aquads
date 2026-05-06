const mongoose = require('mongoose');

const freeCourseSchema = new mongoose.Schema(
  {
    // High-level feed bucket — used as the primary "course type" filter.
    // 'technology' = IT / programming / etc.; 'business' = marketing / management / finance
    feed: {
      type: String,
      required: true,
      enum: ['technology', 'business', 'languages'],
      index: true,
    },
    // More granular topical bucket derived from the title (Programming, Web Dev, AI & Data,
    // Marketing, SEO, Finance, etc.). Exposed as the secondary filter.
    category: {
      type: String,
      required: true,
      index: true,
      maxlength: 80,
    },
    externalKey: {
      type: String,
      required: true,
      unique: true,
      maxlength: 1200,
    },
    guid: { type: String, maxlength: 500 },
    // RSS entry link (the cursa.app course landing page).
    link: { type: String, required: true, maxlength: 2000 },
    title: { type: String, required: true, maxlength: 500 },
    description: { type: String, maxlength: 4000 },
    imageUrl: { type: String, maxlength: 2000 },
    creator: { type: String, maxlength: 200 },
    // URL slug used by the dedicated course page (`/learn/courses/:slug`).
    // Stable + unique so we can look up by slug only.
    slug: {
      type: String,
      required: true,
      unique: true,
      index: true,
      maxlength: 220,
    },
    publishedAt: { type: Date, required: true, index: true },
    lastSyncedAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

freeCourseSchema.index({ publishedAt: -1, feed: 1, category: 1 });
freeCourseSchema.index({ category: 1, publishedAt: -1 });

module.exports = mongoose.model('FreeCourse', freeCourseSchema);
