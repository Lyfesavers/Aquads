import React, { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import BlogList from './BlogList';
import CreateBlogModal from './CreateBlogModal';
import SkillTests from './SkillTests';
import FreelancerWorkshop from './FreelancerWorkshop';
import LoginModal from './LoginModal';
import CreateAccountModal from './CreateAccountModal';
import CreateAdModal from './CreateAdModal';
import CreateBannerModal from './CreateBannerModal';
import ProfileModal from './ProfileModal';
import Dashboard from './Dashboard';
import { API_URL } from '../services/api';
import { getDisplayName } from '../utils/nameUtils';

const HowTo = ({ currentUser, onLogin, onLogout, onCreateAccount, openMintFunnelPlatform }) => {
  const [blogs, setBlogs] = useState([]);
  const [showCreateBlogModal, setShowCreateBlogModal] = useState(false);
  const [editingBlog, setEditingBlog] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [activeTab, setActiveTab] = useState('videos'); // 'videos', 'tests', 'blogs', 'workshop'
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showCreateAccountModal, setShowCreateAccountModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showBannerModal, setShowBannerModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const blogListRef = useRef(null);
  const PLAYLIST_ID = 'PLKHtulN0_0h8hun9lEhYHPGm4Mqophidj';

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

  useEffect(() => {
    // Check if we're coming from BlogPage with edit state
    if (location.state?.editBlog) {
      setEditingBlog(location.state.editBlog);
      setShowCreateBlogModal(true);
      // Clear the state to prevent re-triggering
      navigate(location.pathname, { replace: true, state: {} });
    }
    
    // Fetch blogs for the list view
    fetchBlogs();
  }, [location, navigate]);



  const fetchBlogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/blogs`);
      if (response.ok) {
        const data = await response.json();
        setBlogs(data);
      }
    } catch (error) {
      setError('Failed to fetch blogs');
    } finally {
      setLoading(false);
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
       setShowCreateBlogModal(false);
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
       setShowCreateBlogModal(false);
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
    setShowCreateBlogModal(true);
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


  return (
    <div className="h-screen overflow-y-auto bg-gray-900 text-white">
      <Helmet>
        <title>How To Guide - Aquads</title>
        <meta name="description" content="Learn how to use Aquads platform with our video tutorials and community blog posts" />
        <link rel="canonical" href={`${window.location.origin}${location.pathname.split('?')[0]}`} />
      </Helmet>

      {/* Header Navigation */}
      <nav className="fixed top-0 left-0 right-0 bg-gray-800/80 backdrop-blur-sm z-[200000]">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <div className="flex items-center">
              <Link to="/home" className="flex items-center">
                <img 
                  src="/Aquadsnewlogo.png" 
                  alt="AQUADS" 
                  className="w-auto filter drop-shadow-lg"
                  style={{height: '1.75rem', filter: 'drop-shadow(0 0 10px rgba(59, 130, 246, 0.6))'}}
                />
              </Link>
            </div>
            
            {/* Mobile menu button */}
            <div className="md:hidden">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="text-gray-300 hover:text-yellow-400 p-2 rounded-lg hover:bg-gray-700/50 transition-colors"
              >
                <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {isMobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>

            {/* Desktop menu */}
            <div className="hidden md:flex items-center space-x-2 lg:space-x-3">
              {/* Main Navigation - Smaller buttons */}
              <Link
                to="/marketplace"
                className="bg-gray-700/90 hover:bg-gray-600/90 px-2 lg:px-3 py-1.5 rounded text-xs lg:text-sm shadow-lg hover:shadow-gray-500/30 transition-all duration-300 backdrop-blur-sm text-yellow-400"
              >
                Freelancer
              </Link>
              <Link
                to="/games"
                className="bg-gray-700/90 hover:bg-gray-600/90 px-2 lg:px-3 py-1.5 rounded text-xs lg:text-sm shadow-lg hover:shadow-gray-500/30 transition-all duration-300 backdrop-blur-sm text-yellow-400"
              >
                Games
              </Link>
              <button
                onClick={openMintFunnelPlatform}
                className="bg-gray-700/90 hover:bg-gray-600/90 px-2 lg:px-3 py-1.5 rounded text-xs lg:text-sm shadow-lg hover:shadow-gray-500/30 transition-all duration-300 backdrop-blur-sm text-yellow-400"
              >
                Paid Ads
              </button>
              <Link
                to="/learn"
                className="bg-gray-700/90 hover:bg-gray-600/90 px-2 lg:px-3 py-1.5 rounded text-xs lg:text-sm shadow-lg hover:shadow-gray-500/30 transition-all duration-300 backdrop-blur-sm text-yellow-400"
              >
                Learn
              </Link>
              <Link
                to="/why-list"
                className="bg-gray-700/90 hover:bg-gray-600/90 px-2 lg:px-3 py-1.5 rounded text-xs lg:text-sm shadow-lg hover:shadow-gray-500/30 transition-all duration-300 backdrop-blur-sm text-yellow-400"
              >
                Why List?
              </Link>

              {currentUser ? (
                <>
                  {/* User Dropdown */}
                  <div className="relative user-dropdown">
                    <button 
                      onClick={() => setShowUserDropdown(!showUserDropdown)}
                      className="flex items-center bg-gray-700/90 hover:bg-gray-600/90 px-2 lg:px-3 py-1.5 rounded text-xs lg:text-sm shadow-lg hover:shadow-gray-500/30 transition-all duration-300 backdrop-blur-sm text-yellow-400"
                    >
                      <span className="mr-1 truncate max-w-16 lg:max-w-none">{getDisplayName(currentUser)}</span>
                      <svg className={`w-3 h-3 lg:w-4 lg:h-4 ml-1 transition-transform ${showUserDropdown ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
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
                    className="bg-gray-700/90 hover:bg-gray-600/90 px-2 lg:px-3 py-1.5 rounded text-xs lg:text-sm shadow-lg hover:shadow-gray-500/30 transition-all duration-300 backdrop-blur-sm text-yellow-400"
                  >
                    Login
                  </button>
                  <button
                    onClick={() => setShowCreateAccountModal(true)}
                    className="bg-gray-700/90 hover:bg-gray-600/90 px-2 lg:px-3 py-1.5 rounded text-sm shadow-lg hover:shadow-gray-500/30 transition-all duration-300 backdrop-blur-sm text-yellow-400"
                  >
                    Create Account
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Mobile menu */}
          <div className={`${isMobileMenuOpen ? 'block' : 'hidden'} md:hidden py-3 z-[200000] relative bg-black`}>
            <div className="flex flex-col space-y-3">
              <Link
                to="/marketplace"
                className="bg-gray-700/90 hover:bg-gray-600/90 px-4 py-3 rounded-lg shadow-lg hover:shadow-gray-500/30 transition-all duration-300 backdrop-blur-sm text-center text-sm font-medium text-yellow-400"
              >
                Freelancer Hub
              </Link>
              <Link
                to="/games"
                className="bg-gray-700/90 hover:bg-gray-600/90 px-4 py-3 rounded-lg shadow-lg hover:shadow-gray-500/30 transition-all duration-300 backdrop-blur-sm text-center text-sm font-medium text-yellow-400"
              >
                GameHub
              </Link>
              <button
                onClick={openMintFunnelPlatform}
                className="bg-gray-700/90 hover:bg-gray-600/90 px-4 py-3 rounded-lg shadow-lg hover:shadow-gray-500/30 transition-all duration-300 backdrop-blur-sm text-center text-sm font-medium text-yellow-400"
              >
                Paid Ads
              </button>
              <Link
                to="/learn"
                className="bg-gray-700/90 hover:bg-gray-600/90 px-4 py-3 rounded-lg shadow-lg hover:shadow-gray-500/30 transition-all duration-300 backdrop-blur-sm text-center text-sm font-medium text-yellow-400"
              >
                Learn
              </Link>
              <Link
                to="/why-list"
                className="bg-gray-700/90 hover:bg-gray-600/90 px-4 py-3 rounded-lg shadow-lg hover:shadow-gray-500/30 transition-all duration-300 backdrop-blur-sm text-center text-sm font-medium text-yellow-400"
              >
                Why List?
              </Link>
                             {currentUser ? (
                 <>
                   <span className="text-blue-300 text-center text-sm font-medium">Welcome, {getDisplayName(currentUser)}!</span>
                  <button
                    onClick={() => {
                      navigate('/home');
                      setIsMobileMenuOpen(false);
                    }}
                    className="bg-gray-700/90 hover:bg-gray-600/90 px-4 py-3 rounded-lg shadow-lg hover:shadow-gray-500/30 transition-all duration-300 backdrop-blur-sm text-sm font-medium text-yellow-400"
                  >
                    Back to Main
                   </button>
                   <button
                     onClick={() => {
                       setShowDashboard(true);
                       setIsMobileMenuOpen(false);
                     }}
                     className="bg-gray-700/90 hover:bg-gray-600/90 px-4 py-3 rounded-lg shadow-lg hover:shadow-gray-500/30 transition-all duration-300 backdrop-blur-sm text-sm font-medium text-yellow-400"
                   >
                     📊 Dashboard
                   </button>
                   <button
                     onClick={() => {
                       setShowCreateModal(true);
                       setIsMobileMenuOpen(false);
                     }}
                     className="bg-gray-700/90 hover:bg-gray-600/90 px-4 py-3 rounded-lg shadow-lg hover:shadow-gray-500/30 transition-all duration-300 backdrop-blur-sm text-sm font-medium text-yellow-400"
                   >
                     ➕ List Project
                   </button>
                   <button
                     onClick={() => {
                       setShowBannerModal(true);
                       setIsMobileMenuOpen(false);
                     }}
                     className="bg-gray-700/90 hover:bg-gray-600/90 px-4 py-3 rounded-lg shadow-lg hover:shadow-gray-500/30 transition-all duration-300 backdrop-blur-sm text-sm font-medium text-yellow-400"
                   >
                     🎨 Create Banner Ad
                   </button>
                   <button
                     onClick={() => {
                       setShowProfileModal(true);
                       setIsMobileMenuOpen(false);
                     }}
                     className="bg-gray-700/90 hover:bg-gray-600/90 px-4 py-3 rounded-lg shadow-lg hover:shadow-gray-500/30 transition-all duration-300 backdrop-blur-sm text-sm font-medium text-yellow-400"
                   >
                     ⚙️ Edit Profile
                   </button>
                   <button
                     onClick={() => {
                       onLogout();
                       setIsMobileMenuOpen(false);
                     }}
                     className="bg-gray-700/90 hover:bg-gray-600/90 px-4 py-3 rounded-lg shadow-lg hover:shadow-gray-500/30 transition-all duration-300 backdrop-blur-sm text-sm font-medium text-yellow-400"
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
                    className="bg-gray-700/90 hover:bg-gray-600/90 px-4 py-3 rounded-lg shadow-lg hover:shadow-gray-500/30 transition-all duration-300 backdrop-blur-sm text-sm font-medium text-yellow-400"
                  >
                    Login
                  </button>
                  <button
                    onClick={() => {
                      setShowCreateAccountModal(true);
                      setIsMobileMenuOpen(false);
                    }}
                    className="bg-gray-700/90 hover:bg-gray-600/90 px-4 py-3 rounded-lg shadow-lg hover:shadow-gray-500/30 transition-all duration-300 backdrop-blur-sm text-sm font-medium text-yellow-400"
                  >
                    Create Account
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

              <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 pt-16 sm:pt-20">
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4 text-blue-400">How To Guide</h1>
          <p className="text-gray-400 text-base sm:text-lg px-2">
            Learn how to make the most of Aquads with our video tutorials, skills tests, and community blog posts
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex justify-center mb-6 sm:mb-8">
          <div className="bg-gray-800/50 rounded-lg p-1 flex flex-wrap justify-center gap-1 max-w-full overflow-x-auto">
            <button
              onClick={() => setActiveTab('videos')}
              className={`px-3 sm:px-6 py-2 rounded-md transition-colors text-xs sm:text-sm whitespace-nowrap ${
                activeTab === 'videos'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Video Tutorials
            </button>
            <button
              onClick={() => setActiveTab('tests')}
              className={`px-3 sm:px-6 py-2 rounded-md transition-colors text-xs sm:text-sm whitespace-nowrap ${
                activeTab === 'tests'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Skills Tests
            </button>
            <button
              onClick={() => setActiveTab('blogs')}
              className={`px-3 sm:px-6 py-2 rounded-md transition-colors text-xs sm:text-sm whitespace-nowrap ${
                activeTab === 'blogs'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Blog Posts
            </button>
            <button
              onClick={() => setActiveTab('workshop')}
              className={`px-3 sm:px-6 py-2 rounded-md transition-colors text-xs sm:text-sm whitespace-nowrap ${
                activeTab === 'workshop'
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              🎓 Freelancer Workshop
            </button>
          </div>
        </div>

        {/* Content based on active tab */}
        {activeTab === 'videos' && (
          <div className="mb-12 sm:mb-16">
            <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-blue-400">Video Tutorials</h2>
            <div className="aspect-w-16 aspect-h-9 bg-gray-800 rounded-lg overflow-hidden">
              {videoError ? (
                <div className="flex items-center justify-center h-full text-gray-400 p-4 text-center">
                  <p className="text-sm sm:text-base">Failed to load video playlist. Please try refreshing the page.</p>
                </div>
              ) : (
                <iframe
                  src={`https://www.youtube.com/embed/videoseries?list=${PLAYLIST_ID}&enablejsapi=1`}
                  title="Aquads Tutorials"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full min-h-[300px] sm:min-h-[400px] lg:min-h-[600px]"
                  onError={() => setVideoError(true)}
                  loading="lazy"
                />
              )}
            </div>
          </div>
        )}

        {activeTab === 'tests' && (
          <div className="mb-12 sm:mb-16">
            <SkillTests currentUser={currentUser} />
          </div>
        )}

        {activeTab === 'blogs' && (
          <div className="mt-12 sm:mt-16" ref={blogListRef}>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0 mb-6">
              <h2 className="text-xl sm:text-2xl font-bold text-blue-400">Community Blog Posts</h2>
              {currentUser && currentUser.isAdmin ? (
                <button
                  onClick={() => setShowCreateBlogModal(true)}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded transition-colors text-sm font-medium"
                >
                  Create Blog Post
                </button>
              ) : currentUser ? (
                <div className="text-gray-400 text-sm">
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
                  className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded transition-colors text-sm font-medium"
                >
                  Create Account
                </button>
              )}
            </div>
            
            {error && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-500 px-3 sm:px-4 py-2 rounded mb-4 text-sm">
                {error}
              </div>
            )}
            
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="flex flex-col items-center space-y-4">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400"></div>
                  <p className="text-gray-400 text-sm">Loading blog posts...</p>
                </div>
              </div>
            ) : (
              <BlogList
                blogs={blogs}
                currentUser={currentUser}
                onEditBlog={handleBlogEdit}
                onDeleteBlog={handleDeleteBlog}
              />
            )}
          </div>
        )}

        {activeTab === 'workshop' && (
          <div className="mt-12 sm:mt-16">
            <FreelancerWorkshop currentUser={currentUser} />
          </div>
        )}

        {/* Create/Edit Blog Modal */}
        {showCreateBlogModal && (
          <CreateBlogModal
            onClose={() => {
              setShowCreateBlogModal(false);
              setEditingBlog(null);
            }}
            onSubmit={editingBlog ? handleEditBlog : handleCreateBlog}
            initialData={editingBlog}
          />
        )}

        {/* Dashboard Modal */}
        {showDashboard && (
          <Dashboard
            currentUser={currentUser}
            onClose={() => setShowDashboard(false)}
            ads={[]}  // Pass empty array since how-to page doesn't handle ads
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
      </div>
    </div>
  );
};

export default HowTo; 