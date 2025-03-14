import React, { useState, useEffect } from 'react';
import { FaGamepad, FaThumbsUp, FaTrophy, FaExternalLinkAlt } from 'react-icons/fa';
import { voteForGame, checkGameVoteStatus } from '../services/api';

const GameListing = ({ game, currentUser, showLoginModal, showNotification }) => {
  const [voted, setVoted] = useState(false);
  const [voteCount, setVoteCount] = useState(game.votes || 0);
  const [loading, setLoading] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  
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
  
  // Format YouTube URLs for embedding
  const formatVideoUrl = (url) => {
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const videoId = url.includes('youtube.com/watch?v=') 
        ? url.split('v=')[1].split('&')[0]
        : url.includes('youtu.be/') 
          ? url.split('youtu.be/')[1].split('?')[0]
          : '';
          
      return `https://www.youtube.com/embed/${videoId}`;
    }
    return url;
  };
  
  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden shadow-lg border border-gray-700 hover:border-blue-500 transition-all duration-300 flex flex-col">
      {/* Banner (video or image) */}
      <div className="relative w-full h-48 bg-gray-900 overflow-hidden">
        {isVideo ? (
          <iframe 
            src={formatVideoUrl(game.bannerUrl)}
            title={game.title}
            className="w-full h-full"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
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
        <div className="absolute top-2 left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
          {game.category}
        </div>
        
        {/* Blockchain label */}
        <div className="absolute top-2 right-2 bg-purple-600 text-white text-xs px-2 py-1 rounded-full">
          {game.blockchain}
        </div>
      </div>
      
      {/* Content */}
      <div className="p-4 flex-grow flex flex-col">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-xl font-bold text-white">{game.title}</h3>
          
          <div className="flex items-center bg-blue-900 text-blue-300 px-2 py-1 rounded-full text-sm">
            <FaThumbsUp className="mr-1" />
            <span>{voteCount}</span>
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
    </div>
  );
};

export default GameListing; 