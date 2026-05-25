import React, { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  FaPlayCircle,
  FaGraduationCap,
  FaPenSquare,
  FaNewspaper,
  FaBookOpen,
  FaChalkboardTeacher,
  FaChevronLeft,
  FaChevronRight,
  FaBars,
  FaTimes,
} from 'react-icons/fa';
import BlogList from './BlogList';
import MarketNewsList from './MarketNewsList';
import FreeCoursesList from './FreeCoursesList';
import CreateBlogModal from './CreateBlogModal';
import SkillTests from './SkillTests';
import FreelancerWorkshop from './FreelancerWorkshop';
import LoginModal from './LoginModal';
import CreateAccountModal from './CreateAccountModal';
import CreateAdModal from './CreateAdModal';
import CreateBannerModal from './CreateBannerModal';
import ProfileModal from './ProfileModal';
import { API_URL, fetchMarketNews, fetchFreeCourses } from '../services/api';
import { getDisplayName } from '../utils/nameUtils';
import {
  TUTORIAL_VIDEOS,
  tutorialPlaylistUrl,
  watchUrl,
  thumbUrl,
} from '../data/tutorialVideos';

const MARKET_NEWS_PAGE_SIZE = 20;
const FREE_COURSES_PAGE_SIZE = 24;

// Mirror of the slug helper used in BlogPage / BlogList / sitemap so that any
// legacy "/learn?blogId=X" URL can be migrated to the canonical
// "/learn/{slug}-{id}" form without a network round-trip beyond fetching the
// blog itself. Keeping the same rules (lowercase, hyphen-separated, max 50)
// guarantees the resulting URL matches the one in the sitemap.
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

// Side panel definition for the Learn page. Order here = order in the sidebar.
const LEARN_TABS = [
  {
    id: 'videos',
    label: 'Video Tutorials',
    short: 'Videos',
    description: 'Watch step-by-step tutorials covering every Aquads feature.',
    icon: FaPlayCircle,
    activeClass: 'bg-blue-500/15 text-blue-300 border-blue-400/40',
    iconClass: 'text-blue-300',
  },
  {
    id: 'tests',
    label: 'Skills Tests',
    short: 'Tests',
    description: 'Take short skill assessments and earn verified badges.',
    icon: FaGraduationCap,
    activeClass: 'bg-amber-500/15 text-amber-200 border-amber-400/40',
    iconClass: 'text-amber-300',
  },
  {
    id: 'blogs',
    label: 'Blog Posts',
    short: 'Blogs',
    description: 'Read the latest articles from the Aquads community.',
    icon: FaPenSquare,
    activeClass: 'bg-emerald-500/15 text-emerald-200 border-emerald-400/40',
    iconClass: 'text-emerald-300',
  },
  {
    id: 'news',
    label: 'Market News',
    short: 'News',
    description: 'Curated headlines from CoinDesk and Sky News.',
    icon: FaNewspaper,
    activeClass: 'bg-orange-500/15 text-orange-200 border-orange-400/40',
    iconClass: 'text-orange-300',
  },
  {
    id: 'free-courses',
    label: 'Free Online Courses',
    short: 'Courses',
    description: 'Hand-picked free certificate courses from cursa.app.',
    icon: FaBookOpen,
    badge: 'New',
    activeClass: 'bg-sky-500/15 text-sky-200 border-sky-400/40',
    iconClass: 'text-sky-300',
  },
  {
    id: 'workshop',
    label: 'Freelancer Workshop',
    short: 'Workshop',
    description: 'Interactive freelancer training with quizzes and progress tracking.',
    icon: FaChalkboardTeacher,
    activeClass: 'bg-gradient-to-r from-purple-500/25 to-pink-500/15 text-pink-200 border-pink-400/40',
    iconClass: 'text-pink-300',
  },
];

const VALID_TAB_IDS = LEARN_TABS.map((t) => t.id);

