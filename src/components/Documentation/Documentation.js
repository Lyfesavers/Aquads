import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FaSearch, FaChevronRight, FaChevronDown, FaChevronLeft, 
  FaHome, FaBook, FaRocket, FaCoins, FaBriefcase, FaExchangeAlt,
  FaCreditCard, FaBullhorn, FaGamepad, FaHandshake, FaTelegram,
  FaCog, FaLightbulb, FaExclamationTriangle, FaInfoCircle, FaCheckCircle,
  FaBars, FaTimes, FaMoon, FaSun, FaExternalLinkAlt, FaCopy
} from 'react-icons/fa';
import './Documentation.css';

// Import UI Mockups
import {
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
} from './DocMockups';

// Documentation content structure with all Aquads features
const documentationStructure = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: FaRocket,
    children: [
      { id: 'what-is-aquads', title: 'What is Aquads?', content: 'whatIsAquads' },
      { id: 'create-account', title: 'Creating Your Account', content: 'createAccount' },
      { id: 'platform-overview', title: 'Platform Overview', content: 'platformOverview' },
      { id: 'dashboard', title: 'Using the Dashboard', content: 'dashboard' },
      { id: 'profile-setup', title: 'Profile Setup', content: 'profileSetup' },
    ]
  },
  {
    id: 'token-features',
    title: 'Token Features',
    icon: FaCoins,
    children: [
      { id: 'listing-token', title: 'Listing Your Token', content: 'listingToken' },
      { id: 'bubble-ads', title: 'Bubble Ads System', content: 'bubbleAds' },
      { id: 'token-voting', title: 'Token Voting & Rankings', content: 'tokenVoting' },
      { id: 'token-sentiment', title: 'Sentiment & Reviews', content: 'tokenSentiment' },
      { id: 'bumping-tokens', title: 'Bumping Your Token', content: 'bumpingTokens' },
      { id: 'banner-advertising', title: 'Banner Advertising', content: 'bannerAdvertising' },
    ]
  },
  {
    id: 'freelancer-hub',
    title: 'Freelancer Hub',
    icon: FaBriefcase,
    children: [
      { id: 'freelancer-overview', title: 'Overview', content: 'freelancerOverview' },
      { id: 'creating-services', title: 'Creating Services', content: 'creatingServices' },
      { id: 'finding-jobs', title: 'Finding & Applying to Jobs', content: 'findingJobs' },
      { id: 'booking-system', title: 'Booking System', content: 'bookingSystem' },
      { id: 'cv-builder', title: 'CV Builder', content: 'cvBuilder' },
      { id: 'onchain-resume', title: 'On-Chain Resume', content: 'onchainResume' },
      { id: 'skill-tests', title: 'Skill Tests & Badges', content: 'skillTests' },
      { id: 'freelancer-workshop', title: 'Freelancer Workshop', content: 'freelancerWorkshop' },
    ]
  },
  {
    id: 'aquaswap-defi',
    title: 'AquaSwap & DeFi',
    icon: FaExchangeAlt,
    children: [
      { id: 'aquaswap', title: 'AquaSwap (Token Swapping)', content: 'aquaswap' },
      { id: 'aquafi', title: 'AquaFi (Savings Pools)', content: 'aquafi' },
      { id: 'wallet-analyzer', title: 'Wallet Analyzer', content: 'walletAnalyzer' },
      { id: 'portfolio-analytics', title: 'Portfolio Analytics', content: 'portfolioAnalytics' },
      { id: 'trading-signals', title: 'Trading Signals', content: 'tradingSignals' },
    ]
  },
  {
    id: 'aquapay',
    title: 'AquaPay',
    icon: FaCreditCard,
    children: [
      { id: 'aquapay-overview', title: 'Overview', content: 'aquapayOverview' },
      { id: 'payment-links', title: 'Creating Payment Links', content: 'paymentLinks' },
      { id: 'accepting-payments', title: 'Accepting Crypto Payments', content: 'acceptingPayments' },
      { id: 'qr-codes', title: 'QR Code Generation', content: 'qrCodes' },
    ]
  },
  {
    id: 'raids-marketing',
    title: 'Raids & Marketing',
    icon: FaBullhorn,
    children: [
      { id: 'raids-overview', title: 'Overview', content: 'raidsOverview' },
      { id: 'twitter-raids', title: 'Twitter/X Raids', content: 'twitterRaids' },
      { id: 'telegram-raids', title: 'Telegram Raids', content: 'telegramRaids' },
      { id: 'facebook-raids', title: 'Facebook Raids', content: 'facebookRaids' },
      { id: 'shill-templates', title: 'Shill Templates', content: 'shillTemplates' },
      { id: 'points-rewards', title: 'Points & Rewards', content: 'pointsRewards' },
      { id: 'hyperspace', title: 'HyperSpace', content: 'hyperspace' },
    ]
  },
  {
    id: 'gamehub',
    title: 'GameHub',
    icon: FaGamepad,
    children: [
      { id: 'gamehub-overview', title: 'Overview', content: 'gamehubOverview' },
      { id: 'available-games', title: 'Available Games', content: 'availableGames' },
      { id: 'listing-game', title: 'Listing Your Game', content: 'listingGame' },
    ]
  },
  {
    id: 'partners-affiliate',
    title: 'Partners & Affiliate',
    icon: FaHandshake,
    children: [
      { id: 'affiliate-program', title: 'Affiliate Program', content: 'affiliateProgram' },
      { id: 'partner-rewards', title: 'Partner Rewards Marketplace', content: 'partnerRewards' },
    ]
  },
  {
    id: 'telegram-bot',
    title: 'Telegram Bot',
    icon: FaTelegram,
    children: [
      { id: 'bot-setup', title: 'Bot Setup', content: 'botSetup' },
      { id: 'bot-commands', title: 'Bot Commands', content: 'botCommands' },
      { id: 'bot-features', title: 'Bot Features', content: 'botFeatures' },
    ]
  },
  {
    id: 'advanced',
    title: 'Advanced Features',
    icon: FaCog,
    children: [
      { id: 'browser-extension', title: 'Browser Extension', content: 'browserExtension' },
      { id: 'embed-widgets', title: 'Embed Widgets', content: 'embedWidgets' },
      { id: 'api-integration', title: 'API Integration', content: 'apiIntegration' },
      { id: 'premium-features', title: 'Premium Features', content: 'premiumFeatures' },
    ]
  },
];

