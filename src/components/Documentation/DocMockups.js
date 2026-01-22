import React from 'react';

// Reusable UI Components for Mockups
const MockupContainer = ({ children, title }) => (
  <div className="mockup-container my-8 rounded-xl overflow-hidden border border-gray-700 shadow-2xl">
    {title && (
      <div className="mockup-title bg-gray-800 px-4 py-2 border-b border-gray-700 flex items-center gap-2">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
        </div>
        <span className="text-gray-400 text-sm ml-2">{title}</span>
      </div>
    )}
    <div className="mockup-content bg-gray-900 p-4">
      {children}
    </div>
  </div>
);

// Create Account Modal Mockup
export const CreateAccountMockup = () => (
  <MockupContainer title="Create Account Modal">
    <div className="bg-gray-800 rounded-lg p-6 max-w-md mx-auto">
      <h2 className="text-xl font-bold text-white mb-4">Create Account</h2>
      
      {/* Account Type */}
      <div className="mb-4">
        <label className="block text-gray-400 text-sm mb-2">Account Type</label>
        <div className="grid grid-cols-2 gap-3">
          <button className="border-2 border-cyan-500 bg-cyan-500/20 text-white px-3 py-2 rounded-lg text-sm">
            Freelancer
          </button>
          <button className="border-2 border-gray-600 text-gray-400 px-3 py-2 rounded-lg text-sm">
            Project
          </button>
        </div>
      </div>

      {/* Form Fields */}
      <div className="space-y-3">
        <div>
          <label className="block text-gray-400 text-sm mb-1">Username</label>
          <input 
            type="text" 
            placeholder="Enter username" 
            className="w-full bg-gray-700 text-white px-3 py-2 rounded text-sm border border-gray-600 focus:border-cyan-500 outline-none"
            readOnly
          />
        </div>
        <div>
          <label className="block text-gray-400 text-sm mb-1">Full Name *</label>
          <input 
            type="text" 
            placeholder="Enter your full name" 
            className="w-full bg-gray-700 text-white px-3 py-2 rounded text-sm border border-gray-600"
            readOnly
          />
        </div>
        <div>
          <label className="block text-gray-400 text-sm mb-1">Email *</label>
          <input 
            type="email" 
            placeholder="Enter email" 
            className="w-full bg-gray-700 text-white px-3 py-2 rounded text-sm border border-gray-600"
            readOnly
          />
        </div>
        <div>
          <label className="block text-gray-400 text-sm mb-1">Country</label>
          <select className="w-full bg-gray-700 text-gray-400 px-3 py-2 rounded text-sm border border-gray-600">
            <option>Select your country</option>
          </select>
        </div>
        <div>
          <label className="block text-gray-400 text-sm mb-1">Password</label>
          <input 
            type="password" 
            placeholder="Create a password" 
            className="w-full bg-gray-700 text-white px-3 py-2 rounded text-sm border border-gray-600"
            readOnly
          />
          {/* Password requirements */}
          <div className="mt-2 p-2 bg-gray-700 rounded text-xs space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              <span className="text-green-500">At least 8 characters</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              <span className="text-green-500">At least one uppercase letter</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-red-500">✗</span>
              <span className="text-red-500">At least one special character</span>
            </div>
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex justify-end gap-3 mt-6">
        <button className="px-4 py-2 bg-gray-600 text-white rounded text-sm">Cancel</button>
        <button className="px-4 py-2 bg-cyan-500 text-white rounded text-sm">Create Account</button>
      </div>
    </div>
  </MockupContainer>
);

// Login Modal Mockup
export const LoginMockup = () => (
  <MockupContainer title="Login Modal">
    <div className="bg-gray-800 rounded-lg p-6 max-w-sm mx-auto">
      <h2 className="text-xl font-bold text-white mb-4">Login</h2>
      
      <div className="space-y-4">
        <div>
          <label className="block text-gray-400 text-sm mb-1">Username or Email</label>
          <input 
            type="text" 
            placeholder="Enter username or email" 
            className="w-full bg-gray-700 text-white px-3 py-2 rounded text-sm border border-gray-600"
            readOnly
          />
        </div>
        <div>
          <label className="block text-gray-400 text-sm mb-1">Password</label>
          <input 
            type="password" 
            placeholder="••••••••" 
            className="w-full bg-gray-700 text-white px-3 py-2 rounded text-sm border border-gray-600"
            readOnly
          />
        </div>
      </div>

      <div className="flex justify-between items-center mt-4">
        <div className="space-x-3 text-sm">
          <span className="text-cyan-400 cursor-pointer">Create Account</span>
          <span className="text-cyan-400 cursor-pointer">Forgot Password?</span>
        </div>
        <button className="px-4 py-2 bg-cyan-500 text-white rounded text-sm">Login</button>
      </div>

      <div className="relative my-4">
        <div className="flex items-center">
          <div className="flex-1 h-px bg-gray-700"></div>
          <span className="px-3 text-gray-500 text-sm">or</span>
          <div className="flex-1 h-px bg-gray-700"></div>
        </div>
      </div>

      <button className="w-full border border-gray-600 text-gray-300 px-4 py-2 rounded text-sm flex items-center justify-center gap-2">
        <svg className="w-4 h-4" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Sign in with Google
      </button>
    </div>
  </MockupContainer>
);

// Navigation Bar Mockup
export const NavigationMockup = () => (
  <MockupContainer title="Navigation Bar">
    <div className="bg-gray-800/80 backdrop-blur px-4 py-3 rounded-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="text-cyan-400 font-bold text-lg tracking-wider">AQUADS</div>
        </div>
        
        <div className="flex items-center gap-2">
          <button className="bg-gray-700 hover:bg-gray-600 text-yellow-400 px-3 py-1.5 rounded text-sm">
            Freelancer
          </button>
          <button className="bg-gray-700 hover:bg-gray-600 text-yellow-400 px-3 py-1.5 rounded text-sm">
            Games
          </button>
          <button className="bg-gray-700 hover:bg-gray-600 text-yellow-400 px-3 py-1.5 rounded text-sm">
            Paid Ads
          </button>
          <button className="bg-gray-700 hover:bg-gray-600 text-yellow-400 px-3 py-1.5 rounded text-sm">
            Learn
          </button>
          <button className="bg-gray-700 hover:bg-gray-600 text-yellow-400 px-3 py-1.5 rounded text-sm">
            Login
          </button>
          <button className="bg-gray-700 hover:bg-gray-600 text-yellow-400 px-3 py-1.5 rounded text-sm">
            Create Account
          </button>
        </div>
      </div>
    </div>
  </MockupContainer>
);

