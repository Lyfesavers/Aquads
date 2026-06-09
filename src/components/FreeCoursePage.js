import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import {
  FaArrowLeft,
  FaShareAlt,
  FaExternalLinkAlt,
  FaPlayCircle,
  FaClock,
  FaTag,
  FaGraduationCap,
} from 'react-icons/fa';
import LoginModal from './LoginModal';
import CreateAccountModal from './CreateAccountModal';
import { fetchFreeCourse } from '../services/api';
import { getDisplayName } from '../utils/nameUtils';

const FEED_LABEL = {
  technology: 'Technology & Programming',
  business: 'Business & Marketing',
  languages: 'Languages',
};

const formatDate = (date) =>
  new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

const RelatedCard = ({ course }) => (
  <Link
    to={`/learn/courses/${course.slug}`}
    className="group flex flex-col overflow-hidden rounded-xl border border-white/10 bg-gray-900/60 hover:border-blue-500/40 transition"
  >
    <div className="aspect-[16/10] w-full bg-gray-950 relative overflow-hidden">
      {course.imageUrl ? (
        <img
          src={course.imageUrl}
          alt=""
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-white/20 text-2xl font-black">
          COURSE
        </div>
      )}
    </div>
    <div className="p-3">
      <p className="text-xs text-blue-300 font-semibold mb-1">{course.category}</p>
      <h4 className="text-sm font-semibold text-white line-clamp-2 group-hover:text-blue-200">
        {course.title}
      </h4>
    </div>
  </Link>
);