// Content for each documentation page
const documentationContent = {
  // Getting Started
  whatIsAquads: {
    title: 'What is Aquads?',
    description: 'Learn about Aquads - the all-in-one Web3 platform for crypto projects and freelancers.',
    mockup: <BubbleMapMockup />,
    content: `
## Welcome to Aquads

Aquads is a comprehensive Web3 ecosystem designed to connect crypto projects, freelancers, and the broader blockchain community. Our platform offers a unique combination of features that make it easy to promote your project, find work, trade tokens, and engage with the crypto community.

### The Interactive Bubble Map

The heart of Aquads is our **interactive bubble map** - a dynamic visualization where crypto projects appear as colorful bubbles. Each bubble represents a listed token, with:

- **Size** determined by community engagement and bumps
- **Color** indicating the blockchain network (Ethereum = Blue, Solana = Purple, BSC = Yellow, etc.)
- **Position** optimized for visibility based on activity

Click any bubble to view project details, vote, and interact with the community.

### Core Platform Features

| Feature | Description |
|---------|-------------|
| **Token Listing** | List your crypto project as an interactive bubble |
| **Freelancer Hub** | Web3 marketplace for services and jobs |
| **AquaSwap** | DEX aggregator for cross-chain token swaps |
| **AquaFi** | Savings pools with competitive APY |
| **AquaPay** | Crypto payment links and QR codes |
| **Raids** | Social media marketing campaigns |
| **GameHub** | Blockchain games platform |
| **HyperSpace** | Featured advertising space |

### Supported Blockchains

Aquads supports 20+ blockchain networks including:

- Ethereum, Base, Arbitrum, Optimism
- Solana, Sui, Aptos
- BSC, Polygon, Avalanche
- Fantom, Cronos, Harmony
- And many more...

### Why Choose Aquads?

- **All-in-One Platform**: Everything you need in one place
- **Community-Driven**: Features designed by and for the crypto community
- **Multi-Chain Support**: Works with 20+ blockchain networks
- **Transparent Pricing**: No hidden fees on any services
- **Active Development**: New features added regularly
- **Earn While You Engage**: Points system rewards participation
    `,
    nextPage: { id: 'create-account', title: 'Creating Your Account' },
  },
  
  createAccount: {
    title: 'Creating Your Account',
    description: 'Step-by-step guide to creating your Aquads account.',
    mockup: <CreateAccountMockup />,
    content: `
## Creating Your Aquads Account

Getting started with Aquads is quick and easy. Follow these steps to create your account and unlock all platform features.

### Step 1: Choose Your Account Type

When creating an account, you'll first select your account type:

| Type | Best For |
|------|----------|
| **Freelancer** | Offering services to the crypto community |
| **Project** | Hiring freelancers for your project |

> 💡 **Tip**: You can use the platform for both purposes regardless of which type you select.

### Step 2: Fill in Your Details

**Required Information:**
- **Username** (3-20 characters, letters, numbers, underscores, hyphens only)
- **Full Name** (your real name as it appears to clients)
- **Email** (required for verification)
- **Password** (must meet security requirements)

**Optional Information:**
- Country
- Profile Image URL
- Referral Code (if you have one)

### Password Requirements

Your password must contain:
- ✓ At least 8 characters
- ✓ At least one uppercase letter (A-Z)
- ✓ At least one lowercase letter (a-z)
- ✓ At least one number (0-9)
- ✓ At least one special character (@, $, !, %, *, ?, &)

### Step 3: Add a Profile Picture (Optional)

You can add a profile picture by:
1. Click "Upload Image" to open Postimages.org
2. Upload your image on Postimages
3. Copy the "Direct Link" URL
4. Paste it in the Profile Image URL field

Supported formats: JPEG, PNG, GIF

### Step 4: Submit & Verify

After submitting:
1. Check your email for verification link
2. Click the link to verify your account
3. You're ready to use Aquads!

> 💡 **Tip**: Check your spam folder if you don't see the verification email within a few minutes.

### Using a Referral Code

If someone referred you to Aquads:
1. Enter their referral code during signup
2. Both you and the referrer earn rewards
3. The code may be auto-filled from the URL you used

### Terms & Conditions

By creating an account, you agree to:
- Aquads Terms & Conditions
- Platform rules and guidelines
- Not take leads or bookings outside of Aquads (this results in account suspension)
    `,
    prevPage: { id: 'what-is-aquads', title: 'What is Aquads?' },
    nextPage: { id: 'platform-overview', title: 'Platform Overview' },
  },
  
  platformOverview: {
    title: 'Platform Overview',
    description: 'A comprehensive overview of all Aquads platform features and navigation.',
    mockup: <NavigationMockup />,
    content: `
## Platform Overview

This guide will help you navigate the Aquads platform and understand all available features.

### Main Navigation Bar

The navigation bar provides quick access to all major sections:

| Button | Destination |
|--------|-------------|
| **Freelancer** | Freelancer Hub marketplace |
| **Games** | GameHub with blockchain games |
| **Paid Ads** | Create banner advertisements |
| **Learn** | Tutorials, blogs, skill tests |
| **Why List?** | Benefits of listing your project |
| **Login/Create Account** | User authentication |

After logging in, you'll see:
- **Notification Bell** for alerts
- **User Dropdown** for account options

### Landing Page vs Home Page

**Landing Page (aquads.xyz/)**
- Beautiful animated introduction
- Feature carousel showcasing platform capabilities
- Call-to-action buttons

**Home Page (aquads.xyz/home)**
- Interactive bubble map with listed tokens
- Real-time token updates
- Filtering and sorting options
- Quick access to all features

### Key Platform Sections

| Section | Access | Description |
|---------|--------|-------------|
| **Bubble Map** | /home | Interactive token visualization |
| **Freelancer Hub** | /marketplace | Services and job marketplace |
| **GameHub** | /games | Play and list games |
| **AquaSwap** | /aquaswap | DEX aggregator for swaps |
| **AquaFi** | /aquafi | Savings pools |
| **AquaPay** | /aquapay | Payment link creation |
| **Learn** | /learn | Videos, blogs, skill tests |
| **Partner Rewards** | /partner-rewards | Exclusive partner deals |

### Mobile Experience

Aquads is fully responsive with:
- Hamburger menu for navigation
- Touch-optimized bubble interactions
- PWA support (install as app)
- Optimized mobile layouts

### Footer Quick Links

The footer provides organized access to:
- **Social**: Twitter, Telegram, Discord, Medium, Instagram, Facebook
- **Resources**: Documentation, Whitepaper, Learn, Affiliate, Verify User
- **Platform**: AquaFi, AquaSwap, Freelancer Hub, GameHub, Partner Rewards, Telegram Bot, AquaPay, HyperSpace
- **Legal**: Terms & Conditions, Privacy Policy
- **Mobile Apps**: PWA install, coming soon to app stores
    `,
    prevPage: { id: 'create-account', title: 'Creating Your Account' },
    nextPage: { id: 'dashboard', title: 'Using the Dashboard' },
  },
  
  dashboard: {
    title: 'Using the Dashboard',
    description: 'Learn how to navigate and use your Aquads dashboard effectively.',
    mockup: <DashboardMockup />,
    content: `
## Using the Dashboard

Your dashboard is the central hub for managing all your activities on Aquads.

### Accessing the Dashboard

1. Log in to your account
2. Click your username in the top navigation
3. Select **"📊 Dashboard"** from the dropdown menu

### Dashboard Tabs

**My Projects (Ads Tab)**
Manage your listed crypto projects:
- View all your token listings
- See vote counts and engagement stats
- Bump listings for more visibility
- Edit or delete projects
- Track click analytics

**Bookings Tab**
Handle all service bookings:
- Incoming requests (as freelancer)
- Outgoing bookings (as client)
- Conversation threads with clients
- Payment and delivery status
- Mark work as complete

**Affiliate Tab**
Track your referral program:
- Your unique referral code
- Generate custom QR codes
- View referral statistics
- Track earnings from referrals
- Monitor affiliate analytics

**AquaPay Tab**
Manage your payment links:
- View received payments
- Check transaction history
- Configure payment settings
- Create custom payment pages

### User Dropdown Menu Options

When clicking your username, you'll see:

| Option | Function |
|--------|----------|
| 📊 Dashboard | Open main dashboard |
| ➕ List Project | Create new token listing |
| 🎨 Create Banner Ad | Create banner advertisement |
| ⚙️ Edit Profile | Open profile settings |
| 🚪 Logout | Sign out of account |

### Dashboard Tips

> 💡 **Pro Tip**: Check your dashboard daily for new booking requests and raid opportunities to maximize your earnings.

- Respond to booking inquiries within 24 hours for better ratings
- Keep your services updated with competitive pricing
- Regularly bump your token listings for visibility
- Generate a referral QR code to share with your community
    `,
    prevPage: { id: 'platform-overview', title: 'Platform Overview' },
    nextPage: { id: 'profile-setup', title: 'Profile Setup' },
  },
  
  profileSetup: {
    title: 'Profile Setup',
    description: 'Complete guide to setting up and optimizing your Aquads profile.',
    mockup: <ProfileSettingsMockup />,
    content: `
## Profile Setup

A complete profile increases your credibility and helps you connect with others on the platform.

### Accessing Profile Settings

1. Click your username in the navigation
2. Select **"⚙️ Edit Profile"** from the dropdown

### Profile Settings Tabs

The profile modal has four main tabs:

**1. 👤 Profile Tab**
Basic information settings:
- Profile picture (via URL)
- Username
- Full Name
- Country selection

**2. 🔒 Security Tab**
Password management:
- Current password verification
- New password creation
- Password confirmation

**3. 📄 CV Builder Tab**
Create your professional resume:
- Personal information
- Work experience
- Skills and expertise
- Education history
- Portfolio links

**4. ⛓️ On-Chain Resume Tab**
Blockchain-verified credentials:
- Mint your resume on Base network
- EAS (Ethereum Attestation Service) integration
- Verifiable trust score
- Permanent reputation record

### Profile Picture Setup

To add or change your profile picture:

1. Open the Profile tab
2. Enter an image URL (or use Postimages.org to upload)
3. Supported formats: JPEG, PNG, GIF
4. Preview will appear automatically
5. Click "Save Changes"

### Updating Basic Information

| Field | Description |
|-------|-------------|
| **Username** | Your unique login identifier |
| **Full Name** | Display name for clients |
| **Country** | Select from dropdown list |

### Changing Your Password

1. Go to the Security tab
2. Enter your current password
3. Enter your new password
4. Confirm the new password
5. Click "Save Changes"

Password requirements:
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter  
- At least one number
- At least one special character

> ⚠️ **Important**: If you forget your password, use the "Forgot Password?" link on the login page.

### Profile Completion Tips

- Add a professional, clear profile picture
- Use your real name for client trust
- Complete your CV for freelancing
- Consider minting your On-Chain Resume for verified credibility
    `,
    prevPage: { id: 'dashboard', title: 'Using the Dashboard' },
    nextPage: { id: 'listing-token', title: 'Listing Your Token' },
  },
  
  // Token Features
  listingToken: {
    title: 'Listing Your Token',
    description: 'How to list your crypto project on Aquads bubble map.',
    mockup: <TokenListingMockup />,
    content: `
## Listing Your Token

Get your crypto project visible to thousands of users by listing it on the Aquads bubble map.

### Accessing the Listing Form

Click **"➕ List Project"** from:
- User dropdown menu in navigation
- Home page buttons
- Dashboard quick actions

### Step 1: Project Information

Fill in the required fields:

| Field | Description | Required |
|-------|-------------|----------|
| **Title** | Your project/token name | Yes |
| **Pair Address** | Trading pair contract address (0x...) | Yes |
| **Blockchain** | Select from 30+ chains | Yes |
| **Logo URL** | Direct link to GIF or PNG image | Yes |
| **Website URL** | Your project's official website | Yes |

### Supported Blockchains

30+ chains available including:
- Ethereum, Base, Arbitrum, Optimism
- Solana, Sui, Aptos, Near
- BSC, Polygon, Avalanche
- Fantom, Cronos, Harmony
- TON, Cardano, Tezos
- And many more...

### Step 2: Marketing Add-ons (Optional)

After entering project info, you can add premium marketing packages:

| Package | Price | Features |
|---------|-------|----------|
| **AquaSplash** | $99 | On-demand media, same day |
| **AquaRipple** | $284 | 4+ media pickups guaranteed |
| **AquaWave** | $1,329 | 9+ pickups, SEO optimization |
| **AquaFlow** | $2,754 | Major crypto news coverage |
| **AquaStorm** | $6,174 | 75+ pickups, 75M+ audience |
| **AquaTidal** | $12,349 | 125+ pickups, CoinTelegraph |
| **AquaLegend** | $20,899 | Epic package, guaranteed Forbes |

> 💡 **Special Offer**: All add-on packages include 5% discount!

### Payment Options

You can pay via:
- **AquaPay** (crypto) - Solana, Ethereum, Base, Sui
- **PayPal** (fiat)

### Listing Fee

Base listing fee: Check current pricing in the modal. Add-ons are optional.

### After Submission

1. Your listing is submitted for admin review
2. Complete payment in the opened window
3. Admin verifies and approves listing
4. Your bubble appears on the map!

### Add Packages to Existing Projects

Already have a listing? You can:
1. Click "List Project"
2. Choose "Get Add-on Packages" for your existing project
3. Select marketing packages
4. Complete payment

### Listing Tips

> 💡 **Pro Tip**: Projects with professional logos and complete info get 3x more engagement.

- Use a high-quality, transparent PNG or animated GIF logo
- Ensure your website is live and professional
- Have your pair address ready
- Engage with voters to grow your bubble
    `,
    prevPage: { id: 'profile-setup', title: 'Profile Setup' },
    nextPage: { id: 'bubble-ads', title: 'Bubble Ads System' },
  },
  
  bubbleAds: {
    title: 'Bubble Ads System',
    description: 'Understanding the Aquads bubble advertising system.',
    mockup: <BubbleAdsMockup />,
    content: `
## Bubble Ads System

The bubble map is Aquads' unique way of displaying crypto projects. Understanding how it works will help you maximize your visibility.

### How Bubbles Work

Each listed project appears as a bubble on the interactive map. Bubbles have several properties:

**Size**
- Determined by bumps and engagement
- Larger bubbles get more visibility
- Bubbles shrink over time without bumps

**Position**
- New bubbles appear in available space
- High-engagement bubbles move to prime positions
- Algorithm optimizes for visibility

**Color**
- Based on blockchain network
- Ethereum = Blue
- Solana = Purple
- BSC = Yellow
- And more...

### Interacting with Bubbles

**Clicking a Bubble**
Opens the project modal with:
- Full project details
- Voting options
- Social links
- Contract info
- Sentiment data

**Voting**
- Vote bullish or bearish on any project
- Votes affect bubble size
- Limited to one vote per project per day

### Bubble Growth Strategies

1. **Regular Bumps**: Keep your bubble large with consistent bumps
2. **Community Engagement**: Encourage your community to vote
3. **Quality Presentation**: Professional logos attract more clicks
4. **Social Proof**: Active social links increase trust

### Filtering Bubbles

Users can filter the bubble map by:
- Blockchain network
- Market cap range
- Sentiment (bullish/bearish)
- Trending projects
    `,
    prevPage: { id: 'listing-token', title: 'Listing Your Token' },
    nextPage: { id: 'token-voting', title: 'Token Voting & Rankings' },
  },
  
  tokenVoting: {
    title: 'Token Voting & Rankings',
    description: 'How the voting system works and how to climb the rankings.',
    mockup: <TokenVotingMockup />,
    content: `
## Token Voting & Rankings

The voting system allows the community to express sentiment on projects and influences rankings.

### Voting Mechanics

**Bullish Vote (🐂)**
- Indicates positive sentiment
- Increases project's bullish score
- Contributes to bubble growth

**Bearish Vote (🐻)**
- Indicates negative sentiment
- Increases project's bearish score
- Balances the sentiment ratio

### Voting Rules

- One vote per project per day
- Must be logged in to vote
- Votes are public on the project page
- Cannot vote on your own project

### Rankings System

Projects are ranked based on multiple factors:

| Factor | Weight | Description |
|--------|--------|-------------|
| Vote Ratio | 35% | Bullish vs bearish sentiment |
| Total Votes | 25% | Overall engagement |
| Bump Status | 20% | Recent bumping activity |
| Profile Completion | 10% | Quality of listing |
| Social Activity | 10% | Linked social engagement |

### Leaderboards

View top projects on the leaderboard:
- **Trending**: Fastest growing today
- **Top Voted**: Most bullish votes
- **Hot**: Recent high activity
- **New**: Latest listings

### Improving Your Ranking

1. Encourage your community to vote daily
2. Keep your bubble bumped
3. Maintain active social presence
4. Respond to community questions
5. Add all relevant project information

> 💡 **Tip**: Share your project's Aquads link on social media to drive more votes.
    `,
    prevPage: { id: 'bubble-ads', title: 'Bubble Ads System' },
    nextPage: { id: 'token-sentiment', title: 'Sentiment & Reviews' },
  },
  
  tokenSentiment: {
    title: 'Sentiment & Reviews',
    description: 'Understanding and leveraging project sentiment and reviews.',
    content: `
## Sentiment & Reviews

The sentiment system provides insights into community perception of projects.

### Sentiment Overview

Each project displays:
- **Bullish %**: Percentage of positive votes
- **Bearish %**: Percentage of negative votes
- **Total Votes**: Overall engagement
- **Trend**: Direction of sentiment change

### Sentiment Indicators

**🟢 Strong Bullish (80%+)**
Overwhelming positive sentiment

**🟡 Bullish (60-79%)**
Generally positive outlook

**⚪ Neutral (40-59%)**
Mixed community opinion

**🟠 Bearish (20-39%)**
Generally negative outlook

**🔴 Strong Bearish (<20%)**
Overwhelming negative sentiment

### Reviews System

Users can leave detailed reviews:

**Writing a Review**
1. Click on a project bubble
2. Navigate to "Reviews" tab
3. Write your review
4. Rate 1-5 stars
5. Submit

**Review Guidelines**
- Be honest and constructive
- Base reviews on actual experience
- No spam or promotional content
- Respect other community members

### Using Sentiment Data

**For Investors**
- Gauge community confidence
- Identify trending projects
- Make informed decisions

**For Project Owners**
- Understand community perception
- Identify areas for improvement
- Track sentiment over time

> ⚠️ **Disclaimer**: Sentiment data is community-generated and should not be the sole basis for investment decisions.
    `,
    prevPage: { id: 'token-voting', title: 'Token Voting & Rankings' },
    nextPage: { id: 'bumping-tokens', title: 'Bumping Your Token' },
  },
  
  bumpingTokens: {
    title: 'Bumping Your Token',
    description: 'How to bump your token listing for increased visibility.',
    content: `
## Bumping Your Token

Bumping increases your bubble size and visibility on the map.

### What is Bumping?

Bumping is a paid feature that:
- Instantly increases bubble size
- Boosts visibility on the map
- Moves your bubble to prime positions
- Shows a "Just Bumped" indicator

### How to Bump

**Step 1: Access Your Project**
- Go to Dashboard > My Projects
- Or click your bubble on the map

**Step 2: Click "Bump"**
Select the Bump option from the project menu.

**Step 3: Choose Bump Package**

| Package | Size Increase | Duration | Price |
|---------|--------------|----------|-------|
| Basic | +20% | 24 hours | 0.01 SOL |
| Standard | +40% | 48 hours | 0.02 SOL |
| Premium | +60% | 72 hours | 0.035 SOL |
| Ultra | +100% | 1 week | 0.05 SOL |

**Step 4: Complete Payment**
- Connect your wallet
- Confirm the transaction
- Bump is applied instantly

### Bump Strategies

**Timing**
- Bump during high-traffic hours
- Coordinate with announcements
- Bump before major events

**Consistency**
- Regular bumps maintain visibility
- Set reminders for rebumping
- Consider weekly bump schedule

### Bump Store

Visit the Bump Store for:
- Discounted bump packages
- Bundle deals
- Special promotions

> 💡 **Pro Tip**: Time your bumps with major announcements for maximum impact.
    `,
    prevPage: { id: 'token-sentiment', title: 'Sentiment & Reviews' },
    nextPage: { id: 'banner-advertising', title: 'Banner Advertising' },
  },
  
  bannerAdvertising: {
    title: 'Banner Advertising',
    description: 'Create and manage banner ads on Aquads.',
    content: `
## Banner Advertising

Banner ads provide premium visibility across the Aquads platform.

### Banner Types

**Top Banner**
- Displayed at the top of the page
- Maximum visibility
- Rotating with other top banners

**Sidebar Banner**
- Shown on marketplace pages
- Persistent visibility
- Good for service promotion

**In-Feed Banner**
- Appears within content feeds
- Native-feeling placement
- High engagement rates

### Creating a Banner

**Step 1: Access Banner Creation**
- Dashboard > Create Banner Ad
- Or Navigation > Paid Ads

**Step 2: Design Your Banner**

Upload your banner image:
- Recommended: 728x90 (leaderboard)
- Or: 300x250 (medium rectangle)
- Max file size: 2MB
- Formats: PNG, JPG, GIF

**Step 3: Set Target URL**
Enter the URL where clicks should direct.

**Step 4: Choose Duration**

| Duration | Price |
|----------|-------|
| 1 Day | 0.05 SOL |
| 1 Week | 0.25 SOL |
| 1 Month | 0.8 SOL |

**Step 5: Submit & Pay**
Review your banner and complete payment.

### Banner Best Practices

**Design Tips**
- Clear, readable text
- High-contrast colors
- Strong call-to-action
- Professional imagery

**Content Guidelines**
- No misleading claims
- No prohibited content
- Must link to legitimate sites
- Follow advertising standards

### Banner Analytics

Track your banner performance:
- Impressions
- Clicks
- Click-through rate (CTR)
- Conversion tracking (if set up)
    `,
    prevPage: { id: 'bumping-tokens', title: 'Bumping Your Token' },
    nextPage: { id: 'freelancer-overview', title: 'Freelancer Hub Overview' },
  },
  
  // Freelancer Hub
  freelancerOverview: {
    title: 'Freelancer Hub Overview',
    description: 'Introduction to the Aquads Freelancer Marketplace.',
    mockup: <MarketplaceMockup />,
    content: `
## Freelancer Hub Overview

The Freelancer Hub (/marketplace) is Aquads' dedicated marketplace connecting Web3 talent with projects seeking services.

### Accessing the Marketplace

Navigate to the Freelancer Hub by:
- Clicking **"Freelancer"** in the main navigation
- Going directly to aquads.xyz/marketplace

### For Freelancers

**Offer Your Services**
- Create detailed service listings
- Set your own prices in USDC, SOL, or ETH
- Choose from multiple categories
- Showcase your portfolio with images and videos
- Earn skill badges through tests

**Find Jobs**
- Browse active job postings
- Apply to relevant opportunities
- Get matched jobs based on your skills
- Build your reputation through reviews
- Earn in cryptocurrency

**Build Your Profile**
- Create your CV with the built-in CV Builder
- Mint an On-Chain Resume for verification
- Display skill badges earned through tests
- Collect client reviews
- Showcase your best work

### For Clients (Projects)

**Find Talent**
- Browse services by category
- Filter by skills, ratings, and price
- View freelancer portfolios
- Read verified client reviews
- Check skill test badges

**Post Jobs**
- Create detailed job listings
- Set budget and requirements
- Receive applications from freelancers
- Manage the hiring process
- Pay securely through the platform

### Service Categories

| Category | Examples |
|----------|----------|
| Development | Smart contracts, DApps, websites, bots |
| Design | UI/UX, logos, NFT art, graphics |
| Marketing | Social media, content, PR, community |
| Writing | Whitepapers, documentation, blogs |
| Community | Moderation, support, AMAs |
| Consulting | Tokenomics, strategy, legal |
| Video/Audio | Editing, animation, voiceover |
| Other | Miscellaneous services |

### Service Badges

Services can earn badges based on quality:
- 🥉 **Bronze** - Good quality service
- 🥈 **Silver** - Excellent quality service  
- 🥇 **Gold** - Top-tier, exceptional service

### Platform Benefits

- **Secure Payments**: Built-in booking and payment system
- **Verified Reviews**: Authentic feedback from real clients
- **Crypto Payments**: Pay and earn in USDC, SOL, ETH
- **Skill Verification**: Test-based skill badges
- **On-Chain Reputation**: Mint your resume on Base network
- **Risk Assessment**: RiskGauge helps evaluate freelancers
    `,
    prevPage: { id: 'banner-advertising', title: 'Banner Advertising' },
    nextPage: { id: 'creating-services', title: 'Creating Services' },
  },
  
  creatingServices: {
    title: 'Creating Services',
    description: 'How to create and manage freelance service listings.',
    mockup: <CreateServiceMockup />,
    content: `
## Creating Services

List your services on the Freelancer Hub to start receiving clients.

### Accessing Create Service

1. Navigate to the Freelancer Hub (/marketplace)
2. Click the **"+ Create Service"** button
3. Or click **"➕ Create Service"** from your dashboard

### Service Details Form

| Field | Description | Required |
|-------|-------------|----------|
| **Service Title** | Clear, descriptive name | Yes |
| **Category** | Development, Design, Marketing, etc. | Yes |
| **Description** | Detailed explanation (min 200 characters) | Yes |
| **Price** | Your rate in USDC, SOL, or ETH | Yes |
| **Hourly Rate** | Optional per-hour pricing | No |
| **Delivery Time** | Expected turnaround (3, 7, 14 days, etc.) | Yes |
| **Service Image** | Main image for your listing | Yes |
| **Video URL** | YouTube video (optional demo) | No |
| **Requirements** | What you need from the buyer | No |

### Description Requirements

Your description must:
- Be at least **200 characters** long
- Clearly explain what you deliver
- NOT contain payment terms (these go in the price field)

> ⚠️ **Important**: Including payment-related terms in the Requirements field will cause your listing to be rejected. Requirements should only describe what you need from the buyer to complete the work.

### Adding Media

**Service Image:**
1. Upload to Postimages.org
2. Copy the "Direct Link" URL
3. Paste in the Image URL field

**Video (Optional):**
- Only YouTube videos are supported
- Use a demo or explainer video
- Great for showcasing your work

### Supported Currencies

| Currency | Symbol |
|----------|--------|
| USDC | 💰 |
| SOL | ◎ |
| ETH | ⟠ |

### Title Best Practices

**Good Titles:**
✅ "I will develop a professional Solidity smart contract with full testing"
✅ "Professional NFT art and collection design for your Web3 project"

**Bad Titles:**
❌ "I do coding"
❌ "cheap work here"

### After Submission

1. Your service is submitted for review
2. Admin reviews within 24-48 hours
3. Once approved, it appears in the marketplace
4. You'll receive bookings and inquiries

> 💡 **Tip**: Services with professional images and detailed descriptions get significantly more bookings.
    `,
    prevPage: { id: 'freelancer-overview', title: 'Freelancer Hub Overview' },
    nextPage: { id: 'finding-jobs', title: 'Finding & Applying to Jobs' },
  },
  
  findingJobs: {
    title: 'Finding & Applying to Jobs',
    description: 'How to find and apply to job opportunities.',
    content: `
## Finding & Applying to Jobs

Discover opportunities posted by clients looking for Web3 talent.

### Browsing Jobs

**Access Job Listings**
Navigate to Freelancer Hub > Jobs

**Filter Options**
- Category
- Budget range
- Project length
- Skills required
- Posted date

**Job Types**
- **Fixed Price**: Set budget for complete project
- **Hourly**: Pay per hour worked
- **Ongoing**: Long-term engagement

### Understanding Job Postings

Each job listing includes:
- Title and description
- Required skills
- Budget range
- Timeline
- Client information
- Number of applicants

### Applying to Jobs

**Step 1: Review the Job**
Read the full description carefully.

**Step 2: Click "Apply"**
Opens the application form.

**Step 3: Write Your Proposal**

Include:
- Why you're the best fit
- Relevant experience
- Your approach to the project
- Timeline estimate
- Your rate

**Step 4: Attach Portfolio**
Add relevant work samples.

**Step 5: Submit Application**

### Application Tips

**Do:**
- Personalize each application
- Address specific requirements
- Show relevant portfolio pieces
- Ask clarifying questions
- Be professional and prompt

**Don't:**
- Use generic templates
- Oversell or make false claims
- Ignore job requirements
- Submit without proofreading

### After Applying

1. Client reviews applications
2. May request interview/chat
3. Negotiation if needed
4. Booking created if selected
5. Work begins

> 💡 **Tip**: Respond to client questions within 24 hours for best results.
    `,
    prevPage: { id: 'creating-services', title: 'Creating Services' },
    nextPage: { id: 'booking-system', title: 'Booking System' },
  },
  
  bookingSystem: {
    title: 'Booking System',
    description: 'How bookings work on the Freelancer Hub.',
    content: `
## Booking System

The booking system manages the entire service delivery process from inquiry to completion.

### Booking Flow

\`\`\`
Client Inquiry → Discussion → Booking Created → Payment → Work → Delivery → Review
\`\`\`

### For Clients

**Creating a Booking**
1. Find a service you need
2. Click "Book Now" or "Contact"
3. Describe your requirements
4. Agree on terms with freelancer
5. Confirm and pay

**Booking Management**
- View active bookings in Dashboard
- Communicate with freelancer
- Track progress
- Request revisions
- Mark as complete

### For Freelancers

**Receiving Bookings**
1. Client initiates contact
2. Discuss requirements
3. Send custom offer if needed
4. Accept booking
5. Deliver work

**Managing Bookings**
- Track all bookings in Dashboard
- Communicate with clients
- Update delivery status
- Submit deliverables
- Request reviews

### Payment Process

**How It Works**
1. Client pays when booking confirmed
2. Funds held in escrow
3. Freelancer delivers work
4. Client approves delivery
5. Funds released to freelancer

**Payment Methods**
- Crypto (SOL, ETH, USDC)
- More options coming soon

### Communication

Use the built-in messaging system for:
- Project discussions
- File sharing
- Progress updates
- Revision requests

### Disputes

If issues arise:
1. Try to resolve directly
2. Contact support if needed
3. Provide evidence
4. Fair mediation process

> ⚠️ **Important**: Always keep communication on-platform for protection.
    `,
    prevPage: { id: 'finding-jobs', title: 'Finding & Applying to Jobs' },
    nextPage: { id: 'cv-builder', title: 'CV Builder' },
  },
  
  cvBuilder: {
    title: 'CV Builder',
    description: 'Create a professional crypto-native resume.',
    content: `
## CV Builder

Create a professional resume tailored for the Web3 industry.

### Accessing CV Builder

Navigate to Dashboard > Profile > CV Builder

### CV Sections

**Personal Information**
- Name and headline
- Contact information
- Profile photo
- Location

**Professional Summary**
Write a compelling overview of your:
- Experience and expertise
- Key achievements
- Career goals

**Work Experience**
Add positions with:
- Company/Project name
- Role title
- Duration
- Key responsibilities
- Achievements

**Skills**
List your technical and soft skills:
- Programming languages
- Blockchain platforms
- Tools and frameworks
- Soft skills

**Education**
- Degrees and certifications
- Relevant courses
- Online certifications

**Portfolio**
- Project showcases
- GitHub repositories
- Live demos
- Case studies

### Web3-Specific Sections

**Blockchain Experience**
- Chains you've worked with
- Protocols and DAOs
- NFT collections
- DeFi experience

**Verified Skills**
- Aquads skill test badges
- Third-party certifications
- On-chain credentials

### Exporting Your CV

Options available:
- PDF download
- Shareable link
- On-chain attestation

### CV Tips

> 💡 **Tip**: Include quantifiable achievements. "Grew Discord to 10K members" is better than "Managed Discord community."

- Keep it concise and relevant
- Use industry-specific keywords
- Update regularly
- Proofread carefully
    `,
    prevPage: { id: 'booking-system', title: 'Booking System' },
    nextPage: { id: 'onchain-resume', title: 'On-Chain Resume' },
  },
  
  onchainResume: {
    title: 'On-Chain Resume',
    description: 'Create a verified, blockchain-attested professional identity.',
    content: `
## On-Chain Resume

Take your professional identity on-chain with EAS (Ethereum Attestation Service) attestations.

### What is On-Chain Resume?

Your on-chain resume is a verifiable, tamper-proof record of your:
- Professional reputation
- Completed work
- Skills and certifications
- Client reviews

Built on Base network using EAS.

### Benefits

**For Freelancers**
- Permanent reputation record
- Verifiable credentials
- Portable across platforms
- Increased trust

**For Clients**
- Verify freelancer history
- Trust in credentials
- Transparent track record

### Creating Your On-Chain Resume

**Step 1: Build Your Profile**
Complete your Aquads profile with:
- Work history
- Skills
- Portfolio
- Reviews

**Step 2: Connect Wallet**
Connect an EVM-compatible wallet (Base network).

**Step 3: Request Attestation**
Navigate to Profile > On-Chain Resume > Mint

**Step 4: Confirm Transaction**
Pay gas fee and confirm the attestation.

**Step 5: Share Your Resume**
Get a shareable link to your verified resume.

### What Gets Attested?

| Data | Description |
|------|-------------|
| Trust Score | Overall reputation score |
| Completion Rate | Percentage of completed jobs |
| Review Average | Average client rating |
| Skill Badges | Verified skill certifications |
| Member Since | Platform tenure |
| Premium Status | Subscription status |

### Viewing Attestations

Your attestations can be viewed:
- On your Aquads profile
- On EAS Explorer
- Via shareable public link

### Resume Badge

Display a verifiable badge on your profile showing:
- Attestation status
- Trust score
- Last updated date

> 💡 **Tip**: Regularly update your on-chain resume as you complete more work.
    `,
    prevPage: { id: 'cv-builder', title: 'CV Builder' },
    nextPage: { id: 'skill-tests', title: 'Skill Tests & Badges' },
  },
  
  skillTests: {
    title: 'Skill Tests & Badges',
    description: 'Earn verified skill badges through testing.',
    content: `
## Skill Tests & Badges

Prove your expertise with verified skill badges.

### Available Tests

**Technical Skills**
- Solidity Development
- Smart Contract Security
- Web3.js / Ethers.js
- React Development
- Node.js Backend
- Python
- Rust (Solana)

**Design Skills**
- UI/UX Design
- NFT Art Creation
- Brand Design

**Marketing Skills**
- Crypto Marketing
- Community Management
- Content Writing

### Taking a Test

**Step 1: Navigate to Tests**
Go to Learn > Skill Tests

**Step 2: Choose a Test**
Select the skill you want to verify.

**Step 3: Read Instructions**
- Time limit per test
- Number of questions
- Passing score required

**Step 4: Complete the Test**
Answer all questions within the time limit.

**Step 5: Get Results**
- Instant results shown
- Badge awarded if passed
- Can retry after 7 days if failed

### Badge Benefits

**Profile Enhancement**
- Displayed on your profile
- Shown on service listings
- Visible in search results

**Trust Building**
- Proves verified skills
- Increases client confidence
- Improves ranking

**Requirements for Badges**

| Badge Level | Score Required |
|-------------|----------------|
| Basic | 70%+ |
| Intermediate | 80%+ |
| Advanced | 90%+ |
| Expert | 95%+ |

### Badge Display

Badges appear:
- On your profile
- Next to service listings
- In search results
- On your on-chain resume

> 💡 **Tip**: Start with skills you're confident in to build momentum.
    `,
    prevPage: { id: 'onchain-resume', title: 'On-Chain Resume' },
    nextPage: { id: 'freelancer-workshop', title: 'Freelancer Workshop' },
  },
  
  freelancerWorkshop: {
    title: 'Freelancer Workshop',
    description: 'Interactive learning modules for freelancer success.',
    content: `
## Freelancer Workshop

Level up your freelancing skills with our interactive workshop modules.

### Workshop Overview

The Freelancer Workshop is a structured learning program covering:
- Freelancing fundamentals
- Web3 industry knowledge
- Client communication
- Business skills

### Available Modules

**Module 1: Getting Started**
- Creating an effective profile
- Setting competitive rates
- Finding your niche

**Module 2: Winning Clients**
- Writing proposals
- Communication best practices
- Negotiation skills

**Module 3: Delivering Excellence**
- Project management
- Meeting deadlines
- Handling revisions

**Module 4: Web3 Essentials**
- Blockchain basics
- DeFi understanding
- NFT landscape

**Module 5: Growing Your Business**
- Building reputation
- Scaling your services
- Long-term client relationships

### Workshop Features

**Interactive Content**
- Video lessons
- Quizzes
- Practical exercises
- Real-world examples

**Progress Tracking**
- Track completion status
- Earn points for modules
- Achievement badges

**Gamification**
- XP system
- Leaderboards
- Completion rewards

### Completing Workshops

1. Select a module
2. Watch/read content
3. Complete exercises
4. Pass the quiz
5. Earn your badge

### Workshop Benefits

- **Free education**: All modules are free
- **Practical skills**: Immediately applicable
- **Verified learning**: Badges for completion
- **Community**: Connect with other learners

> 💡 **Tip**: Complete all modules to unlock exclusive opportunities and priority in job matching.
    `,
    prevPage: { id: 'skill-tests', title: 'Skill Tests & Badges' },
    nextPage: { id: 'aquaswap', title: 'AquaSwap' },
  },
  
  // AquaSwap & DeFi
  aquaswap: {
    title: 'AquaSwap (Token Swapping)',
    description: 'How to swap tokens using AquaSwap DEX aggregator.',
    mockup: <AquaSwapMockup />,
    content: `
## AquaSwap

AquaSwap is Aquads' integrated DEX aggregator, allowing you to swap tokens across multiple chains at the best rates.

### Accessing AquaSwap

Navigate to AquaSwap by:
- Going to aquads.xyz/aquaswap
- Using the footer links
- Embedding it on your own website

### Features

| Feature | Description |
|---------|-------------|
| **Multi-Chain** | Swap on 20+ blockchain networks |
| **Best Rates** | Aggregates quotes from multiple DEXs |
| **Low Fees** | Competitive transaction costs |
| **Simple UI** | Clean, easy-to-use interface |
| **Token Search** | Find any token by name or address |
| **Price Charts** | View token price history |

### Supported Chains

| Chain | Status | Native Token |
|-------|--------|--------------|
| Ethereum | ✅ Live | ETH |
| Base | ✅ Live | ETH |
| Solana | ✅ Live | SOL |
| BSC | ✅ Live | BNB |
| Polygon | ✅ Live | MATIC |
| Arbitrum | ✅ Live | ETH |
| Optimism | ✅ Live | ETH |
| Avalanche | ✅ Live | AVAX |
| Fantom | ✅ Live | FTM |
| Cronos | ✅ Live | CRO |

### How to Swap Tokens

**Step 1: Connect Your Wallet**
Click "Connect Wallet" and select your provider (MetaMask, WalletConnect, Phantom, etc.)

**Step 2: Select Tokens**
- **From**: Choose the token you want to swap
- **To**: Choose the token you want to receive
- Use the dropdown or paste contract address

**Step 3: Enter Amount**
Enter the amount you want to swap. The interface shows your available balance.

**Step 4: Review the Quote**
AquaSwap displays:
- Exchange rate (e.g., 1 ETH = 3,250 USDC)
- Expected output amount
- Price impact percentage
- Best route (which DEX is used)
- Estimated gas fees

**Step 5: Approve & Swap**
1. Click "Approve" if first time swapping this token
2. Confirm the approval in your wallet
3. Click "Swap" 
4. Confirm the swap transaction

### Quote Information

| Metric | Meaning |
|--------|---------|
| **Rate** | Current exchange rate |
| **Price Impact** | How much your swap affects the price |
| **Route** | Which DEX(s) provide the best rate |
| **Slippage** | Maximum price movement allowed |

### Embedding AquaSwap

Add AquaSwap to your website:
\`\`\`html
<iframe 
  src="https://aquads.xyz/embed/aquaswap"
  width="400"
  height="600"
/>
\`\`\`

> ⚠️ **Important**: Always verify token addresses and check for slippage before swapping. Use official contract addresses only.
    `,
    prevPage: { id: 'freelancer-workshop', title: 'Freelancer Workshop' },
    nextPage: { id: 'aquafi', title: 'AquaFi' },
  },
  
  aquafi: {
    title: 'AquaFi (Savings Pools)',
    description: 'Earn passive income with AquaFi savings pools.',
    mockup: <AquaFiMockup />,
    content: `
## AquaFi

Earn passive income by depositing your tokens into AquaFi savings pools.

### Accessing AquaFi

Navigate to AquaFi by:
- Going to aquads.xyz/aquafi
- Using the footer links under "Platform"

### What is AquaFi?

AquaFi offers yield-generating savings pools where you can:
- Deposit supported tokens
- Earn compound interest over time
- Withdraw anytime (with small fee)
- Track your earnings and projections

### Available Pools

| Pool | Token | APY | TVL |
|------|-------|-----|-----|
| USDC Pool | USDC | 4-5% | Stablecoin savings |
| SOL Pool | SOL | 5-7% | Solana staking |
| ETH Pool | ETH | 4-6% | Ethereum yield |

### Savings Calculator

AquaFi includes a built-in savings calculator:
1. Enter your **weekly contribution** amount
2. Set the **APY** (annual percentage yield)
3. Choose your **time horizon** in years
4. See projected results:
   - Final balance
   - Total contributed
   - Total earnings
   - Withdrawal fee (2.5%)
   - Final after fee

### How to Deposit

**Step 1: Navigate to AquaFi**
Go to aquads.xyz/aquafi

**Step 2: Connect Wallet**
Connect your Web3 wallet (MetaMask, Phantom, etc.)

**Step 3: Choose a Pool**
Browse available pools and review APY rates

**Step 4: Enter Amount**
Specify how much you want to deposit

**Step 5: Approve & Deposit**
- Approve token spending (first time only)
- Confirm deposit transaction in your wallet

### Portfolio Analytics

AquaFi includes Portfolio Analytics to track:
- Total portfolio value
- Token distribution
- Performance over time
- P&L calculations
- Chain breakdown

### Withdrawing Funds

1. Go to your AquaFi positions
2. Select the pool you want to withdraw from
3. Click "Withdraw"
4. Enter amount (or click "Max")
5. Confirm transaction
6. Note: 2.5% withdrawal fee applies

### Safety Features

- **Transparent**: All transactions on-chain
- **No Custody**: You control your funds
- **Compound Interest**: Weekly compounding
- **Instant Access**: Withdraw anytime

> ⚠️ **Risk Warning**: DeFi carries inherent risks. Only deposit what you can afford to lose. APY rates are variable and not guaranteed.
    `,
    prevPage: { id: 'aquaswap', title: 'AquaSwap' },
    nextPage: { id: 'wallet-analyzer', title: 'Wallet Analyzer' },
  },
  
  walletAnalyzer: {
    title: 'Wallet Analyzer',
    description: 'Analyze any wallet address for insights and risk assessment.',
    content: `
## Wallet Analyzer

Get detailed insights into any wallet address with our comprehensive analyzer.

### Features

**Portfolio Overview**
- Total value
- Token breakdown
- Chain distribution
- Historical performance

**Risk Assessment**
- Risk score (0-100)
- Risk factors identified
- Improvement suggestions

**Transaction History**
- Recent transactions
- Trading patterns
- DeFi interactions

**Token Holdings**
- All tokens held
- USD values
- Percentage allocation

### How to Use

**Step 1: Navigate to Analyzer**
Go to Platform > Wallet Analyzer

**Step 2: Enter Address**
Paste any wallet address (EVM or Solana).

**Step 3: Analyze**
Click "Analyze" and wait for results.

**Step 4: Review Report**
Explore the detailed breakdown.

### Risk Gauge

The Risk Gauge provides a visual score:

| Score | Risk Level | Color |
|-------|------------|-------|
| 0-25 | Low | Green |
| 26-50 | Moderate | Yellow |
| 51-75 | High | Orange |
| 76-100 | Very High | Red |

### Risk Factors Analyzed

- Token concentration
- Interaction with flagged contracts
- Transaction patterns
- Portfolio diversity
- Exposure to volatile assets

### Improvement Tips

The analyzer provides actionable suggestions:
- Diversification recommendations
- Security improvements
- Portfolio optimization tips

### Privacy Note

- Analysis is read-only
- No wallet connection required
- Data is not stored
- Completely anonymous

> 💡 **Tip**: Use the analyzer to audit wallets before transactions or partnerships.
    `,
    prevPage: { id: 'aquafi', title: 'AquaFi' },
    nextPage: { id: 'portfolio-analytics', title: 'Portfolio Analytics' },
  },
  
  portfolioAnalytics: {
    title: 'Portfolio Analytics',
    description: 'Track and analyze your DeFi portfolio performance.',
    content: `
## Portfolio Analytics

Comprehensive analytics for your AquaFi positions and overall portfolio.

### Dashboard Overview

**Key Metrics**
- Total Portfolio Value
- Total Deposited
- Total Earnings
- Average APY
- ROI Percentage

### Charts & Visualizations

**Asset Allocation Pie Chart**
Visual breakdown of your holdings by:
- Token type
- Chain
- Pool

**Earnings Bar Chart**
Compare earnings across:
- Different pools
- Time periods
- Tokens

**Performance Over Time**
Line chart showing:
- Portfolio growth
- APY trends
- Deposit history

### Position Details

For each position view:
- Pool name and chain
- Amount deposited
- Current value
- Earned to date
- APY rate
- Entry date

### Analytics Features

**Filtering**
Filter positions by:
- Chain
- Token
- Performance
- Date range

**Sorting**
Sort by:
- Highest APY
- Largest position
- Best performer
- Most recent

**Export**
Download reports as:
- CSV
- PDF
- JSON

### Insights

**Performance Insights**
- Best performing pools
- Underperforming positions
- Optimization suggestions

**Risk Analysis**
- Portfolio diversity score
- Concentration warnings
- Volatility assessment

### Using Analytics

1. Connect wallet
2. View auto-synced positions
3. Explore charts and data
4. Make informed decisions

> 💡 **Tip**: Check analytics weekly to optimize your positions and maximize returns.
    `,
    prevPage: { id: 'wallet-analyzer', title: 'Wallet Analyzer' },
    nextPage: { id: 'trading-signals', title: 'Trading Signals' },
  },
  
  tradingSignals: {
    title: 'Trading Signals',
    description: 'Access AI-powered trading signals and market insights.',
    content: `
## Trading Signals

Get AI-powered trading signals for tokens listed on Aquads.

### Signal Types

| Signal | Confidence | Meaning |
|--------|------------|---------|
| 🚀 STRONG BUY | 80-100% | Very bullish indicators |
| 📈 BUY | 60-79% | Generally bullish |
| ⏸️ HOLD | Mixed | Neutral signals |
| 📉 SELL | 60-79% | Generally bearish |
| 🔻 STRONG SELL | 80-100% | Very bearish indicators |

### How Signals Work

Our algorithm analyzes:
- Price action
- Volume patterns
- On-chain metrics
- Social sentiment
- Technical indicators

### Viewing Signals

**On Token Pages**
Each listed token shows:
- Current signal
- Signal strength
- Key factors
- Historical accuracy

**Signals Dashboard**
View all signals in one place:
- Filter by chain
- Sort by strength
- Track favorites

### Signal Components

**Technical Analysis**
- Moving averages
- RSI
- MACD
- Bollinger Bands

**On-Chain Data**
- Holder distribution
- Transaction volume
- Whale activity
- Liquidity changes

**Sentiment Analysis**
- Community votes
- Social mentions
- News sentiment

### Using Signals

**Best Practices**
1. Use signals as one input, not sole decision maker
2. Always do your own research (DYOR)
3. Consider your risk tolerance
4. Diversify your positions

**Signal Alerts**
Set up alerts for:
- Signal changes
- Price targets
- Volume spikes

> ⚠️ **Disclaimer**: Trading signals are for informational purposes only. Past performance does not guarantee future results. Always DYOR.
    `,
    prevPage: { id: 'portfolio-analytics', title: 'Portfolio Analytics' },
    nextPage: { id: 'aquapay-overview', title: 'AquaPay Overview' },
  },
  
  // AquaPay
  aquapayOverview: {
    title: 'AquaPay Overview',
    description: 'Introduction to AquaPay crypto payment solution.',
    mockup: <AquaPayMockup />,
    content: `
## AquaPay Overview

AquaPay is Aquads' crypto payment solution, making it easy to accept and send cryptocurrency payments.

### Accessing AquaPay

Set up AquaPay from:
- **Dashboard > AquaPay tab** - Configure settings
- **Profile > AquaPay Settings** - Wallet addresses
- **aquads.xyz/pay/[your-slug]** - Your payment page

### What is AquaPay?

AquaPay enables you to:
- Create custom payment pages with your branding
- Generate QR codes for in-person payments
- Accept crypto payments on multiple chains
- Track all payments in your dashboard
- Send payment notifications

### Supported Chains & Tokens

| Chain | Native Token | Stablecoins |
|-------|--------------|-------------|
| Solana | SOL | USDC |
| Ethereum | ETH | USDC |
| Base | ETH | USDC |
| Polygon | MATIC | USDC |
| Arbitrum | ETH | USDC |
| BNB Chain | BNB | USDC |
| Bitcoin | BTC | - |
| TRON | TRX | - |

### Payment Page Features

**Customizable Payment Page**
- Custom slug URL (e.g., aquads.xyz/pay/yourname)
- Your profile name and description
- Multiple chain options for payers
- Native or USDC token choice

**Payment Options**
- Fixed amount payments
- Open/flexible amounts
- Multiple currency support
- Real-time price conversion

### Use Cases

**For Freelancers**
- Invoice clients with a simple link
- Accept payments in crypto
- Track payment history

**For Projects**
- Accept donations
- Sell services
- Receive bounty payments

**For Everyone**
- Request money from friends
- Split bills
- Receive tips

### Key Features

| Feature | Description |
|---------|-------------|
| **Multi-Chain** | Accept payments on 8+ chains |
| **Wallet Connect** | Connect MetaMask, Phantom, etc. |
| **QR Codes** | Generate scannable payment QR |
| **Real-Time** | Instant payment notifications |
| **No Platform Fees** | Only network gas fees |

### Dashboard Tracking

In your Dashboard > AquaPay tab, view:
- Total received (USD value)
- Transaction count
- Average payment amount
- Last payment details
- Chain breakdown
- Payment history with transaction links

> 💡 **Tip**: AquaPay is perfect for freelancers wanting to accept crypto from clients without complex invoicing.
    `,
    prevPage: { id: 'trading-signals', title: 'Trading Signals' },
    nextPage: { id: 'payment-links', title: 'Creating Payment Links' },
  },
  
  paymentLinks: {
    title: 'Creating Payment Links',
    description: 'How to create and share payment links.',
    content: `
## Creating Payment Links

Generate shareable payment links for easy crypto transactions.

### Creating a Link

**Step 1: Access AquaPay**
Navigate to your profile > AquaPay Settings

**Step 2: Configure Payment**

Fill in the details:
| Field | Description |
|-------|-------------|
| Amount | Payment amount (or leave open) |
| Currency | Select crypto currency |
| Description | What the payment is for |
| Slug | Custom URL (optional) |

**Step 3: Generate Link**
Click "Create Payment Link"

**Step 4: Share**
Copy and share your unique link.

### Link Types

**Fixed Amount**
- Specific amount required
- Best for invoices
- No under/overpayment

**Open Amount**
- Payer chooses amount
- Good for donations
- Flexible payments

**Recurring** (Coming Soon)
- Subscription payments
- Regular intervals
- Automatic reminders

### Link Options

**Custom Slug**
Create memorable URLs:
\`aquads.xyz/pay/yourname\`
\`aquads.xyz/pay/project-fee\`

**Expiry Date**
Set links to expire after:
- Specific date
- Number of uses
- Never

**Metadata**
Attach information:
- Order ID
- Client reference
- Notes

### Sharing Links

Share via:
- Direct link
- QR code
- Email
- Social media
- Embed button

### Tracking Payments

View all payments in your dashboard:
- Payment status
- Amount received
- Transaction hash
- Payer info (if provided)

> 💡 **Tip**: Use descriptive slugs to keep your payment links organized.
    `,
    prevPage: { id: 'aquapay-overview', title: 'AquaPay Overview' },
    nextPage: { id: 'accepting-payments', title: 'Accepting Crypto Payments' },
  },
  
  acceptingPayments: {
    title: 'Accepting Crypto Payments',
    description: 'Guide to accepting cryptocurrency payments.',
    content: `
## Accepting Crypto Payments

Learn how to seamlessly accept cryptocurrency payments from clients.

### Setup Requirements

1. **Wallet Addresses**
   Add receiving addresses for each currency you want to accept.

2. **Payment Page**
   Create your personalized payment page.

3. **Notification Settings**
   Configure how you receive payment alerts.

### Payment Flow

\`\`\`
Link Shared → Payer Visits → Selects Crypto → Sends Payment → You Receive → Notification Sent
\`\`\`

### Payer Experience

When someone uses your payment link:

1. They see your payment page
2. Amount displayed (if fixed)
3. Select cryptocurrency
4. Connect wallet or scan QR
5. Confirm transaction
6. Receipt shown

### Receiving Payments

**Instant Settlement**
Payments go directly to your wallet - no intermediary holding.

**Notifications**
Receive alerts via:
- Email
- In-app notification
- Telegram (if connected)

**Confirmation**
Track confirmation status:
- Pending (mempool)
- Confirming (1-6 confirmations)
- Complete (fully confirmed)

### Multi-Currency Support

Accept multiple currencies on one link:
- Payer chooses their preferred crypto
- You receive to respective wallets
- Automatic conversion tracking

### Best Practices

**For Invoicing**
- Include invoice number in description
- Set exact amount
- Add due date

**For Services**
- Create service-specific links
- Include deliverables in description
- Set clear terms

**For Tips/Donations**
- Leave amount open
- Add thank you message
- Consider suggested amounts

> 💡 **Tip**: Always verify transactions on-chain before delivering goods/services.
    `,
    prevPage: { id: 'payment-links', title: 'Creating Payment Links' },
    nextPage: { id: 'qr-codes', title: 'QR Code Generation' },
  },
  
  qrCodes: {
    title: 'QR Code Generation',
    description: 'Create and customize QR codes for payments.',
    content: `
## QR Code Generation

Generate scannable QR codes for easy mobile payments.

### Creating QR Codes

Every payment link automatically gets a QR code. You can also create standalone QR codes.

**Quick QR**
1. Go to AquaPay
2. Click "Generate QR"
3. Enter payment details
4. Download or share

### Customization Options

**Style Options**
- Standard black/white
- Colored patterns
- Logo in center
- Custom corners

**Size Options**
- Small (for receipts)
- Medium (for displays)
- Large (for posters)
- Vector (scalable)

**Information Included**
- Payment address
- Amount (optional)
- Currency type
- Payment reference

### Using QR Codes

**In-Person Payments**
- Display at checkout
- Print on invoices
- Show on mobile

**Digital Use**
- Add to website
- Include in emails
- Share on social

### QR Code Types

| Type | Use Case |
|------|----------|
| Static | Same address, any amount |
| Dynamic | Unique per transaction |
| Multi-Currency | Payer selects crypto |

### Download Formats

Export your QR codes as:
- PNG (best for web)
- SVG (scalable vector)
- PDF (for print)

### Display Tips

**Size Guidelines**
- Minimum 2cm x 2cm for scanning
- Larger for distance scanning
- High contrast background

**Testing**
- Always test with your phone
- Try different lighting conditions
- Verify correct address

> 💡 **Tip**: Print high-quality QR codes to ensure reliable scanning.
    `,
    prevPage: { id: 'accepting-payments', title: 'Accepting Crypto Payments' },
    nextPage: { id: 'raids-overview', title: 'Raids Overview' },
  },
  
  // Raids & Marketing
  raidsOverview: {
    title: 'Raids Overview',
    description: 'Introduction to the Aquads raid system.',
    mockup: <RaidsMockup />,
    content: `
## Raids Overview

Raids are coordinated social media campaigns where users engage with content to earn points.

### What are Raids?

Raids are community-driven marketing campaigns that:
- Coordinate engagement on social media posts
- Reward participants with points
- Help projects gain visibility
- Build active community participation

### Raid Types

**Twitter/X Raids** 🐦
The most popular raid type:
- Like tweets
- Retweet/Quote tweet
- Reply with comments
- Follow accounts

**Telegram Raids** 📱
Boost Telegram engagement:
- Join channels/groups
- React to pinned messages
- Participate in discussions
- Share in groups

**Facebook Raids** 📘
Support Facebook content:
- Like posts/pages
- Comment meaningfully
- Share content
- Tag friends

### How Raids Work

1. **Project creates raid** with required actions
2. **Raid goes live** for a set duration
3. **Users participate** by completing actions
4. **System verifies** participation
5. **Points awarded** upon verification

### Points System

| Action | Typical Points |
|--------|----------------|
| Like | 5-10 points |
| Retweet | 10-15 points |
| Comment | 15-20 points |
| Full Raid Completion | 20-50 points |
| Bonus for early participation | +5-10 points |

### Using Your Points

Points can be used for:
- **Creating your own raids** (costs points)
- **Leaderboard ranking** visibility
- **Free raid eligibility** for active users
- **Future rewards** and platform perks
- **Redemptions** (coming soon)

### Raid Rules

**✅ Do:**
- Engage authentically with content
- Follow all raid instructions
- Complete all required actions
- Use your real social accounts

**❌ Don't:**
- Use bots or automation tools
- Create fake accounts for raiding
- Spam or post low-quality comments
- Attempt to game the system

### Accessing Raids

1. Navigate to the home page
2. Look for the "Raids" section
3. Browse available active raids
4. Click "Join Raid" to participate
5. Complete all required actions
6. Return to verify and earn points

> ⚠️ **Important**: Fraudulent participation (bots, fake accounts, automation) will result in account suspension and point loss.
    `,
    prevPage: { id: 'qr-codes', title: 'QR Code Generation' },
    nextPage: { id: 'twitter-raids', title: 'Twitter/X Raids' },
  },
  
  twitterRaids: {
    title: 'Twitter/X Raids',
    description: 'How to participate in and create Twitter raids.',
    content: `
## Twitter/X Raids

The most popular raid type - engage with tweets to earn points.

### Participating in Raids

**Step 1: Find a Raid**
Browse active Twitter raids on the Raids page.

**Step 2: View Tweet**
Click the raid to see the target tweet.

**Step 3: Complete Actions**
Follow the required actions:
- ❤️ Like the tweet
- 🔄 Retweet
- 💬 Comment (if required)

**Step 4: Verify**
Click "Verify" to confirm your participation.

**Step 5: Earn Points**
Points credited upon verification.

### Creating Raids

**Requirements**
- Must have Aquads account
- Costs points or crypto
- Tweet must be accessible

**Steps to Create**
1. Go to Raids > Create
2. Paste tweet URL
3. Set requirements
4. Set point rewards
5. Pay creation fee
6. Publish raid

### Raid Pricing

| Raid Type | Cost |
|-----------|------|
| Points-Based | 100+ points |
| Paid | 0.01+ SOL |
| Free (Limited) | 1 per day |

### Verification System

Our system verifies actions via:
- Twitter API checks
- Manual verification
- Anti-fraud detection

### Tips for Success

**For Participants**
- Act quickly on new raids
- Complete all required actions
- Use authentic engagement

**For Creators**
- Write engaging tweet content
- Set fair rewards
- Time raids strategically
- Promote in your community

> 💡 **Tip**: Raids created during high-activity hours get more participation.
    `,
    prevPage: { id: 'raids-overview', title: 'Raids Overview' },
    nextPage: { id: 'telegram-raids', title: 'Telegram Raids' },
  },
  
  telegramRaids: {
    title: 'Telegram Raids',
    description: 'Telegram-specific raid participation guide.',
    content: `
## Telegram Raids

Boost Telegram engagement through coordinated raids.

### Types of Telegram Raids

**Channel Join Raids**
- Join a Telegram channel
- Stay for required duration
- Earn points

**Message Reaction Raids**
- React to specific messages
- Use specified emojis
- Complete engagement

**Discussion Raids**
- Participate in group discussions
- Ask/answer questions
- Engage authentically

### Participating

**Step 1: Find Raid**
Browse Telegram raids section.

**Step 2: Read Requirements**
Understand what's needed:
- Channel to join
- Actions required
- Duration

**Step 3: Complete Actions**
Follow the instructions carefully.

**Step 4: Verify**
Provide verification (username/screenshot).

**Step 5: Receive Points**
Points credited after verification.

### Verification Methods

| Method | Description |
|--------|-------------|
| Username | Submit your TG username |
| Screenshot | Provide proof of action |
| Bot | Verify via @AquadsBot |

### Creating Telegram Raids

1. Have an active TG channel/group
2. Go to Create Raid
3. Select "Telegram"
4. Enter channel link
5. Set requirements
6. Publish raid

### Best Practices

**For Participants**
- Only join channels you're interested in
- Engage genuinely
- Don't spam

**For Creators**
- Provide clear instructions
- Set reasonable requirements
- Reward participants fairly

### Daily Engagement

Special daily raids offer:
- Bonus points
- Streak rewards
- Leaderboard bonuses

> 💡 **Tip**: Connect your Telegram to Aquads for easier verification.
    `,
    prevPage: { id: 'twitter-raids', title: 'Twitter/X Raids' },
    nextPage: { id: 'facebook-raids', title: 'Facebook Raids' },
  },
  
  facebookRaids: {
    title: 'Facebook Raids',
    description: 'Facebook raid participation guide.',
    content: `
## Facebook Raids

Engage with Facebook content to earn points.

### Available Actions

**Post Engagement**
- Like posts
- React with emojis
- Comment
- Share

**Page Support**
- Follow pages
- Like pages
- Engage with content

### Participating in FB Raids

**Step 1: Find Raid**
Browse Facebook raids section.

**Step 2: View Content**
Click to see the target post/page.

**Step 3: Complete Actions**
- Navigate to Facebook
- Complete required actions
- Return to Aquads

**Step 4: Verify**
Submit verification of completion.

**Step 5: Earn Points**
Points credited after verification.

### Verification

Facebook raid verification typically requires:
- Screenshot proof
- Profile link
- Action confirmation

### Creating FB Raids

Requirements:
- Public Facebook content
- Accessible post URL
- Clear instructions

Steps:
1. Create Raid > Facebook
2. Enter post URL
3. Set required actions
4. Set rewards
5. Publish

### Points Structure

| Action | Points |
|--------|--------|
| Like | 5 |
| Comment | 10 |
| Share | 15 |
| Follow Page | 10 |

### Guidelines

**Allowed**
- Genuine engagement
- Public posts only
- Authentic comments

**Not Allowed**
- Fake accounts
- Automated tools
- Spam comments

> 💡 **Tip**: Facebook raids help projects grow their social presence across platforms.
    `,
    prevPage: { id: 'telegram-raids', title: 'Telegram Raids' },
    nextPage: { id: 'shill-templates', title: 'Shill Templates' },
  },
  
  shillTemplates: {
    title: 'Shill Templates',
    description: 'Use and create shill templates for marketing.',
    content: `
## Shill Templates

Pre-made templates to help you promote projects effectively.

### What are Shill Templates?

Shill templates are ready-to-use marketing messages:
- Copy and customize
- Share on social media
- Maintain consistency
- Save time

### Template Categories

**Announcement Posts**
- New listing alerts
- Feature updates
- Partnership news

**Engagement Posts**
- Questions for community
- Polls
- Discussion starters

**Promotional Posts**
- Project highlights
- Benefits overview
- Call-to-action posts

### Using Templates

**Step 1: Access Templates**
Click the templates icon on any token page.

**Step 2: Browse Options**
View available templates for the project.

**Step 3: Customize**
Edit the template:
- Add your perspective
- Include relevant links
- Adjust for platform

**Step 4: Copy & Share**
Copy to clipboard and share on your social media.

### Template Best Practices

**Do:**
- Personalize messages
- Add your own insights
- Be authentic
- Follow platform guidelines

**Don't:**
- Copy exactly without changes
- Spam the same message
- Mislead your audience
- Make false claims

### Creating Templates

Project owners can create templates:
1. Go to Project Settings
2. Navigate to Marketing
3. Create Template
4. Set category
5. Save for community use

### Template Elements

| Element | Purpose |
|---------|---------|
| Hook | Grab attention |
| Benefits | Why care |
| Proof | Credibility |
| CTA | What to do next |
| Links | Where to go |

> 💡 **Tip**: Templates with personalization get 2x more engagement.
    `,
    prevPage: { id: 'facebook-raids', title: 'Facebook Raids' },
    nextPage: { id: 'points-rewards', title: 'Points & Rewards' },
  },
  
  pointsRewards: {
    title: 'Points & Rewards',
    description: 'Understanding the points system and rewards.',
    content: `
## Points & Rewards

Earn points through platform activities and unlock rewards.

### Earning Points

**Raid Participation**
| Action | Points |
|--------|--------|
| Twitter Like | 5 |
| Retweet | 10 |
| Comment | 15 |
| Complete Raid | 20 |
| Telegram Join | 10 |
| Daily Engagement | 5-25 |

**Platform Activities**
| Activity | Points |
|----------|--------|
| Daily Login | 5 |
| Referral Signup | 50 |
| First Service Created | 25 |
| Profile Completion | 20 |
| Skill Test Passed | 30 |

### Points Dashboard

View your points in Dashboard:
- Current balance
- Points history
- Earning breakdown
- Leaderboard rank

### Using Points

**Create Raids**
Spend points to create community raids.

**Leaderboard Rewards**
Top earners receive:
- Monthly prizes
- Exclusive badges
- Platform perks

**Future Uses**
- Marketplace discounts
- Premium features
- Token rewards (planned)

### Leaderboard

**Rankings**
- Daily top earners
- Weekly champions
- All-time leaders

**Rewards**
| Rank | Reward |
|------|--------|
| #1 | Premium badge + perks |
| #2-5 | Special recognition |
| #6-10 | Bonus points |

### Point Validity

- Points don't expire
- Some rewards are time-limited
- Leaderboard resets periodically

### Anti-Fraud

We monitor for:
- Bot activity
- Multiple accounts
- Fake engagement
- Gaming attempts

> ⚠️ **Warning**: Fraudulent point earning results in account ban.

> 💡 **Tip**: Consistent daily engagement builds points faster than sporadic activity.
    `,
    prevPage: { id: 'shill-templates', title: 'Shill Templates' },
    nextPage: { id: 'hyperspace', title: 'HyperSpace' },
  },
  
  // GameHub
  gamehubOverview: {
    title: 'GameHub Overview',
    description: 'Introduction to the Aquads GameHub.',
    mockup: <GameHubMockup />,
    content: `
## GameHub Overview

Discover, play, and list blockchain games on Aquads.

### Accessing GameHub

Navigate to GameHub by:
- Clicking **"Games"** in the main navigation
- Going directly to aquads.xyz/games

### What is GameHub?

GameHub is Aquads' gaming section featuring:
- Blockchain games listings
- Aquads mini-games
- Community voting and reviews
- Game categories and filters

### Features

**Browse Games**
- Filter by blockchain (Ethereum, Solana, BSC, etc.)
- Filter by category (Action, RPG, Strategy, etc.)
- Sort by votes, newest, or alphabetically
- Search games by name

**Vote on Games**
- Vote for your favorite games
- Help good games rise to the top
- Community-driven rankings

**List Your Game**
- Showcase your blockchain game
- Reach crypto gamers
- Build community
- Get visibility

### Game Categories

| Category | Description |
|----------|-------------|
| Action | Fast-paced gameplay |
| Adventure | Story-driven experiences |
| RPG | Role-playing games |
| Strategy | Tactical gameplay |
| Puzzle | Brain teasers |
| Card Game | Card-based gameplay |
| Casual | Easy to pick up |
| Racing | Speed-based games |
| Battle Royale | Last one standing |
| MMORPG | Massive multiplayer RPGs |
| Shooter | Combat games |

### Supported Blockchains

Games can be listed on:
- Ethereum, Solana, BSC, Polygon
- Avalanche, WAX, Sui, Polkadot
- Aptos, Near, Immutable X, Kaspa

### Aquads Mini-Games

Play games built into Aquads:
- **Dots & Boxes** - Classic strategy game
- **Horse Racing** - Betting game
- More games coming soon!

### Game Listing Status

| Badge | Meaning |
|-------|---------|
| 🟢 **Live** | Game is playable |
| 🟡 **Beta** | Testing phase |
| 🔵 **Coming Soon** | In development |

> 💡 **Tip**: Check GameHub regularly for new games and tournaments.
    `,
    prevPage: { id: 'hyperspace', title: 'HyperSpace' },
    nextPage: { id: 'available-games', title: 'Available Games' },
  },
  
  availableGames: {
    title: 'Available Games',
    description: 'Explore games available on Aquads GameHub.',
    content: `
## Available Games

Explore the games you can play right now on Aquads.

### Aquads Original Games

**Dots & Boxes**
Classic strategy game:
- Turn-based gameplay
- Multiplayer option
- Quick matches

**HyperSpace**
Space adventure:
- Arcade-style gameplay
- Leaderboards
- Achievements

**Horse Racing**
Racing excitement:
- Bet on races
- Multiple horses
- Live results

**Duck Hunt**
Classic shooter:
- Test your reflexes
- High score challenge
- Nostalgic fun

### Featured Third-Party Games

Browse games listed by developers:
- DeFi games
- NFT games
- P2E titles
- Casual games

### Game Information

Each game listing shows:
- Game name & description
- Screenshots/videos
- Blockchain integration
- Play requirements
- User reviews

### Filters

Find games by:
- Category
- Blockchain
- Play-to-earn status
- Rating
- Recent additions

### Playing Games

**Browser Games**
1. Click "Play"
2. Game loads in browser
3. Follow instructions
4. Enjoy!

**External Games**
1. Click game
2. Visit external site
3. Follow their instructions

### Leaderboards

Compete for top spots:
- Daily rankings
- Weekly champions
- All-time bests

### Rewards

Some games offer:
- Points for playing
- Achievement badges
- Tournament prizes

> 💡 **Tip**: Join game communities for tips and competitive play.
    `,
    prevPage: { id: 'gamehub-overview', title: 'GameHub Overview' },
    nextPage: { id: 'listing-game', title: 'Listing Your Game' },
  },
  
  listingGame: {
    title: 'Listing Your Game',
    description: 'How to list your game on Aquads GameHub.',
    content: `
## Listing Your Game

Showcase your blockchain game to the Aquads community.

### Requirements

To list a game, you need:
- Playable game (live or demo)
- Game description
- Screenshots/video
- Valid website/link
- Aquads account

### Submission Process

**Step 1: Start Listing**
Navigate to GameHub > List Your Game

**Step 2: Basic Information**

| Field | Description |
|-------|-------------|
| Game Name | Official title |
| Description | What makes it special |
| Category | Select game type |
| Blockchain | Integration details |
| Website | Official URL |

**Step 3: Media**
Upload required media:
- Icon/Logo
- Screenshots (3-5)
- Gameplay video (optional)
- Banner image

**Step 4: Details**
Provide additional info:
- Platforms supported
- Play-to-earn details
- NFT integration
- Token requirements

**Step 5: Submit**
Review and submit for approval.

### Review Process

1. Submission received
2. Team reviews listing
3. Approval/feedback (24-48h)
4. Published if approved

### Listing Tips

**Stand Out**
- Write compelling description
- Use high-quality media
- Highlight unique features
- Show gameplay

**Optimize**
- Use relevant keywords
- Complete all fields
- Add social links
- Update regularly

### Managing Your Listing

After approval:
- Edit details anytime
- Update media
- Respond to reviews
- Track analytics

### Promotion

Boost visibility:
- Share on social media
- Participate in features
- Encourage reviews
- Host tournaments

> 💡 **Tip**: Games with video previews get 3x more clicks.
    `,
    prevPage: { id: 'available-games', title: 'Available Games' },
    nextPage: { id: 'affiliate-program', title: 'Affiliate Program' },
  },
  
  hyperspace: {
    title: 'HyperSpace',
    description: 'Boost your Twitter Space with real listeners.',
    mockup: <HyperSpaceMockup />,
    content: `
## HyperSpace

HyperSpace is Aquads' Twitter Space boosting service - get real listeners to your Twitter Spaces and increase engagement.

### What is HyperSpace?

HyperSpace helps you:
- Boost your Twitter Space with real listeners
- Increase engagement and visibility
- Trend on Twitter/X
- Grow your audience

### Accessing HyperSpace

Navigate to HyperSpace by:
- Going to aquads.xyz/hyperspace
- Using footer links
- Dashboard quick links

### Pricing Packages

**Duration Options:**

| Duration | Icon | Description |
|----------|------|-------------|
| 30 Minutes | ⚡ | Quick trending push |
| 1 Hour | 🔥 | Full Space coverage (Popular) |
| 2 Hours | 💎 | Extended trending |

**Listener Options:**
- 100 listeners
- 200 listeners
- 500 listeners
- 1,000 listeners
- 2,500 listeners
- 5,000 listeners

### How to Order

**Step 1: Select Duration**
Choose 30 min, 1 hour, or 2 hours

**Step 2: Select Listeners**
Pick how many listeners you want (100-5,000)

**Step 3: Enter Space URL**
Paste your Twitter Space URL

**Step 4: Choose Payment Chain**
Select from:
- Solana (SOL)
- Ethereum (ETH)
- Base (ETH)
- Polygon (MATIC)
- BNB Chain (BNB)

**Step 5: Complete Payment**
Pay and your order is submitted for processing

### Supported Payment Methods

| Chain | Token |
|-------|-------|
| Solana | SOL |
| Ethereum | ETH |
| Base | ETH |
| Polygon | MATIC |
| BNB | BNB |

### Order Tracking

After ordering, you can:
- View order status in real-time
- See confirmation when listeners join
- Track order history
- Get email confirmations

### Order History

Check your past orders:
- Order ID and date
- Package details
- Status (pending/active/completed)
- Payment information

### Best Practices

**For Maximum Impact:**
- Schedule Spaces during peak hours
- Promote your Space beforehand
- Have engaging content prepared
- Interact with listeners

**Timing Tips:**
- Order before your Space starts
- Allow processing time
- Peak hours vary by timezone

### Support

Need help with your order?
- Check order status in dashboard
- Contact support for issues
- Real-time status updates via socket

> 💡 **Tip**: The 1-hour package is most popular - it gives full coverage for typical Space duration.

> 💡 **Tip**: Practice mode lets you learn without affecting your stats.
    `,
    prevPage: { id: 'points-rewards', title: 'Points & Rewards' },
    nextPage: { id: 'gamehub-overview', title: 'GameHub Overview' },
  },
  
  // Partners & Affiliate
  affiliateProgram: {
    title: 'Affiliate Program',
    description: 'Earn rewards by referring users to Aquads.',
    mockup: <AffiliateMockup />,
    content: `
## Affiliate Program

Earn rewards by inviting others to join Aquads.

### Accessing Your Affiliate Dashboard

Find your affiliate tools in:
- **Dashboard > Affiliate Tab**
- Profile settings
- Footer link "Affiliate"

### How It Works

1. **Get your unique referral code** from the dashboard
2. **Share with friends/community** using your link or QR code
3. **They sign up using your code** (auto-filled from link)
4. **You earn points and rewards** automatically

### Your Referral Code

Your referral code is a unique identifier like **CRYPTO123** that gets assigned to your account. You can find it in:
- Dashboard > Affiliate tab
- The welcome email

### Sharing Methods

**Referral Link:**
\`\`\`
https://aquads.xyz/?ref=YOUR_CODE
\`\`\`

**Custom QR Code:**
Generate a branded QR code from Dashboard > Affiliate > Generate QR Code

You can customize:
- Colors and style
- Size
- Download as PNG

### Rewards Structure

| Action | Reward |
|--------|--------|
| New user signup | 10 points |
| Verified referral | Bonus points |
| Active referrals | Additional rewards |
| Network building | Multiplier bonuses |

### Affiliate Analytics

Your dashboard shows detailed analytics:

**Summary Stats:**
- Total affiliates (referrals)
- This week signups
- Active this week
- Verified count

**Performance Tiers:**
- Top Performers (1000+ pts)
- Moderate (500-1000 pts)
- New Users (0-500 pts)

**Engagement Metrics:**
- Verification rate
- Activity rate
- Network builders count

### Tracking Your Referrals

In the Affiliate tab you can:
- View all your referrals
- See their activity status
- Track points earned from each
- Monitor total affiliate earnings

### Free Raid Eligibility

Active affiliates with good referral activity may become eligible for:
- Free raid creation
- Bonus point multipliers
- Special features

### Promotion Tips

**Where to Share:**
- Twitter/X posts
- Telegram groups
- Discord communities
- YouTube content
- Blog articles

**Best Practices:**
- Share your genuine experience
- Help new users get started
- Create helpful content
- Be active in the community

### Terms

- One account per person
- No self-referrals
- Fraudulent activity = account suspension
- Bot/fake accounts will be removed
- Terms subject to change

> 💡 **Tip**: Active affiliates who help their referrals succeed have higher retention and earn more rewards.
    `,
    prevPage: { id: 'listing-game', title: 'Listing Your Game' },
    nextPage: { id: 'partner-rewards', title: 'Partner Rewards' },
  },
  
  partnerRewards: {
    title: 'Partner Rewards Marketplace',
    description: 'Access exclusive deals from Aquads partners.',
    content: `
## Partner Rewards Marketplace

Exclusive deals and discounts from our partner network.

### What is Partner Rewards?

A marketplace of exclusive offers:
- Discounts on services
- Free trials
- Special deals
- Partner products

### Browsing Offers

**Categories**
- Development tools
- Marketing services
- Design resources
- Security audits
- Infrastructure

**Filters**
- Discount percentage
- Category
- Partner type
- Expiration date

### Claiming Rewards

**Step 1: Browse**
Explore available offers.

**Step 2: Select Offer**
Click to view details.

**Step 3: Verify Eligibility**
Some offers require:
- Account level
- Points balance
- Specific activity

**Step 4: Claim**
Click "Claim" to get your code/link.

**Step 5: Use**
Follow partner instructions to redeem.

### Featured Partners

| Partner | Offer Type |
|---------|------------|
| Dev Tools | Development software |
| Marketing | Ad credits |
| Security | Audit discounts |
| Hosting | Infrastructure |

### Partner Levels

**Basic Offers**
Available to all users.

**Premium Offers**
Require premium membership.

**Exclusive Offers**
Limited availability.

### For Partners

Want to list your offer?
- Contact our partnerships team
- Submit your offer
- Get featured to our community

### Terms

- Offers subject to availability
- Partner terms apply
- Some require verification
- Limited redemptions

> 💡 **Tip**: Check regularly for new offers and limited-time deals.
    `,
    prevPage: { id: 'affiliate-program', title: 'Affiliate Program' },
    nextPage: { id: 'bot-setup', title: 'Telegram Bot Setup' },
  },
  
  // Telegram Bot
  botSetup: {
    title: 'Telegram Bot Setup',
    description: 'Set up the Aquads Bump Bot for raids, voting, and boosting your meme coin.',
    mockup: <TelegramBotMockup />,
    content: `
## Telegram Bot Setup

The Aquads Bump Bot helps meme coin projects grow through coordinated raids, voting, and trending features.

### Finding the Bot

Search in Telegram:
\`@aquadsbumpbot\`

Or click: [t.me/aquadsbumpbot](https://t.me/aquadsbumpbot)

### Initial Setup

**Step 1: Start the Bot**
Click "Start" or send \`/start\` to begin onboarding.

**Step 2: Link Your Account**
Connect your Aquads account:
\`/link your_username\`

**Step 3: Set Twitter Handle**
Required for raid verification:
\`/twitter your_handle\`

**Step 4: Set Facebook Handle (Optional)**
For Facebook raid participation:
\`/facebook your_handle\`

### What You Get (Free)

- ✅ 5 FREE raid posts daily
- ✅ Complete raids & earn 20 points each
- ✅ Vote on projects (earn 20 pts per first vote)
- ✅ View top 10 bubble rankings
- ✅ Create extra raids (2000 pts each after free daily)

### Premium Features (List & Bump Required)

When you list and bump your project:
- 🔥 Trending across Aquads homepage
- 🔥 BEX trending section visibility
- 🔥 Bubble ranking boost
- 🔥 5K+ trending channel exposure
- 🔥 Custom branding on vote notifications
- 🔥 Vote + Member boost packages

### Adding Bot to Your Group

1. Invite @aquadsbumpbot to your TG group
2. Raids will be shared directly to your community
3. Use \`/raidin\` to opt-in to community raid network
4. Use \`/raidout\` to opt-out anytime

### Points System

- **Earn**: 20 points per raid completion
- **Earn**: 20 points per first vote on each project
- **Spend**: 2000 points for additional raids
- **Redeem**: $100 CAD per 10,000 points

> 💡 **Tip**: Start with /help to see the interactive menu with all features.
    `,
    prevPage: { id: 'partner-rewards', title: 'Partner Rewards' },
    nextPage: { id: 'bot-commands', title: 'Bot Commands' },
  },
  
  botCommands: {
    title: 'Bot Commands',
    description: 'Complete list of Aquads Bump Bot commands.',
    content: `
## Bot Commands

Full reference of all 16 commands available in @aquadsbumpbot.

### Account Commands

| Command | Description |
|---------|-------------|
| \`/start\` | Begin onboarding and link your account |
| \`/link username\` | Connect your Telegram to Aquads account |
| \`/twitter handle\` | Set your Twitter username for raids |
| \`/facebook handle\` | Set your Facebook username for raids |
| \`/help\` | View interactive menu with all features |
| \`/cancel\` | Cancel any ongoing operation |

### Raid Commands

| Command | Description |
|---------|-------------|
| \`/raids\` | View all available Twitter & Facebook raids |
| \`/createraid URL\` | Create a Twitter raid (5 FREE daily, then 2000 pts) |
| \`/cancelraid URL\` | Cancel a raid you created |

### Bubble & Voting Commands

| Command | Description |
|---------|-------------|
| \`/bubbles\` | View top 10 bubbles by bullish votes |
| \`/mybubble\` | View YOUR projects with voting buttons |
| \`/boostvote\` | Purchase vote + member boost packages |

### Branding Commands

| Command | Description |
|---------|-------------|
| \`/setbranding\` | Upload custom branding image (bumped projects only) |
| \`/removebranding\` | Remove your custom branding |

### Group Commands

| Command | Description |
|---------|-------------|
| \`/raidin\` | Opt-in your group to community raid sharing |
| \`/raidout\` | Opt-out your group from community raids |

### Command Examples

**Creating a Raid:**
\`\`\`
/createraid https://twitter.com/yourproject/status/123456789
\`\`\`

**Linking Account:**
\`\`\`
/link myaquadsusername
\`\`\`

**Setting Twitter:**
\`\`\`
/twitter myhandle
\`\`\`

> 💡 **Tip**: Use /help to see an interactive menu with buttons for quick access to all features.
    `,
    prevPage: { id: 'bot-setup', title: 'Telegram Bot Setup' },
    nextPage: { id: 'bot-features', title: 'Bot Features' },
  },
  
  botFeatures: {
    title: 'Bot Features',
    description: 'Core features of the Aquads Bump Bot for meme coin projects.',
    content: `
## Bot Features

The Aquads Bump Bot is built specifically for meme coin projects to grow their community and visibility.

### Twitter & Facebook Raids

**How Raids Work:**
1. Project owners create raids with tweet/post URLs
2. Community members complete raids (like, RT, comment)
3. Completions are admin-verified
4. Participants earn 20 points per completion

**Raid Details:**
- 5 FREE raid posts per day
- Additional raids cost 2000 points each
- Raids auto-expire after 48 hours
- Support both Twitter and Facebook

### Voting System

**Bullish vs Bearish:**
- Click 👍 (Bullish) or 👎 (Bearish) on any project
- First vote on each project earns 20 points
- Votes affect bubble rankings
- Projects with more bullish votes trend higher

### Bubble Rankings & Trending

**Multi-Platform Visibility:**
- **Aquads Homepage**: Bumped projects appear in trending
- **BEX Trending Section**: Featured visibility
- **Bubble Leaderboards**: Ranked by bullish votes
- **5K+ Trending Channel**: Vote notifications reach thousands

Use \`/bubbles\` to see top 10 and \`/mybubble\` to manage your projects.

### Vote + Member Boost Packages

Purchase boosts via \`/boostvote\`:

| Package | Votes + Members | Price | Discount |
|---------|-----------------|-------|----------|
| Starter | 100 | $20 USDC | - |
| Basic | 250 | $40 USDC | 20% OFF |
| Growth | 500 | $80 USDC | 20% OFF |
| Pro | 1000 | $150 USDC | 25% OFF |

**Every package includes:**
- Guaranteed bullish votes
- Real Telegram group members
- Vote notifications to trending channel

### Custom Branding

**For Bumped Projects:**
- Upload your logo/image (max 500KB, JPG/PNG)
- Your branding appears on vote notifications
- Notifications go to 5K+ member trending channel
- Set with \`/setbranding\`, remove with \`/removebranding\`

### Community Raid Network

**Cross-Group Sharing:**
- \`/raidin\` - Opt your group into the network
- \`/raidout\` - Opt out anytime
- Raids shared across all participating groups
- Multiply your reach beyond your own community

### Points Economy

| Action | Points |
|--------|--------|
| Complete a raid | +20 pts |
| First vote on project | +20 pts |
| Create extra raid | -2000 pts |
| Redeem for cash | 10,000 pts = $100 CAD |

> 💡 **Tip**: List and bump your project on Aquads to unlock premium features like trending visibility and custom branding.
    `,
    prevPage: { id: 'bot-commands', title: 'Bot Commands' },
    nextPage: { id: 'browser-extension', title: 'Browser Extension' },
  },
  
  // Advanced
  browserExtension: {
    title: 'Browser Extension',
    description: 'Install and use the Aquads browser extension.',
    content: `
## Browser Extension

Enhance your browsing with the Aquads extension.

### Features

- Quick access to Aquads
- Price overlays on pages
- Wallet connection
- Notification badges
- One-click actions

### Installation

**Chrome**
1. Visit Chrome Web Store
2. Search "Aquads"
3. Click "Add to Chrome"
4. Confirm installation

**Firefox**
Coming soon

**Brave**
Same as Chrome process

### Setup

**Step 1: Install**
Add extension to browser.

**Step 2: Sign In**
Click extension icon and log in.

**Step 3: Configure**
Set your preferences:
- Enable/disable overlays
- Notification settings
- Quick actions

### Using the Extension

**Quick Menu**
Click the icon to access:
- Dashboard link
- Quick search
- Notifications
- Shortcuts

**Page Integration**
When browsing:
- Token prices appear
- Project info overlays
- Quick voting

### Features in Detail

**Price Overlay**
See token prices when:
- Browsing DEX Screener
- Viewing CoinGecko
- Twitter mentions

**Quick Actions**
- List project
- Create service
- Check dashboard
- Access settings

### Notifications

Receive desktop notifications for:
- New bookings
- Payments
- Raids
- Messages

### Privacy

The extension:
- Doesn't track browsing
- Only activates on relevant sites
- Secure authentication
- Data stays local

### Troubleshooting

**Extension Not Working**
- Check if enabled
- Try reinstalling
- Clear browser cache
- Update browser

> 💡 **Tip**: Pin the extension for quick access to all features.
    `,
    prevPage: { id: 'bot-features', title: 'Bot Features' },
    nextPage: { id: 'embed-widgets', title: 'Embed Widgets' },
  },
  
  embedWidgets: {
    title: 'Embed Widgets',
    description: 'Add Aquads widgets to your website.',
    content: `
## Embed Widgets

Add Aquads functionality to your website with embed widgets.

### Available Widgets

**AquaSwap Widget**
Embed token swapping on your site.

**Price Ticker**
Display live token prices.

**Voting Widget**
Let users vote from your site.

### AquaSwap Embed

Add swap functionality:

\`\`\`html
<iframe 
  src="https://aquads.xyz/embed/aquaswap"
  width="400"
  height="600"
  frameborder="0"
  allow="clipboard-write"
/>
\`\`\`

**Customization Options**
- \`?defaultFrom=ETH\`
- \`?defaultTo=SOL\`
- \`?theme=dark\`

### Price Widget

Display token prices:

\`\`\`html
<iframe 
  src="https://aquads.xyz/embed/price?token=SOL"
  width="300"
  height="80"
  frameborder="0"
/>
\`\`\`

### Styling Options

| Parameter | Options |
|-----------|---------|
| theme | light, dark |
| border | true, false |
| rounded | true, false |
| color | hex code |

### Integration Guide

**Step 1: Choose Widget**
Select the widget you need.

**Step 2: Configure**
Set your parameters.

**Step 3: Get Code**
Copy the embed code.

**Step 4: Add to Site**
Paste into your HTML.

### Responsive Design

Widgets are responsive:
- Adapt to container
- Mobile-friendly
- Consistent experience

### Best Practices

- Use HTTPS
- Set appropriate dimensions
- Test on mobile
- Monitor performance

### Support

For widget issues:
- Check documentation
- Test embed URL directly
- Contact support

> 💡 **Tip**: Use the AquaSwap widget to add swap functionality without building your own.
    `,
    prevPage: { id: 'browser-extension', title: 'Browser Extension' },
    nextPage: { id: 'api-integration', title: 'API Integration' },
  },
  
  apiIntegration: {
    title: 'API Integration',
    description: 'Integrate with Aquads programmatically.',
    content: `
## API Integration

Access Aquads data and features programmatically.

### API Overview

The Aquads API allows you to:
- Fetch token data
- Access market information
- Integrate with your applications
- Automate workflows

### Authentication

Some endpoints require authentication:

\`\`\`javascript
const headers = {
  'Authorization': 'Bearer YOUR_API_TOKEN',
  'Content-Type': 'application/json'
};
\`\`\`

Get your API token from Dashboard > Settings > API.

### Public Endpoints

**Get Token List**
\`\`\`
GET /api/tokens
\`\`\`

**Get Token Details**
\`\`\`
GET /api/tokens/:id
\`\`\`

**Get Trending**
\`\`\`
GET /api/tokens/trending
\`\`\`

### Authenticated Endpoints

**User Profile**
\`\`\`
GET /api/user/profile
\`\`\`

**User Services**
\`\`\`
GET /api/user/services
\`\`\`

### Rate Limits

| Plan | Requests/Hour |
|------|---------------|
| Free | 100 |
| Basic | 1,000 |
| Pro | 10,000 |
| Enterprise | Unlimited |

### Response Format

All responses are JSON:

\`\`\`json
{
  "success": true,
  "data": { ... },
  "timestamp": "2024-01-01T00:00:00Z"
}
\`\`\`

### Error Handling

Error responses include:
- Error code
- Message
- Details (if applicable)

\`\`\`json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid API token"
  }
}
\`\`\`

### SDKs

Coming soon:
- JavaScript SDK
- Python SDK
- More languages

### Support

For API questions:
- Read full documentation
- Check status page
- Contact developer support

> 💡 **Tip**: Start with public endpoints to test integration before adding authentication.
    `,
    prevPage: { id: 'embed-widgets', title: 'Embed Widgets' },
    nextPage: { id: 'premium-features', title: 'Premium Features' },
  },
  
  premiumFeatures: {
    title: 'Premium Features',
    description: 'Unlock advanced features with Premium membership.',
    content: `
## Premium Features

Unlock the full power of Aquads with Premium membership.

### What's Included

**Profile Enhancements**
- ✅ Verified badge
- ✅ Priority in search
- ✅ Custom profile URL
- ✅ Enhanced analytics

**Token Features**
- ✅ Larger default bubble
- ✅ Priority placement
- ✅ Bump discounts
- ✅ Advanced analytics

**Freelancer Benefits**
- ✅ Featured listings
- ✅ Lower platform fees
- ✅ Premium badge
- ✅ Priority support

**Additional Perks**
- ✅ Early access to features
- ✅ Exclusive Discord channel
- ✅ Partner discounts
- ✅ Monthly rewards

### Pricing

| Plan | Duration | Price |
|------|----------|-------|
| Monthly | 1 month | 0.05 SOL |
| Quarterly | 3 months | 0.12 SOL |
| Annual | 12 months | 0.4 SOL |

### How to Upgrade

**Step 1: Navigate**
Go to Dashboard > Premium

**Step 2: Choose Plan**
Select your preferred duration.

**Step 3: Payment**
Connect wallet and pay.

**Step 4: Activate**
Premium features instant!

### Premium Badge

Display your verified status:
- Shown on profile
- Visible in search
- On all listings
- In conversations

### ROI Analysis

Premium pays for itself through:
- Increased visibility
- More bookings
- Lower fees
- Better conversion

### Cancellation

- Cancel anytime
- No refunds for partial periods
- Features until expiry
- Reactivate anytime

### Enterprise

For teams and businesses:
- Multiple accounts
- Custom features
- Dedicated support
- Volume discounts

Contact: enterprise@aquads.xyz

> 💡 **Tip**: The annual plan saves you 33% compared to monthly.
    `,
    prevPage: { id: 'api-integration', title: 'API Integration' },
  },
};

