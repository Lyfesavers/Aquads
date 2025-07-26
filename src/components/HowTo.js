import React, { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import BlogList from './BlogList';
import CreateBlogModal from './CreateBlogModal';
import { API_URL } from '../services/api';




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
    // Check if we're coming from BlogPage with edit state
    if (location.state?.editBlog) {
      setEditingBlog(location.state.editBlog);
      setShowCreateModal(true);
      // Clear the state to prevent re-triggering
      navigate(location.pathname, { replace: true, state: {} });
    }
    
    // Fetch blogs for the list view
    fetchBlogs();
  }, [location, navigate]);



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



  // Set up a blog for editing
  const handleBlogEdit = (blog) => {
    setEditingBlog(blog);
    setShowCreateModal(true);
  };



  return (
    <div className="h-screen overflow-y-auto bg-gray-900 text-white">
      <Helmet>
        <title>How To Guide - Aquads</title>
        <meta name="description" content="Learn how to use Aquads platform with our video tutorials and community blog posts" />
        <link rel="canonical" href={`${window.location.origin}${location.pathname.split('?')[0]}`} />
      </Helmet>

      {/* Header */}
      <div className="bg-gray-800/50 backdrop-blur-sm border-b border-gray-700/50">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link to="/" className="flex items-center">
                <img 
                  src="/Aquadsnewlogo.png" 
                  alt="AQUADS" 
                  className="w-auto filter drop-shadow-lg"
                  style={{height: '2rem', filter: 'drop-shadow(0 0 10px rgba(59, 130, 246, 0.6))'}}
                />
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