// Dashboard Mockup
export const DashboardMockup = () => (
  <MockupContainer title="User Dashboard">
    <div className="bg-gray-800 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gray-900 px-4 py-3 border-b border-gray-700 flex items-center justify-between">
        <h2 className="text-white font-bold">Dashboard</h2>
        <button className="text-gray-400 hover:text-white">✕</button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-700 bg-gray-850">
        <button className="px-4 py-2 text-cyan-400 border-b-2 border-cyan-400 text-sm">My Projects</button>
        <button className="px-4 py-2 text-gray-400 text-sm">Bookings</button>
        <button className="px-4 py-2 text-gray-400 text-sm">Affiliate</button>
        <button className="px-4 py-2 text-gray-400 text-sm">AquaPay</button>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="grid gap-4">
          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gray-700/50 rounded-lg p-4">
              <div className="text-gray-400 text-sm">Active Projects</div>
              <div className="text-2xl font-bold text-white">3</div>
            </div>
            <div className="bg-gray-700/50 rounded-lg p-4">
              <div className="text-gray-400 text-sm">Total Votes</div>
              <div className="text-2xl font-bold text-green-400">+127</div>
            </div>
            <div className="bg-gray-700/50 rounded-lg p-4">
              <div className="text-gray-400 text-sm">Points Balance</div>
              <div className="text-2xl font-bold text-yellow-400">850</div>
            </div>
          </div>

          {/* Project List */}
          <div className="bg-gray-700/30 rounded-lg p-4">
            <h3 className="text-white font-medium mb-3">Your Listed Projects</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between bg-gray-700/50 rounded p-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-full"></div>
                  <div>
                    <div className="text-white text-sm font-medium">MyToken</div>
                    <div className="text-gray-400 text-xs">Ethereum • Listed 5 days ago</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-400 text-sm">+85 votes</span>
                  <button className="bg-purple-500 text-white text-xs px-2 py-1 rounded">Bump</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </MockupContainer>
);

// Bubble Map Mockup
export const BubbleMapMockup = () => (
  <MockupContainer title="Token Bubble Map">
    <div className="bg-gradient-to-br from-gray-900 to-black rounded-lg p-8 relative min-h-[300px]">
      {/* Background effects */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent"></div>
      
      {/* Bubbles */}
      <div className="relative">
        {/* Large bubble */}
        <div className="absolute top-10 left-20 w-24 h-24 bg-gradient-to-br from-purple-500 to-purple-700 rounded-full flex items-center justify-center shadow-lg shadow-purple-500/30 animate-pulse">
          <div className="text-center">
            <div className="text-white font-bold text-sm">SOL</div>
            <div className="text-green-400 text-xs">+12%</div>
          </div>
        </div>

        {/* Medium bubble */}
        <div className="absolute top-5 right-20 w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/30">
          <div className="text-center">
            <div className="text-white font-bold text-sm">ETH</div>
            <div className="text-green-400 text-xs">+5%</div>
          </div>
        </div>

        {/* Small bubbles */}
        <div className="absolute top-32 left-48 w-16 h-16 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-full flex items-center justify-center shadow-lg shadow-yellow-500/30">
          <div className="text-center">
            <div className="text-white font-bold text-xs">BNB</div>
          </div>
        </div>

        <div className="absolute top-24 right-32 w-14 h-14 bg-gradient-to-br from-cyan-500 to-teal-500 rounded-full flex items-center justify-center shadow-lg shadow-cyan-500/30">
          <div className="text-white font-bold text-xs">BASE</div>
        </div>

        <div className="absolute bottom-4 left-32 w-12 h-12 bg-gradient-to-br from-pink-500 to-rose-500 rounded-full flex items-center justify-center shadow-lg shadow-pink-500/30">
          <div className="text-white font-bold text-xs">ARB</div>
        </div>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 right-4 text-xs text-gray-400">
        <div>Bubble size = Community engagement</div>
        <div>Click any bubble for details</div>
      </div>
    </div>
  </MockupContainer>
);

// Profile Settings Mockup
export const ProfileSettingsMockup = () => (
  <MockupContainer title="Profile Settings">
    <div className="bg-gray-800 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gray-900 px-4 py-3 border-b border-gray-700 flex items-center justify-between">
        <h2 className="text-white font-bold">Edit Profile</h2>
        <button className="text-gray-400 hover:text-white">✕</button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-700">
        <button className="px-4 py-2 text-cyan-400 border-b-2 border-cyan-400 text-sm flex items-center gap-2">
          <span>👤</span> Profile
        </button>
        <button className="px-4 py-2 text-gray-400 text-sm flex items-center gap-2">
          <span>🔒</span> Security
        </button>
        <button className="px-4 py-2 text-gray-400 text-sm flex items-center gap-2">
          <span>📄</span> CV Builder
        </button>
        <button className="px-4 py-2 text-gray-400 text-sm flex items-center gap-2">
          <span>⛓️</span> On-Chain Resume
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Profile Picture */}
          <div className="bg-gray-700/30 rounded-lg p-4">
            <h3 className="text-white font-medium mb-3 flex items-center gap-2">
              <span className="text-cyan-400">👤</span> Profile Picture
            </h3>
            <div className="flex justify-center mb-4">
              <div className="w-24 h-24 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-full border-4 border-cyan-500/30"></div>
            </div>
            <input 
              type="text" 
              placeholder="Enter image URL (JPEG, PNG, or GIF)" 
              className="w-full bg-gray-700 text-gray-300 px-3 py-2 rounded text-sm border border-gray-600"
              readOnly
            />
          </div>

          {/* Basic Info */}
          <div className="bg-gray-700/30 rounded-lg p-4">
            <h3 className="text-white font-medium mb-3 flex items-center gap-2">
              <span className="text-green-400">✏️</span> Basic Information
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-gray-400 text-sm mb-1">Username</label>
                <input 
                  type="text" 
                  value="cryptodev123" 
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded text-sm border border-gray-600"
                  readOnly
                />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1">Full Name</label>
                <input 
                  type="text" 
                  value="John Smith" 
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded text-sm border border-gray-600"
                  readOnly
                />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1">Country</label>
                <select className="w-full bg-gray-700 text-white px-3 py-2 rounded text-sm border border-gray-600">
                  <option>United States</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <button className="mt-4 bg-cyan-500 text-white px-6 py-2 rounded font-medium">
          Save Changes
        </button>
      </div>
    </div>
  </MockupContainer>
);

