import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { FaArrowLeft, FaShare, FaEdit, FaTrash, FaClock, FaUser } from 'react-icons/fa';
import { Markdown } from 'tiptap-markdown';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import LinkExtension from '@tiptap/extension-link';
import CreateBlogModal from './CreateBlogModal';
import LoginModal from './LoginModal';
import CreateAccountModal from './CreateAccountModal';
import CreateAdModal from './CreateAdModal';
import CreateBannerModal from './CreateBannerModal';
import ProfileModal from './ProfileModal';
import { API_URL } from '../services/api';
import Dashboard from './Dashboard';
import { getDisplayName } from '../utils/nameUtils';

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

// Helper function to extract blogId from slug
const extractBlogIdFromSlug = (slug) => {
  if (!slug) return null;
  const parts = slug.split('-');
  return parts[parts.length - 1];
};

// Markdown renderer component
const MarkdownRenderer = ({ content }) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      LinkExtension.configure({
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
        linkify: true,
      }),
    ],
    content: content,
    editable: false,
  }, [content]);

  if (!editor) {
    return <div className="animate-pulse bg-gray-700 h-24 rounded"></div>;
  }

  return (
    <EditorContent 
      editor={editor} 
      className="prose prose-invert prose-lg max-w-none blog-content"
    />
  );
};

