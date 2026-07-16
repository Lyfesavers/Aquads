const spaces = require('./spaces');

const getCdnUrlForBlogMediaId = (id) =>
  spaces.toPublicUrl(`migrated/blogs/${id}.webp`);

/**
 * Rewrite blog inline image refs (Railway /api/blogs/media/:id) to Spaces CDN URLs.
 * Also repairs malformed URLs from an earlier migration pass that only replaced the path segment.
 */
const normalizeBlogContentMediaUrls = (content) => {
  if (!content || typeof content !== 'string') return content;
  if (!spaces.isConfigured()) return content;

  let result = content;

  // Bad migration: https://railway.apphttps://cdn.../migrated/blogs/id.webp
  result = result.replace(
    /https?:\/\/[^\s"'<>]+?https:\/\/[^\s"'<>]+\/migrated\/blogs\/([a-f0-9]{24})\.webp/gi,
    (_, id) => getCdnUrlForBlogMediaId(id)
  );

  // Full absolute Railway (or other host) media URLs
  result = result.replace(
    /https?:\/\/[^\s"'<>]+\/api\/blogs\/media\/([a-f0-9]{24})/gi,
    (_, id) => getCdnUrlForBlogMediaId(id)
  );

  // Relative media paths
  result = result.replace(
    /\/api\/blogs\/media\/([a-f0-9]{24})/gi,
    (_, id) => getCdnUrlForBlogMediaId(id)
  );

  return result;
};

const contentNeedsBlogMediaRepair = (content) => {
  if (!content || typeof content !== 'string') return false;
  return (
    /\/api\/blogs\/media\/[a-f0-9]{24}/i.test(content) ||
    /https?:\/\/[^\s"'<>]+?https:\/\/[^\s"'<>]+\/migrated\/blogs\/[a-f0-9]{24}\.webp/i.test(content)
  );
};

module.exports = {
  normalizeBlogContentMediaUrls,
  contentNeedsBlogMediaRepair,
  getCdnUrlForBlogMediaId
};
