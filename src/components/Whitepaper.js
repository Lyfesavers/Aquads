import React from 'react';
import { Link } from 'react-router-dom';

const Whitepaper = () => {
  return (
    <div className="h-screen overflow-y-auto text-white">
      {/* Fixed Background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-black to-black"></div>
        <div className="tech-lines"></div>
        <div className="tech-dots"></div>
      </div>

      {/* Fixed Navigation */}
      <nav className="sticky top-0 bg-gray-800/80 backdrop-blur-sm shadow-lg shadow-blue-500/20 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Link to="/home" className="flex items-center">
                <img 
                  src="/Aquadsnewlogo.png" 
                  alt="AQUADS" 
                  className="w-auto filter drop-shadow-lg"
                  style={{height: '2rem', filter: 'drop-shadow(0 0 10px rgba(59, 130, 246, 0.6))'}}
                />
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 py-8">
        <div className="prose prose-invert">
          <h1 className="text-4xl font-bold mb-4">Aquads Business Plan</h1>

          <h2 className="text-2xl mb-8">All-in-One Web3 Crypto Hub, Freelancer Marketplace, and Game Hub</h2>
          <p className="text-yellow-400 italic mb-8">(Note: This is not a token project – no crypto tokens will ever be created.)</p>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">1. Executive Summary</h2>
            <p className="mb-4">
              Aquads is an innovative platform built to serve the rapidly growing Web3 ecosystem by integrating three core components:
            </p>
            <ul className="list-disc pl-6 mb-4">
              <li>A Dynamic Advertising System tailored for crypto projects</li>
              <li>A specialized Freelancer Marketplace connecting Web3 professionals with crypto projects</li>
              <li>A Token Information Hub offering real-time cryptocurrency insights</li>
            </ul>
            <p className="mb-4">
              In addition, Aquads has expanded its offerings with new features:
            </p>
            <ul className="list-disc pl-6 mb-4">
              <li>A dedicated Game Hub for crypto and blockchain gaming projects</li>
              <li>An extensive How-To & Blog Page with valuable articles and tutorials</li>
              <li>A robust Booking System complete with watermarking for sent images, enhancing security and professionalism</li>
              <li>An upgraded Internal Messaging System with payment functionality (coming soon)</li>
              <li>A new Twitter Raid Feature that rewards users with points for engaging with Twitter posts</li>
              <li><strong>Industry-First Trust Score & Risk Gauge System</strong> - A comprehensive freelancer vetting algorithm that evaluates ratings, completion rates, KYC status, and verified skills</li>
              <li><strong>World's First On-Chain Freelancer Resume</strong> - Blockchain-verified credentials using Ethereum Attestation Service (EAS) on Base, enabling portable, tamper-proof professional reputation</li>
              <li><strong>AquaPay - Multi-Chain Payment Link System</strong> - A non-custodial payment solution with competitive 0.5% transaction fees enabling users to receive cryptocurrency payments via personalized payment links across 8+ blockchain networks</li>
            </ul>
            

            
            <p>Our mission is to bridge the gap between crypto projects, service providers, and the broader Web3 community while providing an integrated suite of tools designed to drive growth, foster transparency, and empower all users within the ecosystem.</p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">2. Business Description</h2>
            <h3 className="text-xl font-semibold mb-3">2.1. Problem Statement</h3>
            <p className="mb-2">The Web3 space is expanding rapidly, yet the ecosystem lacks a unified platform that:</p>
            <ul className="list-disc pl-6 mb-4">
              <li>Provides specialized services in areas such as smart contract development, security audits, marketing, and community management.</li>
              <li>Integrates dynamic advertising solutions specifically designed for crypto projects.</li>
              <li>Offers real-time token data and market insights in a centralized, community-driven resource.</li>
              <li>Caters to the growing demand in blockchain gaming, empowering game developers and enthusiasts.</li>
              <li>Enables seamless, low-cost cryptocurrency payments without custodial risks or high transaction fees.</li>
              <li>Supports multi-chain payment processing, allowing users to receive payments across different blockchain networks through a single interface.</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3">2.2. The Aquads Solution</h3>
            <p className="mb-2">Aquads combines a suite of interrelated features into one platform:</p>
            
            <div className="mb-4">
              <h4 className="text-lg font-semibold mb-2">Dynamic Advertising System:</h4>
              <ul className="list-disc pl-6 mb-4">
                <li>Interactive ad displays, premium bump mechanisms, and real-time ad management that increase project visibility.</li>
              </ul>
            </div>

            <div className="mb-4">
              <h4 className="text-lg font-semibold mb-2">Freelancer Marketplace:</h4>
              <ul className="list-disc pl-6 mb-4">
                <li>A dedicated space for freelancers with verification, integrated reviews, and streamlined service matching.</li>
              </ul>
            </div>

            <div className="mb-4">
              <h4 className="text-lg font-semibold mb-2">Token Information Hub:</h4>
              <ul className="list-disc pl-6 mb-4">
                <li>Real-time tracking of crypto prices, community-driven token reviews, and market analytics.</li>
              </ul>
            </div>

            <div className="mb-4">
              <h4 className="text-lg font-semibold mb-2">New Game Hub:</h4>
              <ul className="list-disc pl-6 mb-4">
                <li>A dedicated section for crypto gaming projects where developers and gamers can connect, share experiences, and collaborate on blockchain-based games.</li>
              </ul>
            </div>

            <div className="mb-4">
              <h4 className="text-lg font-semibold mb-2">How-To & Blog Page:</h4>
              <ul className="list-disc pl-6 mb-4">
                <li>A resource center offering detailed guides, tutorials, and industry insights to help users maximize platform potential.</li>
              </ul>
            </div>

            <div className="mb-4">
              <h4 className="text-lg font-semibold mb-2">Enhanced Booking System & Messaging:</h4>
              <ul className="list-disc pl-6 mb-4">
                <li>Our complete booking system now features watermarking for sent images, ensuring secure and professional communication. The internal messaging system is upgraded—with a payment integration coming soon—to streamline project discussions and transactions.</li>
              </ul>
            </div>

            <div className="mb-4">
              <h4 className="text-lg font-semibold mb-2">Twitter Raid Feature:</h4>
              <ul className="list-disc pl-6 mb-4">
                <li>Users earn points for engaging with Twitter posts, further boosting community participation and platform engagement.</li>
              </ul>
            </div>

            <div className="mb-4">
              <h4 className="text-lg font-semibold mb-2">AquaPay Payment Link System:</h4>
              <ul className="list-disc pl-6 mb-4">
                <li>A revolutionary non-custodial payment solution that enables users to create personalized payment pages and receive cryptocurrency payments directly to their wallets across multiple blockchain networks, with competitive 0.5% transaction fees and real-time notifications.</li>
              </ul>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">3. Market Opportunity & Analysis</h2>
            
            <h3 className="text-xl font-semibold mb-3">3.1. Market Trends</h3>
            <ul className="list-disc pl-6 mb-4">
              <li><strong>Web3 Growth:</strong> Blockchain, cryptocurrency, and decentralized platforms are reshaping how business is done. The increasing demand for specialized freelance talent in this space is driving rapid market expansion.</li>
              <li><strong>Gaming and Blockchain Integration:</strong> The blockchain gaming sector is booming, with a growing number of projects seeking skilled developers and marketers who understand decentralized economies.</li>
              <li><strong>Service Fragmentation:</strong> Currently, crypto projects and Web3 freelancers operate on disparate platforms. Aquads' integrated approach meets the demand for a unified, efficient marketplace.</li>
              <li><strong>Advertising Gaps:</strong> Traditional advertising channels often fail to address the unique needs of crypto projects, creating a niche for dynamic, blockchain-based ad solutions.</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3">3.2. Target Audience</h3>
            <ul className="list-disc pl-6 mb-4">
              <li><strong>Crypto Projects & Gaming Startups:</strong> Seeking reliable advertising and specialized freelance talent.</li>
              <li><strong>Web3 Freelancers & Agencies:</strong> Offering niche services tailored to the blockchain, crypto, and gaming industries.</li>
              <li><strong>Investors & Analysts:</strong> Looking for up-to-date token information and market insights.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">4. Product & Services</h2>
            
            <h3 className="text-xl font-semibold mb-3">4.1. Core Components</h3>
            
            <div className="mb-4">
              <h4 className="text-lg font-semibold mb-2">Dynamic Advertising System:</h4>
              <ul className="list-disc pl-6 mb-4">
                <li><strong>Features:</strong> Dynamic bubble ad sizing, premium bump system, real-time performance analytics, and premium ad banners.</li>
                <li><strong>Benefits:</strong> Boost project visibility with targeted, performance-based advertising.</li>
              </ul>
            </div>

            <div className="mb-4">
              <h4 className="text-lg font-semibold mb-2">Freelancer Marketplace:</h4>
              <ul className="list-disc pl-6 mb-4">
                <li><strong>Features:</strong> Verified service provider profiles, categorized services, integrated reviews, integrated booking system, Trust Score & Risk Gauge vetting system, On-Chain Resume with EAS attestations.</li>
                <li><strong>Benefits:</strong> Streamline the process of finding specialized talent in the Web3 space with unprecedented transparency and verifiable credentials.</li>
              </ul>
            </div>

            <div className="mb-4">
              <h4 className="text-lg font-semibold mb-2">Token Information Hub:</h4>
              <ul className="list-disc pl-6 mb-4">
                <li><strong>Features:</strong> Real-time crypto tracking, community token reviews, market trend analysis.</li>
                <li><strong>Benefits:</strong> Empower users with data to make informed decisions.</li>
              </ul>
            </div>

            <div className="mb-4">
              <h4 className="text-lg font-semibold mb-2">Game Hub:</h4>
              <ul className="list-disc pl-6 mb-4">
                <li><strong>Features:</strong> Dedicated gaming project listings, forums for gamers, voting and developers, NFT asset showcases.</li>
                <li><strong>Benefits:</strong> Foster collaboration and innovation in blockchain gaming.</li>
              </ul>
            </div>

            <div className="mb-4">
              <h4 className="text-lg font-semibold mb-2">How-To & Blog Page:</h4>
              <ul className="list-disc pl-6 mb-4">
                <li><strong>Features:</strong> Comprehensive guides, industry insights, and actionable tips.</li>
                <li><strong>Benefits:</strong> Educate users and build a community of informed, engaged professionals.</li>
              </ul>
            </div>

            <div className="mb-4">
              <h4 className="text-lg font-semibold mb-2">Booking System & Messaging:</h4>
              <ul className="list-disc pl-6 mb-4">
                <li><strong>Features:</strong> Robust project scheduling, secure watermarking for images, and an internal messaging system.</li>
                <li><strong>Benefits:</strong> Enhance communication, security, and workflow efficiency.</li>
              </ul>
            </div>

            <div className="mb-4">
              <h4 className="text-lg font-semibold mb-2">Twitter Raid Feature:</h4>
              <ul className="list-disc pl-6 mb-4">
                <li><strong>Features:</strong> Earn points for engaging with targeted Twitter posts.</li>
                <li><strong>Benefits:</strong> Drive community engagement and reward active participation.</li>
              </ul>
            </div>

            <div className="mb-4">
              <h4 className="text-lg font-semibold mb-2">AquaPay Payment Link System:</h4>
              <ul className="list-disc pl-6 mb-4">
                <li><strong>Features:</strong> Multi-chain payment pages, wallet integration, payment history tracking, real-time notifications, QR code generation, customizable themes, and competitive 0.5% transaction fees.</li>
                <li><strong>Benefits:</strong> Enable seamless cryptocurrency payments for freelancers, creators, and businesses without intermediaries, fees, or custody risks.</li>
              </ul>
            </div>
          </section>

          {/* NEW SECTION: Trust Score & Risk Gauge */}
          <section className="mb-8">
            <div className="bg-gradient-to-r from-green-900/30 to-emerald-900/30 border border-green-500/30 rounded-lg p-6 mb-6">
              <h3 className="text-xl font-bold text-green-400 mb-2">🛡️ Industry Innovation: Comprehensive Freelancer Vetting System</h3>
              <p className="text-gray-200">
                Aquads has developed a sophisticated <strong>Trust Score Algorithm</strong> and <strong>Risk Gauge</strong> system that provides clients with transparent, data-driven insights into freelancer reliability. This multi-factor scoring system goes beyond simple ratings to create a holistic view of freelancer trustworthiness.
              </p>
            </div>

            <h2 className="text-2xl font-bold mb-4">4.2. Trust Score & Risk Gauge System</h2>
            <p className="mb-4">
              Our proprietary Trust Score algorithm aggregates multiple performance indicators to generate a comprehensive reliability score (0-100) for every freelancer on the platform. This score is displayed via our intuitive Risk Gauge component, helping clients make informed hiring decisions.
            </p>

            <h3 className="text-xl font-semibold mb-3">Trust Score Components (100 Points Total)</h3>
            
            <div className="bg-gray-800/50 rounded-lg p-4 mb-4">
              <h4 className="text-lg font-semibold mb-3 text-yellow-400">⭐ Service Rating (50 Points - 50% Weight)</h4>
              <p className="text-gray-300 mb-2">The most heavily weighted factor, reflecting client satisfaction from completed jobs.</p>
              <ul className="list-disc pl-6 text-gray-400">
                <li>4.8-5.0★ rating = 50 points (Exceptional)</li>
                <li>4.5-4.7★ rating = 40 points (Excellent)</li>
                <li>4.0-4.4★ rating = 30 points (Good)</li>
                <li>3.5-3.9★ rating = 15 points (Fair)</li>
                <li>Below 3.5★ = 5 points (Needs Improvement)</li>
                <li>No reviews = 0 points (Unproven)</li>
              </ul>
            </div>

            <div className="bg-gray-800/50 rounded-lg p-4 mb-4">
              <h4 className="text-lg font-semibold mb-3 text-green-400">✅ Job Completion Rate (20 Points - 20% Weight)</h4>
              <p className="text-gray-300 mb-2">Measures reliability by tracking the percentage of accepted jobs completed successfully.</p>
              <ul className="list-disc pl-6 text-gray-400">
                <li>95%+ completion = 20 points</li>
                <li>85-94% completion = 16 points</li>
                <li>75-84% completion = 12 points</li>
                <li>65-74% completion = 6 points</li>
                <li>Below 65% = 2 points</li>
                <li>No history = 4 points (neutral)</li>
              </ul>
            </div>

            <div className="bg-gray-800/50 rounded-lg p-4 mb-4">
              <h4 className="text-lg font-semibold mb-3 text-purple-400">👤 Identity Verification & KYC (20 Points - 20% Weight)</h4>
              <p className="text-gray-300 mb-2">Confirms freelancer identity and professional status through our vetting process.</p>
              <ul className="list-disc pl-6 text-gray-400">
                <li>Registered Freelancer Account = 10 points</li>
                <li>Premium Service (requires KYC verification) = additional 10 points</li>
                <li>Premium listing requires identity verification, ensuring real professionals</li>
              </ul>
            </div>

            <div className="bg-gray-800/50 rounded-lg p-4 mb-4">
              <h4 className="text-lg font-semibold mb-3 text-blue-400">📋 Profile Completeness (5 Points - 5% Weight)</h4>
              <p className="text-gray-300 mb-2">Rewards freelancers who maintain comprehensive professional profiles.</p>
              <ul className="list-disc pl-6 text-gray-400">
                <li>Complete CV with name, summary, experience, education, and skills = 5 points</li>
                <li>Incomplete profile = 0 points</li>
              </ul>
            </div>

            <div className="bg-gray-800/50 rounded-lg p-4 mb-4">
              <h4 className="text-lg font-semibold mb-3 text-orange-400">🏆 Skill Badges (5 Points - 5% Weight)</h4>
              <p className="text-gray-300 mb-2">Recognizes verified skills through our assessment system.</p>
              <ul className="list-disc pl-6 text-gray-400">
                <li>3+ skill badges = 5 points</li>
                <li>1-2 skill badges = 2.5 points</li>
                <li>No badges = 0 points</li>
              </ul>
            </div>

            <h3 className="text-xl font-semibold mb-3">Risk Gauge Visualization</h3>
            <p className="mb-4">The Trust Score is displayed through an intuitive gauge that categorizes freelancers:</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="bg-green-900/30 border border-green-500/30 rounded-lg p-3 text-center">
                <div className="text-2xl mb-1">🟢</div>
                <div className="text-green-400 font-bold">85-100</div>
                <div className="text-sm text-gray-400">Safe to Book</div>
              </div>
              <div className="bg-yellow-900/30 border border-yellow-500/30 rounded-lg p-3 text-center">
                <div className="text-2xl mb-1">🟡</div>
                <div className="text-yellow-400 font-bold">70-84</div>
                <div className="text-sm text-gray-400">Almost Proven</div>
              </div>
              <div className="bg-orange-900/30 border border-orange-500/30 rounded-lg p-3 text-center">
                <div className="text-2xl mb-1">🟠</div>
                <div className="text-orange-400 font-bold">50-69</div>
                <div className="text-sm text-gray-400">Unproven</div>
              </div>
              <div className="bg-red-900/30 border border-red-500/30 rounded-lg p-3 text-center">
                <div className="text-2xl mb-1">🔴</div>
                <div className="text-red-400 font-bold">0-49</div>
                <div className="text-sm text-gray-400">Risky</div>
              </div>
            </div>
          </section>

          {/* NEW SECTION: On-Chain Resume */}
          <section className="mb-8">
            <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-blue-500/30 rounded-lg p-6 mb-6">
              <h3 className="text-xl font-bold text-blue-400 mb-2">⛓️ World's First: On-Chain Freelancer Resume</h3>
              <p className="text-gray-200">
                Aquads proudly introduces the <strong>world's first on-chain freelancer resume system</strong>, allowing professionals to mint their verified credentials as permanent, tamper-proof attestations on the blockchain. This groundbreaking feature bridges traditional freelancing with Web3 technology, creating portable, verifiable proof of professional reputation.
              </p>
            </div>

            <h2 className="text-2xl font-bold mb-4">4.3. On-Chain Resume System</h2>
            
            <h3 className="text-xl font-semibold mb-3">The Problem with Traditional Reputation</h3>
            <ul className="list-disc pl-6 mb-4">
              <li><strong>Platform Lock-in:</strong> Freelancer reputation is trapped within individual platforms and cannot be transferred.</li>
              <li><strong>No Verification:</strong> Clients have no way to verify if credentials are authentic or manipulated.</li>
              <li><strong>Centralized Risk:</strong> Platform shutdowns or account issues can erase years of built reputation.</li>
              <li><strong>Trust Gaps:</strong> When moving between platforms, freelancers start from zero despite years of proven work.</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3">The Aquads Solution: Blockchain-Verified Credentials</h3>
            <p className="mb-4">
              Our On-Chain Resume system leverages the <strong>Ethereum Attestation Service (EAS)</strong> on <strong>Base</strong> (Coinbase's Layer 2) to create permanent, verifiable attestations of freelancer credentials. This is not an NFT or token—it's a signed attestation that can be independently verified by anyone, anywhere.
            </p>

            <h3 className="text-xl font-semibold mb-3">Technology Overview</h3>
            <div className="bg-gray-800/50 rounded-lg p-4 mb-4">
              <p className="text-gray-300 mb-3">
                Our On-Chain Resume system is built on cutting-edge blockchain infrastructure, utilizing Ethereum Layer 2 technology for fast, low-cost transactions. The system leverages industry-standard attestation protocols to create cryptographically signed, verifiable credentials.
              </p>
              <ul className="list-disc pl-6 text-gray-400">
                <li><strong>Layer 2 Blockchain:</strong> Near-zero transaction costs (~$0.01) with instant finality</li>
                <li><strong>Attestation Protocol:</strong> Industry-standard cryptographic verification system</li>
                <li><strong>Proprietary Schema:</strong> Custom-designed data structure capturing comprehensive freelancer metrics</li>
                <li><strong>Hybrid Architecture:</strong> On-chain immutability combined with real-time platform data</li>
              </ul>
            </div>

            <h3 className="text-xl font-semibold mb-3">How It Works</h3>
            <div className="space-y-4 mb-4">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center font-bold">1</div>
                <div>
                  <h4 className="font-semibold text-white">Build Your Reputation</h4>
                  <p className="text-gray-400">Complete jobs, earn ratings, pass skill assessments, and verify your identity on Aquads.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center font-bold">2</div>
                <div>
                  <h4 className="font-semibold text-white">Connect Your Wallet</h4>
                  <p className="text-gray-400">Link any EVM-compatible wallet (MetaMask, Coinbase Wallet, WalletConnect, etc.).</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center font-bold">3</div>
                <div>
                  <h4 className="font-semibold text-white">Mint Your Resume</h4>
                  <p className="text-gray-400">One-click minting creates an EAS attestation with your current Trust Score and credentials. Cost: ~$0.01 in ETH gas.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center font-bold">4</div>
                <div>
                  <h4 className="font-semibold text-white">Share & Verify</h4>
                  <p className="text-gray-400">Get a public resume URL, EAS Explorer link, and Basescan transaction proof. Anyone can verify your credentials independently.</p>
                </div>
              </div>
            </div>

            <h3 className="text-xl font-semibold mb-3">Public Resume Page</h3>
            <p className="mb-4">
              Each minted resume generates a public, shareable page at <code className="bg-gray-800 px-2 py-1 rounded">aquads.xyz/resume/[username]</code> featuring:
            </p>
            <ul className="list-disc pl-6 mb-4">
              <li><strong>Live Trust Score:</strong> Real-time data from Aquads platform</li>
              <li><strong>On-Chain Verified Score:</strong> Immutable record from blockchain</li>
              <li><strong>Score Breakdown:</strong> Expandable details explaining each metric</li>
              <li><strong>Skill Badges:</strong> Verified competencies with assessment scores</li>
              <li><strong>Work Experience:</strong> Professional history from CV</li>
              <li><strong>Education:</strong> Academic credentials</li>
              <li><strong>Active Services:</strong> Current offerings on Aquads</li>
              <li><strong>Verification Links:</strong> Direct links to EAS Explorer and Basescan</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3">Benefits</h3>
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div className="bg-gray-800/50 rounded-lg p-4">
                <h4 className="font-semibold text-green-400 mb-2">For Freelancers</h4>
                <ul className="list-disc pl-4 text-gray-400 text-sm">
                  <li>Portable reputation across platforms</li>
                  <li>Tamper-proof credential verification</li>
                  <li>Stand out with blockchain-verified trust</li>
                  <li>Own your professional data forever</li>
                  <li>No platform can revoke your credentials</li>
                </ul>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-4">
                <h4 className="font-semibold text-blue-400 mb-2">For Employers</h4>
                <ul className="list-disc pl-4 text-gray-400 text-sm">
                  <li>Independently verify credentials</li>
                  <li>No reliance on centralized platforms</li>
                  <li>Cryptographic proof of reputation</li>
                  <li>Historical attestation tracking</li>
                  <li>Reduced hiring risk with verified data</li>
                </ul>
              </div>
            </div>

            <h3 className="text-xl font-semibold mb-3">Why This Matters</h3>
            <p className="mb-4">
              The On-Chain Resume represents a fundamental shift in how professional reputation works. By combining Aquads' comprehensive Trust Score system with blockchain immutability, we've created the first truly portable, verifiable freelancer credential system. This innovation:
            </p>
            <ul className="list-disc pl-6 mb-4">
              <li>Eliminates the "cold start" problem when joining new platforms</li>
              <li>Creates accountability through permanent, public records</li>
              <li>Bridges Web2 freelancing with Web3 verification standards</li>
              <li>Establishes a new paradigm for professional reputation</li>
            </ul>
          </section>

          {/* NEW SECTION: AquaPay */}
          <section className="mb-8">
            <div className="bg-gradient-to-r from-cyan-900/30 to-blue-900/30 border border-cyan-500/30 rounded-lg p-6 mb-6">
              <h3 className="text-xl font-bold text-cyan-400 mb-2">💸 Revolutionary Payment Infrastructure: AquaPay</h3>
              <p className="text-gray-200">
                AquaPay represents a paradigm shift in cryptocurrency payment processing, offering a <strong>non-custodial payment link system with competitive 0.5% transaction fees</strong> that enables direct wallet-to-wallet transactions across multiple blockchain networks. Unlike traditional payment processors that act as intermediaries, AquaPay empowers users to receive payments directly to their own wallets, eliminating custody risks while maintaining transparent, low-cost fee structure.
              </p>
            </div>

            <h2 className="text-2xl font-bold mb-4">4.4. AquaPay Payment Link System</h2>
            
            <h3 className="text-xl font-semibold mb-3">The Problem with Traditional Crypto Payment Solutions</h3>
            <ul className="list-disc pl-6 mb-4">
              <li><strong>Custodial Risk:</strong> Most payment processors hold user funds in centralized wallets, creating single points of failure and trust dependencies.</li>
              <li><strong>High Fees:</strong> Traditional payment processors charge significant transaction fees (2-5% or more), reducing profitability for freelancers and creators.</li>
              <li><strong>Limited Chain Support:</strong> Most solutions support only one or two blockchain networks, forcing users to choose between ecosystems.</li>
              <li><strong>Complex Integration:</strong> Businesses and individuals face technical barriers when implementing crypto payments, requiring API integrations and technical expertise.</li>
              <li><strong>Poor User Experience:</strong> Payment flows are often clunky, requiring multiple steps, wallet switches, and manual address copying.</li>
              <li><strong>Lack of Transparency:</strong> Users cannot easily track payment history, view statistics, or receive notifications about incoming payments.</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3">The AquaPay Solution: Direct, Non-Custodial Payments</h3>
            <p className="mb-4">
              AquaPay eliminates intermediaries by enabling direct wallet-to-wallet transactions. Users create personalized payment pages accessible via simple links (e.g., <code className="bg-gray-800 px-2 py-1 rounded">aquads.xyz/pay/username</code>), allowing anyone to send cryptocurrency payments directly to the recipient's wallet. The system never touches user funds, ensuring complete financial sovereignty and security.
            </p>

            <h3 className="text-xl font-semibold mb-3">Core Features & Capabilities</h3>
            
            <div className="bg-gray-800/50 rounded-lg p-4 mb-4">
              <h4 className="text-lg font-semibold mb-3 text-cyan-400">🌐 Multi-Chain Support (8+ Networks)</h4>
              <p className="text-gray-300 mb-2">AquaPay supports payments across the most popular blockchain networks:</p>
              <div className="grid md:grid-cols-2 gap-3 mb-3">
                <div className="bg-gray-900/50 rounded-lg p-3">
                  <p className="text-white font-medium mb-1">EVM-Compatible Chains</p>
                  <ul className="text-gray-400 text-sm space-y-1">
                    <li>• Ethereum (ETH, USDC)</li>
                    <li>• Base (ETH, USDC)</li>
                    <li>• Polygon (MATIC, USDC)</li>
                    <li>• Arbitrum (ETH, USDC)</li>
                    <li>• BNB Smart Chain (BNB, USDC)</li>
                  </ul>
                </div>
                <div className="bg-gray-900/50 rounded-lg p-3">
                  <p className="text-white font-medium mb-1">Non-EVM Chains</p>
                  <ul className="text-gray-400 text-sm space-y-1">
                    <li>• Solana (SOL, USDC)</li>
                    <li>• Bitcoin (BTC) - Manual transfer</li>
                    <li>• TRON (TRX) - Manual transfer</li>
                  </ul>
                </div>
              </div>
              <p className="text-gray-400 text-sm">Each chain supports native tokens and USDC stablecoins where applicable, providing maximum flexibility for recipients and senders.</p>
            </div>

            <div className="bg-gray-800/50 rounded-lg p-4 mb-4">
              <h4 className="text-lg font-semibold mb-3 text-green-400">🔐 Non-Custodial Architecture</h4>
              <p className="text-gray-300 mb-2">AquaPay operates on a non-custodial model, meaning:</p>
              <ul className="list-disc pl-6 text-gray-400 space-y-1">
                <li>All payments go directly to the recipient's wallet address</li>
                <li>Aquads never holds, controls, or has access to user funds</li>
                <li>Users maintain complete control over their private keys and assets</li>
                <li>No risk of platform insolvency, hacks, or fund freezes affecting user assets</li>
                <li>Compliance with the core principles of Web3 and decentralized finance</li>
              </ul>
            </div>

            <div className="bg-gray-800/50 rounded-lg p-4 mb-4">
              <h4 className="text-lg font-semibold mb-3 text-yellow-400">💰 Competitive Transaction Fees</h4>
              <p className="text-gray-300 mb-2">AquaPay charges a transparent 0.5% transaction fee on all payments:</p>
              <ul className="list-disc pl-6 text-gray-400 space-y-1">
                <li><strong>0.5% Transaction Fee:</strong> Applied to all successful payments, deducted from the payment amount</li>
                <li><strong>No Setup Fees:</strong> No monthly subscriptions or account setup costs</li>
                <li><strong>No Withdrawal Fees:</strong> Payments go directly to recipient wallets - no additional withdrawal charges</li>
                <li><strong>Gas Fees:</strong> Users pay standard blockchain network fees (gas), which are unavoidable and paid directly to the network</li>
                <li><strong>Transparent Pricing:</strong> The 0.5% fee is clearly displayed and significantly lower than traditional payment processors (2-5%)</li>
                <li>This makes AquaPay one of the most cost-effective payment solutions for crypto transactions</li>
              </ul>
            </div>

            <div className="bg-gray-800/50 rounded-lg p-4 mb-4">
              <h4 className="text-lg font-semibold mb-3 text-purple-400">🔗 Personalized Payment Links</h4>
              <p className="text-gray-300 mb-2">Each user can create a custom payment page with:</p>
              <ul className="list-disc pl-6 text-gray-400 space-y-1">
                <li><strong>Custom Payment Slug:</strong> Users can set a custom URL slug (e.g., <code className="bg-gray-900 px-1.5 py-0.5 rounded text-xs">aquads.xyz/pay/mybusiness</code>) or use their username</li>
                <li><strong>Display Name:</strong> Customizable name shown on the payment page</li>
                <li><strong>Bio/Description:</strong> Optional description explaining what payments are for</li>
                <li><strong>Profile Image:</strong> Visual branding for the payment page</li>
                <li><strong>Theme Customization:</strong> Choose from multiple visual themes (default, dark, light, gradient, neon)</li>
                <li><strong>Preferred Chain:</strong> Set default blockchain network for payments</li>
                <li><strong>Accepted Tokens:</strong> Specify which tokens you accept (USDC, USDT, ETH, SOL, BTC, etc.)</li>
              </ul>
            </div>

            <div className="bg-gray-800/50 rounded-lg p-4 mb-4">
              <h4 className="text-lg font-semibold mb-3 text-blue-400">📊 Payment Tracking & Analytics</h4>
              <p className="text-gray-300 mb-2">Comprehensive payment management features:</p>
              <ul className="list-disc pl-6 text-gray-400 space-y-1">
                <li><strong>Payment History:</strong> Complete transaction log with last 100 payments, including transaction hash, amount, token, chain, sender address, timestamp, and optional messages</li>
                <li><strong>Real-Time Statistics:</strong> Track total received (USD value), total transactions, and last payment timestamp</li>
                <li><strong>Transaction Explorer Links:</strong> Direct links to blockchain explorers for transaction verification</li>
                <li><strong>Payment Notifications:</strong> Real-time WebSocket notifications when payments are received</li>
                <li><strong>Email Notifications:</strong> Optional email alerts with payment details and explorer links</li>
              </ul>
            </div>

            <div className="bg-gray-800/50 rounded-lg p-4 mb-4">
              <h4 className="text-lg font-semibold mb-3 text-orange-400">⚡ Seamless Wallet Integration</h4>
              <p className="text-gray-300 mb-2">AquaPay supports all major wallet providers:</p>
              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <p className="text-white font-medium mb-1 text-sm">EVM Wallets:</p>
                  <ul className="text-gray-400 text-sm space-y-0.5">
                    <li>• MetaMask</li>
                    <li>• WalletConnect (300+ wallets)</li>
                    <li>• Coinbase Wallet</li>
                    <li>• Rabby</li>
                    <li>• Any EIP-1193 compatible wallet</li>
                  </ul>
                </div>
                <div>
                  <p className="text-white font-medium mb-1 text-sm">Solana Wallets:</p>
                  <ul className="text-gray-400 text-sm space-y-0.5">
                    <li>• Phantom</li>
                    <li>• Solflare</li>
                    <li>• Backpack</li>
                    <li>• Any Solana wallet adapter</li>
                  </ul>
                </div>
              </div>
              <p className="text-gray-400 text-sm mt-3">For Bitcoin and TRON, users can copy addresses or scan QR codes for manual transfers.</p>
            </div>

            <div className="bg-gray-800/50 rounded-lg p-4 mb-4">
              <h4 className="text-lg font-semibold mb-3 text-pink-400">📱 User Experience Features</h4>
              <ul className="list-disc pl-6 text-gray-400 space-y-1">
                <li><strong>One-Click Wallet Connection:</strong> Senders can connect wallets with a single click</li>
                <li><strong>Multi-Token Support:</strong> Send native tokens (ETH, SOL, etc.) or USDC stablecoins on supported chains</li>
                <li><strong>Real-Time Price Display:</strong> USD value estimates for native tokens using CoinGecko integration</li>
                <li><strong>Quick Amount Buttons:</strong> Pre-set amount buttons for common payment values</li>
                <li><strong>Optional Payment Messages:</strong> Senders can include notes with payments (up to 200 characters)</li>
                <li><strong>QR Code Generation:</strong> Automatic QR codes for Bitcoin and TRON addresses</li>
                <li><strong>Transaction Status Tracking:</strong> Real-time confirmation status with explorer links</li>
                <li><strong>Mobile-Responsive Design:</strong> Optimized for all device sizes</li>
              </ul>
            </div>

            <h3 className="text-xl font-semibold mb-3">Use Cases & Applications</h3>
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div className="bg-gray-800/50 rounded-lg p-4">
                <h4 className="font-semibold text-green-400 mb-2">For Freelancers</h4>
                <ul className="list-disc pl-4 text-gray-400 text-sm space-y-1">
                  <li>Receive payments from clients worldwide</li>
                  <li>Low 0.5% transaction fees preserve more of your earnings compared to traditional processors</li>
                  <li>Multi-chain support for client flexibility</li>
                  <li>Professional payment pages for credibility</li>
                  <li>Payment history for accounting and tax purposes</li>
                </ul>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-4">
                <h4 className="font-semibold text-blue-400 mb-2">For Content Creators</h4>
                <ul className="list-disc pl-4 text-gray-400 text-sm space-y-1">
                  <li>Accept tips and donations from fans</li>
                  <li>Share payment links on social media</li>
                  <li>Track supporter contributions</li>
                  <li>Receive payments in preferred cryptocurrencies</li>
                  <li>Low 0.5% fees maximize donation value compared to traditional payment processors</li>
                </ul>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-4">
                <h4 className="font-semibold text-purple-400 mb-2">For Businesses</h4>
                <ul className="list-disc pl-4 text-gray-400 text-sm space-y-1">
                  <li>Accept crypto payments for products/services</li>
                  <li>Custom payment pages with branding</li>
                  <li>Multi-chain support for customer convenience</li>
                  <li>Payment tracking and analytics</li>
                  <li>Integration with existing workflows</li>
                </ul>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-4">
                <h4 className="font-semibold text-orange-400 mb-2">For Individuals</h4>
                <ul className="list-disc pl-4 text-gray-400 text-sm space-y-1">
                  <li>Split bills with friends in crypto</li>
                  <li>Receive payments for services</li>
                  <li>Accept gifts and payments</li>
                  <li>Simple, shareable payment links</li>
                  <li>No technical knowledge required</li>
                </ul>
              </div>
            </div>

            <h3 className="text-xl font-semibold mb-3">Competitive Advantages</h3>
            <div className="bg-gradient-to-r from-green-900/30 to-emerald-900/30 border border-green-500/30 rounded-lg p-6 mb-4">
              <p className="text-gray-200 mb-4">
                AquaPay differentiates itself from competitors through several key advantages:
              </p>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold text-green-400 mb-2">vs. Traditional Payment Processors (PayPal, Stripe)</h4>
                  <ul className="list-disc pl-4 text-gray-400 text-sm space-y-1">
                    <li>✅ Supports cryptocurrency (they don't or have limited support)</li>
                    <li>✅ Low 0.5% transaction fee (they charge 2-5%)</li>
                    <li>✅ Non-custodial (they hold funds)</li>
                    <li>✅ Multi-chain support (they're fiat-only)</li>
                    <li>✅ Direct wallet transfers (they require bank accounts)</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-blue-400 mb-2">vs. Crypto Payment Services (Coinbase Commerce, BitPay)</h4>
                  <ul className="list-disc pl-4 text-gray-400 text-sm space-y-1">
                    <li>✅ Competitive 0.5% transaction fee (they charge 1-2%)</li>
                    <li>✅ Non-custodial architecture (many are custodial)</li>
                    <li>✅ 8+ blockchain networks (most support 1-3)</li>
                    <li>✅ Personalized payment pages (they're generic)</li>
                    <li>✅ Integrated with freelancer marketplace</li>
                    <li>✅ Real-time notifications and tracking</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-purple-400 mb-2">vs. Payment Link Services (Request Network, BTCPay)</h4>
                  <ul className="list-disc pl-4 text-gray-400 text-sm space-y-1">
                    <li>✅ Simpler setup and user experience</li>
                    <li>✅ Multi-chain in one interface (they're often single-chain)</li>
                    <li>✅ Modern, intuitive UI (many are technical/complex)</li>
                    <li>✅ Integrated wallet connection</li>
                    <li>✅ Real-time price display</li>
                    <li>✅ Payment history and analytics</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-cyan-400 mb-2">vs. Manual Address Sharing</h4>
                  <ul className="list-disc pl-4 text-gray-400 text-sm space-y-1">
                    <li>✅ Professional payment pages</li>
                    <li>✅ Multi-chain support in one link</li>
                    <li>✅ Payment tracking and history</li>
                    <li>✅ Real-time notifications</li>
                    <li>✅ QR codes for easy scanning</li>
                    <li>✅ Customizable branding</li>
                  </ul>
                </div>
              </div>
            </div>

            <h3 className="text-xl font-semibold mb-3">Future Enhancements</h3>
            <p className="mb-4 text-gray-300">
              AquaPay is continuously evolving. Planned enhancements include:
            </p>
            <ul className="list-disc pl-6 mb-4 text-gray-400">
              <li><strong>Recurring Payments:</strong> Subscription and recurring payment support</li>
              <li><strong>Payment Requests:</strong> Send payment requests with specific amounts and due dates</li>
              <li><strong>Invoice Generation:</strong> Automatic invoice creation for business payments</li>
              <li><strong>Multi-Signature Wallets:</strong> Support for multi-sig wallet addresses</li>
              <li><strong>Additional Chains:</strong> Support for more blockchain networks (Avalanche, Optimism, etc.)</li>
              <li><strong>Token Swaps:</strong> Automatic token conversion for cross-token payments</li>
              <li><strong>Payment Analytics Dashboard:</strong> Advanced analytics and reporting tools</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3">Why AquaPay Matters</h3>
            <p className="mb-4 text-gray-300">
              AquaPay represents the future of cryptocurrency payments—a future where:
            </p>
            <ul className="list-disc pl-6 mb-4 text-gray-400">
              <li>Users maintain complete control over their funds without trusting intermediaries</li>
              <li>Payment processing is free and accessible to everyone, regardless of transaction size</li>
              <li>Multi-chain interoperability is seamless and user-friendly</li>
              <li>Payment infrastructure integrates naturally with Web3 ecosystems</li>
              <li>Freelancers, creators, and businesses can accept crypto payments without technical barriers</li>
            </ul>
            <p className="mb-4 text-gray-300">
              By combining non-custodial architecture, competitive 0.5% transaction fees, multi-chain support, and exceptional user experience, AquaPay sets a new standard for cryptocurrency payment solutions. It empowers users to participate fully in the Web3 economy while maintaining the security, transparency, and decentralization that make blockchain technology revolutionary.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">5. Revenue Model</h2>
            
            <h3 className="text-xl font-semibold mb-3">5.1. Token-Based Lead Unlocking System</h3>
            <ul className="list-disc pl-6 mb-4">
              <li>Users purchase tokens at $1 USDC each to unlock premium leads and client contact information.</li>
              <li>2 tokens are required to unlock each client's contact details, creating a pay-per-lead model.</li>
              <li>This system eliminates traditional subscription fees and allows freelancers to invest only in leads they want to pursue.</li>
              <li>With average project values of $3,200 and 35% conversion rates, the ROI is typically 560%.</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3">5.2. AquaSwap Trading Fees</h3>
            <ul className="list-disc pl-6 mb-4">
              <li>0.5% fee on all token swaps and trading activities within the AquaSwap platform.</li>
              <li>Revenue generated from DeFi trading activities and cross-chain token exchanges.</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3">5.3. AquaPay Transaction Fees</h3>
            <ul className="list-disc pl-6 mb-4">
              <li>0.5% transaction fee on all successful payments processed through AquaPay.</li>
              <li>Fee is deducted from the payment amount before it reaches the recipient's wallet.</li>
              <li>Revenue generated from payment processing across all supported blockchain networks (Ethereum, Base, Polygon, Arbitrum, BNB, Solana, Bitcoin, TRON).</li>
              <li>Competitive fee structure that is significantly lower than traditional payment processors (2-5%) while maintaining sustainable revenue.</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3">5.4. AquaFi Savings Platform Fees</h3>
            <ul className="list-disc pl-6 mb-4">
              <li>0% fee on deposits to encourage user adoption and remove barriers to entry.</li>
              <li>2.5% fee on withdrawals, optimizing revenue while maintaining user-friendly deposit experience.</li>
              <li>Strategic fee structure designed to balance user experience with sustainable revenue generation.</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3">5.5. Advertising Revenue</h3>
            <ul className="list-disc pl-6 mb-4">
              <li>Base ad placements, premium bump features, and extended visibility options create a performance-driven advertising model.</li>
              <li>VIP ad banners, AMAs, and additional monetized features are planned for future phases and more.</li>
              <li>Paid twitter raid post</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3">5.6. On-Chain Resume Services (Planned)</h3>
            <ul className="list-disc pl-6 mb-4">
              <li>Optional minting fee for On-Chain Resume attestations (in addition to minimal blockchain gas fees).</li>
              <li>Premium resume features such as enhanced public profiles and priority verification badges.</li>
              <li>Enterprise verification services for bulk credential validation.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">6. Marketing & Growth Strategy</h2>
            
            <h3 className="text-xl font-semibold mb-3">6.1. Go-to-Market Plan</h3>
            <ul className="list-disc pl-6 mb-4">
              <li>Community Building: Focus on engaging early adopters through social media channels, AMAs, and interactive content.</li>
              <li>Partnerships: Collaborate with industry influencers, crypto projects, and gaming communities.</li>
              <li>Digital Marketing: Leverage SEO, content marketing, and targeted online ads to drive traffic and engagement.</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3">6.2. Affiliate Program</h3>
            <ul className="list-disc pl-6 mb-4">
              <li>A tiered commission structure rewards affiliates based on the volume of referred sales.</li>
              <li>Commission rates: 10% for $2,500+ in referrals, 15% for $5,000+, and 20% for $25,000+ in total referrals.</li>
              <li>Commission payments are processed once the affiliate balance reaches $100 and are issued in crypto or other agreed-upon methods.</li>
              <li>This program serves as a key user acquisition and retention strategy rather than a primary revenue source.</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3">6.3. Community Engagement</h3>
            <ul className="list-disc pl-6 mb-4">
              <li>User Reviews & Ratings: Foster trust with a transparent feedback system.</li>
              <li>Social Integration: Enable seamless social sharing and community interaction.</li>
              <li>Regular Updates: Keep users informed with fresh content on the How-To page and blog.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">7. Management & Team</h2>
            
            <h3 className="text-xl font-semibold mb-3">7.1. Leadership</h3>
            <p>Our team comprises experienced professionals in blockchain, software development, digital marketing, and community management. Our leadership is committed to fostering innovation and growth in the Web3 ecosystem.</p>

            <h3 className="text-xl font-semibold mb-3">7.2. Talent Acquisition</h3>
            <p>We focus on hiring specialists in blockchain technology, cybersecurity, and UI/UX design to ensure a secure, scalable, and user-friendly platform.</p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">8. Conclusion</h2>
            <p className="mb-4">
              Aquads.xyz represents the future of Web3 work, gaming, and crypto projects by uniting advertising, freelance services, and cutting-edge blockchain features in one platform. With dynamic features such as our new Game Hub, comprehensive How-To page, robust booking system with watermarking, upgraded messaging, an engaging Twitter Raid feature, and our revolutionary <strong>AquaPay payment link system</strong>, Aquads.xyz is poised to lead the decentralized marketplace revolution.
            </p>
            <p className="mb-4">
              Our groundbreaking innovations in freelancer vetting—the <strong>Trust Score & Risk Gauge system</strong>—combined with the <strong>world's first On-Chain Freelancer Resume</strong>, set a new standard for professional reputation in the gig economy. By leveraging blockchain technology through Ethereum Attestation Service on Base, we've created a paradigm where freelancer credentials are portable, verifiable, and truly owned by the professional.
            </p>
            <p className="mb-4">
              <strong>AquaPay</strong> further revolutionizes the platform by enabling seamless, non-custodial cryptocurrency payments with competitive 0.5% transaction fees across 8+ blockchain networks. This eliminates the traditional barriers of payment processing—custodial risk, high fees, and limited chain support—empowering freelancers, creators, and businesses to receive payments directly to their wallets without intermediaries.
            </p>
            <p className="mb-4">
              These innovations solve longstanding problems in freelancing: platform lock-in, unverifiable credentials, the "cold start" reputation problem, and payment processing friction. Aquads is not just building a marketplace—we're building the complete infrastructure for the future of decentralized work, combining professional reputation systems, blockchain verification, and seamless payment processing in one integrated platform.
            </p>
            <p className="mb-4">
              Join us as we build a vibrant community where innovation meets opportunity. Let's transform the world of digital freelancing and crypto projects together!
            </p>
            <p className="font-semibold">— The Aquads Team</p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">Contact Information:</h2>
            <ul className="list-none space-y-2">
              <li>Twitter: <a href="https://twitter.com/_Aquads_" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">@_Aquads_</a></li>
              <li>Telegram: <a href="https://t.co/TE6WbzWh9K" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">https://t.co/TE6WbzWh9K</a></li>
              <li>Email: <a href="mailto:aquads.info@gmail.com" className="text-blue-400 hover:text-blue-300">aquads.info@gmail.com</a></li>
              <li>Website: <a href="https://aquads.xyz" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">https://aquads.xyz</a></li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Whitepaper; 