import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import {
  FaArrowLeft, FaShare, FaThumbsUp, FaGamepad, FaExternalLinkAlt,
  FaTag, FaCubes, FaUser, FaCalendarAlt, FaComments, FaTrash,
  FaExclamationTriangle, FaPaperPlane
} from 'react-icons/fa';
import { fetchGameById, fetchGameComments, postGameComment, deleteGameComment, voteForGame, checkGameVoteStatus } from '../services/api';
import { socket } from '../services/api';
import { getDisplayName } from '../utils/nameUtils';
import LoginModal from './LoginModal';
import CreateAccountModal from './CreateAccountModal';

// Format a date string into a human-readable relative time
const timeAgo = (dateStr) => {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const seconds = Math.floor((now - then) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
};

const formatDate = (dateStr) =>
  new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

const GamePage = ({ currentUser, onLogin, onLogout, onCreateAccount }) => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [voted, setVoted] = useState(false);
  const [voteCount, setVoteCount] = useState(0);
  const [voteLoading, setVoteLoading] = useState(false);

  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const [commentError, setCommentError] = useState(null);

  const [copied, setCopied] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showCreateAccount, setShowCreateAccount] = useState(false);

  const commentEndRef = useRef(null);
  const commentInputRef = useRef(null);

  // ─── Load game first, then comments in the background ───────────────────
  // Splitting the two fetches means the game page renders immediately once
  // the game data arrives — users aren't blocked waiting for the comment feed.
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const gameData = await fetchGameById(id);
        setGame(gameData);
        setVoteCount(gameData.votes || 0);
        setLoading(false);

        // Load comments non-blocking after the game is already on screen
        fetchGameComments(id)
          .then((commentsData) => setComments(commentsData))
          .catch(() => {}); // silently ignore — Socket.IO will still deliver new comments
      } catch (err) {
        setError('Game not found or failed to load.');
        setLoading(false);
      }
    };
    if (id) load();
  }, [id]);

  // ─── Check vote status ───────────────────────────────────────────────────
  useEffect(() => {
    if (currentUser && id) {
      checkGameVoteStatus(id)
        .then(({ voted }) => setVoted(voted))
        .catch(() => {});
    }
  }, [currentUser, id]);

  // ─── Socket.IO room for live comments ───────────────────────────────────
  useEffect(() => {
    if (!id) return;
    socket.emit('joinGame', id);

    const handleGameComment = ({ type, comment, commentId }) => {
      if (type === 'new' && comment) {
        setComments((prev) => {
          // Avoid duplicates (our own optimistic add may already be there)
          if (prev.find((c) => c._id === comment._id)) return prev;
          return [comment, ...prev];
        });
      } else if (type === 'delete' && commentId) {
        setComments((prev) => prev.filter((c) => c._id !== commentId));
      }
    };

    socket.on('gameComment', handleGameComment);

    return () => {
      socket.emit('leaveGame', id);
      socket.off('gameComment', handleGameComment);
    };
  }, [id]);

  // ─── Handlers ────────────────────────────────────────────────────────────
  const handleVote = async () => {
    if (!currentUser) { setShowLoginModal(true); return; }
    try {
      setVoteLoading(true);
      const res = await voteForGame(id);
      setVoted(res.voted);
      setVoteCount(res.votes);
    } catch {
      // silent
    } finally {
      setVoteLoading(false);
    }
  };

  const handleShare = () => {
    const shareUrl = `${window.location.origin}/share/game/${id}`;
    const finalUrl = currentUser?.username ? `${shareUrl}?ref=${currentUser.username}` : shareUrl;
    navigator.clipboard.writeText(finalUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }).catch(() => {});
  };

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!currentUser) { setShowLoginModal(true); return; }
    const text = commentText.trim();
    if (!text) return;

    setCommentLoading(true);
    setCommentError(null);
    try {
      const newComment = await postGameComment(id, text);
      setCommentText('');
      // The socket broadcast will add it for everyone, but add optimistically for the poster
      setComments((prev) => {
        if (prev.find((c) => c._id === newComment._id)) return prev;
        return [newComment, ...prev];
      });
    } catch (err) {
      setCommentError(err.message || 'Failed to post comment.');
    } finally {
      setCommentLoading(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await deleteGameComment(id, commentId);
      setComments((prev) => prev.filter((c) => c._id !== commentId));
    } catch (err) {
      // silent
    }
  };

  // ─── Derived values ──────────────────────────────────────────────────────
  const isOwnerOrAdmin = currentUser && game && (
    (game.owner && (currentUser._id === game.owner._id || currentUser.userId === game.owner._id || currentUser.id === game.owner._id)) ||
    currentUser.isAdmin ||
    currentUser.role === 'admin'
  );

  const isVideo = game && (
    game.bannerType === 'video' ||
    game.bannerUrl?.endsWith('.mp4') ||
    game.bannerUrl?.endsWith('.webm') ||
    game.bannerUrl?.includes('youtube.com') ||
    game.bannerUrl?.includes('youtu.be')
  );

  const isYouTube = game && (
    game.bannerUrl?.includes('youtube.com/watch?v=') ||
    game.bannerUrl?.includes('youtube.com/embed/') ||
    game.bannerUrl?.includes('youtu.be/')
  );

  const getYouTubeEmbedUrl = (url) => {
    if (!url) return '';
    const videoId = url.includes('youtube.com/watch?v=')
      ? url.split('v=')[1].split('&')[0]
      : url.includes('youtu.be/')
        ? url.split('youtu.be/')[1].split('?')[0]
        : '';
    return `https://www.youtube.com/embed/${videoId}?controls=1&mute=1&modestbranding=1`;
  };

  const canonicalUrl = `https://www.aquads.xyz/games/${id}`;
  const ogImage = game && game.bannerType === 'image' && game.bannerUrl
    ? game.bannerUrl
    : 'https://www.aquads.xyz/logo712.png';
  const ogDescription = game
    ? game.description.replace(/<[^>]*>/g, '').slice(0, 200)
    : 'Play exciting Web3 games on Aquads Game Hub!';

  // ─── Render ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-pulse text-yellow-400 text-xl flex items-center gap-3">
          <FaGamepad className="animate-bounce" />
          Loading game...
        </div>
      </div>
    );
  }

  if (error || !game) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center gap-4">
        <FaExclamationTriangle className="text-yellow-500 text-5xl" />
        <p className="text-white text-xl">{error || 'Game not found.'}</p>
        <Link to="/games" className="text-blue-400 hover:text-blue-300 flex items-center gap-2">
          <FaArrowLeft /> Back to Game Hub
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Helmet>
        <title>{game.title} | Aquads Game Hub</title>
        <meta name="description" content={ogDescription} />
        <link rel="canonical" href={canonicalUrl} />

        <meta property="og:title" content={`${game.title} | Aquads Game Hub`} />
        <meta property="og:description" content={ogDescription} />
        <meta property="og:image" content={ogImage} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Aquads Game Hub" />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@AquadsXYZ" />
        <meta name="twitter:title" content={`${game.title} | Aquads Game Hub`} />
        <meta name="twitter:description" content={ogDescription} />
        <meta name="twitter:image" content={ogImage} />
      </Helmet>

      {/* ── Header nav ── */}
      <div className="bg-gray-800 border-b border-gray-700 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-4">
          <Link
            to="/games"
            className="flex items-center gap-2 text-gray-400 hover:text-yellow-400 transition-colors text-sm"
          >
            <FaArrowLeft />
            <span>Game Hub</span>
          </Link>
          <span className="text-gray-600">/</span>
          <span className="text-yellow-400 text-sm truncate max-w-xs">{game.title}</span>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">

        {/* ── Banner ── */}
        <div className="rounded-xl overflow-hidden bg-gray-800 border border-gray-700 mb-8 aspect-video relative">
          {isVideo ? (
            isYouTube ? (
              <iframe
                src={getYouTubeEmbedUrl(game.bannerUrl)}
                title={game.title}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-gray-800 text-center p-6">
                <FaExclamationTriangle className="text-yellow-500 text-4xl mb-3" />
                <p className="text-gray-300">Video preview unavailable</p>
                <button
                  onClick={() => window.open(game.gameUrl, '_blank', 'noopener,noreferrer')}
                  className="mt-3 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-2"
                >
                  <FaGamepad /> Play Game Directly
                </button>
              </div>
            )
          ) : (
            <img
              src={game.bannerUrl}
              alt={game.title}
              className="w-full h-full object-cover"
              onError={(e) => { e.target.onerror = null; e.target.src = '/logo712.png'; }}
            />
          )}
        </div>

        {/* ── Title + actions ── */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-yellow-400 mb-1">{game.title}</h1>
            <p className="text-gray-400 text-sm">
              by <span className="text-blue-400">{game.projectName}</span>
              {game.owner?.username && (
                <> · <span className="text-gray-500">{getDisplayName(game.owner, game.owner.username)}</span></>
              )}
              <span className="ml-2">· {formatDate(game.createdAt)}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* Vote */}
            <button
              onClick={handleVote}
              disabled={voteLoading}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
                voted
                  ? 'bg-blue-700 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <FaThumbsUp />
              {voteLoading ? '...' : `${voteCount} Vote${voteCount !== 1 ? 's' : ''}`}
            </button>

            {/* Share */}
            <button
              onClick={handleShare}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                copied
                  ? 'bg-green-700 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <FaShare />
              {copied ? 'Copied!' : 'Share'}
            </button>

            {/* Play */}
            <a
              href={game.gameUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white transition-colors"
            >
              <FaGamepad />
              Play Game
              <FaExternalLinkAlt className="text-xs" />
            </a>
          </div>
        </div>

        {/* ── Meta badges ── */}
        <div className="flex flex-wrap gap-2 mb-6">
          <span className="flex items-center gap-1 bg-purple-900 text-purple-300 text-xs px-3 py-1 rounded-full">
            <FaTag /> {game.category}
          </span>
          <span className="flex items-center gap-1 bg-blue-900 text-blue-300 text-xs px-3 py-1 rounded-full">
            <FaCubes /> {game.blockchain}
          </span>
          {game.tags && game.tags.map((tag, i) => (
            <span key={i} className="bg-gray-700 text-gray-300 text-xs px-3 py-1 rounded-full">
              #{tag}
            </span>
          ))}
        </div>

        {/* ── Description ── */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 mb-8">
          <h2 className="text-lg font-semibold text-yellow-400 mb-3">About this game</h2>
          <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">{game.description}</p>
        </div>

        {/* ── Comment feed ── */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-yellow-400 mb-5 flex items-center gap-2">
            <FaComments />
            Community ({comments.length})
          </h2>

          {/* Comment input */}
          {currentUser ? (
            <form onSubmit={handleSubmitComment} className="mb-6">
              <div className="flex gap-3 items-start">
                {/* Avatar */}
                <div className="w-9 h-9 rounded-full bg-gray-700 border border-gray-600 flex items-center justify-center shrink-0 overflow-hidden">
                  {currentUser.image ? (
                    <img src={currentUser.image} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <FaUser className="text-gray-400 text-sm" />
                  )}
                </div>
                <div className="flex-1">
                  <textarea
                    ref={commentInputRef}
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Leave a comment..."
                    rows={2}
                    maxLength={1000}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white text-sm placeholder-gray-500 resize-none focus:outline-none focus:border-yellow-500 transition-colors"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmitComment(e);
                      }
                    }}
                  />
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-xs text-gray-500">{commentText.length}/1000</span>
                    <button
                      type="submit"
                      disabled={!commentText.trim() || commentLoading}
                      className="flex items-center gap-2 px-4 py-1.5 bg-yellow-500 hover:bg-yellow-400 text-black text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <FaPaperPlane className="text-xs" />
                      {commentLoading ? 'Posting...' : 'Post'}
                    </button>
                  </div>
                  {commentError && (
                    <p className="text-red-400 text-xs mt-1">{commentError}</p>
                  )}
                </div>
              </div>
            </form>
          ) : (
            <div className="mb-6 text-center py-4 bg-gray-750 rounded-lg border border-gray-700">
              <p className="text-gray-400 text-sm mb-2">Join the conversation</p>
              <button
                onClick={() => setShowLoginModal(true)}
                className="text-yellow-400 hover:text-yellow-300 font-medium text-sm transition-colors"
              >
                Log in to comment
              </button>
            </div>
          )}

          {/* Comments list */}
          {comments.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              <FaComments className="text-4xl mx-auto mb-3 opacity-30" />
              <p>No comments yet — be the first!</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
              {comments.map((comment) => {
                const isCommentOwner = currentUser && (
                  comment.userId === currentUser._id ||
                  comment.userId === currentUser.userId ||
                  comment.userId === currentUser.id
                );
                const canDelete = isCommentOwner || (currentUser && (currentUser.isAdmin || currentUser.role === 'admin'));

                return (
                  <div key={comment._id} className="flex gap-3 group">
                    <div className="w-9 h-9 rounded-full bg-gray-700 border border-gray-600 flex items-center justify-center shrink-0 overflow-hidden">
                      {comment.userImage ? (
                        <img src={comment.userImage} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <FaUser className="text-gray-400 text-sm" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 mb-1 flex-wrap">
                        <span className="text-sm font-medium text-blue-400">{comment.username}</span>
                        <span className="text-xs text-gray-500">{timeAgo(comment.createdAt)}</span>
                        {canDelete && (
                          <button
                            onClick={() => handleDeleteComment(comment._id)}
                            className="ml-auto opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-400 transition-all text-xs flex items-center gap-1"
                            title="Delete comment"
                          >
                            <FaTrash />
                          </button>
                        )}
                      </div>
                      <p className="text-gray-300 text-sm leading-relaxed break-words">{comment.text}</p>
                    </div>
                  </div>
                );
              })}
              <div ref={commentEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* ── Modals ── */}
      {showLoginModal && (
        <LoginModal
          onClose={() => setShowLoginModal(false)}
          onLogin={(user) => {
            if (onLogin) onLogin(user);
            setShowLoginModal(false);
          }}
          onCreateAccount={() => {
            setShowLoginModal(false);
            setShowCreateAccount(true);
          }}
        />
      )}
      {showCreateAccount && (
        <CreateAccountModal
          onClose={() => setShowCreateAccount(false)}
          onCreateAccount={(user) => {
            if (onCreateAccount) onCreateAccount(user);
            setShowCreateAccount(false);
          }}
          onLogin={() => {
            setShowCreateAccount(false);
            setShowLoginModal(true);
          }}
        />
      )}
    </div>
  );
};

export default GamePage;