// Token Voting Mockup
export const TokenVotingMockup = () => (
  <MockupContainer title="Token Voting Modal">
    <div className="bg-gray-800 rounded-lg p-6 max-w-md mx-auto">
      {/* Token Header */}
      <div className="flex items-center gap-4 mb-6">
        <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-700 rounded-full flex items-center justify-center">
          <span className="text-white font-bold text-lg">SOL</span>
        </div>
        <div>
          <h3 className="text-white font-bold text-lg">Solana</h3>
          <p className="text-gray-400 text-sm">Solana Network • Listed 30 days ago</p>
        </div>
      </div>

      {/* Sentiment Display */}
      <div className="bg-gray-700/50 rounded-lg p-4 mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-gray-400 text-sm">Community Sentiment</span>
          <span className="text-green-400 font-medium">78% Bullish</span>
        </div>
        <div className="h-3 bg-gray-600 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-green-500 to-green-400" style={{width: '78%'}}></div>
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>🐻 Bearish: 22%</span>
          <span>🐂 Bullish: 78%</span>
        </div>
      </div>

      {/* Vote Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-700/30 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-green-400">+1,247</div>
          <div className="text-gray-400 text-xs">Bullish Votes</div>
        </div>
        <div className="bg-gray-700/30 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-red-400">-352</div>
          <div className="text-gray-400 text-xs">Bearish Votes</div>
        </div>
      </div>

      {/* Vote Buttons */}
      <div className="grid grid-cols-2 gap-4">
        <button className="bg-green-500 hover:bg-green-600 text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2">
          🐂 Vote Bullish
        </button>
        <button className="bg-red-500 hover:bg-red-600 text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2">
          🐻 Vote Bearish
        </button>
      </div>

      <p className="text-gray-500 text-xs text-center mt-4">
        You can vote once per project per day
      </p>
    </div>
  </MockupContainer>
);

// User Dropdown Mockup
export const UserDropdownMockup = () => (
  <MockupContainer title="User Dropdown Menu">
    <div className="flex justify-end p-4">
      <div className="relative">
        <button className="bg-gray-700 text-yellow-400 px-3 py-1.5 rounded flex items-center gap-2 text-sm">
          cryptodev123
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
        
        {/* Dropdown */}
        <div className="absolute right-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-xl">
          <div className="py-2">
            <button className="w-full text-left px-4 py-2 text-gray-300 hover:text-white hover:bg-blue-600/50 text-sm flex items-center gap-2">
              📊 Dashboard
            </button>
            <button className="w-full text-left px-4 py-2 text-gray-300 hover:text-white hover:bg-purple-600/50 text-sm flex items-center gap-2">
              ➕ List Project
            </button>
            <button className="w-full text-left px-4 py-2 text-gray-300 hover:text-white hover:bg-blue-600/50 text-sm flex items-center gap-2">
              🎨 Create Banner Ad
            </button>
            <button className="w-full text-left px-4 py-2 text-gray-300 hover:text-white hover:bg-purple-600/50 text-sm flex items-center gap-2">
              ⚙️ Edit Profile
            </button>
            <hr className="my-2 border-gray-700" />
            <button className="w-full text-left px-4 py-2 text-gray-300 hover:text-white hover:bg-red-600/50 text-sm flex items-center gap-2">
              🚪 Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  </MockupContainer>
);

// Annotation Component for mockups
export const Annotation = ({ number, text, position = 'right' }) => (
  <div className={`flex items-center gap-2 ${position === 'left' ? 'flex-row-reverse' : ''}`}>
    <div className="w-6 h-6 bg-cyan-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
      {number}
    </div>
    <span className="text-cyan-400 text-sm">{text}</span>
  </div>
);

// Freelancer Marketplace Mockup
export const MarketplaceMockup = () => (
  <MockupContainer title="Freelancer Hub Marketplace">
    <div className="bg-gray-900 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gray-800 px-4 py-3 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-cyan-400 font-bold">AQUADS</span>
            <div className="flex gap-2">
              <button className="bg-gray-700 text-yellow-400 px-3 py-1 rounded text-sm">Freelancer</button>
              <button className="bg-gray-700 text-gray-400 px-3 py-1 rounded text-sm">Games</button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="bg-cyan-500 text-white px-3 py-1 rounded text-sm">+ Create Service</button>
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="px-4 py-3 border-b border-gray-800 flex gap-2 overflow-x-auto">
        <button className="bg-cyan-500/20 text-cyan-400 px-3 py-1 rounded-full text-xs whitespace-nowrap">All Services</button>
        <button className="text-gray-400 px-3 py-1 rounded-full text-xs whitespace-nowrap hover:bg-gray-700">Development</button>
        <button className="text-gray-400 px-3 py-1 rounded-full text-xs whitespace-nowrap hover:bg-gray-700">Design</button>
        <button className="text-gray-400 px-3 py-1 rounded-full text-xs whitespace-nowrap hover:bg-gray-700">Marketing</button>
        <button className="text-gray-400 px-3 py-1 rounded-full text-xs whitespace-nowrap hover:bg-gray-700">Writing</button>
        <button className="text-gray-400 px-3 py-1 rounded-full text-xs whitespace-nowrap hover:bg-gray-700">Community</button>
      </div>

      {/* Search Bar */}
      <div className="px-4 py-3">
        <input 
          type="text" 
          placeholder="Search services..." 
          className="w-full bg-gray-800 text-gray-300 px-4 py-2 rounded-lg border border-gray-700 text-sm"
          readOnly
        />
      </div>

      {/* Service Cards */}
      <div className="p-4 grid grid-cols-3 gap-4">
        {/* Service Card 1 */}
        <div className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700 hover:border-cyan-500/50 transition-colors">
          <div className="h-32 bg-gradient-to-br from-purple-500 to-pink-500 relative">
            <span className="absolute top-2 left-2 bg-yellow-400 text-black text-xs px-2 py-0.5 rounded-full font-medium">🥇 Gold</span>
          </div>
          <div className="p-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 bg-cyan-500 rounded-full"></div>
              <span className="text-white text-xs font-medium">cryptodev</span>
              <span className="text-green-400 text-xs">●</span>
            </div>
            <h3 className="text-white text-sm font-medium mb-1 line-clamp-2">Smart Contract Development & Audit</h3>
            <div className="flex items-center justify-between">
              <span className="text-cyan-400 font-bold">$500</span>
              <span className="text-gray-400 text-xs">⭐ 4.9 (23)</span>
            </div>
          </div>
        </div>

        {/* Service Card 2 */}
        <div className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700 hover:border-cyan-500/50 transition-colors">
          <div className="h-32 bg-gradient-to-br from-blue-500 to-cyan-500"></div>
          <div className="p-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 bg-pink-500 rounded-full"></div>
              <span className="text-white text-xs font-medium">designer_pro</span>
            </div>
            <h3 className="text-white text-sm font-medium mb-1 line-clamp-2">NFT Art & Collection Design</h3>
            <div className="flex items-center justify-between">
              <span className="text-cyan-400 font-bold">$150</span>
              <span className="text-gray-400 text-xs">⭐ 4.8 (45)</span>
            </div>
          </div>
        </div>

        {/* Service Card 3 */}
        <div className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700 hover:border-cyan-500/50 transition-colors">
          <div className="h-32 bg-gradient-to-br from-green-500 to-emerald-500"></div>
          <div className="p-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 bg-orange-500 rounded-full"></div>
              <span className="text-white text-xs font-medium">web3_writer</span>
            </div>
            <h3 className="text-white text-sm font-medium mb-1 line-clamp-2">Whitepaper & Documentation Writing</h3>
            <div className="flex items-center justify-between">
              <span className="text-cyan-400 font-bold">$200</span>
              <span className="text-gray-400 text-xs">⭐ 5.0 (12)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </MockupContainer>
);

