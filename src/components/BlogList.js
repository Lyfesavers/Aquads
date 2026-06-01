import React from 'react';
import { Link } from 'react-router-dom';
import { FaShare, FaEdit, FaTrash } from 'react-icons/fa';
import BlogContentRenderer from './BlogContentRenderer';
import { isMarkdownBlogContent, sanitizeBlogHtml, getBlogAuthorId } from '../utils/blogEditor';

// Helper function to create URL-friendly slugs
const createSlug = (title) => {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  
  // Limit slug length to prevent extremely long URLs (keep first 50 characters)
  // This helps prevent 5xx errors due to URL length limits
  const maxLength = 50;
  if (slug.length > maxLength) {
    // Find the last complete word within the limit to avoid cutting words in half
    const truncated = slug.substring(0, maxLength);
    const lastDash = truncated.lastIndexOf('-');
    return lastDash > 20 ? truncated.substring(0, lastDash) : truncated;
  }
  
  return slug;
};

const BlogList = ({ blogs, currentUser, onEditBlog, onDeleteBlog, deletingBlogId = null }) => {

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleShare = (blog) => {
    // Copy the canonical /learn/{slug}-{id} URL. The learn-blog Edge Function
    // injects blog-specific OG / Twitter / canonical / JSON-LD metadata into
    // the SPA shell for every client (humans, Facebook, Twitter, opengraph.xyz,
    // Iframely, Embedly, …), so social previews work the same as the legacy
    // /share/blog/:id wrapper while also being the URL Google indexes and
    // ranks. The /share/blog/:id route still exists for backward compatibility
    // with links already shared in the wild.
    const shareUrl = `${window.location.origin}/learn/${createSlug(blog.title)}-${blog._id}`;

    // Add referral code if user is logged in (as a separate parameter)
    const finalUrl = currentUser?.username
      ? `${shareUrl}?ref=${currentUser.username}`
      : shareUrl;

    navigator.clipboard.writeText(finalUrl).then(() => {
      alert('Blog link copied to clipboard!');
    }).catch(err => {
      console.error('Failed to copy:', err);
    });
  };

  const truncateContent = (content) => {
    // Handle content appropriately based on whether it's Markdown or HTML
    const isMarkdown = /^#|\n-\s|^-\s|\*\*/.test(content);
    if (isMarkdown) {
      // For Markdown content, trim to a certain length
      return content.length > 300 
        ? content.substring(0, 300) + '...'
        : content;
    } else {
      // For HTML content, strip tags and truncate
      const strippedContent = content.replace(/<[^>]*>/g, '');
      return strippedContent.length > 300 
        ? strippedContent.substring(0, 300) + '...'
        : strippedContent;
    }
  };

  // Function to check if content is Markdown
  const isMarkdownContent = (content) => isMarkdownBlogContent(content);

  if (!blogs?.length) {
    return (
      <div className="text-center py-8 text-gray-400">
        No blog posts yet.
      </div>
    );
  }

  return (
    <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
      {blogs.map((blog) => (
        <div
          key={blog._id}
          id={`blog-${blog._id}`}
          className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-lg overflow-hidden hover:bg-gray-800/70 transition-all duration-300"
        >
          {/* Banner Image */}
          <div className="aspect-video">
            <img
              src={blog.bannerImage}
              alt={blog.title}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Content */}
          <div className="p-4">
            <div className="flex items-start justify-between mb-4">
              {/* Author Info */}
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full overflow-hidden">
                  <img
                    src={blog.authorImage || `https://ui-avatars.com/api/?name=${blog.authorUsername}&background=random`}
                    alt={blog.authorUsername}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <div className="font-medium text-white">{blog.authorUsername}</div>
                  <div className="text-sm text-gray-400">{formatDate(blog.createdAt)}</div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-2">
                <button
                  onClick={() => handleShare(blog)}
                  className="text-blue-400 hover:text-blue-300 transition-colors"
                  title="Share"
                >
                  <FaShare size={18} />
                </button>
                {currentUser && (currentUser.userId === getBlogAuthorId(blog.author) || currentUser.isAdmin) && (
                  <>
                    <button
                      onClick={() => onEditBlog(blog)}
                      disabled={deletingBlogId === blog._id}
                      className={`text-blue-400 transition-colors ${
                        deletingBlogId === blog._id ? 'opacity-50 cursor-not-allowed' : 'hover:text-blue-300'
                      }`}
                      title="Edit"
                    >
                      <FaEdit size={18} />
                    </button>
                    <button
                      onClick={() => {
                        if (deletingBlogId) return; // Prevent if already deleting
                        if (window.confirm('Are you sure you want to delete this blog post?')) {
                          onDeleteBlog(blog._id);
                        }
                      }}
                      disabled={deletingBlogId !== null}
                      className={`transition-colors ${
                        deletingBlogId === blog._id 
                          ? 'text-yellow-400 cursor-wait' 
                          : deletingBlogId !== null 
                            ? 'text-red-400 opacity-50 cursor-not-allowed'
                            : 'text-red-400 hover:text-red-300'
                      }`}
                      title={deletingBlogId === blog._id ? 'Deleting...' : 'Delete'}
                    >
                      {deletingBlogId === blog._id ? (
                        <svg className="animate-spin h-[18px] w-[18px]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : (
                        <FaTrash size={18} />
                      )}
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Title */}
            <h2 className="text-xl font-bold text-white mb-2">{blog.title}</h2>

            {/* Content Preview - always show truncated version */}
            {isMarkdownContent(blog.content) ? (
              <div className="markdown-content max-h-24 overflow-hidden">
                <BlogContentRenderer
                  content={truncateContent(blog.content)}
                  className="prose prose-invert max-w-none"
                />
                <style jsx global>{`
                  .markdown-content .ProseMirror {
                    min-height: auto !important;
                    padding: 0 !important;
                    overflow: visible !important;
                  }
                  
                  .markdown-content h1, 
                  .markdown-content h2, 
                  .markdown-content h3,
                  .markdown-content h4,
                  .markdown-content h5,
                  .markdown-content h6 {
                    margin-top: 1.5em;
                    margin-bottom: 0.75em;
                    font-weight: bold;
                    line-height: 1.2;
                  }
                  
                  .markdown-content h1 {
                    font-size: 1.75rem;
                  }
                  
                  .markdown-content h2 {
                    font-size: 1.5rem;
                  }
                  
                  .markdown-content h3 {
                    font-size: 1.25rem;
                  }
                  
                  .markdown-content p {
                    margin-bottom: 1em;
                    line-height: 1.6;
                  }
                  
                  .markdown-content ul, 
                  .markdown-content ol {
                    margin-bottom: 1em;
                    padding-left: 1.5em;
                  }
                  
                  .markdown-content ul {
                    list-style-type: disc;
                  }
                  
                  .markdown-content ol {
                    list-style-type: decimal;
                  }
                  
                  .markdown-content li {
                    margin-bottom: 0.5em;
                  }
                  
                  .markdown-content blockquote {
                    border-left: 3px solid #4b5563;
                    padding-left: 1em;
                    margin: 1em 0;
                    font-style: italic;
                  }
                  
                  .markdown-content pre {
                    background-color: #1f2937;
                    padding: 1em;
                    border-radius: 4px;
                    margin: 1em 0;
                    overflow-x: auto;
                  }
                  
                  .markdown-content code {
                    background-color: rgba(75, 85, 99, 0.4);
                    padding: 0.2em 0.4em;
                    border-radius: 0.25em;
                    font-family: monospace;
                  }
                  
                  /* Enhanced link styling to match the older blog styling */
                  .markdown-content a,
                  .markdown-content .ProseMirror a,
                  .markdown-content .blog-link {
                    color: #f700ff !important; /* Neon pink/violet */
                    text-decoration: underline !important;
                    cursor: pointer !important;
                    text-shadow: 0 0 5px rgba(247, 0, 255, 0.5) !important;
                    transition: all 0.2s ease !important;
                  }
                  
                  .markdown-content a:hover,
                  .markdown-content .ProseMirror a:hover,
                  .markdown-content .blog-link:hover {
                    color: #cb6ce6 !important; /* Lighter neon pink/violet on hover */
                    text-shadow: 0 0 8px rgba(247, 0, 255, 0.7) !important;
                  }
                  
                  .markdown-content hr {
                    margin: 2em 0;
                    border: none;
                    border-top: 1px solid #4b5563;
                  }
                `}</style>
              </div>
            ) : (
              <div
                className="prose prose-invert max-w-none line-clamp-3"
                dangerouslySetInnerHTML={{
                  __html: sanitizeBlogHtml(truncateContent(blog.content)),
                }}
              />
            )}
            
            <style jsx global>{`
              /* Standard HTML content links styling to match markdown links */
              .prose a {
                color: #f700ff !important; /* Neon pink/violet */
                text-decoration: underline !important;
                cursor: pointer !important;
                text-shadow: 0 0 5px rgba(247, 0, 255, 0.5) !important;
                transition: all 0.2s ease !important;
              }
              
              .prose a:hover {
                color: #cb6ce6 !important; /* Lighter neon pink/violet on hover */
                text-shadow: 0 0 8px rgba(247, 0, 255, 0.7) !important;
              }
            `}</style>

            {/*
              All blog links (internal navigation AND the Share button) now
              point at the canonical /learn/{slug}-{id} URL. Matches the
              sitemap and the <link rel=canonical> on BlogPage. Social
              previews are served on that URL by the learn-blog Edge Function,
              and Google consolidates ranking signals on the same URL. The
              legacy /share/blog/:id wrapper still exists as a backward-compat
              route for links already shared in the wild.
            */}
            <Link
              to={`/learn/${createSlug(blog.title)}-${blog._id}`}
              className="mt-2 text-blue-400 hover:text-blue-300 transition-colors inline-block"
            >
              Read More
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
};

export default BlogList; 