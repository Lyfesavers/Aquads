import React from 'react';
import { Link } from 'react-router-dom';

const Marketplace = ({ currentUser, onLogin, onLogout, onCreateAccount }) => {
  const categories = [
    { id: 'smart-contract', name: 'Smart Contract Development', icon: '⚡' },
    { id: 'audit', name: 'Security Auditing', icon: '🔒' },
    { id: 'marketing', name: 'Crypto Marketing', icon: '📢' },
    { id: 'community', name: 'Community Management', icon: '👥' },
    { id: 'web3', name: 'Web3 Development', icon: '🌐' },
    { id: 'tokenomics', name: 'Tokenomics Design', icon: '📊' },
    { id: 'writing', name: 'Technical Writing', icon: '📝' },
    { id: 'consulting', name: 'Blockchain Consulting', icon: '💡' }
  ];

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-gray-900 to-black text-white">
      {/* Fixed Background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-black to-black"></div>
        <div className="tech-lines"></div>
        <div className="tech-dots"></div>
      </div>

      {/* Fixed Navigation */}
      <nav className="fixed top-0 left-0 right-0 bg-gray-800/80 backdrop-blur-sm shadow-lg shadow-blue-500/20 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 glow-text">
                AQUADS
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-500">
                AQUADUCT
              </span>
              {currentUser ? (
                <>
                  <span className="text-blue-300">Welcome, {currentUser.username}!</span>
                  <button
                    onClick={onLogout}
                    className="bg-red-500/80 hover:bg-red-600/80 px-4 py-2 rounded shadow-lg hover:shadow-red-500/50 transition-all duration-300 backdrop-blur-sm"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={onLogin}
                    className="bg-blue-500/80 hover:bg-blue-600/80 px-4 py-2 rounded shadow-lg hover:shadow-blue-500/50 transition-all duration-300 backdrop-blur-sm"
                  >
                    Login
                  </button>
                  <button
                    onClick={onCreateAccount}
                    className="bg-green-500/80 hover:bg-green-600/80 px-4 py-2 rounded shadow-lg hover:shadow-green-500/50 transition-all duration-300 backdrop-blur-sm"
                  >
                    Create Account
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Scrollable Content */}
      <main className="flex-grow relative z-10 overflow-auto">
        <div className="pt-20 pb-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Search and Filters */}
            <div className="mb-8">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Search services..."
                    className="w-full px-4 py-2 bg-gray-800/50 backdrop-blur-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="flex gap-2">
                  <select className="px-4 py-2 bg-gray-800/50 backdrop-blur-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="">All Categories</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                  <select className="px-4 py-2 bg-gray-800/50 backdrop-blur-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="newest">Newest First</option>
                    <option value="rating">Highest Rated</option>
                    <option value="price-low">Price: Low to High</option>
                    <option value="price-high">Price: High to Low</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Categories */}
            <div className="mb-12">
              <h2 className="text-2xl font-bold mb-6">Browse Categories</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {categories.map(category => (
                  <div
                    key={category.id}
                    className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-lg cursor-pointer hover:bg-gray-700/50 transition-all duration-300 group"
                  >
                    <div className="text-4xl mb-3 transform group-hover:scale-110 transition-transform">{category.icon}</div>
                    <h3 className="font-medium text-lg">{category.name}</h3>
                    <p className="text-gray-400 text-sm mt-2">Find expert {category.name.toLowerCase()} services</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Featured Services */}
            <div className="mb-12">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Featured Services</h2>
                <button className="px-4 py-2 bg-indigo-500/80 hover:bg-indigo-600/80 rounded-lg transition-colors">
                  List Your Service
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-lg">
                  <p className="text-gray-400 text-center">No services listed yet. Be the first to offer your expertise!</p>
                </div>
              </div>
            </div>

            {/* How It Works */}
            <div>
              <h2 className="text-2xl font-bold mb-6">How It Works</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-lg">
                  <div className="text-3xl mb-3">🔍</div>
                  <h3 className="font-medium text-lg mb-2">1. Find Services</h3>
                  <p className="text-gray-400">Browse through various crypto and blockchain services offered by professionals</p>
                </div>
                <div className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-lg">
                  <div className="text-3xl mb-3">💬</div>
                  <h3 className="font-medium text-lg mb-2">2. Connect</h3>
                  <p className="text-gray-400">Contact service providers and discuss your project requirements</p>
                </div>
                <div className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-lg">
                  <div className="text-3xl mb-3">✨</div>
                  <h3 className="font-medium text-lg mb-2">3. Get It Done</h3>
                  <p className="text-gray-400">Work with professionals and bring your crypto project to life</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Marketplace; 