// Create Service Modal Mockup
export const CreateServiceMockup = () => (
  <MockupContainer title="Create New Service">
    <div className="bg-gray-900 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-3">
        <h2 className="text-white font-bold">Create New Service</h2>
        <p className="text-indigo-200 text-xs">Build your professional service listing</p>
      </div>

      {/* Form */}
      <div className="p-4 space-y-4">
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <label className="block text-white font-medium mb-2 text-sm">Service Title</label>
          <input 
            type="text" 
            placeholder="I will create a professional website..." 
            className="w-full bg-gray-700 text-white px-3 py-2 rounded text-sm border border-gray-600"
            readOnly
          />
        </div>

        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <label className="block text-white font-medium mb-2 text-sm">Category</label>
          <select className="w-full bg-gray-700 text-white px-3 py-2 rounded text-sm border border-gray-600">
            <option>Development</option>
            <option>Design</option>
            <option>Marketing</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
            <label className="block text-white font-medium mb-2 text-sm">Price</label>
            <div className="flex">
              <input 
                type="number" 
                placeholder="100" 
                className="flex-1 bg-gray-700 text-white px-3 py-2 rounded-l text-sm border border-gray-600"
                readOnly
              />
              <select className="bg-gray-600 text-white px-2 py-2 rounded-r text-sm border border-gray-600">
                <option>USDC</option>
                <option>SOL</option>
                <option>ETH</option>
              </select>
            </div>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
            <label className="block text-white font-medium mb-2 text-sm">Delivery Time</label>
            <select className="w-full bg-gray-700 text-white px-3 py-2 rounded text-sm border border-gray-600">
              <option>3 days</option>
              <option>7 days</option>
              <option>14 days</option>
            </select>
          </div>
        </div>

        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <label className="block text-white font-medium mb-2 text-sm">Description (min 200 characters)</label>
          <textarea 
            placeholder="Describe your service in detail..." 
            className="w-full bg-gray-700 text-white px-3 py-2 rounded text-sm border border-gray-600 h-20"
            readOnly
          />
          <span className="text-gray-400 text-xs">0/200 characters minimum</span>
        </div>

        <button className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-lg font-medium">
          Create Service
        </button>
      </div>
    </div>
  </MockupContainer>
);

// AquaSwap Mockup
export const AquaSwapMockup = () => (
  <MockupContainer title="AquaSwap DEX Aggregator">
    <div className="bg-gray-900 rounded-lg p-6 max-w-sm mx-auto">
      <div className="text-center mb-6">
        <h2 className="text-white font-bold text-xl">Swap</h2>
        <p className="text-gray-400 text-sm">Trade tokens at the best rates</p>
      </div>

      {/* From Token */}
      <div className="bg-gray-800 rounded-lg p-4 mb-2">
        <div className="flex justify-between mb-2">
          <span className="text-gray-400 text-sm">From</span>
          <span className="text-gray-400 text-sm">Balance: 1.5</span>
        </div>
        <div className="flex items-center justify-between">
          <input 
            type="number" 
            placeholder="0.0" 
            className="bg-transparent text-white text-2xl font-bold w-32 outline-none"
            readOnly
            value="1.0"
          />
          <button className="flex items-center gap-2 bg-gray-700 px-3 py-2 rounded-lg">
            <div className="w-6 h-6 bg-purple-500 rounded-full"></div>
            <span className="text-white font-medium">ETH</span>
            <span className="text-gray-400">▼</span>
          </button>
        </div>
      </div>

      {/* Swap Arrow */}
      <div className="flex justify-center -my-2 relative z-10">
        <button className="bg-gray-700 p-2 rounded-lg border-4 border-gray-900">
          <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
          </svg>
        </button>
      </div>

      {/* To Token */}
      <div className="bg-gray-800 rounded-lg p-4 mb-4">
        <div className="flex justify-between mb-2">
          <span className="text-gray-400 text-sm">To</span>
          <span className="text-gray-400 text-sm">Balance: 0</span>
        </div>
        <div className="flex items-center justify-between">
          <input 
            type="number" 
            placeholder="0.0" 
            className="bg-transparent text-white text-2xl font-bold w-32 outline-none"
            readOnly
            value="3,250"
          />
          <button className="flex items-center gap-2 bg-gray-700 px-3 py-2 rounded-lg">
            <div className="w-6 h-6 bg-yellow-500 rounded-full"></div>
            <span className="text-white font-medium">USDC</span>
            <span className="text-gray-400">▼</span>
          </button>
        </div>
      </div>

      {/* Rate Info */}
      <div className="bg-gray-800/50 rounded-lg p-3 mb-4 text-sm">
        <div className="flex justify-between text-gray-400">
          <span>Rate</span>
          <span>1 ETH = 3,250 USDC</span>
        </div>
        <div className="flex justify-between text-gray-400">
          <span>Price Impact</span>
          <span className="text-green-400">{"<"}0.01%</span>
        </div>
        <div className="flex justify-between text-gray-400">
          <span>Route</span>
          <span className="text-cyan-400">Uniswap V3</span>
        </div>
      </div>

      {/* Swap Button */}
      <button className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white py-4 rounded-lg font-bold text-lg">
        Connect Wallet
      </button>
    </div>
  </MockupContainer>
);