const BlogPage = ({ currentUser, onLogin, onLogout, onCreateAccount, openMintFunnelPlatform, ads = [] }) => {
  const { slug, id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [blog, setBlog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [relatedBlogs, setRelatedBlogs] = useState([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showCreateAccountModal, setShowCreateAccountModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showBannerModal, setShowBannerModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showUserDropdown && !event.target.closest('.user-dropdown')) {
        setShowUserDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserDropdown]);

  // Extract blog ID from slug, /share/blog/:id, or URL params
  const blogId = id || extractBlogIdFromSlug(slug) || new URLSearchParams(location.search).get('blogId');

  useEffect(() => {
    if (!blogId) {
      setError('Blog ID not found');
      setLoading(false);
      return;
    }

    fetchBlog();
    fetchRelatedBlogs();
  }, [blogId]);

  // Update browser URL to show /share/blog/:id when viewing via /learn/:slug
  // This ensures copied URLs have proper metadata
  useEffect(() => {
    if (blog && blog._id && location.pathname.startsWith('/learn/')) {
      // If we're on /learn/:slug but have the blog loaded, update URL to /share/blog/:id
      const shareUrl = `/share/blog/${blog._id}`;
      if (location.pathname !== shareUrl) {
        navigate(shareUrl, { replace: true });
      }
    }
  }, [blog, location.pathname, navigate]);

  // Load Coinscribble ad widget script
  useEffect(() => {
    const loadCoinscribbleScript = () => {
      // Check if script already exists
      if (document.getElementById('coinscribble-widget-script')) {
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://cdn.coinscribble.sapient.tools/js/widget2.js';
      script.async = true;
      script.id = 'coinscribble-widget-script';
      
      document.head.appendChild(script);
    };

    // Load script after blog content is loaded
    if (blog) {
      loadCoinscribbleScript();
    }
  }, [blog]);

  const fetchBlog = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/blogs/${blogId}`);
      if (!response.ok) {
        throw new Error('Blog not found');
      }
      const blogData = await response.json();
      setBlog(blogData);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchRelatedBlogs = async () => {
    try {
      const response = await fetch(`${API_URL}/blogs`);
      if (response.ok) {
        const allBlogs = await response.json();
        // Get related blogs (excluding current blog)
        const related = allBlogs
          .filter(b => b._id !== blogId)
          .slice(0, 3);
        setRelatedBlogs(related);
      }
    } catch (err) {
      console.error('Failed to fetch related blogs:', err);
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleShare = () => {
    // Use /share/blog/:id for proper social media meta tags (blog image, title, etc.)
    // This ensures crawlers always get the correct metadata, just like /share/aquaswap
    if (!blog || !blog._id) {
      alert('Blog information not available');
      return;
    }
    
    const shareUrl = `${window.location.origin}/share/blog/${blog._id}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      alert('Blog link copied to clipboard!');
    }).catch(err => {
      console.error('Failed to copy:', err);
    });
  };

  const handleEdit = () => {
    setShowEditModal(true);
  };

  const handleEditBlog = async (blogData) => {
    try {
      const token = currentUser?.token || localStorage.getItem('token');
      
      if (!token) {
        alert('Authentication required. Please log in again.');
        return;
      }

      // Check if user is either the blog author or an admin
      if (blog.author !== currentUser.userId && !currentUser.isAdmin) {
        alert('You do not have permission to edit this blog post');
        return;
      }

      const response = await fetch(`${API_URL}/blogs/${blog._id}`, {
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

      // Refresh the blog data to show updated content
      await fetchBlog();
      setShowEditModal(false);
      alert('Blog updated successfully!');
    } catch (error) {
      alert(error.message || 'Failed to update blog. Please try again.');
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this blog post?')) {
      try {
        // Get token from both possible sources
        const token = currentUser?.token || localStorage.getItem('token');
        
        if (!token) {
          alert('Authentication required. Please log in again.');
          return;
        }

        const response = await fetch(`${API_URL}/blogs/${blog._id}`, {
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
            alert('Your session has expired. Please log in again.');
            return;
          }
          throw new Error(`Failed to delete blog: ${response.statusText}`);
        }

        // Navigate back to blog list after successful deletion
        navigate('/learn');
      } catch (error) {
        alert(error.message || 'Failed to delete blog. Please try again.');
      }
    }
  };

  const getReadingTime = (content) => {
    const wordsPerMinute = 200;
    const words = content.replace(/<[^>]*>/g, '').split(/\s+/).length;
    const minutes = Math.ceil(words / wordsPerMinute);
    return `${minutes} min read`;
  };

  const extractPlainText = (content) => {
    return content ? content.replace(/<[^>]*>/g, '').slice(0, 160) : '';
  };



  const handleLoginSubmit = async (credentials) => {
    try {
      await onLogin(credentials);
      setShowLoginModal(false);
      // No need to set currentUser or localStorage here as it's handled in App.js
    } catch (error) {
      console.error('Login error:', error);
      // Show error in the LoginModal
      // The error will be shown in the LoginModal component
    }
  };

  const handleCreateAccountSubmit = async (formData) => {
    try {
      await onCreateAccount(formData);
      setShowCreateAccountModal(false);
      // The welcome modal and other state updates are handled in App.js
      // No need to duplicate that logic here
    } catch (error) {
      console.error('Create account error:', error);
      // Error will be shown in the CreateAccountModal component
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-yellow-400">
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-700 rounded w-1/4 mb-8"></div>
            <div className="h-64 bg-gray-700 rounded w-full mb-8"></div>
            <div className="h-12 bg-gray-700 rounded w-3/4 mb-4"></div>
            <div className="h-4 bg-gray-700 rounded w-1/2 mb-8"></div>
            <div className="space-y-4">
              <div className="h-4 bg-gray-700 rounded"></div>
              <div className="h-4 bg-gray-700 rounded"></div>
              <div className="h-4 bg-gray-700 rounded w-5/6"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !blog) {
    return (
      <div className="min-h-screen bg-gray-900 text-yellow-400">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">Blog Not Found</h1>
            <p className="text-gray-400 mb-8">{error || 'The blog post you\'re looking for doesn\'t exist.'}</p>
            <Link
              to="/learn"
              className="bg-blue-500 hover:bg-blue-600 text-yellow-400 px-6 py-3 rounded-lg transition-colors inline-flex items-center gap-2"
            >
              <FaArrowLeft />
              Back to Blog List
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const canonicalUrl = `${window.location.origin}/learn/${createSlug(blog.title)}-${blog._id}`;
  const plainTextContent = extractPlainText(blog.content);

  return (
    <div className="min-h-screen bg-gray-900 text-yellow-400">
      <Helmet>
        <title>{blog.title} - Aquads Blog</title>
        <meta name="description" content={plainTextContent} />
        <link rel="canonical" href={canonicalUrl} />
        
        {/* Open Graph meta tags */}
        <meta property="og:title" content={`${blog.title} - Aquads Blog`} />
        <meta property="og:description" content={plainTextContent} />
        <meta property="og:image" content={blog.bannerImage || 'https://www.aquads.xyz/logo712.png'} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:type" content="article" />
        <meta property="article:published_time" content={blog.createdAt} />
        <meta property="article:modified_time" content={blog.updatedAt || blog.createdAt} />
        <meta property="article:author" content={blog.authorUsername} />
        
        {/* Twitter Card meta tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${blog.title} - Aquads Blog`} />
        <meta name="twitter:description" content={plainTextContent} />
        <meta name="twitter:image" content={blog.bannerImage || 'https://www.aquads.xyz/logo712.png'} />
        
        {/* JSON-LD BlogPosting schema.org structured data */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            "headline": blog.title,
            "image": blog.bannerImage,
            "datePublished": blog.createdAt,
            "dateModified": blog.updatedAt || blog.createdAt,
            "author": {
              "@type": "Person",
              "name": blog.authorUsername || blog.author,
              "image": blog.authorImage
            },
            "publisher": {
              "@type": "Organization",
              "name": "Aquads",
              "logo": {
                "@type": "ImageObject",
                "url": "https://aquads.xyz/logo192.png"
              }
            },
            "description": plainTextContent,
            "mainEntityOfPage": {
              "@type": "WebPage",
              "@id": canonicalUrl
            },
            "wordCount": blog.content.replace(/<[^>]*>/g, '').split(/\s+/).length,
            "articleBody": blog.content.replace(/<[^>]*>/g, ''),
            "url": canonicalUrl
          })}
        </script>
      </Helmet>

      {/* Header Navigation */}
      <nav className="fixed top-0 left-0 right-0 bg-gray-800/80 backdrop-blur-sm z-[200000]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Link to="/home" className="flex items-center">
                <img 
                  src="/Aquadsnewlogo.png" 
                  alt="AQUADS" 
                  className="w-auto filter drop-shadow-lg"
                  style={{height: '2rem', filter: 'drop-shadow(0 0 10px rgba(59, 130, 246, 0.6))'}}
                />
              </Link>
            </div>
            
            {/* Mobile menu button */}
            <div className="md:hidden">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="text-gray-300 hover:text-yellow-400 p-2"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {isMobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>

            {/* Desktop menu */}
            <div className="hidden md:flex items-center space-x-3">
              {/* Main Navigation - Smaller buttons */}
              <Link
                to="/marketplace"
                className="bg-gray-700/90 hover:bg-gray-600/90 px-3 py-1.5 rounded text-sm shadow-lg hover:shadow-gray-500/30 transition-all duration-300 backdrop-blur-sm text-yellow-400"
              >
                Freelancer
              </Link>
              <Link
                to="/games"
                className="bg-gray-700/90 hover:bg-gray-600/90 px-3 py-1.5 rounded text-sm shadow-lg hover:shadow-gray-500/30 transition-all duration-300 backdrop-blur-sm text-yellow-400"
              >
                Games
              </Link>
              <button
                onClick={openMintFunnelPlatform}
                className="bg-gray-700/90 hover:bg-gray-600/90 px-3 py-1.5 rounded text-sm shadow-lg hover:shadow-gray-500/30 transition-all duration-300 backdrop-blur-sm text-yellow-400"
              >
                Paid Ads
              </button>
              <Link
                to="/learn"
                className="bg-gray-700/90 hover:bg-gray-600/90 px-3 py-1.5 rounded text-sm shadow-lg hover:shadow-gray-500/30 transition-all duration-300 backdrop-blur-sm text-yellow-400"
              >
                Learn
              </Link>
              <Link
                to="/why-list"
                className="bg-gray-700/90 hover:bg-gray-600/90 px-3 py-1.5 rounded text-sm shadow-lg hover:shadow-gray-500/30 transition-all duration-300 backdrop-blur-sm text-yellow-400"
              >
                Why List?
              </Link>

              {currentUser ? (
                <>
                  {/* User Dropdown */}
                  <div className="relative user-dropdown">
                    <button 
                      onClick={() => setShowUserDropdown(!showUserDropdown)}
                      className="flex items-center bg-gray-700/90 hover:bg-gray-600/90 px-3 py-1.5 rounded text-sm shadow-lg hover:shadow-gray-500/30 transition-all duration-300 backdrop-blur-sm text-yellow-400"
                    >
                      <span className="mr-1">{getDisplayName(currentUser)}</span>
                      <svg className={`w-4 h-4 ml-1 transition-transform ${showUserDropdown ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                    
                                         {/* Dropdown Menu */}
                     {showUserDropdown && (
                      <div className="absolute right-0 mt-2 w-48 bg-gray-800/95 backdrop-blur-sm rounded-lg shadow-xl border border-gray-700/50 z-50">
                        <div className="py-2">
                          <button
                            onClick={() => {
                              navigate('/home');
                              setShowUserDropdown(false);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:text-yellow-400 hover:bg-blue-600/50 transition-colors"
                          >
                            🏠 Back to Main
                           </button>
                           <button
                             onClick={() => {
                               setShowDashboard(true);
                               setShowUserDropdown(false);
                             }}
                             className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:text-yellow-400 hover:bg-purple-600/50 transition-colors"
                           >
                             📊 Dashboard
                           </button>
                           <button
                             onClick={() => {
                               setShowCreateModal(true);
                               setShowUserDropdown(false);
                             }}
                             className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:text-yellow-400 hover:bg-purple-600/50 transition-colors"
                           >
                             ➕ List Project
                           </button>
                           <button
                             onClick={() => {
                               setShowBannerModal(true);
                               setShowUserDropdown(false);
                             }}
                             className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:text-yellow-400 hover:bg-blue-600/50 transition-colors"
                           >
                             🎨 Create Banner Ad
                           </button>
                           <button
                             onClick={() => {
                               setShowProfileModal(true);
                               setShowUserDropdown(false);
                             }}
                             className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:text-yellow-400 hover:bg-purple-600/50 transition-colors"
                           >
                             ⚙️ Edit Profile
                           </button>
                           <hr className="my-2 border-gray-700" />
                           <button
                             onClick={() => {
                               onLogout();
                               setShowUserDropdown(false);
                             }}
                             className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:text-yellow-400 hover:bg-red-600/50 transition-colors"
                           >
                             🚪 Logout
                           </button>
                         </div>
                       </div>
                     )}
                  </div>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setShowLoginModal(true)}
                    className="bg-blue-500/80 hover:bg-blue-600/80 px-3 py-1.5 rounded text-sm shadow-lg hover:shadow-blue-500/50 transition-all duration-300 backdrop-blur-sm"
                  >
                    Login
                  </button>
                  <button
                    onClick={() => setShowCreateAccountModal(true)}
                    className="bg-green-500/80 hover:bg-green-600/80 px-3 py-1.5 rounded text-sm shadow-lg hover:shadow-green-500/50 transition-all duration-300 backdrop-blur-sm"
                  >
                    Create Account
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Mobile menu */}
          <div className={`${isMobileMenuOpen ? 'block' : 'hidden'} md:hidden py-2 z-[200000] relative bg-black`}>
            <div className="flex flex-col space-y-2">
              <Link
                to="/marketplace"
                className="bg-gray-700/90 hover:bg-gray-600/90 px-4 py-2 rounded shadow-lg hover:shadow-gray-500/30 transition-all duration-300 backdrop-blur-sm text-center text-yellow-400"
              >
                Freelancer Hub
              </Link>
              <Link
                to="/games"
                className="bg-gray-700/90 hover:bg-gray-600/90 px-4 py-2 rounded shadow-lg hover:shadow-gray-500/30 transition-all duration-300 backdrop-blur-sm text-center text-yellow-400"
              >
                GameHub
              </Link>
              <button
                onClick={openMintFunnelPlatform}
                className="bg-gray-700/90 hover:bg-gray-600/90 px-4 py-2 rounded shadow-lg hover:shadow-gray-500/30 transition-all duration-300 backdrop-blur-sm text-center text-yellow-400"
              >
                Paid Ads
              </button>
              <Link
                to="/learn"
                className="bg-gray-700/90 hover:bg-gray-600/90 px-4 py-2 rounded shadow-lg hover:shadow-gray-500/30 transition-all duration-300 backdrop-blur-sm text-center text-yellow-400"
              >
                Learn
              </Link>
              <Link
                to="/why-list"
                className="bg-gray-700/90 hover:bg-gray-600/90 px-4 py-2 rounded shadow-lg hover:shadow-gray-500/30 transition-all duration-300 backdrop-blur-sm text-center text-yellow-400"
              >
                Why List?
              </Link>
                             {currentUser ? (
                 <>
                   <span className="text-blue-300 text-center">Welcome, {getDisplayName(currentUser)}!</span>
                  <button
                    onClick={() => {
                      navigate('/home');
                      setIsMobileMenuOpen(false);
                    }}
                    className="bg-gray-700/90 hover:bg-gray-600/90 px-4 py-2 rounded shadow-lg hover:shadow-gray-500/30 transition-all duration-300 backdrop-blur-sm text-yellow-400"
                  >
                    Back to Main
                   </button>
                   <button
                     onClick={() => {
                       setShowDashboard(true);
                       setIsMobileMenuOpen(false);
                     }}
                     className="bg-gray-700/90 hover:bg-gray-600/90 px-4 py-2 rounded shadow-lg hover:shadow-gray-500/30 transition-all duration-300 backdrop-blur-sm text-yellow-400"
                   >
                     📊 Dashboard
                   </button>
                   <button
                     onClick={() => {
                       setShowCreateModal(true);
                       setIsMobileMenuOpen(false);
                     }}
                     className="bg-gray-700/90 hover:bg-gray-600/90 px-4 py-2 rounded shadow-lg hover:shadow-gray-500/30 transition-all duration-300 backdrop-blur-sm text-yellow-400"
                   >
                     ➕ List Project
                   </button>
                   <button
                     onClick={() => {
                       setShowBannerModal(true);
                       setIsMobileMenuOpen(false);
                     }}
                     className="bg-gray-700/90 hover:bg-gray-600/90 px-4 py-2 rounded shadow-lg hover:shadow-gray-500/30 transition-all duration-300 backdrop-blur-sm text-yellow-400"
                   >
                     🎨 Create Banner Ad
                   </button>
                   <button
                     onClick={() => {
                       setShowProfileModal(true);
                       setIsMobileMenuOpen(false);
                     }}
                     className="bg-gray-700/90 hover:bg-gray-600/90 px-4 py-2 rounded shadow-lg hover:shadow-gray-500/30 transition-all duration-300 backdrop-blur-sm text-yellow-400"
                   >
                     ⚙️ Edit Profile
                   </button>
                   <button
                     onClick={() => {
                       onLogout();
                       setIsMobileMenuOpen(false);
                     }}
                     className="bg-gray-700/90 hover:bg-gray-600/90 px-4 py-2 rounded shadow-lg hover:shadow-gray-500/30 transition-all duration-300 backdrop-blur-sm text-yellow-400"
                   >
                     Logout
                   </button>
                 </>
               ) : (
                <>
                  <button
                    onClick={() => {
                      setShowLoginModal(true);
                      setIsMobileMenuOpen(false);
                    }}
                    className="bg-gray-700/90 hover:bg-gray-600/90 px-4 py-2 rounded shadow-lg hover:shadow-gray-500/30 transition-all duration-300 backdrop-blur-sm text-yellow-400"
                  >
                    Login
                  </button>
                  <button
                    onClick={() => {
                      setShowCreateAccountModal(true);
                      setIsMobileMenuOpen(false);
                    }}
                    className="bg-gray-700/90 hover:bg-gray-600/90 px-4 py-2 rounded shadow-lg hover:shadow-gray-500/30 transition-all duration-300 backdrop-blur-sm text-yellow-400"
                  >
                    Create Account
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Desktop: 2-column layout with sidebar, Mobile: single column */}
      <div className="container mx-auto px-4 py-8 pt-20 max-w-7xl">
        <div className="lg:flex lg:gap-8">
          {/* Main Content Column */}
          <div className="lg:flex-1 lg:max-w-4xl">
            {/* Navigation */}
            <nav className="mb-8">
              <Link
                to="/learn"
                className="text-blue-400 hover:text-blue-300 transition-colors inline-flex items-center gap-2"
              >
                <FaArrowLeft />
                Back to Blog List
              </Link>
            </nav>

            {/* Blog Header */}
            <header className="mb-8">
              {/* Banner Image */}
              {blog.bannerImage && (
                <div className="aspect-video mb-6 rounded-lg overflow-hidden">
                  <img
                    src={blog.bannerImage}
                    alt={blog.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Title */}
              <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
                {blog.title}
              </h1>

              {/* Meta info */}
              <div className="flex flex-wrap items-center gap-6 text-gray-400 mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full overflow-hidden">
                    <img
                      src={blog.authorImage || `https://ui-avatars.com/api/?name=${blog.authorUsername}&background=random`}
                      alt={blog.authorUsername}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <div className="font-medium text-yellow-400">{blog.authorUsername}</div>
                    <div className="text-sm">Author</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <FaClock />
                  <span>{formatDate(blog.createdAt)}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <FaUser />
                  <span>{getReadingTime(blog.content)}</span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-4 mb-8">
                <button
                  onClick={handleShare}
                  className="bg-blue-500 hover:bg-blue-600 text-yellow-400 px-4 py-2 rounded-lg transition-colors inline-flex items-center gap-2"
                >
                  <FaShare />
                  Share
                </button>
                
                {currentUser && (currentUser.userId === blog.author || currentUser.isAdmin) && (
                  <>
                    <button
                      onClick={handleEdit}
                      className="bg-gray-600 hover:bg-gray-700 text-yellow-400 px-4 py-2 rounded-lg transition-colors inline-flex items-center gap-2"
                    >
                      <FaEdit />
                      Edit
                    </button>
                    <button
                      onClick={handleDelete}
                      className="bg-red-600 hover:bg-red-700 text-yellow-400 px-4 py-2 rounded-lg transition-colors inline-flex items-center gap-2"
                    >
                      <FaTrash />
                      Delete
                    </button>
                  </>
                )}
              </div>
            </header>

            {/* Blog Content */}
            <article className="mb-12">
              <div className="blog-content-wrapper">
                <MarkdownRenderer content={blog.content} />
              </div>
            </article>

            {/* Mobile Ad Widget - Shows below content on mobile only */}
            <div 
              className="mb-12 flex justify-center lg:hidden"
              dangerouslySetInnerHTML={{
                __html: '<coinscribble-ad widget="ab1b9248-ce2b-4de0-abc8-b3fdde9f3a8b"></coinscribble-ad><script async src="https://cdn.coinscribble.sapient.tools/js/widget2.js"></script>'
              }}
            />

            {/* Related Blogs */}
            {relatedBlogs.length > 0 && (
              <section className="border-t border-gray-700 pt-8">
                <h2 className="text-2xl font-bold mb-6">Related Posts</h2>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {relatedBlogs.map((relatedBlog) => (
                    <Link
                      key={relatedBlog._id}
                      to={`/share/blog/${relatedBlog._id}`}
                      className="bg-gray-800 rounded-lg overflow-hidden hover:bg-gray-750 transition-colors group"
                    >
                      <div className="aspect-video">
                        <img
                          src={relatedBlog.bannerImage}
                          alt={relatedBlog.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                      <div className="p-4">
                        <h3 className="font-semibold mb-2 line-clamp-2 group-hover:text-blue-400 transition-colors">
                          {relatedBlog.title}
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                          <span>{relatedBlog.authorUsername}</span>
                          <span>•</span>
                          <span>{formatDate(relatedBlog.createdAt)}</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Sidebar with Vertical Ads - Desktop only */}
          <aside className="hidden lg:block lg:w-72 xl:w-80 lg:flex-shrink-0">
            <div className="sticky top-24">
              <div className="space-y-6">
                {/* Sidebar Ad Widget - Vertical */}
                <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
                  <div className="text-xs text-gray-500 uppercase tracking-wider mb-3 text-center">Sponsored</div>
                  <div 
                    dangerouslySetInnerHTML={{
                      __html: '<coinscribble-ad widget="ab1b9248-ce2b-4de0-abc8-b3fdde9f3a8b"></coinscribble-ad><script async src="https://cdn.coinscribble.sapient.tools/js/widget2.js"></script>'
                    }}
                  />
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>

       {/* Edit Blog Modal */}
       {showEditModal && (
         <CreateBlogModal
           onClose={() => setShowEditModal(false)}
           onSubmit={handleEditBlog}
           initialData={blog}
         />
       )}

               {/* Login Modal */}
        {showLoginModal && (
          <LoginModal
            onClose={() => setShowLoginModal(false)}
            onLogin={handleLoginSubmit}
            onCreateAccount={() => {
              setShowLoginModal(false);
              setShowCreateAccountModal(true);
            }}
          />
        )}

        {/* Create Account Modal */}
        {showCreateAccountModal && (
          <CreateAccountModal
            onClose={() => setShowCreateAccountModal(false)}
            onSubmit={handleCreateAccountSubmit}
          />
        )}

        {/* Create Ad Modal */}
        {showCreateModal && currentUser && (
          <CreateAdModal
            onCreateAd={() => {}}
            onClose={() => setShowCreateModal(false)}
            currentUser={currentUser}
            userAds={ads}
          />
        )}

        {/* Create Banner Modal */}
        {showBannerModal && currentUser && (
          <CreateBannerModal
            onSubmit={() => {}}
            onClose={() => setShowBannerModal(false)}
          />
        )}

        {/* Profile Modal */}
        {showProfileModal && currentUser && (
          <ProfileModal
            currentUser={currentUser}
            onClose={() => setShowProfileModal(false)}
            onProfileUpdate={() => {}}
          />
        )}

       <style jsx global>{`
        .blog-content-wrapper .blog-content {
          font-size: 1.125rem;
          line-height: 1.8;
        }
        
        .blog-content-wrapper .ProseMirror {
          min-height: auto !important;
          padding: 0 !important;
          overflow: visible !important;
          outline: none !important;
        }
        
        .blog-content-wrapper h1, 
        .blog-content-wrapper h2, 
        .blog-content-wrapper h3,
        .blog-content-wrapper h4,
        .blog-content-wrapper h5,
        .blog-content-wrapper h6 {
          margin-top: 2em;
          margin-bottom: 1em;
          font-weight: bold;
          line-height: 1.3;
          color: #ffffff;
        }
        
        .blog-content-wrapper h1 {
          font-size: 2rem;
        }
        
        .blog-content-wrapper h2 {
          font-size: 1.75rem;
        }
        
        .blog-content-wrapper h3 {
          font-size: 1.5rem;
        }
        
        .blog-content-wrapper h4 {
          font-size: 1.25rem;
        }
        
        .blog-content-wrapper p {
          margin-bottom: 1.5em;
          line-height: 1.8;
          color: #e5e7eb;
        }
        
        .blog-content-wrapper ul, 
        .blog-content-wrapper ol {
          margin-bottom: 1.5em;
          padding-left: 2em;
        }
        
        .blog-content-wrapper ul {
          list-style-type: disc;
        }
        
        .blog-content-wrapper ol {
          list-style-type: decimal;
        }
        
        .blog-content-wrapper li {
          margin-bottom: 0.5em;
          line-height: 1.7;
          color: #e5e7eb;
        }
        
        .blog-content-wrapper blockquote {
          border-left: 4px solid #6366f1;
          padding-left: 1.5em;
          margin: 2em 0;
          font-style: italic;
          color: #d1d5db;
          background-color: rgba(99, 102, 241, 0.1);
          padding: 1em 1.5em;
          border-radius: 0 0.5rem 0.5rem 0;
        }
        
        .blog-content-wrapper pre {
          background-color: #1f2937;
          padding: 1.5em;
          border-radius: 0.5rem;
          margin: 2em 0;
          overflow-x: auto;
          border: 1px solid #374151;
        }
        
        .blog-content-wrapper code {
          background-color: rgba(75, 85, 99, 0.6);
          padding: 0.3em 0.5em;
          border-radius: 0.25rem;
          font-family: 'Fira Code', 'Consolas', monospace;
          font-size: 0.9em;
        }
        
        .blog-content-wrapper pre code {
          background-color: transparent;
          padding: 0;
        }
        
        .blog-content-wrapper a,
        .blog-content-wrapper .blog-link {
          color: #f700ff !important;
          text-decoration: underline !important;
          cursor: pointer !important;
          text-shadow: 0 0 5px rgba(247, 0, 255, 0.5) !important;
          transition: all 0.2s ease !important;
        }
        
        .blog-content-wrapper a:hover,
        .blog-content-wrapper .blog-link:hover {
          color: #cb6ce6 !important;
          text-shadow: 0 0 8px rgba(247, 0, 255, 0.7) !important;
        }
        
        .blog-content-wrapper hr {
          margin: 3em 0;
          border: none;
          border-top: 2px solid #374151;
        }
        
        .blog-content-wrapper img {
          max-width: 100%;
          height: auto;
          border-radius: 0.5rem;
          margin: 2em auto;
          display: block;
        }
        
        .blog-content-wrapper table {
          width: 100%;
          border-collapse: collapse;
          margin: 2em 0;
        }
        
        .blog-content-wrapper th,
        .blog-content-wrapper td {
          border: 1px solid #374151;
          padding: 0.75em;
          text-align: left;
        }
        
        .blog-content-wrapper th {
          background-color: #374151;
          font-weight: bold;
        }
      `}</style>

      {/* Dashboard Modal */}
      {showDashboard && (
        <Dashboard
          currentUser={currentUser}
          onClose={() => setShowDashboard(false)}
          ads={[]}  // Pass empty array since blog page doesn't handle ads
        />
      )}

              {/* Login Modal */}
        {showLoginModal && (
          <LoginModal
            onClose={() => setShowLoginModal(false)}
            onLogin={handleLoginSubmit}
            onCreateAccount={() => {
              setShowLoginModal(false);
              setShowCreateAccountModal(true);
            }}
          />
        )}

        {/* Create Account Modal */}
        {showCreateAccountModal && (
          <CreateAccountModal
            onClose={() => setShowCreateAccountModal(false)}
            onSubmit={handleCreateAccountSubmit}
          />
        )}
    </div>
  );
};

export default BlogPage;