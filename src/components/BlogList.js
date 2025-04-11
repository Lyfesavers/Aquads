import React, { useState, useRef, useEffect } from 'react';
import { FaShare, FaEdit, FaTrash } from 'react-icons/fa';
import DOMPurify from 'dompurify';
import { Markdown } from 'tiptap-markdown';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';

// Helper function to create URL-friendly slugs
const createSlug = (title) => {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
};

// Markdown renderer component
const MarkdownRenderer = ({ content }) => {
  const [ready, setReady] = useState(false);
  // Add a key to force re-rendering when content changes
  const editorKey = useRef(Math.random().toString(36).substring(7)).current;
  
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: true,
        HTMLAttributes: {
          class: 'blog-link',
          target: '_blank',
          rel: 'noopener noreferrer'
        },
        autolink: true,
      }),
      Markdown.configure({
        html: false,
        tightLists: true,
        bulletListMarker: '-',
        linkify: true, // Enable automatic link detection
      }),
    ],
    content: content,
    editable: false,
    onBeforeCreate({ editor }) {
      // Process Markdown in a more explicit way
      if (content && typeof content === 'string') {
        // Let the editor fully initialize first
        setTimeout(() => {
          try {
            // Force the Markdown extension to parse the content
            const md = editor.storage.markdown;
            if (md) {
              // Process links in Markdown - look for [text](url) pattern
              const contentWithEnhancedLinks = content.replace(
                /\[([^\]]+)\]\(([^)]+)\)/g, 
                (match, text, url) => {
                  return `[${text}](${url})`;
                }
              );
              editor.commands.setContent(contentWithEnhancedLinks);
              setReady(true);
            }
          } catch (err) {
            console.error('Error parsing Markdown:', err);
            // Fallback to simply setting content
            editor.commands.setContent(content);
            setReady(true);
          }
        }, 0);
      } else {
        setReady(true);
      }
    },
  }, [content]); // Re-initialize when content changes

  // Update editor content when it changes externally
  useEffect(() => {
    if (editor && content) {
      editor.commands.setContent(content);
    }
  }, [editor, content]);

  if (!editor || !ready) {
    return <div className="animate-pulse bg-gray-700 h-24 rounded"></div>;
  }

  return (
    <EditorContent key={editorKey + content.slice(0, 20)} editor={editor} className="prose prose-invert max-w-none" />
  );
};

const BlogList = ({ blogs, currentUser, onEditBlog, onDeleteBlog }) => {
  const [expandedBlogId, setExpandedBlogId] = useState(null);
  // Track blogs that have been expanded at least once to keep their full content
  const [expandedBlogs, setExpandedBlogs] = useState({});
  
  // Function to toggle blog expansion
  const toggleBlogExpansion = (blogId) => {
    // If expanding a blog for the first time, store it in expandedBlogs
    if (blogId !== expandedBlogId) {
      setExpandedBlogs(prev => ({
        ...prev,
        [blogId]: true
      }));
    }
    setExpandedBlogId(expandedBlogId === blogId ? null : blogId);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleShare = (blog) => {
    // Create SEO-friendly URL with slug and ID for sharing on social media
    const slug = createSlug(blog.title);
    const shareUrl = `${window.location.origin}/how-to/${slug}-${blog._id}`;
    
    // Add referral code if user is logged in (as a separate parameter)
    // The redirect rule will preserve this parameter
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
  const isMarkdownContent = (content) => {
    if (!content || typeof content !== 'string') return false;
    
    // More comprehensive check for Markdown patterns
    return (
      /^#+ .+/m.test(content) || // Headers
      /\n#+ .+/m.test(content) || // Headers after newline
      /\n- .+/m.test(content) || // List items after newline
      /^- .+/m.test(content) || // List items at start
      /\n\* .+/m.test(content) || // Asterisk list items
      /^(>\s.*)+$/m.test(content) || // Blockquotes
      /\*\*[^*]+\*\*/m.test(content) || // Bold text
      /\*[^*]+\*/m.test(content) || // Italic text
      /\[.+\]\(.+\)/m.test(content) || // Links
      /`[^`]+`/m.test(content) || // Inline code
      /^\s*```[\s\S]*?```\s*$/m.test(content) // Code blocks
    );
  };

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
                {currentUser && (currentUser.userId === blog.author || currentUser.isAdmin) && (
                  <>
                    <button
                      onClick={() => onEditBlog(blog)}
                      className="text-blue-400 hover:text-blue-300 transition-colors"
                      title="Edit"
                    >
                      <FaEdit size={18} />
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm('Are you sure you want to delete this blog post?')) {
                          onDeleteBlog(blog._id);
                        }
                      }}
                      className="text-red-400 hover:text-red-300 transition-colors"
                      title="Delete"
                    >
                      <FaTrash size={18} />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Title */}
            <h2 className="text-xl font-bold text-white mb-2">{blog.title}</h2>

            {/* Content Preview - conditionally render based on content type */}
            {isMarkdownContent(blog.content) ? (
              <div className={`markdown-content ${expandedBlogId === blog._id ? 'expanded' : 'max-h-24 overflow-hidden'}`}>
                <MarkdownRenderer 
                  content={expandedBlogId === blog._id || expandedBlogs[blog._id] ? blog.content : truncateContent(blog.content)} 
                />
                <style jsx global>{`
                  /* Full height styles to ensure all content is visible */
                  .markdown-content.expanded {
                    max-height: none !important;
                    height: auto !important;
                    overflow: visible !important;
                    display: block !important;
                  }
                  
                  .markdown-content.expanded .ProseMirror {
                    display: block !important;
                    height: auto !important;
                    min-height: auto !important;
                    max-height: none !important;
                    overflow: visible !important;
                  }
                  
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
                className={`prose prose-invert max-w-none ${
                  expandedBlogId === blog._id ? '' : 'line-clamp-3'
                }`}
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(
                    expandedBlogId === blog._id ? blog.content : truncateContent(blog.content)
                  )
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

            {/* Read More Button */}
            <button
              onClick={() => toggleBlogExpansion(blog._id)}
              className="mt-2 text-blue-400 hover:text-blue-300 transition-colors"
            >
              {expandedBlogId === blog._id ? 'Show Less' : 'Read More'}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default BlogList; 