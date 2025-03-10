import React, { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet';
import { Link, useLocation } from 'react-router-dom';
import BlogList from './BlogList';
import CreateBlogModal from './CreateBlogModal';
import { API_URL, updateBlog } from '../services/api';

const HowTo = ({ currentUser }) => {
  const [blogs, setBlogs] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingBlog, setEditingBlog] = useState(null);
  const [error, setError] = useState(null);
  const [videoError, setVideoError] = useState(false);
  const location = useLocation();
  const blogListRef = useRef(null);
  const PLAYLIST_ID = 'PLKHtulN0_0h8hun9lEhYHPGm4Mqophidj';

  useEffect(() => {
    fetchBlogs();
  }, []);

  useEffect(() => {
    // Handle URL parameters for shared blogs
    const params = new URLSearchParams(location.search);
    const blogId = params.get('blogId');
    
    if (blogId && blogs.length > 0) {
      // Find the blog post with the matching ID
      const sharedBlog = blogs.find(blog => blog._id === blogId);
      
      if (sharedBlog) {
        // Update meta tags for sharing
        const dynamicTwitterImage = document.getElementById('dynamic-twitter-image');
        const dynamicTwitterTitle = document.getElementById('dynamic-twitter-title');
        const dynamicTwitterDesc = document.getElementById('dynamic-twitter-description');
        const dynamicOgImage = document.getElementById('dynamic-og-image');
        const dynamicOgTitle = document.getElementById('dynamic-og-title');
        const dynamicOgDesc = document.getElementById('dynamic-og-description');
        const dynamicOgUrl = document.getElementById('dynamic-og-url');

        if (dynamicTwitterImage) dynamicTwitterImage.content = sharedBlog.bannerImage;
        if (dynamicTwitterTitle) dynamicTwitterTitle.content = `${sharedBlog.title} - Aquads Blog`;
        if (dynamicTwitterDesc) dynamicTwitterDesc.content = sharedBlog.content?.replace(/<[^>]*>/g, '').slice(0, 200) + '...';
        if (dynamicOgImage) dynamicOgImage.content = sharedBlog.bannerImage;
        if (dynamicOgTitle) dynamicOgTitle.content = `${sharedBlog.title} - Aquads Blog`;
        if (dynamicOgDesc) dynamicOgDesc.content = sharedBlog.content?.replace(/<[^>]*>/g, '').slice(0, 200) + '...';
        if (dynamicOgUrl) dynamicOgUrl.content = window.location.href;

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
      console.error('Error fetching blogs:', error);
      setError('Failed to fetch blogs');
    }
  };

  const handleCreateBlog = async (blogData) => {
    try {
      console.log('Current user:', currentUser); // Debug log
      
      if (!currentUser) {
        console.log('No current user found'); // Debug log
        setError('You must be logged in to create a blog post');
        return;
      }

      const token = currentUser.token || localStorage.getItem('token');
      
      if (!token) {
        console.log('No token found in currentUser or localStorage'); // Debug log
        setError('Authentication token not found. Please log in again.');
        return;
      }

      const requestData = {
        ...blogData,
        author: currentUser.username,
        userId: currentUser.userId
      };

      console.log('Sending blog data:', requestData); // Debug log

      const response = await fetch(`${API_URL}/blogs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestData)
      });

      console.log('Response status:', response.status); // Debug log

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to parse error response' }));
        console.error('Error creating blog:', errorData);
        if (response.status === 401) {
          setError('Your session has expired. Please log in again.');
        } else {
          setError(errorData.error || 'Failed to create blog post');
        }
        return;
      }

      const data = await response.json();
      console.log('Blog created successfully:', data); // Debug log
      setShowCreateModal(false);
      setError(null);
      fetchBlogs();
    } catch (error) {
      console.error('Error creating blog:', error);
      setError('Failed to create blog post. Please try again.');
    }
  };

  const handleEditBlog = async (blogData) => {
    try {
      // Get token from both possible sources (same as handleDeleteBlog)
      const token = currentUser?.token || localStorage.getItem('token');
      
      if (!token) {
        console.error('No authentication token found');
        setError('Authentication required. Please log in again.');
        return;
      }

      const response = await fetch(`${API_URL}/blogs/${editingBlog._id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(blogData)
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Clear invalid token
          localStorage.removeItem('token');
          setError('Your session has expired. Please log in again.');
          return;
        }
        throw new Error(`Failed to update blog: ${response.statusText}`);
      }

      // Only update UI if edit was successful
      await fetchBlogs();
      setEditingBlog(null);
      setShowCreateModal(false);
      setError(null);
    } catch (error) {
      console.error('Error updating blog:', error);
      setError(error.message || 'Failed to update blog. Please try again.');
    }
  };

  const handleDeleteBlog = async (blogId) => {
    try {
      // Get token from both possible sources
      const token = currentUser?.token || localStorage.getItem('token');
      
      if (!token) {
        console.error('No authentication token found');
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
      console.error('Error deleting blog:', error);
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
    console.log("Setting blog for editing:", blog); // Debug log
    setEditingBlog(blog);
    setShowCreateModal(true);
  };

  return (
    <div className="h-screen overflow-y-auto bg-gray-900 text-white">
      <Helmet>
        {sharedBlog ? (
          // Dynamic meta tags for a specific blog post
          <>
            <title>{`${sharedBlog.title} - Aquads How To Guide`}</title>
            <meta name="description" content={sharedBlog.content?.replace(/<[^>]*>/g, '').slice(0, 160)} />
            <meta property="og:title" content={`${sharedBlog.title} - Aquads Blog`} />
            <meta property="og:description" content={sharedBlog.content?.replace(/<[^>]*>/g, '').slice(0, 200) + '...'} />
            <meta property="og:image" content={sharedBlog.bannerImage} />
            <meta property="og:url" content={window.location.href} />
            <meta property="og:type" content="article" />
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={`${sharedBlog.title} - Aquads Blog`} />
            <meta name="twitter:description" content={sharedBlog.content?.replace(/<[^>]*>/g, '').slice(0, 200) + '...'} />
            <meta name="twitter:image" content={sharedBlog.bannerImage} />
            
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
                  "@id": window.location.href
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
            {currentUser ? (
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded transition-colors"
              >
                Create Blog Post
              </button>
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