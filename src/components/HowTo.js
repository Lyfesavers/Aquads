import React from 'react';
import { Helmet } from 'react-helmet';

const HowTo = () => {
  // Replace this with your YouTube playlist ID
  const PLAYLIST_ID = 'PLKHtulN0_0h8hun9lEhYHPGm4Mqophidj';
  
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Helmet>
        <title>How To Guide - Aquads</title>
        <meta name="description" content="Learn how to use Aquads platform with our video tutorials" />
      </Helmet>

      <div className="container mx-auto px-4 py-8">
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