// Callout component for tips, warnings, etc.
const Callout = ({ type = 'info', children }) => {
  const icons = {
    tip: <FaLightbulb />,
    warning: <FaExclamationTriangle />,
    info: <FaInfoCircle />,
    success: <FaCheckCircle />,
  };
  
  const colors = {
    tip: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/50 text-emerald-300',
    warning: 'from-amber-500/20 to-amber-600/10 border-amber-500/50 text-amber-300',
    info: 'from-blue-500/20 to-blue-600/10 border-blue-500/50 text-blue-300',
    success: 'from-green-500/20 to-green-600/10 border-green-500/50 text-green-300',
  };
  
  return (
    <div className={`callout bg-gradient-to-r ${colors[type]} border-l-4 p-4 rounded-r-lg my-4`}>
      <div className="flex items-start gap-3">
        <span className="text-lg mt-0.5">{icons[type]}</span>
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
};

// Main Documentation component
const Documentation = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSections, setExpandedSections] = useState(['getting-started']);
  const [activePage, setActivePage] = useState('what-is-aquads');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [searchResults, setSearchResults] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const contentRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

  // Handle URL-based navigation
  useEffect(() => {
    const hash = location.hash.replace('#', '');
    if (hash && documentationContent[hash.replace(/-/g, '')]) {
      setActivePage(hash);
      // Find and expand parent section
      documentationStructure.forEach(section => {
        const child = section.children.find(c => c.id === hash);
        if (child) {
          setExpandedSections(prev => [...new Set([...prev, section.id])]);
        }
      });
    }
  }, [location.hash]);

  // Update URL when page changes
  useEffect(() => {
    if (activePage) {
      navigate(`/docs#${activePage}`, { replace: true });
    }
  }, [activePage, navigate]);

  // Search functionality
  useEffect(() => {
    if (searchQuery.trim()) {
      const results = [];
      documentationStructure.forEach(section => {
        section.children.forEach(child => {
          const content = documentationContent[child.content];
          if (content) {
            const titleMatch = content.title.toLowerCase().includes(searchQuery.toLowerCase());
            const contentMatch = content.content.toLowerCase().includes(searchQuery.toLowerCase());
            if (titleMatch || contentMatch) {
              results.push({
                id: child.id,
                title: content.title,
                section: section.title,
                preview: content.description,
              });
            }
          }
        });
      });
      setSearchResults(results);
      setShowSearch(true);
    } else {
      setSearchResults([]);
      setShowSearch(false);
    }
  }, [searchQuery]);

  // Toggle section expansion
  const toggleSection = (sectionId) => {
    setExpandedSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  // Navigate to a page
  const goToPage = (pageId) => {
    setActivePage(pageId);
    setSearchQuery('');
    setShowSearch(false);
    setIsSidebarOpen(false);
    contentRef.current?.scrollTo(0, 0);
  };

  // Get current page content
  const getCurrentContent = () => {
    for (const section of documentationStructure) {
      const page = section.children.find(c => c.id === activePage);
      if (page) {
        return documentationContent[page.content];
      }
    }
    return documentationContent.whatIsAquads;
  };

  const currentContent = getCurrentContent();

  // Copy code block
  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
  };

  // Render markdown-like content
  const renderContent = (content) => {
    const lines = content.trim().split('\n');
    const elements = [];
    let inCodeBlock = false;
    let codeContent = '';
    let codeLanguage = '';
    let inTable = false;
    let tableRows = [];
    let inList = false;
    let listItems = [];
    
    lines.forEach((line, index) => {
      // Code blocks
      if (line.startsWith('```')) {
        if (inCodeBlock) {
          elements.push(
            <div key={`code-${index}`} className="code-block-container my-4">
              <div className="code-block-header flex justify-between items-center px-4 py-2 bg-gray-800 rounded-t-lg border-b border-gray-700">
                <span className="text-xs text-gray-400 uppercase">{codeLanguage || 'code'}</span>
                <button 
                  onClick={() => copyCode(codeContent)}
                  className="text-gray-400 hover:text-white transition-colors"
                  title="Copy code"
                >
                  <FaCopy size={14} />
                </button>
              </div>
              <pre className="bg-gray-900 p-4 rounded-b-lg overflow-x-auto">
                <code className="text-sm text-gray-300">{codeContent.trim()}</code>
              </pre>
            </div>
          );
          codeContent = '';
          inCodeBlock = false;
        } else {
          inCodeBlock = true;
          codeLanguage = line.replace('```', '').trim();
        }
        return;
      }
      
      if (inCodeBlock) {
        codeContent += line + '\n';
        return;
      }

      // Tables
      if (line.startsWith('|')) {
        if (!inTable) {
          inTable = true;
          tableRows = [];
        }
        if (!line.includes('---')) {
          tableRows.push(line.split('|').filter(cell => cell.trim()).map(cell => cell.trim()));
        }
        return;
      } else if (inTable) {
        elements.push(
          <div key={`table-${index}`} className="overflow-x-auto my-4">
            <table className="doc-table w-full">
              <thead>
                <tr>
                  {tableRows[0]?.map((cell, i) => (
                    <th key={i} className="text-left px-4 py-2 bg-gray-800 text-cyan-400 font-medium border-b border-gray-700">
                      {cell}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableRows.slice(1).map((row, rowIndex) => (
                  <tr key={rowIndex} className="border-b border-gray-800 hover:bg-gray-800/50">
                    {row.map((cell, cellIndex) => (
                      <td key={cellIndex} className="px-4 py-2 text-gray-300">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        inTable = false;
        tableRows = [];
      }

      // Headings
      if (line.startsWith('## ')) {
        elements.push(
          <h2 key={`h2-${index}`} className="text-2xl font-bold text-white mt-8 mb-4 pb-2 border-b border-gray-700">
            {line.replace('## ', '')}
          </h2>
        );
        return;
      }
      
      if (line.startsWith('### ')) {
        elements.push(
          <h3 key={`h3-${index}`} className="text-xl font-semibold text-cyan-400 mt-6 mb-3">
            {line.replace('### ', '')}
          </h3>
        );
        return;
      }

      // Callouts
      if (line.startsWith('> 💡')) {
        elements.push(
          <Callout key={`callout-${index}`} type="tip">
            {line.replace('> 💡 **Tip**:', '').replace('> 💡', '').trim()}
          </Callout>
        );
        return;
      }
      
      if (line.startsWith('> ⚠️')) {
        elements.push(
          <Callout key={`callout-${index}`} type="warning">
            {line.replace('> ⚠️ **Warning**:', '').replace('> ⚠️ **Important**:', '').replace('> ⚠️ **Note**:', '').replace('> ⚠️ **Disclaimer**:', '').replace('> ⚠️', '').trim()}
          </Callout>
        );
        return;
      }

      // Lists
      if (line.startsWith('- ') || line.startsWith('* ')) {
        if (!inList) {
          inList = true;
          listItems = [];
        }
        listItems.push(line.replace(/^[-*] /, ''));
        return;
      } else if (inList && line.trim() === '') {
        elements.push(
          <ul key={`list-${index}`} className="list-disc list-inside space-y-2 my-4 text-gray-300">
            {listItems.map((item, i) => (
              <li key={i}>{renderInlineFormatting(item)}</li>
            ))}
          </ul>
        );
        inList = false;
        listItems = [];
      } else if (inList) {
        elements.push(
          <ul key={`list-${index}`} className="list-disc list-inside space-y-2 my-4 text-gray-300">
            {listItems.map((item, i) => (
              <li key={i}>{renderInlineFormatting(item)}</li>
            ))}
          </ul>
        );
        inList = false;
        listItems = [];
      }

      // Numbered lists
      const numberedMatch = line.match(/^(\d+)\. /);
      if (numberedMatch) {
        elements.push(
          <div key={`num-${index}`} className="flex gap-3 my-2 text-gray-300">
            <span className="text-cyan-400 font-bold">{numberedMatch[1]}.</span>
            <span>{renderInlineFormatting(line.replace(/^\d+\. /, ''))}</span>
          </div>
        );
        return;
      }

      // Bold headers (like **Step 1:**)
      if (line.startsWith('**') && line.endsWith('**')) {
        elements.push(
          <p key={`bold-${index}`} className="font-bold text-white mt-4 mb-2">
            {line.replace(/\*\*/g, '')}
          </p>
        );
        return;
      }

      // Regular paragraphs
      if (line.trim() && !line.startsWith('|')) {
        elements.push(
          <p key={`p-${index}`} className="text-gray-300 my-3 leading-relaxed">
            {renderInlineFormatting(line)}
          </p>
        );
      }
    });

    // Handle remaining list items
    if (inList && listItems.length > 0) {
      elements.push(
        <ul key="list-final" className="list-disc list-inside space-y-2 my-4 text-gray-300">
          {listItems.map((item, i) => (
            <li key={i}>{renderInlineFormatting(item)}</li>
          ))}
        </ul>
      );
    }

    return elements;
  };

  // Render inline formatting (bold, italic, code, links)
  const renderInlineFormatting = (text) => {
    // Handle inline code
    let parts = text.split(/(`[^`]+`)/g);
    return parts.map((part, i) => {
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code key={i} className="bg-gray-800 text-cyan-400 px-1.5 py-0.5 rounded text-sm font-mono">
            {part.slice(1, -1)}
          </code>
        );
      }
      // Handle bold
      let boldParts = part.split(/(\*\*[^*]+\*\*)/g);
      return boldParts.map((boldPart, j) => {
        if (boldPart.startsWith('**') && boldPart.endsWith('**')) {
          return <strong key={`${i}-${j}`} className="text-white">{boldPart.slice(2, -2)}</strong>;
        }
        // Handle links
        const linkMatch = boldPart.match(/\[([^\]]+)\]\(([^)]+)\)/);
        if (linkMatch) {
          return (
            <a 
              key={`${i}-${j}`}
              href={linkMatch[2]}
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-400 hover:text-cyan-300 underline"
            >
              {linkMatch[1]} <FaExternalLinkAlt className="inline text-xs" />
            </a>
          );
        }
        return boldPart;
      });
    });
  };

  return (
    <div className={`documentation-container min-h-screen ${isDarkMode ? 'dark bg-gray-950' : 'bg-white'}`}>
      <Helmet>
        <title>{currentContent?.title || 'Documentation'} - Aquads Docs</title>
        <meta name="description" content={currentContent?.description || 'Aquads platform documentation'} />
      </Helmet>

      {/* Header */}
      <header className="doc-header fixed top-0 left-0 right-0 h-16 bg-gray-900/95 backdrop-blur-md border-b border-gray-800 z-50 flex items-center px-4">
        <div className="flex items-center gap-4 flex-1">
          {/* Mobile menu button */}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="lg:hidden text-gray-400 hover:text-white p-2"
          >
            {isSidebarOpen ? <FaTimes size={20} /> : <FaBars size={20} />}
          </button>

          {/* Logo */}
          <Link to="/home" className="flex items-center gap-2">
            <img src="/Aquadsnewlogo.png" alt="Aquads" className="h-8" />
            <span className="text-gray-400 text-sm hidden sm:inline">/ Docs</span>
          </Link>

          {/* Search */}
          <div className="relative flex-1 max-w-md mx-4">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Search documentation..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-colors"
            />
            
            {/* Search Results Dropdown */}
            <AnimatePresence>
              {showSearch && searchResults.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute top-full left-0 right-0 mt-2 bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-h-96 overflow-y-auto z-50"
                >
                  {searchResults.map((result) => (
                    <button
                      key={result.id}
                      onClick={() => goToPage(result.id)}
                      className="w-full text-left px-4 py-3 hover:bg-gray-700 border-b border-gray-700 last:border-0 transition-colors"
                    >
                      <div className="text-sm text-cyan-400">{result.section}</div>
                      <div className="text-white font-medium">{result.title}</div>
                      <div className="text-gray-400 text-sm truncate">{result.preview}</div>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="text-gray-400 hover:text-white p-2"
            title="Toggle theme"
          >
            {isDarkMode ? <FaSun size={18} /> : <FaMoon size={18} />}
          </button>
          <Link
            to="/home"
            className="hidden sm:flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm"
          >
            <FaHome /> Back to Aquads
          </Link>
        </div>
      </header>

      {/* Sidebar Overlay for Mobile */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`doc-sidebar fixed top-16 left-0 bottom-0 w-72 bg-gray-900 border-r border-gray-800 overflow-y-auto z-40 transform transition-transform lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <nav className="p-4">
          {documentationStructure.map((section) => (
            <div key={section.id} className="mb-2">
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full flex items-center justify-between px-3 py-2 text-left rounded-lg hover:bg-gray-800 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <section.icon className="text-cyan-400" />
                  <span className="text-gray-200 font-medium">{section.title}</span>
                </div>
                <motion.div
                  animate={{ rotate: expandedSections.includes(section.id) ? 90 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <FaChevronRight className="text-gray-500 text-sm" />
                </motion.div>
              </button>
              
              <AnimatePresence>
                {expandedSections.includes(section.id) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    {section.children.map((child) => (
                      <button
                        key={child.id}
                        onClick={() => goToPage(child.id)}
                        className={`w-full text-left pl-12 pr-3 py-2 text-sm rounded-lg transition-colors ${
                          activePage === child.id 
                            ? 'bg-cyan-500/20 text-cyan-400 border-l-2 border-cyan-400' 
                            : 'text-gray-400 hover:text-white hover:bg-gray-800'
                        }`}
                      >
                        {child.title}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main 
        ref={contentRef}
        className="doc-content absolute top-16 left-0 right-0 lg:left-72 bottom-0 overflow-y-auto"
      >
        <div className="max-w-4xl mx-auto px-6 py-8">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
            <Link to="/docs" className="hover:text-cyan-400">Docs</Link>
            <FaChevronRight className="text-xs" />
            {documentationStructure.map(section => {
              const page = section.children.find(c => c.id === activePage);
              if (page) {
                return (
                  <React.Fragment key={section.id}>
                    <span className="hover:text-cyan-400 cursor-pointer" onClick={() => toggleSection(section.id)}>
                      {section.title}
                    </span>
                    <FaChevronRight className="text-xs" />
                    <span className="text-cyan-400">{page.title}</span>
                  </React.Fragment>
                );
              }
              return null;
            })}
          </div>

          {/* Page Title */}
          <motion.div
            key={activePage}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <h1 className="text-4xl font-bold text-white mb-4">{currentContent?.title}</h1>
            <p className="text-xl text-gray-400 mb-8">{currentContent?.description}</p>
            
            {/* Mockup Component - Shown first for visual reference */}
            {currentContent?.mockup && (
              <div className="mb-8">
                {currentContent.mockup}
              </div>
            )}

            {/* Content */}
            <div className="doc-content-body prose prose-invert max-w-none">
              {renderContent(currentContent?.content || '')}
            </div>

            {/* Navigation */}
            <div className="flex justify-between items-center mt-12 pt-8 border-t border-gray-800">
              {currentContent?.prevPage ? (
                <button
                  onClick={() => goToPage(currentContent.prevPage.id)}
                  className="flex items-center gap-2 text-gray-400 hover:text-cyan-400 transition-colors"
                >
                  <FaChevronLeft />
                  <div className="text-left">
                    <div className="text-xs text-gray-500">Previous</div>
                    <div>{currentContent.prevPage.title}</div>
                  </div>
                </button>
              ) : <div />}
              
              {currentContent?.nextPage ? (
                <button
                  onClick={() => goToPage(currentContent.nextPage.id)}
                  className="flex items-center gap-2 text-gray-400 hover:text-cyan-400 transition-colors"
                >
                  <div className="text-right">
                    <div className="text-xs text-gray-500">Next</div>
                    <div>{currentContent.nextPage.title}</div>
                  </div>
                  <FaChevronRight />
                </button>
              ) : <div />}
            </div>
          </motion.div>

          {/* Footer */}
          <footer className="mt-16 pt-8 border-t border-gray-800 text-center text-gray-500 text-sm">
            <p>© {new Date().getFullYear()} Aquads. All rights reserved.</p>
            <p className="mt-2">
              Need help? <a href="mailto:aquads.info@gmail.com" className="text-cyan-400 hover:underline">Contact Support</a>
            </p>
          </footer>
        </div>
      </main>
    </div>
  );
};

export default Documentation;

