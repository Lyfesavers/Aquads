import React, { useState, useEffect } from 'react';
import { FaGamepad, FaThumbsUp, FaTrophy, FaExternalLinkAlt, FaEdit, FaTrash, FaVolumeUp, FaVolumeMute, FaExclamationTriangle } from 'react-icons/fa';
import { voteForGame, checkGameVoteStatus } from '../services/api';

const GameListing = ({ game, currentUser, showLoginModal, showNotification, onEdit, onDelete }) => {
  const [voted, setVoted] = useState(false);
  const [voteCount, setVoteCount] = useState(game.votes || 0);
  const [loading, setLoading] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isMuted, setIsMuted] = useState(true); // Default to muted
  
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
      console.error('Error checking vote status:', error);
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
      console.error('Error voting for game:', error);
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
  
  const toggleMute = () => {
    setIsMuted(!isMuted);
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
  
  // Format YouTube URLs for embedding
  const formatVideoUrl = (url) => {
    if (isYouTubeVideo) {
      const videoId = url.includes('youtube.com/watch?v=') 
        ? url.split('v=')[1].split('&')[0]
        : url.includes('youtu.be/') 
          ? url.split('youtu.be/')[1].split('?')[0]
          : '';
          
      // Add parameters for controls, mute status, and modest branding
      return `https://www.youtube.com/embed/${videoId}?controls=1&mute=${isMuted ? 1 : 0}&modestbranding=1`;
    }
    return url;
  };
  
  // Check if current user is the owner or an admin
  const isOwnerOrAdmin = currentUser && (
    (game.owner && currentUser._id === game.owner._id) || 
    (game.owner && currentUser.userId === game.owner._id) || 
    (game.owner && currentUser.id === game.owner._id) ||
    (game.createdBy && (currentUser._id === game.createdBy || currentUser.userId === game.createdBy || currentUser.id === game.createdBy)) ||
    currentUser.isAdmin || 
    currentUser.role === 'admin'
  );
  
  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden shadow-lg border border-gray-700 hover:border-blue-500 transition-all duration-300 flex flex-col h-full">
      {/* Banner (video or image) */}
      <div className="relative w-full h-48 bg-gray-900 overflow-hidden">
        {isVideo ? (
          <>
            {isUnsupportedExternalUrl ? (
              <div className="w-full h-full flex flex-col items-center justify-center text-center p-4 bg-gray-800">
                <FaExclamationTriangle className="text-yellow-500 text-3xl mb-2" />
                <p className="text-gray-300 text-sm">Non-YouTube content cannot be embedded</p>
                <button
                  onClick={handlePlay}
                  className="mt-3 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                >
                  Open Game Directly
                </button>
                {isOwnerOrAdmin && (
                  <p className="text-red-400 text-xs mt-2">
                    Admin: Please edit this entry and use YouTube for video previews
                  </p>
                )}
              </div>
            ) : (
              <iframe 
                src={formatVideoUrl(game.bannerUrl)}
                title={game.title}
                className="w-full h-full"
                frameBorder="0"
                allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                sandbox={isYouTubeVideo ? "allow-scripts allow-same-origin allow-presentation" : ""}
              />
            )}
            {/* Volume control button for YouTube videos */}
            {isYouTubeVideo && (
              <button 
                onClick={toggleMute}
                className="absolute bottom-2 right-2 bg-black bg-opacity-60 text-white p-2 rounded-full hover:bg-opacity-80 transition-opacity z-10"
                title={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted ? <FaVolumeMute /> : <FaVolumeUp />}
              </button>
            )}
          </>
        ) : (
          <img 
            src={game.bannerUrl} 
            alt={game.title} 
            className="w-full h-full object-cover"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = 'https://via.placeholder.com/640x360?text=Game+Banner+Not+Available';
            }}
          />
        )}
        
        {/* Category label */}
        <div className="absolute top-2 left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded-full z-[200]">
          {game.category}
        </div>
        
        {/* Blockchain label */}
        <div className="absolute top-2 right-2 bg-purple-600 text-white text-xs px-2 py-1 rounded-full z-[200]">
          {game.blockchain}
        </div>
      </div>
      
      {/* Content */}
      <div className="p-4 flex-grow flex flex-col">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-xl font-bold text-white">{game.title}</h3>
          
          <div className="flex items-center">
            {/* Owner/Admin Buttons - Moved here for better visibility */}
            {isOwnerOrAdmin && (
              <div className="flex space-x-2 mr-2">
                <button
                  onClick={handleEdit}
                  className="bg-yellow-600 hover:bg-yellow-700 text-white p-1.5 rounded-full flex items-center justify-center"
                  title="Edit game"
                >
                  <FaEdit size={14} />
                </button>
                <button
                  onClick={handleDeleteClick}
                  className="bg-red-600 hover:bg-red-700 text-white p-1.5 rounded-full flex items-center justify-center"
                  title="Delete game"
                >
                  <FaTrash size={14} />
                </button>
              </div>
            )}
            
            <div className="flex items-center bg-blue-900 text-blue-300 px-2 py-1 rounded-full text-sm">
              <FaThumbsUp className="mr-1" />
              <span>{voteCount}</span>
            </div>
          </div>
        </div>
        
        <p className="text-sm text-gray-400 mb-2">
          By <span className="text-blue-400">{game.projectName}</span>
        </p>
        
        <div className="mb-4 flex-grow">
          <div
            className={`text-gray-300 text-sm ${showFullDescription ? '' : 'line-clamp-3'}`}
          >
            {showFullDescription ? game.description : truncateDescription(game.description)}
          </div>
          
          {game.description.length > 150 && (
            <button
              onClick={() => setShowFullDescription(!showFullDescription)}
              className="text-blue-400 text-sm mt-1 hover:underline focus:outline-none"
            >
              {showFullDescription ? 'Show less' : 'Read more'}
            </button>
          )}
        </div>
        
        {/* Tags */}
        {game.tags && game.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {game.tags.map((tag, index) => (
              <span
                key={index}
                className="bg-gray-700 text-gray-300 text-xs px-2 py-1 rounded-full"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
        
        {/* Actions */}
        <div className="flex justify-between items-center mt-auto">
          <button
            onClick={handleVote}
            disabled={loading}
            className={`flex items-center px-3 py-2 rounded text-sm ${
              voted
                ? 'bg-blue-700 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            } transition-colors disabled:opacity-50`}
          >
            <FaThumbsUp className={`mr-1 ${voted ? 'text-white' : 'text-gray-400'}`} />
            {loading ? 'Processing...' : voted ? 'Voted' : 'Vote'}
          </button>
          
          <button
            onClick={handlePlay}
            className="flex items-center bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-4 py-2 rounded text-sm transition-colors"
          >
            <FaGamepad className="mr-1" />
            Play Game
            <FaExternalLinkAlt className="ml-1 text-xs" />
          </button>
        </div>
      </div>
      
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md mx-auto">
            <h3 className="text-xl font-bold text-white mb-4">Confirm Delete</h3>
            <p className="text-gray-300 mb-6">Are you sure you want to delete "{game.title}"? This action cannot be undone.</p>
            
            <div className="flex justify-end space-x-4">
              <button
                onClick={handleDeleteCancel}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
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