// Raids Mockup
export const RaidsMockup = () => (
  <MockupContainer title="Twitter Raids">
    <div className="bg-gray-900 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gray-800 px-4 py-3 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <h2 className="text-white font-bold">Active Raids</h2>
          <button className="bg-cyan-500 text-white px-3 py-1 rounded text-sm">+ Create Raid</button>
        </div>
      </div>

      {/* Raid List */}
      <div className="p-4 space-y-3">
        {/* Raid Card 1 */}
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center text-white text-xl">
              𝕏
            </div>
            <div className="flex-1">
              <h3 className="text-white font-medium">Twitter Raid - @CryptoProject</h3>
              <p className="text-gray-400 text-sm">Like, Retweet & Comment to earn points</p>
              <div className="flex items-center gap-4 mt-2">
                <span className="text-green-400 text-sm">🎁 20 points</span>
                <span className="text-gray-500 text-sm">👥 45 completed</span>
                <span className="text-yellow-400 text-sm">⏱️ 23h left</span>
              </div>
            </div>
            <button className="bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
              Join Raid
            </button>
          </div>
        </div>

        {/* Raid Card 2 */}
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 bg-blue-400 rounded-lg flex items-center justify-center text-white text-xl">
              📱
            </div>
            <div className="flex-1">
              <h3 className="text-white font-medium">Telegram Raid - Join Channel</h3>
              <p className="text-gray-400 text-sm">Join our Telegram and react to pinned</p>
              <div className="flex items-center gap-4 mt-2">
                <span className="text-green-400 text-sm">🎁 15 points</span>
                <span className="text-gray-500 text-sm">👥 120 completed</span>
                <span className="text-yellow-400 text-sm">⏱️ 1d left</span>
              </div>
            </div>
            <button className="bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
              Join Raid
            </button>
          </div>
        </div>

        {/* Points Summary */}
        <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-lg p-4 border border-yellow-500/30">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-gray-400 text-sm">Your Points Balance</span>
              <div className="text-yellow-400 text-2xl font-bold">850 pts</div>
            </div>
            <div className="text-right">
              <span className="text-gray-400 text-sm">Today's Earnings</span>
              <div className="text-green-400 text-xl font-bold">+45 pts</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </MockupContainer>
);

// AquaPay Mockup
export const AquaPayMockup = () => (
  <MockupContainer title="AquaPay Payment Page">
    <div className="bg-gray-900 rounded-lg overflow-hidden max-w-sm mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-6 text-center">
        <div className="w-16 h-16 bg-white/20 rounded-full mx-auto mb-3 flex items-center justify-center">
          <span className="text-2xl">💰</span>
        </div>
        <h2 className="text-white font-bold text-xl">Pay CryptoFreelancer</h2>
        <p className="text-white/80 text-sm">Web3 Developer Services</p>
      </div>

      {/* Payment Amount */}
      <div className="p-4">
        <div className="bg-gray-800 rounded-lg p-4 mb-4">
          <label className="block text-gray-400 text-sm mb-2">Amount (USD)</label>
          <div className="flex items-center">
            <span className="text-gray-400 text-2xl mr-2">$</span>
            <input 
              type="number" 
              value="100" 
              className="bg-transparent text-white text-3xl font-bold w-full outline-none"
              readOnly
            />
          </div>
        </div>

        {/* Chain Selection */}
        <div className="mb-4">
          <label className="block text-gray-400 text-sm mb-2">Select Chain</label>
          <div className="grid grid-cols-4 gap-2">
            <button className="bg-purple-500/20 border-2 border-purple-500 rounded-lg p-2 text-center">
              <span className="block text-lg">◎</span>
              <span className="text-white text-xs">SOL</span>
            </button>
            <button className="bg-gray-800 border border-gray-700 rounded-lg p-2 text-center">
              <span className="block text-lg">Ξ</span>
              <span className="text-gray-400 text-xs">ETH</span>
            </button>
            <button className="bg-gray-800 border border-gray-700 rounded-lg p-2 text-center">
              <span className="block text-lg">🔵</span>
              <span className="text-gray-400 text-xs">Base</span>
            </button>
            <button className="bg-gray-800 border border-gray-700 rounded-lg p-2 text-center">
              <span className="block text-lg">🟡</span>
              <span className="text-gray-400 text-xs">BNB</span>
            </button>
          </div>
        </div>

        {/* Token Selection */}
        <div className="bg-gray-800 rounded-lg p-3 mb-4">
          <div className="flex justify-between items-center">
            <span className="text-gray-400 text-sm">Pay with</span>
            <div className="flex gap-2">
              <button className="bg-purple-500 text-white px-3 py-1 rounded text-sm">SOL</button>
              <button className="bg-gray-700 text-gray-300 px-3 py-1 rounded text-sm">USDC</button>
            </div>
          </div>
          <div className="text-right mt-2">
            <span className="text-white font-bold">≈ 0.67 SOL</span>
          </div>
        </div>

        {/* Connect Wallet Button */}
        <button className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-4 rounded-lg font-bold text-lg">
          Connect Wallet to Pay
        </button>

        <p className="text-gray-500 text-xs text-center mt-3">
          Powered by AquaPay • Secure crypto payments
        </p>
      </div>
    </div>
  </MockupContainer>
);