const HowTo = ({ currentUser, onLogin, onLogout, onCreateAccount, openMintFunnelPlatform, ads = [] }) => {
  const [blogs, setBlogs] = useState([]);
  const [showCreateBlogModal, setShowCreateBlogModal] = useState(false);
  const [editingBlog, setEditingBlog] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingBlogId, setDeletingBlogId] = useState(null);
  const [selectedTutorialId, setSelectedTutorialId] = useState(
    () => TUTORIAL_VIDEOS[0]?.id ?? null
  );
  // Initialize activeTab from sessionStorage or default to 'videos'.
  // Validate against the known tab list so a stale storage value can't render an empty page.
  const [activeTab, setActiveTab] = useState(() => {
    const stored = sessionStorage.getItem('learnActiveTab');
    return stored && VALID_TAB_IDS.includes(stored) ? stored : 'videos';
  });
  // Desktop side panel collapse (icon-only) — persisted across sessions in localStorage.
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('learnSidebarCollapsed') === 'true';
  });
  // Mobile slide-in drawer for the side panel.
  const [isLearnNavOpen, setIsLearnNavOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showCreateAccountModal, setShowCreateAccountModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showBannerModal, setShowBannerModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const blogListRef = useRef(null);
  const [marketNewsItems, setMarketNewsItems] = useState([]);
  const [marketNewsLoading, setMarketNewsLoading] = useState(false);
  const [marketNewsError, setMarketNewsError] = useState(null);
  const [marketNewsPagination, setMarketNewsPagination] = useState(null);
  const [marketNewsPage, setMarketNewsPage] = useState(1);
  const [isLoadingMoreMarketNews, setIsLoadingMoreMarketNews] = useState(false);
  const [marketNewsSourceFilter, setMarketNewsSourceFilter] = useState('all');

  // Free online courses tab state
  const [freeCoursesItems, setFreeCoursesItems] = useState([]);
  const [freeCoursesCategories, setFreeCoursesCategories] = useState([]);
  const [freeCoursesPagination, setFreeCoursesPagination] = useState(null);
  const [freeCoursesLoading, setFreeCoursesLoading] = useState(false);
  const [freeCoursesError, setFreeCoursesError] = useState(null);
  const [freeCoursesPage, setFreeCoursesPage] = useState(1);
  const [isLoadingMoreFreeCourses, setIsLoadingMoreFreeCourses] = useState(false);
  const [freeCoursesFeed, setFreeCoursesFeed] = useState('all');
  const [freeCoursesCategory, setFreeCoursesCategory] = useState('all');
  const [freeCoursesSearch, setFreeCoursesSearch] = useState('');
  const [freeCoursesSearchDebounced, setFreeCoursesSearchDebounced] = useState('');

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

  // Store activeTab in sessionStorage whenever it changes
  useEffect(() => {
    sessionStorage.setItem('learnActiveTab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('learnSidebarCollapsed', String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  // Lock body scroll while the mobile drawer is open and close it on Esc.
  useEffect(() => {
    if (!isLearnNavOpen) return undefined;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape') setIsLearnNavOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [isLearnNavOpen]);

  const handleSelectTab = (id) => {
    setActiveTab(id);
    setIsLearnNavOpen(false);
  };

  const activeTabMeta = LEARN_TABS.find((t) => t.id === activeTab) || LEARN_TABS[0];
  // Capitalize so JSX treats it as a component (rather than a lowercase HTML tag)
  const ActiveTabIcon = activeTabMeta.icon;

  useEffect(() => {
    if (activeTab !== 'news') return undefined;
    let cancelled = false;
    (async () => {
      setMarketNewsLoading(true);
      setMarketNewsError(null);
      setMarketNewsPage(1);
      setMarketNewsPagination(null);
      try {
        const data = await fetchMarketNews(1, MARKET_NEWS_PAGE_SIZE, marketNewsSourceFilter);
        if (!cancelled) {
          setMarketNewsItems(data.items || []);
          setMarketNewsPagination(data.pagination || null);
        }
      } catch (e) {
        if (!cancelled) {
          setMarketNewsError(e.message || 'Failed to load market news');
          setMarketNewsItems([]);
          setMarketNewsPagination(null);
        }
      } finally {
        if (!cancelled) setMarketNewsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeTab, marketNewsSourceFilter]);

  // Debounce search input so we don't fire a request on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => setFreeCoursesSearchDebounced(freeCoursesSearch.trim()), 300);
    return () => clearTimeout(t);
  }, [freeCoursesSearch]);

  // Whenever we're on the free-courses tab AND any of the filters change, reload page 1.
  useEffect(() => {
    if (activeTab !== 'free-courses') return undefined;
    let cancelled = false;
    (async () => {
      setFreeCoursesLoading(true);
      setFreeCoursesError(null);
      setFreeCoursesPage(1);
      setFreeCoursesPagination(null);
      try {
        const data = await fetchFreeCourses({
          page: 1,
          limit: FREE_COURSES_PAGE_SIZE,
          feed: freeCoursesFeed,
          category: freeCoursesCategory,
          search: freeCoursesSearchDebounced,
        });
        if (cancelled) return;
        setFreeCoursesItems(data.items || []);
        setFreeCoursesCategories(data.categories || []);
        setFreeCoursesPagination(data.pagination || null);
      } catch (e) {
        if (!cancelled) {
          setFreeCoursesError(e.message || 'Failed to load free courses');
          setFreeCoursesItems([]);
          setFreeCoursesPagination(null);
        }
      } finally {
        if (!cancelled) setFreeCoursesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeTab, freeCoursesFeed, freeCoursesCategory, freeCoursesSearchDebounced]);

  const handleLoadMoreFreeCourses = async () => {
    if (!freeCoursesPagination?.hasMore || isLoadingMoreFreeCourses) return;
    try {
      setIsLoadingMoreFreeCourses(true);
      const nextPage = freeCoursesPage + 1;
      const data = await fetchFreeCourses({
        page: nextPage,
        limit: FREE_COURSES_PAGE_SIZE,
        feed: freeCoursesFeed,
        category: freeCoursesCategory,
        search: freeCoursesSearchDebounced,
      });
      setFreeCoursesItems((prev) => [...prev, ...(data.items || [])]);
      setFreeCoursesPagination(data.pagination || null);
      setFreeCoursesPage(nextPage);
    } catch (e) {
      setFreeCoursesError(e.message || 'Failed to load more courses');
    } finally {
      setIsLoadingMoreFreeCourses(false);
    }
  };

  // Switching the high-level feed filter should reset the secondary category filter
  // so users don't end up looking at an empty set.
  const handleChangeFreeCoursesFeed = (id) => {
    setFreeCoursesFeed(id);
    setFreeCoursesCategory('all');
  };

  const handleLoadMoreMarketNews = async () => {
    if (!marketNewsPagination?.hasMore || isLoadingMoreMarketNews) return;
    try {
      setIsLoadingMoreMarketNews(true);
      const nextPage = marketNewsPage + 1;
      const data = await fetchMarketNews(nextPage, MARKET_NEWS_PAGE_SIZE, marketNewsSourceFilter);
      setMarketNewsItems((prev) => [...prev, ...(data.items || [])]);
      setMarketNewsPagination(data.pagination || null);
      setMarketNewsPage(nextPage);
    } catch (e) {
      setMarketNewsError(e.message || 'Failed to load more headlines');
    } finally {
      setIsLoadingMoreMarketNews(false);
    }
  };

  useEffect(() => {
    // Check if we're coming from BlogPage with edit state
    if (location.state?.editBlog) {
      setEditingBlog(location.state.editBlog);
      setShowCreateBlogModal(true);
      // Clear the state to prevent re-triggering
      navigate(location.pathname, { replace: true, state: {} });
    }
    
    // Check if we're coming back from a blog page (indicated by sessionStorage)
    const returningFromBlog = sessionStorage.getItem('returningFromBlog');
    if (returningFromBlog === 'true') {
      // User is returning from blog page, ensure blogs tab is active
      setActiveTab('blogs');
      // Clear the flag
      sessionStorage.removeItem('returningFromBlog');
    }
    
    // Fetch blogs for the list view
    fetchBlogs();
  }, [location, navigate]);

  // Legacy URL migration: if someone hits "/learn?blogId=X" (an old share URL
  // pattern that used to be served by an inline script in index.html), fetch
  // the blog, redirect to the canonical "/learn/{slug}-{id}" so Google and
  // the user end up on the indexable URL with proper meta tags. Uses
  // replaceState so it doesn't pollute browser history.
  useEffect(() => {
    if (!location.pathname.startsWith('/learn')) return;
    const params = new URLSearchParams(location.search);
    const legacyBlogId = params.get('blogId');
    if (!legacyBlogId) return;

    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(`${API_URL}/blogs/${legacyBlogId}`);
        if (!response.ok) return;
        const blog = await response.json();
        if (cancelled || !blog || !blog._id) return;
        const slug = createBlogSlug(blog.title) || 'post';
        navigate(`/learn/${slug}-${blog._id}`, { replace: true });
      } catch (err) {
        // Silently fall back to the Learn hub if the API call fails — the
        // user still sees a valid page rather than a broken redirect loop.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [location.pathname, location.search, navigate]);

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
    // Prevent multiple simultaneous submissions
    if (isSubmitting) {
      return;
    }
    
    try {
      setIsSubmitting(true);
      
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
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditBlog = async (blogData) => {
    // Prevent multiple simultaneous submissions
    if (isSubmitting) {
      return;
    }
    
    try {
      setIsSubmitting(true);
      
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
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteBlog = async (blogId) => {
    // Prevent multiple simultaneous delete calls
    if (deletingBlogId) {
      return;
    }
    
    try {
      setDeletingBlogId(blogId);
      
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
    } finally {
      setDeletingBlogId(null);
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
        <meta name="description" content="Learn how to use Aquads with video tutorials, skill tests, community blog posts, market headlines, and a curated library of free online courses with certificates" />
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
                to="/list-token-free"
                className="bg-gray-700/90 hover:bg-gray-600/90 px-2 lg:px-3 py-1.5 rounded text-xs lg:text-sm shadow-lg hover:shadow-gray-500/30 transition-all duration-300 backdrop-blur-sm text-yellow-400"
              >
                List token free
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
                           <Link
                             to="/dashboard"
                             onClick={() => setShowUserDropdown(false)}
                             className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:text-yellow-400 hover:bg-purple-600/50 transition-colors"
                           >
                             📊 Dashboard
                           </Link>
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
                to="/list-token-free"
                className="bg-gray-700/90 hover:bg-gray-600/90 px-4 py-3 rounded-lg shadow-lg hover:shadow-gray-500/30 transition-all duration-300 backdrop-blur-sm text-center text-sm font-medium text-yellow-400"
              >
                List token free
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
                   <Link
                     to="/dashboard"
                     onClick={() => setIsMobileMenuOpen(false)}
                     className="bg-gray-700/90 hover:bg-gray-600/90 px-4 py-3 rounded-lg shadow-lg hover:shadow-gray-500/30 transition-all duration-300 backdrop-blur-sm text-sm font-medium text-yellow-400 block text-center"
                   >
                     📊 Dashboard
                   </Link>
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

      {/* Mobile-only floating button to open the side panel drawer */}
      <button
        type="button"
        onClick={() => setIsLearnNavOpen(true)}
        className="lg:hidden fixed top-[68px] sm:top-[76px] left-3 z-[150] inline-flex items-center gap-2 rounded-lg bg-gray-800/95 hover:bg-gray-700 border border-white/10 text-blue-300 px-3 py-2 shadow-lg backdrop-blur"
        aria-label="Open Learn navigation"
      >
        <FaBars className="w-3.5 h-3.5" />
        <span className="text-xs font-semibold">{activeTabMeta.short}</span>
      </button>

      {/* Mobile backdrop */}
      {isLearnNavOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/65 backdrop-blur-sm z-[180]"
          onClick={() => setIsLearnNavOpen(false)}
          aria-hidden
        />
      )}

      {/* Side panel — fixed below the top nav, doubles as a slide-in drawer on mobile */}
      <aside
        className={`fixed left-0 top-14 sm:top-16 bottom-0 z-[190] bg-gray-900/95 backdrop-blur-md border-r border-white/5 shadow-2xl shadow-black/40 flex flex-col transition-all duration-300 ease-in-out
          w-72 max-w-[80vw]
          ${isLearnNavOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
          ${isSidebarCollapsed ? 'lg:w-16' : 'lg:w-64'}`}
        aria-label="Learn sections"
      >
        {/* Sidebar header — title on mobile + expanded desktop, hidden when collapsed */}
        <div
          className={`flex items-center justify-between gap-2 px-4 py-4 border-b border-white/5 ${
            isSidebarCollapsed ? 'lg:justify-center lg:px-2' : ''
          }`}
        >
          <div className={`min-w-0 ${isSidebarCollapsed ? 'lg:hidden' : ''}`}>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">Aquads</p>
            <p className="text-base font-bold text-white truncate">Learn Center</p>
          </div>
          <button
            type="button"
            onClick={() => setIsLearnNavOpen(false)}
            className="lg:hidden text-gray-400 hover:text-white p-1.5 rounded hover:bg-white/5"
            aria-label="Close Learn navigation"
          >
            <FaTimes className="w-4 h-4" />
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1" aria-label="Learn tabs">
          {LEARN_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleSelectTab(tab.id)}
                title={isSidebarCollapsed ? tab.label : undefined}
                className={`group w-full flex items-center gap-3 rounded-lg border transition-all text-left
                  ${isSidebarCollapsed ? 'lg:justify-center lg:px-0 lg:py-3' : ''}
                  px-3 py-2.5
                  ${
                    isActive
                      ? `${tab.activeClass} shadow-inner shadow-black/20`
                      : 'border-transparent text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 transition-colors ${
                    isActive ? tab.iconClass : 'text-gray-500 group-hover:text-gray-300'
                  }`}
                />
                <span className={`flex-1 min-w-0 text-sm font-semibold truncate ${isSidebarCollapsed ? 'lg:hidden' : ''}`}>
                  {tab.label}
                </span>
                {tab.badge ? (
                  <span
                    className={`text-[9px] font-bold uppercase tracking-wider rounded px-1.5 py-0.5 bg-blue-500/25 text-blue-200 border border-blue-400/30 ${
                      isSidebarCollapsed ? 'lg:hidden' : ''
                    }`}
                  >
                    {tab.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>

        {/* Desktop-only collapse / expand toggle */}
        <div className="hidden lg:flex items-center justify-end px-2 py-3 border-t border-white/5">
          <button
            type="button"
            onClick={() => setIsSidebarCollapsed((v) => !v)}
            className="inline-flex items-center gap-2 text-xs font-semibold text-gray-400 hover:text-white px-2.5 py-1.5 rounded-md hover:bg-white/5 transition-colors"
            aria-label={isSidebarCollapsed ? 'Expand side panel' : 'Collapse side panel'}
            title={isSidebarCollapsed ? 'Expand' : 'Collapse'}
          >
            {isSidebarCollapsed ? (
              <FaChevronRight className="w-3 h-3" />
            ) : (
              <>
                <FaChevronLeft className="w-3 h-3" />
                <span>Collapse</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* Main content shifts right to accommodate the desktop side panel */}
      <main
        className={`pt-14 sm:pt-16 transition-[padding] duration-300 ease-in-out ${
          isSidebarCollapsed ? 'lg:pl-16' : 'lg:pl-64'
        }`}
      >
        <div className="px-3 sm:px-4 lg:px-8 py-6 sm:py-8 pt-12 sm:pt-10 max-w-6xl mx-auto">
          {/* Per-tab header — replaces the old generic page intro */}
          <header className="mb-6 sm:mb-8 flex items-start gap-3 sm:gap-4">
            <span
              className={`hidden sm:inline-flex shrink-0 items-center justify-center w-12 h-12 rounded-xl border bg-gray-900/70 ${activeTabMeta.activeClass}`}
              aria-hidden
            >
              <ActiveTabIcon className={`w-5 h-5 ${activeTabMeta.iconClass}`} />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.25em] text-gray-500">
                Aquads Learn
              </p>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white leading-tight">
                {activeTabMeta.label}
              </h1>
              <p className="text-gray-400 text-sm sm:text-base mt-1.5 max-w-3xl">
                {activeTabMeta.description}
              </p>
            </div>
          </header>

        {/* Content based on active tab */}
        {activeTab === 'videos' && (
          <div className="mb-12 sm:mb-16">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-4 sm:mb-6">
              <h2 className="text-xl sm:text-2xl font-bold text-blue-400">Video Tutorials</h2>
              <a
                href={tutorialPlaylistUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-gray-400 hover:text-blue-400 transition-colors shrink-0"
              >
                Open full playlist on YouTube →
              </a>
            </div>
            <p className="text-gray-400 text-sm mb-6 max-w-3xl">
              Pick a tutorial below to play it here, or open any video on YouTube for comments, chapters, and the full player.
            </p>

            {selectedTutorialId && (
              <div className="mb-8 rounded-xl overflow-hidden border border-gray-700 bg-gray-900/50 shadow-lg">
                <div className="aspect-video w-full bg-black">
                  <iframe
                    key={selectedTutorialId}
                    src={`https://www.youtube.com/embed/${selectedTutorialId}?rel=0&modestbranding=1`}
                    title={
                      TUTORIAL_VIDEOS.find((v) => v.id === selectedTutorialId)?.title ||
                      'Aquads tutorial'
                    }
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    className="w-full h-full min-h-[200px]"
                    loading="lazy"
                  />
                </div>
                <div className="px-4 py-3 sm:px-5 sm:py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-gray-700">
                  <p className="text-white font-medium text-sm sm:text-base leading-snug">
                    {TUTORIAL_VIDEOS.find((v) => v.id === selectedTutorialId)?.title}
                  </p>
                  <a
                    href={watchUrl(selectedTutorialId)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors whitespace-nowrap"
                  >
                    Watch on YouTube
                  </a>
                </div>
              </div>
            )}

            <h3 className="text-lg font-semibold text-gray-200 mb-4">All tutorials</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {TUTORIAL_VIDEOS.map((video) => {
                const isActive = video.id === selectedTutorialId;
                return (
                  <div
                    key={video.id}
                    className={`rounded-xl overflow-hidden border bg-gray-800/80 transition-all ${
                      isActive
                        ? 'border-blue-500 ring-2 ring-blue-500/40 shadow-lg shadow-blue-900/20'
                        : 'border-gray-700 hover:border-gray-500'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedTutorialId(video.id)}
                      className="group w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
                    >
                      <div className="relative aspect-video bg-gray-900">
                        <img
                          src={thumbUrl(video.id)}
                          alt=""
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                        <div className="absolute inset-0 flex items-center justify-center opacity-90 group-hover:opacity-100 transition-opacity">
                          <span className="rounded-full bg-red-600 w-14 h-14 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                            <svg
                              className="w-7 h-7 text-white ml-1"
                              fill="currentColor"
                              viewBox="0 0 24 24"
                              aria-hidden
                            >
                              <path d="M8 5v14l11-7z" />
                            </svg>
                          </span>
                        </div>
                        {isActive && (
                          <span className="absolute top-2 left-2 text-xs font-semibold uppercase tracking-wide bg-blue-600 text-white px-2 py-0.5 rounded">
                            Now playing
                          </span>
                        )}
                      </div>
                      <div className="p-3 sm:p-4">
                        <p className="text-white text-sm font-medium leading-snug line-clamp-2">
                          {video.title}
                        </p>
                        <span className="mt-2 inline-block text-xs text-blue-400 group-hover:text-blue-300">
                          Play in player above
                        </span>
                      </div>
                    </button>
                    <div className="px-3 pb-3 sm:px-4 sm:pb-4 -mt-1">
                      <a
                        href={watchUrl(video.id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
                      >
                        Open on YouTube ↗
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>

            {/*
              SEO: surface the latest blog posts on the default /learn view
              so crawlers can discover and follow links into individual blog
              pages from the Learn hub. Links use the canonical
              /learn/{slug}-{id} URL so internal link signals match the
              sitemap and <link rel=canonical> on each BlogPage. UX-wise this
              is purely additive — the Videos tab still leads as today.
            */}
            {blogs && blogs.length > 0 && (
              <section className="mt-12 sm:mt-16 pt-8 border-t border-white/5" aria-label="Latest blog posts">
                <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-4 sm:mb-6">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-emerald-300">Latest from the blog</h2>
                    <p className="text-gray-400 text-sm mt-1">
                      Deep dives, tutorials, and updates from the Aquads community.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSelectTab('blogs')}
                    className="text-sm text-gray-400 hover:text-emerald-300 transition-colors shrink-0"
                  >
                    See all blog posts →
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {blogs.slice(0, 6).map((blog) => (
                    <Link
                      key={blog._id}
                      to={`/learn/${createBlogSlug(blog.title)}-${blog._id}`}
                      className="group rounded-xl overflow-hidden border border-gray-700 bg-gray-800/80 hover:border-emerald-500/60 transition-all"
                    >
                      {blog.bannerImage && (
                        <div className="aspect-video bg-gray-900 overflow-hidden">
                          <img
                            src={blog.bannerImage}
                            alt={blog.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                          />
                        </div>
                      )}
                      <div className="p-3 sm:p-4">
                        <h3 className="text-white text-sm sm:text-base font-semibold leading-snug line-clamp-2 group-hover:text-emerald-300 transition-colors">
                          {blog.title}
                        </h3>
                        {blog.authorUsername && (
                          <p className="mt-2 text-xs text-gray-400">
                            {blog.authorUsername}
                            {blog.createdAt && (
                              <>
                                {' • '}
                                {new Date(blog.createdAt).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                })}
                              </>
                            )}
                          </p>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {activeTab === 'tests' && (
          <div className="mb-12 sm:mb-16">
            <SkillTests currentUser={currentUser} />
          </div>
        )}

        {activeTab === 'news' && (
          <div className="mt-12 sm:mt-16">
            <div className="mb-6">
              <h2 className="text-xl sm:text-2xl font-bold text-blue-400">Market &amp; world news</h2>
              <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Filter by source">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'coindesk', label: 'CoinDesk' },
                  { id: 'sky', label: 'Sky News' },
                ].map(({ id, label }) => {
                  const active = marketNewsSourceFilter === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setMarketNewsSourceFilter(id)}
                      disabled={marketNewsLoading}
                      className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50 ${
                        active
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30'
                          : 'bg-gray-800/80 text-gray-300 hover:bg-gray-700 hover:text-white border border-white/10'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
            {marketNewsError && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-500 px-3 sm:px-4 py-2 rounded mb-4 text-sm">
                {marketNewsError}
              </div>
            )}
            {marketNewsLoading ? (
              <div className="flex justify-center items-center py-12">
                <div className="flex flex-col items-center space-y-4">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400" />
                  <p className="text-gray-400 text-sm">Loading headlines…</p>
                </div>
              </div>
            ) : (
              <MarketNewsList
                items={marketNewsItems}
                pagination={marketNewsPagination}
                onLoadMore={handleLoadMoreMarketNews}
                isLoadingMore={isLoadingMoreMarketNews}
              />
            )}
          </div>
        )}

        {activeTab === 'free-courses' && (
          <div className="mt-12 sm:mt-16">
            <div className="mb-6">
              <h2 className="text-xl sm:text-2xl font-bold text-blue-400">Free Online Courses</h2>
              <p className="text-gray-400 text-sm mt-2 max-w-3xl">
                Hand-picked free online courses with certificates from cursa.app — covering programming,
                AI, web dev, marketing, finance and more. Filter by category, share with friends, and
                jump straight into the lessons.
              </p>
            </div>

            {freeCoursesError && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-500 px-3 sm:px-4 py-2 rounded mb-4 text-sm">
                {freeCoursesError}
              </div>
            )}

            <FreeCoursesList
              items={freeCoursesItems}
              categories={freeCoursesCategories}
              feedFilter={freeCoursesFeed}
              onChangeFeedFilter={handleChangeFreeCoursesFeed}
              categoryFilter={freeCoursesCategory}
              onChangeCategoryFilter={setFreeCoursesCategory}
              search={freeCoursesSearch}
              onChangeSearch={setFreeCoursesSearch}
              loading={freeCoursesLoading}
              pagination={freeCoursesPagination}
              onLoadMore={handleLoadMoreFreeCourses}
              isLoadingMore={isLoadingMoreFreeCourses}
            />
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
                deletingBlogId={deletingBlogId}
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
              // Prevent closing while submitting
              if (!isSubmitting) {
                setShowCreateBlogModal(false);
                setEditingBlog(null);
              }
            }}
            onSubmit={editingBlog ? handleEditBlog : handleCreateBlog}
            initialData={editingBlog}
            isSubmitting={isSubmitting}
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
        </div>
      </main>
    </div>
  );
};

export default HowTo; 