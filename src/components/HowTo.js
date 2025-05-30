import React, { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import BlogList from './BlogList';
import CreateBlogModal from './CreateBlogModal';
import { API_URL, deleteBlog } from '../services/api';
import { Markdown } from 'tiptap-markdown';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

// Helper function to create URL-friendly slugs
const createSlug = (title) => {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
};

// Helper function to extract blogId from slug URL
const extractBlogIdFromPath = (pathname) => {
  if (pathname.startsWith('/how-to/')) {
    const slug = pathname.substring('/how-to/'.length);
    const slugParts = slug.split('-');
    // The ID should be the last part after the last dash
    return slugParts[slugParts.length - 1];
  }
  return null;
};

const HowTo = ({ currentUser }) => {
  const [blogs, setBlogs] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingBlog, setEditingBlog] = useState(null);
  const [error, setError] = useState(null);
  const [videoError, setVideoError] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const blogListRef = useRef(null);
  const PLAYLIST_ID = 'PLKHtulN0_0h8hun9lEhYHPGm4Mqophidj';

  useEffect(() => {
    // On component mount, check if we're coming from an SEO-friendly URL
    const params = new URLSearchParams(location.search);
    const queryBlogId = params.get('blogId');
    
    // Check if we're on a path-based URL
    const pathBlogId = extractBlogIdFromPath(location.pathname);
    
    // If we have a blogId in the path but not in query params, redirect to the query param version
    // This keeps our app's internal logic consistent while supporting SEO-friendly URLs
    if (pathBlogId && !queryBlogId) {
      // Keep any existing query parameters when redirecting
      const existingParams = location.search ? location.search : '';
      const separator = existingParams ? '&' : '?';
      
      navigate(`/how-to${existingParams}${separator}blogId=${pathBlogId}`, { replace: true });
    }
    
    // Use either the query param blogId or path blogId to fetch and display the blog
    const blogIdToUse = queryBlogId || pathBlogId;
    if (blogIdToUse) {
      fetchBlogs().then(() => {
        setSharedBlogId(blogIdToUse);
      });
    } else {
      fetchBlogs();
    }
  }, [location, navigate]);

  useEffect(() => {
    // Handle URL parameters for shared blogs
    const params = new URLSearchParams(location.search);
    const blogId = params.get('blogId');
    
    if (blogId && blogs.length > 0) {
      // Find the blog post with the matching ID
      const sharedBlog = blogs.find(blog => blog._id === blogId);
      
      if (sharedBlog) {
        // Update page title for SEO
        document.title = `${sharedBlog.title} - Aquads Blog`;
        
        // Update meta tags for sharing
        const dynamicTwitterImage = document.getElementById('dynamic-twitter-image');
        const dynamicTwitterTitle = document.getElementById('dynamic-twitter-title');
        const dynamicTwitterDesc = document.getElementById('dynamic-twitter-description');
        const dynamicOgImage = document.getElementById('dynamic-og-image');
        const dynamicOgTitle = document.getElementById('dynamic-og-title');
        const dynamicOgDesc = document.getElementById('dynamic-og-description');
        const dynamicOgUrl = document.getElementById('dynamic-og-url');
        
        // Create slug for SEO-friendly URL
        const slug = createSlug(sharedBlog.title);
        const seoUrl = `${window.location.origin}/how-to/${slug}-${blogId}`;
        
        // Clean the description for social media
        const cleanDescription = sharedBlog.content
          ? sharedBlog.content.replace(/<[^>]*>/g, '').slice(0, 200) + '...'
          : 'Read our latest blog post on Aquads!';

        if (dynamicTwitterImage) dynamicTwitterImage.content = sharedBlog.bannerImage || 'https://www.aquads.xyz/logo712.png';
        if (dynamicTwitterTitle) dynamicTwitterTitle.content = `${sharedBlog.title} - Aquads Blog`;
        if (dynamicTwitterDesc) dynamicTwitterDesc.content = cleanDescription;
        if (dynamicOgImage) dynamicOgImage.content = sharedBlog.bannerImage || 'https://www.aquads.xyz/logo712.png';
        if (dynamicOgTitle) dynamicOgTitle.content = `${sharedBlog.title} - Aquads Blog`;
        if (dynamicOgDesc) dynamicOgDesc.content = cleanDescription;
        if (dynamicOgUrl) dynamicOgUrl.content = seoUrl;
        
        // Add canonical URL for SEO
        let canonicalUrl = document.querySelector('link[rel="canonical"]');
        if (!canonicalUrl) {
          canonicalUrl = document.createElement('link');
          canonicalUrl.setAttribute('rel', 'canonical');
          document.head.appendChild(canonicalUrl);
        }
        canonicalUrl.setAttribute('href', seoUrl);
        
        // Scroll to and highlight the blog post
        const blogElement = document.getElementById(`blog-${blogId}`);
        if (blogElement) {
          blogElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Highlight the shared blog post
          blogElement.classList.add('ring-2', 'ring-blue-500');
          setTimeout(() => {
            blogElement.classList.remove('ring-2', 'ring-blue-500');
          }, 2000);
        }
      }
    }
  }, [location.search, blogs]);

  const fetchBlogs = async () => {
    try {
      const response = await fetch(`${API_URL}/blogs`);
      if (response.ok) {
        const data = await response.json();
        setBlogs(data);
      }
    } catch (error) {
      setError('Failed to fetch blogs');
    }
  };

  const handleCreateBlog = async (blogData) => {
    try {
      
      if (!currentUser) {
        setError('You must be logged in to create a blog post');
        return;
      }

      // Check if user is an admin
      if (!currentUser.isAdmin) {
        setError('Only administrators can create blog posts');
        return;
      }

      const token = currentUser.token || localStorage.getItem('token');
      
      if (!token) {
        setError('Authentication token not found. Please log in again.');
        return;
      }

      const requestData = {
        ...blogData,
        author: currentUser.username,
        userId: currentUser.userId
      };


      const response = await fetch(`${API_URL}/blogs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestData)
      });


      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to parse error response' }));
        if (response.status === 401) {
          setError('Your session has expired. Please log in again.');
        } else {
          setError(errorData.error || 'Failed to create blog post');
        }
        return;
      }

      const data = await response.json();
      setShowCreateModal(false);
      setError(null);
      fetchBlogs();
    } catch (error) {
      setError('Failed to create blog post. Please try again.');
    }
  };

  const handleEditBlog = async (blogData) => {
    try {
      const token = currentUser?.token || localStorage.getItem('token');
      
      if (!token) {
        setError('Authentication required. Please log in again.');
        return;
      }

      // Check if user is either the blog author or an admin
      if (editingBlog.author !== currentUser.userId && !currentUser.isAdmin) {
        setError('You do not have permission to edit this blog post');
        return;
      }

      // Use a simpler, more direct approach that matches the working delete function
      const response = await fetch(`${API_URL}/blogs/${editingBlog._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: blogData.title,
          content: blogData.content,
          bannerImage: blogData.bannerImage
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update blog');
      }

      await fetchBlogs();
      setEditingBlog(null);
      setShowCreateModal(false);
      setError(null);
    } catch (error) {
      setError('Failed to update blog. Please try again.');
    }
  };

  const handleDeleteBlog = async (blogId) => {
    try {
      // Get token from both possible sources
      const token = currentUser?.token || localStorage.getItem('token');
      
      if (!token) {
        setError('Authentication required. Please log in again.');
        return;
      }

      const response = await fetch(`${API_URL}/blogs/${blogId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Clear invalid token
          localStorage.removeItem('token');
          setError('Your session has expired. Please log in again.');
          return;
        }
        throw new Error(`Failed to delete blog: ${response.statusText}`);
      }

      // Only update UI if deletion was successful
      await fetchBlogs();
      setError(null);
    } catch (error) {
      setError(error.message || 'Failed to delete blog. Please try again.');
    }
  };

  // Get the currently shared blog
  const getSharedBlog = () => {
    const params = new URLSearchParams(location.search);
    const blogId = params.get('blogId');
    if (blogId && blogs.length > 0) {
      return blogs.find(blog => blog._id === blogId);
    }
    return null;
  };

  const sharedBlog = getSharedBlog();

  // Set up a blog for editing
  const handleBlogEdit = (blog) => {
    setEditingBlog(blog);
    setShowCreateModal(true);
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
  
  // Function to extract plain text from either Markdown or HTML
  const extractPlainText = (content, maxLength = 160) => {
    if (!content || typeof content !== 'string') return '';
    
    // Check if content is likely Markdown
    if (isMarkdownContent(content)) {
      // For Markdown, strip out markdown syntax
      return content
        .replace(/#{1,6}\s+/g, '') // Remove headers
        .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
        .replace(/\*(.*?)\*/g, '$1') // Remove italic
        .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Remove links but keep text
        .replace(/^\s*[-*+]\s+/gm, '') // Remove list markers
        .replace(/^\s*\d+\.\s+/gm, '') // Remove numbered list markers
        .replace(/\n/g, ' ') // Replace newlines with spaces
        .replace(/\s+/g, ' ') // Normalize spaces
        .trim()
        .slice(0, maxLength) + (content.length > maxLength ? '...' : '');
    } else {
      // For HTML, strip tags
      return content
        .replace(/<[^>]*>/g, '')
        .trim()
        .slice(0, maxLength) + (content.length > maxLength ? '...' : '');
    }
  };

  return (
    <div className="h-screen overflow-y-auto bg-gray-900 text-white">
      <Helmet>
        {sharedBlog ? (
          // Dynamic meta tags for a specific blog post
          <>
            <title>{`${sharedBlog.title} - Aquads How To Guide`}</title>
            <meta name="description" content={extractPlainText(sharedBlog.content)} />
            <meta property="og:title" content={`${sharedBlog.title} - Aquads Blog`} />
            <meta property="og:description" content={extractPlainText(sharedBlog.content)} />
            <meta property="og:image" content={sharedBlog.bannerImage} />
            <meta property="og:url" content={`${window.location.origin}/how-to?blogId=${sharedBlog._id}`} />
            <meta property="og:type" content="article" />
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={`${sharedBlog.title} - Aquads Blog`} />
            <meta name="twitter:description" content={extractPlainText(sharedBlog.content)} />
            <meta name="twitter:image" content={sharedBlog.bannerImage} />
            
            {/* Canonical link for SEO */}
            <link 
              rel="canonical" 
              href={`${window.location.origin}/how-to/${createSlug(sharedBlog.title)}-${sharedBlog._id}`} 
            />
            
            {/* JSON-LD BlogPosting schema.org structured data */}
            <script type="application/ld+json">
              {JSON.stringify({
                "@context": "https://schema.org",
                "@type": "BlogPosting",
                "headline": sharedBlog.title,
                "image": sharedBlog.bannerImage,
                "datePublished": sharedBlog.createdAt,
                "dateModified": sharedBlog.updatedAt || sharedBlog.createdAt,
                "author": {
                  "@type": "Person",
                  "name": sharedBlog.authorUsername || sharedBlog.author
                },
                "publisher": {
                  "@type": "Organization",
                  "name": "Aquads",
                  "logo": {
                    "@type": "ImageObject",
                    "url": "https://aquads.xyz/logo192.png"
                  }
                },
                "description": sharedBlog.content?.replace(/<[^>]*>/g, '').slice(0, 160),
                "mainEntityOfPage": {
                  "@type": "WebPage",
                  "@id": `${window.location.origin}/how-to?blogId=${sharedBlog._id}`
                }
              })}
            </script>
          </>
        ) : (
          // Default meta tags for the How To page
          <>
            <title>How To Guide - Aquads</title>
            <meta name="description" content="Learn how to use Aquads platform with our video tutorials and community blog posts" />
          </>
        )}
        <link rel="canonical" href={`${window.location.origin}${location.pathname.split('?')[0]}`} />
        {location.search && <meta name="robots" content="noindex, follow" />}
      </Helmet>

      {/* Header */}
      <div className="bg-gray-800/50 backdrop-blur-sm border-b border-gray-700/50">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link to="/" className="text-2xl font-bold text-blue-400">
                Aquads
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                to="/marketplace"
                className="bg-indigo-500/80 hover:bg-indigo-600/80 px-4 py-2 rounded shadow-lg hover:shadow-indigo-500/50 transition-all duration-300 backdrop-blur-sm"
              >
                Freelancer Hub
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4 text-blue-400">How To Guide</h1>
          <p className="text-gray-400 text-lg">
            Learn how to make the most of Aquads with our video tutorials and community blog posts
          </p>
        </div>

        {/* Video Section */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold mb-6 text-white">Video Tutorials</h2>
          <div className="aspect-w-16 aspect-h-9 bg-gray-800 rounded-lg overflow-hidden">
            {videoError ? (
              <div className="flex items-center justify-center h-full text-gray-400">
                <p>Failed to load video playlist. Please try refreshing the page.</p>
              </div>
            ) : (
              <iframe
                src={`https://www.youtube.com/embed/videoseries?list=${PLAYLIST_ID}&enablejsapi=1`}
                title="Aquads Tutorials"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full min-h-[600px]"
                onError={() => setVideoError(true)}
                loading="lazy"
              />
            )}
          </div>
        </div>

        {/* Blog Section */}
        <div className="mt-16" ref={blogListRef}>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-white">Community Blog Posts</h2>
            {currentUser && currentUser.isAdmin ? (
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded transition-colors"
              >
                Create Blog Post
              </button>
            ) : currentUser ? (
              <div className="text-gray-400">
                <span>Only administrators can create blog posts</span>
              </div>
            ) : (
              <button
                onClick={() => {
                  // When clicked, get the ref parameter and pass it to the "Create Account" modal
                  const params = new URLSearchParams(window.location.search);
                  const refCode = params.get('ref');
                  
                  // Set the referral code in session storage so it can be accessed by the CreateAccountModal
                  if (refCode) {
                    sessionStorage.setItem('pendingReferralCode', refCode);
                  }
                  
                  // Navigate to the main page with "showCreateAccount=true" parameter
                  window.location.href = `/?showCreateAccount=true${refCode ? `&ref=${refCode}` : ''}`;
                }}
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded transition-colors"
              >
                Create Account
              </button>
            )}
          </div>
          
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-500 px-4 py-2 rounded mb-4">
              {error}
            </div>
          )}
          
          <BlogList
            blogs={blogs}
            currentUser={currentUser}
            onEditBlog={handleBlogEdit}
            onDeleteBlog={handleDeleteBlog}
          />
        </div>

        {/* Create/Edit Blog Modal */}
        {showCreateModal && (
          <CreateBlogModal
            onClose={() => {
              setShowCreateModal(false);
              setEditingBlog(null);
            }}
            onSubmit={editingBlog ? handleEditBlog : handleCreateBlog}
            initialData={editingBlog}
          />
        )}
      </div>
    </div>
  );
};

export default HowTo; 