// AquaFi Mockup
export const AquaFiMockup = () => (
  <MockupContainer title="AquaFi Savings Pools">
    <div className="bg-gray-900 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-cyan-600 to-blue-600 px-4 py-4">
        <h2 className="text-white font-bold text-xl">💰 AquaFi Savings</h2>
        <p className="text-cyan-100 text-sm">Earn passive income on your crypto</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 p-4 border-b border-gray-800">
        <div className="text-center">
          <div className="text-cyan-400 text-2xl font-bold">$1.2M</div>
          <div className="text-gray-400 text-xs">Total TVL</div>
        </div>
        <div className="text-center">
          <div className="text-green-400 text-2xl font-bold">4-8%</div>
          <div className="text-gray-400 text-xs">APY Range</div>
        </div>
        <div className="text-center">
          <div className="text-purple-400 text-2xl font-bold">6</div>
          <div className="text-gray-400 text-xs">Active Pools</div>
        </div>
      </div>

      {/* Pools */}
      <div className="p-4 space-y-3">
        {/* Pool Card */}
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center font-bold">$</div>
              <div>
                <div className="text-white font-medium">USDC Pool</div>
                <div className="text-gray-400 text-xs">Stablecoin savings</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-green-400 font-bold">4.5% APY</div>
              <div className="text-gray-400 text-xs">$500K TVL</div>
            </div>
          </div>
          <button className="w-full bg-cyan-500 hover:bg-cyan-600 text-white py-2 rounded-lg text-sm font-medium">
            Deposit USDC
          </button>
        </div>

        {/* Pool Card 2 */}
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center font-bold">◎</div>
              <div>
                <div className="text-white font-medium">SOL Pool</div>
                <div className="text-gray-400 text-xs">Solana staking</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-green-400 font-bold">6.2% APY</div>
              <div className="text-gray-400 text-xs">$350K TVL</div>
            </div>
          </div>
          <button className="w-full bg-cyan-500 hover:bg-cyan-600 text-white py-2 rounded-lg text-sm font-medium">
            Deposit SOL
          </button>
        </div>
      </div>
    </div>
  </MockupContainer>
);

// GameHub Mockup
export const GameHubMockup = () => (
  <MockupContainer title="GameHub">
    <div className="bg-gray-900 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gray-800 px-4 py-3 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎮</span>
            <span className="text-white font-bold">GameHub</span>
          </div>
          <button className="bg-purple-500 text-white px-3 py-1 rounded text-sm">+ List Game</button>
        </div>
      </div>

      {/* Filters */}
      <div className="px-4 py-3 border-b border-gray-800 flex gap-2 overflow-x-auto">
        <button className="bg-purple-500/20 text-purple-400 px-3 py-1 rounded-full text-xs whitespace-nowrap">All Games</button>
        <button className="text-gray-400 px-3 py-1 rounded-full text-xs whitespace-nowrap">Action</button>
        <button className="text-gray-400 px-3 py-1 rounded-full text-xs whitespace-nowrap">RPG</button>
        <button className="text-gray-400 px-3 py-1 rounded-full text-xs whitespace-nowrap">Strategy</button>
        <button className="text-gray-400 px-3 py-1 rounded-full text-xs whitespace-nowrap">Card</button>
      </div>

      {/* Search */}
      <div className="px-4 py-3">
        <input 
          type="text" 
          placeholder="Search games..." 
          className="w-full bg-gray-800 text-gray-300 px-4 py-2 rounded-lg border border-gray-700 text-sm"
          readOnly
        />
      </div>

      {/* Game Cards */}
      <div className="p-4 grid grid-cols-2 gap-4">
        {/* Game 1 */}
        <div className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700">
          <div className="h-24 bg-gradient-to-br from-purple-500 to-pink-500 relative">
            <span className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-0.5 rounded">Live</span>
          </div>
          <div className="p-3">
            <h3 className="text-white font-medium text-sm mb-1">Space Warriors</h3>
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-xs">🎯 Action</span>
              <span className="text-green-400 text-xs">+245 votes</span>
            </div>
            <div className="text-purple-400 text-xs mt-1">◎ Solana</div>
          </div>
        </div>

        {/* Game 2 */}
        <div className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700">
          <div className="h-24 bg-gradient-to-br from-blue-500 to-cyan-500 relative">
            <span className="absolute top-2 right-2 bg-yellow-500 text-black text-xs px-2 py-0.5 rounded">Beta</span>
          </div>
          <div className="p-3">
            <h3 className="text-white font-medium text-sm mb-1">Crypto Kingdoms</h3>
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-xs">🏰 Strategy</span>
              <span className="text-green-400 text-xs">+180 votes</span>
            </div>
            <div className="text-blue-400 text-xs mt-1">Ξ Ethereum</div>
          </div>
        </div>
      </div>
    </div>
  </MockupContainer>
);

// HyperSpace Mockup
export const HyperSpaceMockup = () => (
  <MockupContainer title="HyperSpace - Twitter Space Boosting">
    <div className="bg-gradient-to-b from-gray-900 to-indigo-900/50 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="text-center py-6 px-4">
        <h2 className="text-white font-bold text-2xl mb-2">🚀 HyperSpace</h2>
        <p className="text-gray-400">Boost your Twitter Space with real listeners</p>
      </div>

      {/* Package Selection */}
      <div className="px-4 pb-4">
        <label className="block text-gray-400 text-sm mb-2">Select Duration</label>
        <div className="grid grid-cols-3 gap-2 mb-4">
          <button className="bg-gray-800 border border-gray-700 rounded-lg p-3 text-center">
            <span className="block text-cyan-400 text-lg">⚡</span>
            <span className="text-white text-sm font-medium">30 Min</span>
          </button>
          <button className="bg-orange-500/20 border-2 border-orange-500 rounded-lg p-3 text-center relative">
            <span className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full">Popular</span>
            <span className="block text-orange-400 text-lg">🔥</span>
            <span className="text-white text-sm font-medium">1 Hour</span>
          </button>
          <button className="bg-gray-800 border border-gray-700 rounded-lg p-3 text-center">
            <span className="block text-purple-400 text-lg">💎</span>
            <span className="text-white text-sm font-medium">2 Hours</span>
          </button>
        </div>

        <label className="block text-gray-400 text-sm mb-2">Select Listeners</label>
        <div className="grid grid-cols-3 gap-2 mb-4">
          <button className="bg-gray-800 border border-gray-700 rounded-lg p-2 text-center">
            <span className="text-white text-sm">100</span>
          </button>
          <button className="bg-gray-800 border border-gray-700 rounded-lg p-2 text-center">
            <span className="text-white text-sm">500</span>
          </button>
          <button className="bg-cyan-500/20 border-2 border-cyan-500 rounded-lg p-2 text-center">
            <span className="text-white text-sm font-medium">1000</span>
          </button>
        </div>

        {/* Space URL */}
        <div className="mb-4">
          <label className="block text-gray-400 text-sm mb-2">Twitter Space URL</label>
          <input 
            type="text" 
            placeholder="https://twitter.com/i/spaces/..." 
            className="w-full bg-gray-800 text-white px-3 py-2 rounded-lg border border-gray-700 text-sm"
            readOnly
          />
        </div>

        {/* Price */}
        <div className="bg-gray-800 rounded-lg p-4 mb-4">
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Total Price</span>
            <div className="text-right">
              <div className="text-white font-bold text-xl">$149</div>
              <div className="text-green-400 text-xs">1 Hour • 1000 Listeners</div>
            </div>
          </div>
        </div>

        <button className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-lg font-bold">
          Book HyperSpace 🚀
        </button>
      </div>
    </div>
  </MockupContainer>
);