const FreeCoursePage = ({ currentUser, onLogin, onLogout, onCreateAccount, openMintFunnelPlatform }) => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [course, setCourse] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showCreateAccountModal, setShowCreateAccountModal] = useState(false);
  const [copyState, setCopyState] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setCourse(null);
    setRelated([]);
    (async () => {
      try {
        const data = await fetchFreeCourse(slug);
        if (cancelled) return;
        setCourse(data.course);
        setRelated(data.related || []);
      } catch (err) {
        if (!cancelled) setError(err.message || 'Course not found');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  // Persist the active learn tab so navigating back via browser button reopens the
  // courses tab instead of the default Videos tab.
  useEffect(() => {
    sessionStorage.setItem('learnActiveTab', 'free-courses');
  }, []);

  // Once the course loads, rewrite the URL bar to the guaranteed /share/courses/:slug
  // path. This way ANY URL the user copies (or refreshes from) hits the Netlify edge
  // function that always renders rich Open Graph / Twitter Card meta — no reliance on
  // a social platform's User-Agent matching our crawler list. Mirrors the BlogPage
  // /share/blog/:id pattern. Uses replace:true so we don't pollute browser history,
  // and only fires when we're currently sitting on the canonical /learn/courses/...
  // path (so navigating in via the share URL is a no-op).
  useEffect(() => {
    if (!course || !course.slug) return;
    const shareUrl = `/share/courses/${course.slug}`;
    if (
      location.pathname.startsWith('/learn/courses/') &&
      location.pathname !== shareUrl
    ) {
      navigate(shareUrl, { replace: true });
    }
  }, [course, location.pathname, navigate]);

  const handleShare = async () => {
    if (!course) return;
    // Use the guaranteed share URL — Netlify edge function at /share/courses/:slug
    // always renders rich Open Graph / Twitter Card meta for crawlers, then
    // redirects real browsers back to the canonical /learn/courses/:slug page.
    const url = `${window.location.origin}/share/courses/${course.slug}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: course.title,
          text: course.description || course.title,
          url,
        });
        return;
      } catch (err) {
        // User cancelled — fall through to clipboard fallback
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopyState('Copied to clipboard!');
      setTimeout(() => setCopyState(null), 2000);
    } catch {
      setCopyState('Could not copy link');
      setTimeout(() => setCopyState(null), 2000);
    }
  };

  const handleLoginSubmit = async (credentials) => {
    try {
      await onLogin(credentials);
      setShowLoginModal(false);
    } catch (err) {
      // Errors surface in the modal
    }
  };

  const handleCreateAccountSubmit = async (formData) => {
    try {
      await onCreateAccount(formData);
      setShowCreateAccountModal(false);
    } catch (err) {
      // Errors surface in the modal
    }
  };

  const renderHeader = () => (
    <nav className="fixed top-0 left-0 right-0 bg-gray-800/80 backdrop-blur-sm z-[200000]">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16">
          <div className="flex items-center">
            <Link to="/home" className="flex items-center">
              <img
                src="/alogo.png"
                alt="AQUADS"
                className="w-auto filter drop-shadow-lg"
                style={{ height: '1.75rem', filter: 'drop-shadow(0 0 10px rgba(59, 130, 246, 0.6))' }}
              />
            </Link>
          </div>

          <div className="md:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-gray-300 hover:text-yellow-400 p-2 rounded-lg hover:bg-gray-700/50 transition-colors"
              aria-label="Toggle menu"
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

          <div className="hidden md:flex items-center space-x-2 lg:space-x-3">
            <Link
              to="/marketplace"
              className="bg-gray-700/90 hover:bg-gray-600/90 px-2 lg:px-3 py-1.5 rounded text-xs lg:text-sm shadow-lg transition-all duration-300 backdrop-blur-sm text-yellow-400"
            >
              Freelancer
            </Link>
            <Link
              to="/games"
              className="bg-gray-700/90 hover:bg-gray-600/90 px-2 lg:px-3 py-1.5 rounded text-xs lg:text-sm shadow-lg transition-all duration-300 backdrop-blur-sm text-yellow-400"
            >
              Games
            </Link>
            {typeof openMintFunnelPlatform === 'function' && (
              <button
                onClick={openMintFunnelPlatform}
                className="bg-gray-700/90 hover:bg-gray-600/90 px-2 lg:px-3 py-1.5 rounded text-xs lg:text-sm shadow-lg transition-all duration-300 backdrop-blur-sm text-yellow-400"
              >
                Paid Ads
              </button>
            )}
            <Link
              to="/learn"
              className="bg-gray-700/90 hover:bg-gray-600/90 px-2 lg:px-3 py-1.5 rounded text-xs lg:text-sm shadow-lg transition-all duration-300 backdrop-blur-sm text-yellow-400"
            >
              Learn
            </Link>
            {currentUser ? (
              <>
                <Link
                  to="/dashboard"
                  className="bg-gray-700/90 hover:bg-gray-600/90 px-2 lg:px-3 py-1.5 rounded text-xs lg:text-sm shadow-lg transition-all duration-300 backdrop-blur-sm text-yellow-400"
                >
                  Dashboard
                </Link>
                <span className="text-blue-300 text-xs lg:text-sm hidden lg:inline">
                  {getDisplayName(currentUser)}
                </span>
                <button
                  onClick={onLogout}
                  className="bg-gray-700/90 hover:bg-gray-600/90 px-2 lg:px-3 py-1.5 rounded text-xs lg:text-sm shadow-lg transition-all duration-300 backdrop-blur-sm text-yellow-400"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setShowLoginModal(true)}
                  className="bg-gray-700/90 hover:bg-gray-600/90 px-2 lg:px-3 py-1.5 rounded text-xs lg:text-sm shadow-lg transition-all duration-300 backdrop-blur-sm text-yellow-400"
                >
                  Login
                </button>
                <button
                  onClick={() => setShowCreateAccountModal(true)}
                  className="bg-gray-700/90 hover:bg-gray-600/90 px-2 lg:px-3 py-1.5 rounded text-xs lg:text-sm shadow-lg transition-all duration-300 backdrop-blur-sm text-yellow-400"
                >
                  Create Account
                </button>
              </>
            )}
          </div>
        </div>

        {isMobileMenuOpen && (
          <div className="md:hidden py-3 z-[200000] relative bg-black">
            <div className="flex flex-col space-y-2">
              <Link
                to="/learn"
                onClick={() => setIsMobileMenuOpen(false)}
                className="bg-gray-700/90 hover:bg-gray-600/90 px-4 py-3 rounded-lg text-center text-sm font-medium text-yellow-400"
              >
                ← Back to Learn
              </Link>
              <Link
                to="/marketplace"
                onClick={() => setIsMobileMenuOpen(false)}
                className="bg-gray-700/90 hover:bg-gray-600/90 px-4 py-3 rounded-lg text-center text-sm font-medium text-yellow-400"
              >
                Freelancer
              </Link>
              <Link
                to="/games"
                onClick={() => setIsMobileMenuOpen(false)}
                className="bg-gray-700/90 hover:bg-gray-600/90 px-4 py-3 rounded-lg text-center text-sm font-medium text-yellow-400"
              >
                Games
              </Link>
              {currentUser ? (
                <>
                  <Link
                    to="/dashboard"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="bg-gray-700/90 hover:bg-gray-600/90 px-4 py-3 rounded-lg text-center text-sm font-medium text-yellow-400"
                  >
                    Dashboard
                  </Link>
                  <button
                    onClick={() => {
                      onLogout();
                      setIsMobileMenuOpen(false);
                    }}
                    className="bg-gray-700/90 hover:bg-gray-600/90 px-4 py-3 rounded-lg text-center text-sm font-medium text-yellow-400"
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
                    className="bg-gray-700/90 hover:bg-gray-600/90 px-4 py-3 rounded-lg text-center text-sm font-medium text-yellow-400"
                  >
                    Login
                  </button>
                  <button
                    onClick={() => {
                      setShowCreateAccountModal(true);
                      setIsMobileMenuOpen(false);
                    }}
                    className="bg-gray-700/90 hover:bg-gray-600/90 px-4 py-3 rounded-lg text-center text-sm font-medium text-yellow-400"
                  >
                    Create Account
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );

  if (loading) {
    return (
      <div className="h-screen overflow-y-auto bg-gray-900 text-white">
        {renderHeader()}
        <div className="container mx-auto px-3 sm:px-4 py-6 pt-20 sm:pt-24">
          <div className="animate-pulse max-w-4xl mx-auto">
            <div className="h-8 bg-gray-700 rounded w-1/3 mb-6"></div>
            <div className="aspect-[16/9] bg-gray-700 rounded-2xl mb-6"></div>
            <div className="h-10 bg-gray-700 rounded w-3/4 mb-4"></div>
            <div className="h-4 bg-gray-700 rounded w-1/2 mb-8"></div>
            <div className="space-y-3">
              <div className="h-4 bg-gray-700 rounded"></div>
              <div className="h-4 bg-gray-700 rounded"></div>
              <div className="h-4 bg-gray-700 rounded w-5/6"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="h-screen overflow-y-auto bg-gray-900 text-white">
        {renderHeader()}
        <div className="container mx-auto px-3 sm:px-4 py-12 pt-24 text-center">
          <h1 className="text-3xl font-bold mb-4">Course not found</h1>
          <p className="text-gray-400 mb-8">
            {error || "The course you're looking for doesn't exist or has been removed."}
          </p>
          <button
            onClick={() => navigate('/learn')}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg transition-colors inline-flex items-center gap-2"
          >
            <FaArrowLeft /> Back to Learn
          </button>
        </div>
      </div>
    );
  }

  const courseUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/learn/courses/${course.slug}`;
  // Branded server-side OG image (course title headline + Start Free Course CTA
  // + Cursa attribution baked in). The image itself is the single source-credit
  // surface — keep meta-tag text clean.
  const ogImageUrl = `${typeof window !== 'undefined' ? window.location.origin : 'https://www.aquads.xyz'}/og/course-card?slug=${encodeURIComponent(course.slug)}&ogv=4`;
  const ogDescription = (course.description || course.title).slice(0, 200);
  const titleWithSuffix = `${course.title} — Free ${FEED_LABEL[course.feed] || 'Course'} on Aquads`;
  const ogImageAlt = `${course.title} — Free Course on Aquads`;

  return (
    <div className="h-screen overflow-y-auto bg-gray-900 text-white">
      <Helmet>
        <title>{titleWithSuffix}</title>
        <meta name="description" content={ogDescription} />
        <link rel="canonical" href={courseUrl} />
        <meta property="og:title" content={titleWithSuffix} />
        <meta property="og:description" content={ogDescription} />
        <meta property="og:image" content={ogImageUrl} />
        <meta property="og:image:secure_url" content={ogImageUrl} />
        <meta property="og:image:type" content="image/png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content={ogImageAlt} />
        <meta property="og:site_name" content="Aquads Learn" />
        <meta property="og:url" content={courseUrl} />
        <meta property="og:type" content="article" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@AquadsXYZ" />
        <meta name="twitter:title" content={titleWithSuffix} />
        <meta name="twitter:description" content={ogDescription} />
        <meta name="twitter:image" content={ogImageUrl} />
        <meta name="twitter:image:alt" content={ogImageAlt} />
      </Helmet>

      {renderHeader()}

      <div className="container mx-auto px-3 sm:px-4 py-6 pt-20 sm:pt-24 max-w-5xl">
        <div className="mb-6">
          <Link
            to="/learn"
            onClick={() => sessionStorage.setItem('learnActiveTab', 'free-courses')}
            className="inline-flex items-center gap-2 text-gray-400 hover:text-blue-300 text-sm font-medium transition-colors"
          >
            <FaArrowLeft className="w-3.5 h-3.5" /> Back to Free Online Courses
          </Link>
        </div>

        <article className="rounded-2xl overflow-hidden border border-white/10 bg-gray-900/70 shadow-xl">
          <div className="relative w-full aspect-[16/9] bg-gray-950">
            {course.imageUrl ? (
              <img
                src={course.imageUrl}
                alt={course.title}
                className="absolute inset-0 h-full w-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-white/15 text-5xl font-black tracking-tighter uppercase">
                {(FEED_LABEL[course.feed] || 'Course').slice(0, 8)}
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/30 to-transparent" />
            <div className="absolute top-4 left-4 flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-black/55 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-blue-300 backdrop-blur-md">
                {FEED_LABEL[course.feed] || course.feed}
              </span>
              <span className="rounded-md bg-black/55 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-emerald-300 backdrop-blur-md inline-flex items-center gap-1">
                <FaTag className="w-2.5 h-2.5" /> {course.category}
              </span>
            </div>
          </div>

          <div className="p-5 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl sm:text-4xl font-bold leading-tight text-white">{course.title}</h1>
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs sm:text-sm text-gray-400">
                  <span className="inline-flex items-center gap-1.5">
                    <FaGraduationCap className="w-3.5 h-3.5" />
                    Free certificate available
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <FaClock className="w-3.5 h-3.5" />
                    Self-paced
                  </span>
                  <span className="text-gray-500">Added {formatDate(course.publishedAt)}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleShare}
                className="shrink-0 inline-flex items-center gap-2 bg-gray-800 hover:bg-gray-700 border border-white/10 text-blue-300 px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                title="Copy share link"
              >
                <FaShareAlt className="w-3.5 h-3.5" />
                {copyState || 'Share'}
              </button>
            </div>

            {course.description ? (
              <p className="text-gray-300 leading-relaxed text-base sm:text-lg whitespace-pre-line mb-8">
                {course.description}
              </p>
            ) : null}

            <div className="rounded-xl border border-blue-500/30 bg-gradient-to-br from-blue-600/15 to-purple-600/10 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-blue-300 mb-1">
                  Ready to learn?
                </p>
                <h2 className="text-lg sm:text-xl font-bold text-white">
                  Start the course on Cursa
                </h2>
                <p className="text-sm text-gray-400 mt-1">
                  Opens the full course on cursa.app — 100% free, includes certificate.
                </p>
              </div>
              <a
                href={course.link}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-400 hover:to-purple-500 text-white px-6 py-3 rounded-lg font-semibold text-sm sm:text-base shadow-lg shadow-blue-900/30 transition-all"
              >
                <FaPlayCircle className="w-5 h-5" />
                Start course
                <FaExternalLinkAlt className="w-3 h-3 opacity-75" />
              </a>
            </div>

            <p className="mt-4 text-xs text-gray-500">
              Hosted by <span className="text-gray-300">cursa.app</span>. Aquads aggregates and curates this
              free learning content for the community — we don't run the course or issue the certificate.
            </p>
          </div>
        </article>

        {related.length > 0 && (
          <div className="mt-12">
            <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-gray-400 mb-4">
              More {course.category} courses
            </h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((c) => (
                <RelatedCard key={c._id} course={c} />
              ))}
            </div>
          </div>
        )}
      </div>

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
      {showCreateAccountModal && (
        <CreateAccountModal
          onClose={() => setShowCreateAccountModal(false)}
          onSubmit={handleCreateAccountSubmit}
        />
      )}
    </div>
  );
};

export default FreeCoursePage;
