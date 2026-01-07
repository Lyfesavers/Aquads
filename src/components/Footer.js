import React from 'react';
import { FaTwitter, FaTelegram, FaEnvelope, FaFileAlt, FaDiscord, FaCoins, FaMedium, FaInstagram, FaFacebook, FaGift, FaApple, FaGooglePlay, FaMobileAlt } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import usePWAInstall from '../hooks/usePWAInstall';

const Footer = () => {
  const { isInstallable, isIOS, handleInstallClick } = usePWAInstall();

  return (
    <footer className="bg-gray-800 text-gray-300 py-8 mt-auto">
      <div className="container mx-auto px-4">
        <div className="flex flex-col space-y-6">
          {/* Links organized in sections */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 text-center lg:text-left">
            {/* Social Media */}
            <div className="space-y-3">
              <h4 className="text-blue-400 font-semibold text-sm uppercase tracking-wide">Social</h4>
              <div className="space-y-2">
                <a
                  href="https://x.com/_Aquads_"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-blue-400 transition-colors flex items-center justify-center lg:justify-start text-sm"
                >
                  <FaTwitter className="mr-2" />
                  <span>Twitter</span>
                </a>
                <a
                  href="https://t.me/+6rJbDLqdMxA3ZTUx"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-blue-400 transition-colors flex items-center justify-center lg:justify-start text-sm"
                >
                  <FaTelegram className="mr-2" />
                  <span>Telegram</span>
                </a>
                <a
                  href="https://discord.gg/kyVqbT9A8x"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-blue-400 transition-colors flex items-center justify-center lg:justify-start text-sm"
                >
                  <FaDiscord className="mr-2" />
                  <span>Discord</span>
                </a>
                <a
                  href="https://medium.com/@aquads.info"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-blue-400 transition-colors flex items-center justify-center lg:justify-start text-sm"
                >
                  <FaMedium className="mr-2" />
                  <span>Medium</span>
                </a>
                <a
                  href="https://www.instagram.com/aquads.xyz/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-blue-400 transition-colors flex items-center justify-center lg:justify-start text-sm"
                >
                  <FaInstagram className="mr-2" />
                  <span>Instagram</span>
                </a>
                <a
                  href="https://www.facebook.com/Aquads.xyz/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-blue-400 transition-colors flex items-center justify-center lg:justify-start text-sm"
                >
                  <FaFacebook className="mr-2" />
                  <span>Facebook</span>
                </a>
              </div>
            </div>

            {/* Resources */}
            <div className="space-y-3">
              <h4 className="text-blue-400 font-semibold text-sm uppercase tracking-wide">Resources</h4>
              <div className="space-y-2">
                <Link
                  to="/whitepaper"
                  className="hover:text-blue-400 transition-colors flex items-center justify-center lg:justify-start text-sm"
                >
                  <FaFileAlt className="mr-2" />
                  <span>Whitepaper</span>
                </Link>
                <Link
                  to="/learn"
                  className="hover:text-blue-400 transition-colors flex items-center justify-center lg:justify-start text-sm"
                >
                  <FaFileAlt className="mr-2" />
                  <span>Learn</span>
                </Link>
                <Link
                  to="/affiliate"
                  className="hover:text-blue-400 transition-colors flex items-center justify-center lg:justify-start text-sm"
                >
                  <FaFileAlt className="mr-2" />
                  <span>Affiliate</span>
                </Link>
                <Link
                  to="/verify-user"
                  className="hover:text-blue-400 transition-colors flex items-center justify-center lg:justify-start text-sm"
                >
                  <FaFileAlt className="mr-2" />
                  <span>Verify User</span>
                </Link>
                <a
                  href="mailto:aquads.info@gmail.com"
                  className="hover:text-blue-400 transition-colors flex items-center justify-center lg:justify-start text-sm"
                >
                  <FaEnvelope className="mr-2" />
                  <span>Contact</span>
                </a>
              </div>
            </div>

            {/* Platform */}
            <div className="space-y-3">
              <h4 className="text-blue-400 font-semibold text-sm uppercase tracking-wide">Platform</h4>
              <div className="space-y-2">
                <Link
                  to="/aquafi"
                  className="hover:text-blue-400 transition-colors flex items-center justify-center lg:justify-start text-sm"
                >
                  <FaCoins className="mr-2" />
                  <span>AquaFi</span>
                </Link>
                <Link
                  to="/aquaswap"
                  className="hover:text-blue-400 transition-colors flex items-center justify-center lg:justify-start text-sm"
                >
                  <FaCoins className="mr-2" />
                  <span>AquaSwap</span>
                </Link>
                <Link
                  to="/marketplace"
                  className="hover:text-blue-400 transition-colors flex items-center justify-center lg:justify-start text-sm"
                >
                  <FaFileAlt className="mr-2" />
                  <span>Freelancer Hub</span>
                </Link>
                <Link
                  to="/games"
                  className="hover:text-blue-400 transition-colors flex items-center justify-center lg:justify-start text-sm"
                >
                  <FaFileAlt className="mr-2" />
                  <span>Game Hub</span>
                </Link>
                <Link
                  to="/partner-rewards"
                  className="hover:text-blue-400 transition-colors flex items-center justify-center lg:justify-start text-sm"
                >
                  <FaGift className="mr-2" />
                  <span>Partner Rewards</span>
                </Link>
                <Link
                  to="/telegram-bot"
                  className="hover:text-blue-400 transition-colors flex items-center justify-center lg:justify-start text-sm"
                >
                  <FaTelegram className="mr-2" />
                  <span>Telegram Bot</span>
                </Link>
              </div>
            </div>

            {/* Legal */}
            <div className="space-y-3">
              <h4 className="text-blue-400 font-semibold text-sm uppercase tracking-wide">Legal</h4>
              <div className="space-y-2">
                <Link
                  to="/terms"
                  className="hover:text-blue-400 transition-colors flex items-center justify-center lg:justify-start text-sm"
                >
                  <FaFileAlt className="mr-2" />
                  <span>Terms & Conditions</span>
                </Link>
                <Link
                  to="/privacy-policy"
                  className="hover:text-blue-400 transition-colors flex items-center justify-center lg:justify-start text-sm"
                >
                  <FaFileAlt className="mr-2" />
                  <span>Privacy Policy</span>
                </Link>
              </div>
            </div>

            {/* Mobile Apps */}
            <div className="space-y-3">
              <h4 className="text-blue-400 font-semibold text-sm uppercase tracking-wide">Mobile Apps</h4>
              <div className="space-y-2">
                {/* PWA Install Button - Only show on mobile when installable */}
                {isInstallable && (
                  <button
                    onClick={handleInstallClick}
                    className="hover:text-blue-400 transition-colors flex items-center justify-center lg:justify-start text-sm cursor-pointer group w-full text-left"
                    title="Install Aquads as a mobile app"
                  >
                    <FaMobileAlt className="mr-2 text-purple-400 group-hover:text-purple-300" />
                    <span className="flex items-center">
                      Install Web App
                      <span className="ml-2 inline-block px-1.5 py-0.5 text-xs font-semibold text-green-400 bg-green-900/30 border border-green-500/30 rounded">
                        Available
                      </span>
                    </span>
                  </button>
                )}
                
                <div className="flex items-center justify-center lg:justify-start">
                  <span className="inline-block px-2 py-1 text-xs font-semibold text-cyan-400 bg-cyan-900/30 border border-cyan-500/30 rounded-full animate-pulse">
                    Coming Soon
                  </span>
                </div>
                <div
                  className="hover:text-blue-400 transition-colors flex items-center justify-center lg:justify-start text-sm cursor-not-allowed opacity-60"
                  title="Coming Soon on Google Play Store"
                >
                  <FaGooglePlay className="mr-2 text-green-500" />
                  <span>Google Play</span>
                </div>
                <div
                  className="hover:text-blue-400 transition-colors flex items-center justify-center lg:justify-start text-sm cursor-not-allowed opacity-60"
                  title="Coming Soon on Apple App Store"
                >
                  <FaApple className="mr-2 text-blue-400" />
                  <span>App Store</span>
                </div>
              </div>
            </div>
          </div>

          {/* Copyright */}
          <div className="border-t border-gray-700 pt-6">
            <div className="text-sm text-gray-400 text-center">
              © {new Date().getFullYear()} Aquads. All rights reserved.
              <br />
              By using Aquads platform and services you agree to all our terms and conditions.
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer; 