// Affiliate Program Mockup
export const AffiliateMockup = () => (
  <MockupContainer title="Affiliate Dashboard">
    <div className="bg-gray-900 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-4 py-4">
        <h2 className="text-white font-bold text-xl">🤝 Affiliate Program</h2>
        <p className="text-green-100 text-sm">Earn rewards by referring users</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 p-4">
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-gray-400 text-sm">Total Referrals</div>
          <div className="text-2xl font-bold text-white">47</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-gray-400 text-sm">Points Earned</div>
          <div className="text-2xl font-bold text-green-400">2,350</div>
        </div>
      </div>

      {/* Referral Code */}
      <div className="px-4 pb-4">
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <label className="block text-gray-400 text-sm mb-2">Your Referral Code</label>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-gray-900 text-cyan-400 px-3 py-2 rounded font-mono text-lg">
              CRYPTO123
            </code>
            <button className="bg-cyan-500 text-white px-4 py-2 rounded font-medium">
              Copy
            </button>
          </div>
        </div>
      </div>

      {/* Referral Link */}
      <div className="px-4 pb-4">
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <label className="block text-gray-400 text-sm mb-2">Your Referral Link</label>
          <div className="flex items-center gap-2">
            <input 
              type="text" 
              value="https://aquads.xyz?ref=CRYPTO123" 
              className="flex-1 bg-gray-900 text-gray-300 px-3 py-2 rounded text-sm"
              readOnly
            />
            <button className="bg-cyan-500 text-white px-4 py-2 rounded font-medium">
              Copy
            </button>
          </div>
        </div>
      </div>

      {/* QR Code Section */}
      <div className="px-4 pb-4">
        <button className="w-full bg-gray-800 border border-gray-700 text-white py-3 rounded-lg flex items-center justify-center gap-2">
          <span>📱</span> Generate QR Code
        </button>
      </div>

      {/* Rewards Info */}
      <div className="px-4 pb-4">
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
          <h3 className="text-green-400 font-medium mb-2">Referral Rewards</h3>
          <ul className="text-gray-300 text-sm space-y-1">
            <li>• 10 points per new signup</li>
            <li>• Bonus for verified referrals</li>
            <li>• Earn when referrals are active</li>
          </ul>
        </div>
      </div>
    </div>
  </MockupContainer>
);

