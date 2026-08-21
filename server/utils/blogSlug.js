/** Canonical slug rules — must match src/utils/blogRelatedPostsCore.js. */
const createBlogSlug = (title) => {
  const slug = (title || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  const maxLength = 50;
  if (slug.length > maxLength) {
    const truncated = slug.substring(0, maxLength);
    const lastDash = truncated.lastIndexOf('-');
    return lastDash > 20 ? truncated.substring(0, lastDash) : truncated;
  }
  return slug;
};

const SITE_ORIGIN = (process.env.AQUADS_SITE_ORIGIN || 'https://www.aquads.xyz').replace(/\/$/, '');

const blogPublicUrl = (blog) => {
  const slug = createBlogSlug(blog.title) || 'post';
  return `${SITE_ORIGIN}/learn/${slug}-${blog._id}`;
};

module.exports = {
  createBlogSlug,
  blogPublicUrl,
  SITE_ORIGIN
};
