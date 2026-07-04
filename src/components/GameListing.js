import React, { useState, useEffect } from 'react';
import { FaGamepad, FaThumbsUp, FaExternalLinkAlt, FaEdit, FaTrash, FaExclamationTriangle, FaShare, FaEye, FaPlay } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import { voteForGame, checkGameVoteStatus } from '../services/api';
import GameSocialLinks from './GameSocialLinks';

const GameListing = ({ game, currentUser, showLoginModal, showNotification, onEdit, onDelete }) => {
  const [voted, setVoted] = useState(false);
  const [voteCount, setVoteCount] = useState(game.votes || 0);
  const [loading, setLoading] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [copied, setCopied] = useState(false);
  
  useEffect(() => {
    if (currentUser) {
      checkVoteStatus();
    }
  }, [currentUser, game._id]);
  
  const checkVoteStatus = async () => {
    if (!currentUser) return;
    
    try {
      const { voted } = await checkGameVoteStatus(game._id);
      setVoted(voted);
    } catch (error) {
      // Silent error handling to prevent console logging
    }
  };
  
  const handleVote = async () => {
    if (!currentUser) {
      showLoginModal();
      return;
    }
    
    try {
      setLoading(true);
      const response = await voteForGame(game._id);
      setVoted(response.voted);
      setVoteCount(response.votes);
      showNotification(response.voted ? 'Vote added!' : 'Vote removed!');
    } catch (error) {
      // Silent error handling
      showNotification('Failed to vote. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };
  
  const handlePlay = () => {
    window.open(game.gameUrl, '_blank', 'noopener,noreferrer');
  };
  
  const handleEdit = () => {
    if (onEdit) {
      onEdit(game);
    }
  };
  
  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };
  
  const handleDeleteConfirm = () => {
    if (onDelete) {
      onDelete(game._id);
      setShowDeleteConfirm(false);
    }
  };
  
  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false);
  };

  const handleShare = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const shareUrl = `${window.location.origin}/share/game/${game._id}`;
    const finalUrl = currentUser?.username ? `${shareUrl}?ref=${currentUser.username}` : shareUrl;
    navigator.clipboard.writeText(finalUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  };
  
  const truncateDescription = (text, length = 150) => {
    if (text.length <= length) return text;
    return text.substring(0, length) + '...';
  };
  
  // Determine if the media is a video or image
  const isVideo = game.bannerType === 'video' || 
    game.bannerUrl.endsWith('.mp4') || 
    game.bannerUrl.endsWith('.webm') || 
    game.bannerUrl.includes('youtube.com') || 
    game.bannerUrl.includes('youtu.be');
  
  // Determine if video is from a supported platform
  const isYouTubeVideo = 
    game.bannerUrl.includes('youtube.com/watch?v=') || 
    game.bannerUrl.includes('youtube.com/embed/') ||
    game.bannerUrl.includes('youtu.be/');
    
  // Check if it's an unsupported external URL (not YouTube)
  const isUnsupportedExternalUrl = isVideo && !isYouTubeVideo && (
    game.bannerUrl.startsWith('http://') || 
    game.bannerUrl.startsWith('https://')
  );
  
  // Extract YouTube video ID for thumbnail
  const getYouTubeVideoId = (url) => {
    if (url.includes('youtube.com/watch?v='))
      return url.split('v=')[1].split('&')[0];
    if (url.includes('youtu.be/'))
      return url.split('youtu.be/')[1].split('?')[0];
    if (url.includes('youtube.com/embed/'))
      return url.split('youtube.com/embed/')[1].split('?')[0];
    return '';
  };

  const youtubeVideoId = isYouTubeVideo ? getYouTubeVideoId(game.bannerUrl) : '';
  const youtubeThumbnail = youtubeVideoId
    ? `https://img.youtube.com/vi/${youtubeVideoId}/hqdefault.jpg`
    : '';
  
  // Check if current user is the owner or an admin
  const isOwnerOrAdmin = currentUser && (
    (game.owner && currentUser._id === game.owner._id) || 
    (game.owner && currentUser.userId === game.owner._id) || 
    (game.owner && currentUser.id === game.owner._id) ||
    (game.createdBy && (currentUser._id === game.createdBy || currentUser.userId === game.createdBy || currentUser.id === game.createdBy)) ||
    currentUser.isAdmin || 
    currentUser.role === 'admin'
  );

  const iconBtnBase =
    'inline-flex shrink-0 items-center justify-center rounded-lg border transition-all duration-200 active:scale-95';
  const iconBtnSm = `${iconBtnBase} h-9 w-9 sm:h-8 sm:w-8`;
  const actionBtnBase =
    'inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-sm font-semibold transition-all duration-200 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 sm:min-h-[40px] sm:py-2';
  
  return (
    <div className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-white/10 bg-gray-900/60 shadow-lg shadow-black/30 ring-1 ring-white/5 transition-all duration-300 hover:-translate-y-1 hover:border-blue-500/40 hover:bg-gray-900/90 hover:shadow-xl hover:shadow-blue-500/10">
      {/* Banner (video or image) */}
      <div className="relative aspect-[16/10] w-full shrink-0 overflow-hidden bg-gray-950">
        {isVideo ? (
          <>
            {isUnsupportedExternalUrl ? (
              <div className="flex h-full w-full flex-col items-center justify-center bg-gray-900/80 p-4 text-center">
                <FaExclamationTriangle className="mb-2 text-3xl text-yellow-500" />
                <p className="text-sm text-gray-300">Non-YouTube content cannot be embedded</p>
                <button
                  onClick={handlePlay}
                  className="mt-3 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-500"
                >
                  Open Game Directly
                </button>
                {isOwnerOrAdmin && (
                  <p className="mt-2 text-xs text-red-400">
                    Admin: Please edit this entry and use YouTube for video previews
                  </p>
                )}
              </div>
            ) : (
              <Link to={`/games/${game._id}`} className="group/banner relative block h-full w-full">
                <img
                  src={youtubeThumbnail}
                  alt={game.title}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover/banner:scale-105"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = 'https://via.placeholder.com/640x360?text=Video+Preview';
                  }}
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/25 transition-colors duration-300 group-hover/banner:bg-black/40">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-600/90 shadow-lg shadow-red-900/40 backdrop-blur-sm transition-transform duration-300 group-hover/banner:scale-110 sm:h-14 sm:w-14">
                    <FaPlay className="ml-0.5 text-base text-white sm:text-lg" />
                  </div>
                </div>
              </Link>
            )}
          </>
        ) : (
          <Link to={`/games/${game._id}`} className="group/banner relative block h-full w-full">
            <img 
              src={game.bannerUrl} 
              alt={game.title} 
              className="h-full w-full object-cover transition-transform duration-500 group-hover/banner:scale-105"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = 'https://via.placeholder.com/640x360?text=Game+Banner+Not+Available';
              }}
            />
          </Link>
        )}

        {/* Category & blockchain badges overlaid on banner */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent px-3 pb-3 pt-10 sm:px-4">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded-md border border-blue-400/30 bg-blue-600/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-sm sm:text-xs">
              {game.category}
            </span>
            <span className="rounded-md border border-purple-400/30 bg-purple-600/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-sm sm:text-xs">
              {game.blockchain}
            </span>
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        {/* Top meta row */}
        <div className="mb-3 flex items-start justify-between gap-3 border-b border-white/5 pb-3">
          <p className="min-w-0 text-xs text-gray-400 sm:text-sm">
            By <span className="font-medium text-blue-300">{game.projectName}</span>
          </p>

          <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
            <div className="inline-flex items-center gap-1 rounded-lg border border-blue-500/20 bg-blue-500/10 px-2 py-1 text-xs font-semibold text-blue-200">
              <FaThumbsUp className="text-[10px] sm:text-xs" />
              <span>{voteCount}</span>
            </div>

            <button
              onClick={handleShare}
              className={`${iconBtnSm} ${
                copied
                  ? 'border-green-500/40 bg-green-600/20 text-green-300'
                  : 'border-white/10 bg-white/5 text-gray-300 hover:border-white/20 hover:bg-white/10 hover:text-white'
              }`}
              title={copied ? 'Link copied!' : 'Copy share link'}
              aria-label={copied ? 'Link copied' : 'Copy share link'}
            >
              <FaShare className="text-xs sm:text-sm" />
            </button>

            {isOwnerOrAdmin && (
              <>
                <button
                  onClick={handleEdit}
                  className={`${iconBtnSm} border-yellow-500/30 bg-yellow-600/20 text-yellow-200 hover:bg-yellow-600/35`}
                  title="Edit game"
                  aria-label="Edit game"
                >
                  <FaEdit className="text-xs sm:text-sm" />
                </button>
                <button
                  onClick={handleDeleteClick}
                  className={`${iconBtnSm} border-red-500/30 bg-red-600/20 text-red-200 hover:bg-red-600/35`}
                  title="Delete game"
                  aria-label="Delete game"
                >
                  <FaTrash className="text-xs sm:text-sm" />
                </button>
              </>
            )}
          </div>
        </div>

        <Link
          to={`/games/${game._id}`}
          className="mb-2 block text-lg font-bold leading-snug text-white transition-colors duration-200 line-clamp-2 group-hover:text-blue-200 sm:text-xl"
        >
          {game.title}
        </Link>

        {game.socials && game.socials.length > 0 && (
          <GameSocialLinks socials={game.socials} size="sm" className="mb-3" />
        )}
        
        <div className="mb-4 flex-grow">
          <div
            className={`text-sm leading-relaxed text-gray-300 whitespace-pre-wrap ${showFullDescription ? '' : 'line-clamp-3'}`}
          >
            {showFullDescription ? game.description : truncateDescription(game.description)}
          </div>
          
          {game.description.length > 150 && (
            <button
              onClick={() => setShowFullDescription(!showFullDescription)}
              className="mt-1.5 text-sm font-medium text-blue-400 transition-colors hover:text-blue-300 focus:outline-none"
            >
              {showFullDescription ? 'Show less' : 'Read more'}
            </button>
          )}
        </div>
        
        {/* Tags */}
        {game.tags && game.tags.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-1.5">
            {game.tags.map((tag, index) => (
              <span
                key={index}
                className="rounded-md border border-white/5 bg-white/5 px-2 py-0.5 text-[11px] font-medium text-gray-400 sm:text-xs"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
        
        {/* Actions — Play first on mobile; Vote/View + Play row on desktop */}
        <div className="mt-auto border-t border-white/5 pt-4">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-stretch">
            <button
              onClick={handlePlay}
              className={`${actionBtnBase} order-1 bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-lg shadow-green-900/30 hover:from-emerald-400 hover:to-green-500 lg:order-2 lg:w-auto lg:shrink-0 lg:px-6`}
            >
              <FaGamepad className="text-sm" />
              <span>Play Game</span>
              <FaExternalLinkAlt className="text-[10px] opacity-80" />
            </button>

            <div className="order-2 grid grid-cols-2 gap-2 lg:order-1 lg:flex-1">
              <button
                onClick={handleVote}
                disabled={loading}
                className={`${actionBtnBase} ${
                  voted
                    ? 'border border-blue-500/40 bg-blue-600/30 text-blue-100 hover:bg-blue-600/40'
                    : 'border border-white/10 bg-white/5 text-gray-200 hover:border-white/20 hover:bg-white/10'
                }`}
              >
                <FaThumbsUp className={`text-sm ${voted ? 'text-blue-200' : 'text-gray-400'}`} />
                <span className="truncate">{loading ? '…' : voted ? 'Voted' : 'Vote'}</span>
              </button>

              <Link
                to={`/games/${game._id}`}
                className={`${actionBtnBase} border border-white/10 bg-white/5 text-gray-200 hover:border-white/20 hover:bg-white/10`}
              >
                <FaEye className="text-sm text-gray-400" />
                <span className="truncate">View Page</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
      
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="mx-auto w-full max-w-md rounded-xl border border-white/10 bg-gray-900 p-6 shadow-2xl">
            <h3 className="mb-2 text-xl font-bold text-white">Confirm Delete</h3>
            <p className="mb-6 text-sm leading-relaxed text-gray-300">
              Are you sure you want to delete &ldquo;{game.title}&rdquo;? This action cannot be undone.
            </p>
            
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
              <button
                onClick={handleDeleteCancel}
                className="min-h-[44px] rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-gray-200 transition-colors hover:bg-white/10 sm:min-h-0"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="min-h-[44px] rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-500 sm:min-h-0"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameListing;