// Token Listing Modal Mockup
export const TokenListingMockup = () => (
  <MockupContainer title="List Your Token">
    <div className="bg-gray-900 rounded-lg overflow-hidden max-w-lg mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-cyan-600 to-blue-600 px-4 py-4">
        <h2 className="text-white font-bold text-xl">➕ List Your Project</h2>
        <p className="text-cyan-100 text-sm">Get visible on the bubble map</p>
      </div>

      {/* Form */}
      <div className="p-4 space-y-4">
        {/* Project Name */}
        <div>
          <label className="block text-gray-400 text-sm mb-1">Project/Token Name *</label>
          <input 
            type="text" 
            placeholder="e.g., AquaToken" 
            className="w-full bg-gray-800 text-white px-3 py-2 rounded-lg border border-gray-700 text-sm"
            value="My Token"
            readOnly
          />
        </div>

        {/* Pair Address */}
        <div>
          <label className="block text-gray-400 text-sm mb-1">Pair Address *</label>
          <input 
            type="text" 
            placeholder="0x..." 
            className="w-full bg-gray-800 text-white px-3 py-2 rounded-lg border border-gray-700 text-sm font-mono"
            value="0x1234...abcd"
            readOnly
          />
        </div>

        {/* Blockchain */}
        <div>
          <label className="block text-gray-400 text-sm mb-1">Blockchain *</label>
          <select className="w-full bg-gray-800 text-white px-3 py-2 rounded-lg border border-gray-700 text-sm">
            <option>Ethereum</option>
            <option>Base</option>
            <option>Solana</option>
            <option>BSC</option>
          </select>
        </div>

        {/* URLs */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-gray-400 text-sm mb-1">Logo URL *</label>
            <input 
              type="text" 
              placeholder="https://..." 
              className="w-full bg-gray-800 text-white px-3 py-2 rounded-lg border border-gray-700 text-sm"
              readOnly
            />
          </div>
          <div>
            <label className="block text-gray-400 text-sm mb-1">Website *</label>
            <input 
              type="text" 
              placeholder="https://..." 
              className="w-full bg-gray-800 text-white px-3 py-2 rounded-lg border border-gray-700 text-sm"
              readOnly
            />
          </div>
        </div>

        {/* Social Links */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-gray-400 text-sm mb-1">Twitter/X</label>
            <input 
              type="text" 
              placeholder="@handle" 
              className="w-full bg-gray-800 text-white px-3 py-2 rounded-lg border border-gray-700 text-sm"
              readOnly
            />
          </div>
          <div>
            <label className="block text-gray-400 text-sm mb-1">Telegram</label>
            <input 
              type="text" 
              placeholder="t.me/..." 
              className="w-full bg-gray-800 text-white px-3 py-2 rounded-lg border border-gray-700 text-sm"
              readOnly
            />
          </div>
        </div>

        {/* Add-ons */}
        <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
          <h4 className="text-white text-sm font-medium mb-2">📦 Add-on Packages</h4>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="rounded bg-gray-700 border-gray-600" />
              <span className="text-gray-300">Larger Bubble (+$49)</span>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="rounded bg-gray-700 border-gray-600" checked readOnly />
              <span className="text-cyan-400">Featured Spot (+$99)</span>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="rounded bg-gray-700 border-gray-600" />
              <span className="text-gray-300">Social Boost (+$29)</span>
            </label>
          </div>
        </div>

        {/* Total */}
        <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-3 flex justify-between items-center">
          <span className="text-cyan-400 font-medium">Total Cost</span>
          <span className="text-white font-bold text-xl">FREE</span>
        </div>

        <button className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white py-3 rounded-lg font-bold hover:opacity-90 transition-opacity">
          List My Token 🚀
        </button>
      </div>
    </div>
  </MockupContainer>
);

// Telegram Bot Mockup
export const TelegramBotMockup = () => (
  <MockupContainer title="Aquads Telegram Bot">
    <div className="bg-gray-900 rounded-lg overflow-hidden max-w-md mx-auto">
      {/* Telegram-style header */}
      <div className="bg-gradient-to-r from-blue-500 to-cyan-500 px-4 py-3 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-bold">
          🤖
        </div>
        <div>
          <h3 className="text-white font-bold">Aquads Bot</h3>
          <p className="text-blue-100 text-xs">online</p>
        </div>
      </div>

      {/* Chat area */}
      <div className="p-4 space-y-3 bg-[#0e1621] min-h-[300px]">
        {/* Bot message */}
        <div className="flex gap-2">
          <div className="w-8 h-8 rounded-full bg-cyan-500 flex items-center justify-center text-white text-sm">🤖</div>
          <div className="bg-gray-800 rounded-lg rounded-tl-none px-3 py-2 max-w-xs">
            <p className="text-white text-sm">Welcome to Aquads! 🌊</p>
            <p className="text-gray-400 text-xs mt-1">Here's what I can do:</p>
          </div>
        </div>

        {/* Command buttons */}
        <div className="ml-10 flex flex-wrap gap-2">
          <button className="bg-cyan-500/20 text-cyan-400 px-3 py-1.5 rounded-lg text-sm border border-cyan-500/30">
            /price
          </button>
          <button className="bg-cyan-500/20 text-cyan-400 px-3 py-1.5 rounded-lg text-sm border border-cyan-500/30">
            /trending
          </button>
          <button className="bg-cyan-500/20 text-cyan-400 px-3 py-1.5 rounded-lg text-sm border border-cyan-500/30">
            /alerts
          </button>
        </div>

        {/* User message */}
        <div className="flex justify-end">
          <div className="bg-cyan-600 rounded-lg rounded-tr-none px-3 py-2 max-w-xs">
            <p className="text-white text-sm">/price SOL</p>
          </div>
        </div>

        {/* Bot response */}
        <div className="flex gap-2">
          <div className="w-8 h-8 rounded-full bg-cyan-500 flex items-center justify-center text-white text-sm">🤖</div>
          <div className="bg-gray-800 rounded-lg rounded-tl-none px-3 py-2 max-w-xs">
            <p className="text-white text-sm font-medium">📊 SOL/USDT</p>
            <p className="text-green-400 text-lg font-bold">$142.50 <span className="text-xs">+5.2%</span></p>
            <div className="text-gray-400 text-xs mt-1 space-y-0.5">
              <p>24h Vol: $2.4B</p>
              <p>MCap: $61.2B</p>
            </div>
          </div>
        </div>

        {/* Alert setup */}
        <div className="flex gap-2">
          <div className="w-8 h-8 rounded-full bg-cyan-500 flex items-center justify-center text-white text-sm">🤖</div>
          <div className="bg-gray-800 rounded-lg rounded-tl-none px-3 py-2 max-w-xs">
            <p className="text-white text-sm">Set up price alerts:</p>
            <code className="text-cyan-400 text-xs block mt-1">/alert SOL 150</code>
          </div>
        </div>
      </div>

      {/* Input area */}
      <div className="bg-gray-800 px-4 py-3 flex items-center gap-2 border-t border-gray-700">
        <input 
          type="text" 
          placeholder="Type a command..." 
          className="flex-1 bg-gray-700 text-white px-3 py-2 rounded-lg text-sm"
          readOnly
        />
        <button className="bg-cyan-500 text-white p-2 rounded-lg">
          ➤
        </button>
      </div>
    </div>
  </MockupContainer>
);

// Bubble Ads Mockup
export const BubbleAdsMockup = () => (
  <MockupContainer title="Bubble Ads System">
    <div className="bg-gray-900 rounded-lg p-4">
      {/* Visual representation of bubbles */}
      <div className="relative h-48 mb-4">
        {/* Large featured bubble */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 w-20 h-20 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 border-4 border-yellow-400 shadow-lg shadow-cyan-500/30 flex items-center justify-center">
          <span className="text-white font-bold text-xs">Featured</span>
        </div>
        {/* Medium bubbles */}
        <div className="absolute top-12 left-4 w-14 h-14 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 shadow-lg flex items-center justify-center">
          <span className="text-white text-xs">🚀</span>
        </div>
        <div className="absolute top-8 right-8 w-16 h-16 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 shadow-lg flex items-center justify-center">
          <span className="text-white text-xs">💎</span>
        </div>
        {/* Small bubbles */}
        <div className="absolute bottom-4 left-12 w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-red-500 shadow-lg"></div>
        <div className="absolute bottom-8 right-4 w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 shadow-lg"></div>
        <div className="absolute bottom-2 left-1/3 w-8 h-8 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 shadow-lg"></div>
      </div>

      {/* Size comparison */}
      <div className="bg-gray-800 rounded-lg p-4 mb-4">
        <h4 className="text-white text-sm font-medium mb-3">Bubble Size Tiers</h4>
        <div className="flex items-end gap-4 justify-center">
          <div className="text-center">
            <div className="w-8 h-8 rounded-full bg-gray-600 mx-auto mb-1"></div>
            <span className="text-gray-400 text-xs">Basic</span>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-cyan-500 mx-auto mb-1"></div>
            <span className="text-cyan-400 text-xs">Medium</span>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-purple-500 mx-auto mb-1"></div>
            <span className="text-purple-400 text-xs">Large</span>
          </div>
          <div className="text-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 mx-auto mb-1 border-2 border-yellow-300"></div>
            <span className="text-yellow-400 text-xs">Featured</span>
          </div>
        </div>
      </div>

      {/* Bump info */}
      <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-cyan-400 font-medium text-sm">⚡ Bump Your Token</h4>
            <p className="text-gray-400 text-xs">Increase visibility & bubble size</p>
          </div>
          <button className="bg-cyan-500 text-white px-3 py-1.5 rounded text-sm font-medium">
            Bump Now
          </button>
        </div>
      </div>
    </div>
  </MockupContainer>
);

// Export all mockups
export default {
  CreateAccountMockup,
  LoginMockup,
  NavigationMockup,
  DashboardMockup,
  BubbleMapMockup,
  ProfileSettingsMockup,
  TokenVotingMockup,
  UserDropdownMockup,
  MarketplaceMockup,
  CreateServiceMockup,
  AquaSwapMockup,
  RaidsMockup,
  AquaPayMockup,
  AquaFiMockup,
  GameHubMockup,
  HyperSpaceMockup,
  AffiliateMockup,
  TokenListingMockup,
  TelegramBotMockup,
  BubbleAdsMockup
};

