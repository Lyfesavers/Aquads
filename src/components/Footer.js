import React from 'react';
import { FaTwitter, FaTelegram, FaEnvelope, FaFileAlt, FaDiscord, FaCoins, FaMedium } from 'react-icons/fa';
import { Link } from 'react-router-dom';

const Footer = () => {
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
                  href="https://discord.gg/6zrsCgkf"
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
                  to="/how-to"
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
                  to="/swap"
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
              </div>
            </div>

            {/* Legal */}
            <div className="space-y-3 col-span-2 sm:col-span-1">
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
          </div>

          {/* Copyright */}
          <div className="border-t border-gray-700 pt-6">
            <div className="text-sm text-gray-400 text-center">
              © {new Date().getFullYear()} Aquads. All rights reserved.
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer; 