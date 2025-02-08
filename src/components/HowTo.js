import React from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';

const HowTo = () => {
  // Replace this with your YouTube playlist ID
  const PLAYLIST_ID = 'PLKHtulN0_0h8hun9lEhYHPGm4Mqophidj';
  
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Helmet>
        <title>How To Guide - Aquads</title>
        <meta name="description" content="Learn how to use Aquads platform with our video tutorials" />
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
                Aquaduct
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 overflow-y-auto h-[calc(100vh-64px)]">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4 text-blue-400">How To Guide</h1>
          <p className="text-gray-400 text-lg">
            Learn how to make the most of Aquads with our video tutorials
          </p>
        </div>

        <div className="aspect-w-16 aspect-h-9 bg-gray-800 rounded-lg overflow-hidden">
          <iframe
            src={`https://www.youtube.com/embed/videoseries?list=${PLAYLIST_ID}`}
            title="Aquads Tutorials"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full h-full min-h-[600px]"
          ></iframe>
        </div>
      </div>
    </div>
  );
};

export default HowTo; 