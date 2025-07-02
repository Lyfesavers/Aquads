import React from 'react';
import { FaTwitter, FaTelegram, FaEnvelope, FaFileAlt, FaDiscord, FaCoins, FaMedium } from 'react-icons/fa';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="bg-gray-800 text-gray-300 py-4 mt-auto">
      <div className="container mx-auto px-4">
        <div className="flex flex-col space-y-4">
          {/* Links organized in sections */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-center lg:text-left">
            {/* Social Media */}
            <div className="space-y-2">
              <h4 className="text-blue-400 font-semibold text-xs uppercase tracking-wide">Social</h4>
              <div className="space-y-1">
                <a
                  href="https://x.com/_Aquads_"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-blue-400 transition-colors flex items-center justify-center lg:justify-start text-xs"
                >
                  <FaTwitter className="mr-1" />
                  <span>Twitter</span>
                </a>
                <a
                  href="https://t.me/+6rJbDLqdMxA3ZTUx"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-blue-400 transition-colors flex items-center justify-center lg:justify-start text-xs"
                >
                  <FaTelegram className="mr-1" />
                  <span>Telegram</span>
                </a>
                <a
                  href="https://discord.gg/6zrsCgkf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-blue-400 transition-colors flex items-center justify-center lg:justify-start text-xs"
                >
                  <FaDiscord className="mr-1" />
                  <span>Discord</span>
                </a>
                <a
                  href="https://medium.com/@aquads.info"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-blue-400 transition-colors flex items-center justify-center lg:justify-start text-xs"
                >
                  <FaMedium className="mr-1" />
                  <span>Medium</span>
                </a>
              </div>
            </div>

            {/* Resources with Legal underneath on mobile */}
            <div className="space-y-2">
              <h4 className="text-blue-400 font-semibold text-xs uppercase tracking-wide">Resources</h4>
              <div className="space-y-1">
                <Link
                  to="/whitepaper"
                  className="hover:text-blue-400 transition-colors flex items-center justify-center lg:justify-start text-xs"
                >
                  <FaFileAlt className="mr-1" />
                  <span>Whitepaper</span>
                </Link>
                <Link
                  to="/how-to"
                  className="hover:text-blue-400 transition-colors flex items-center justify-center lg:justify-start text-xs"
                >
                  <FaFileAlt className="mr-1" />
                  <span>Learn</span>
                </Link>
                <Link
                  to="/affiliate"
                  className="hover:text-blue-400 transition-colors flex items-center justify-center lg:justify-start text-xs"
                >
                  <FaFileAlt className="mr-1" />
                  <span>Affiliate</span>
                </Link>
                <Link
                  to="/verify-user"
                  className="hover:text-blue-400 transition-colors flex items-center justify-center lg:justify-start text-xs"
                >
                  <FaFileAlt className="mr-1" />
                  <span>Verify User</span>
                </Link>
                <a
                  href="mailto:aquads.info@gmail.com"
                  className="hover:text-blue-400 transition-colors flex items-center justify-center lg:justify-start text-xs"
                >
                  <FaEnvelope className="mr-1" />
                  <span>Contact</span>
                </a>
              </div>
              {/* Legal section under Resources on mobile */}
              <div className="lg:hidden mt-3 pt-2 border-t border-gray-700">
                <div className="space-y-1">
                  <Link
                    to="/terms"
                    className="hover:text-blue-400 transition-colors flex items-center justify-center text-xs"
                  >
                    <FaFileAlt className="mr-1" />
                    <span>Terms & Conditions</span>
                  </Link>
                  <Link
                    to="/privacy-policy"
                    className="hover:text-blue-400 transition-colors flex items-center justify-center text-xs"
                  >
                    <FaFileAlt className="mr-1" />
                    <span>Privacy Policy</span>
                  </Link>
                </div>
              </div>
            </div>

            {/* Platform with Legal next to it on mobile */}
            <div className="space-y-2">
              <h4 className="text-blue-400 font-semibold text-xs uppercase tracking-wide">Platform</h4>
              <div className="space-y-1">
                <Link
                  to="/aquafi"
                  className="hover:text-blue-400 transition-colors flex items-center justify-center lg:justify-start text-xs"
                >
                  <FaCoins className="mr-1" />
                  <span>AquaFi</span>
                </Link>
                <Link
                  to="/swap"
                  className="hover:text-blue-400 transition-colors flex items-center justify-center lg:justify-start text-xs"
                >
                  <FaCoins className="mr-1" />
                  <span>AquaSwap</span>
                </Link>
                <Link
                  to="/marketplace"
                  className="hover:text-blue-400 transition-colors flex items-center justify-center lg:justify-start text-xs"
                >
                  <FaFileAlt className="mr-1" />
                  <span>Freelancer Hub</span>
                </Link>
                <Link
                  to="/games"
                  className="hover:text-blue-400 transition-colors flex items-center justify-center lg:justify-start text-xs"
                >
                  <FaFileAlt className="mr-1" />
                  <span>Game Hub</span>
                </Link>
              </div>
            </div>

            {/* Legal - separate column on larger screens, hidden on mobile */}
            <div className="hidden lg:block space-y-2">
              <h4 className="text-blue-400 font-semibold text-xs uppercase tracking-wide">Legal</h4>
              <div className="space-y-1">
                <Link
                  to="/terms"
                  className="hover:text-blue-400 transition-colors flex items-center justify-center lg:justify-start text-xs"
                >
                  <FaFileAlt className="mr-1" />
                  <span>Terms & Conditions</span>
                </Link>
                <Link
                  to="/privacy-policy"
                  className="hover:text-blue-400 transition-colors flex items-center justify-center lg:justify-start text-xs"
                >
                  <FaFileAlt className="mr-1" />
                  <span>Privacy Policy</span>
                </Link>
              </div>
            </div>
          </div>

          {/* Copyright */}
          <div className="border-t border-gray-700 pt-3">
            <div className="text-xs text-gray-400 text-center">
              © {new Date().getFullYear()} Aquads. All rights reserved.
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer; 