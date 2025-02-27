import React from 'react';
import { FaTwitter, FaTelegram, FaEnvelope, FaFileAlt, FaDiscord } from 'react-icons/fa';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="bg-gray-800 text-gray-300 py-6 mt-auto">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          {/* Mobile-optimized link grid */}
          <div className="grid grid-cols-2 sm:flex sm:items-center gap-4 mb-4 md:mb-0 w-full sm:w-auto">
            <a
              href="https://x.com/_Aquads_"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-blue-400 transition-colors flex items-center justify-center sm:justify-start"
            >
              <FaTwitter className="mr-2" />
              <span>Twitter</span>
            </a>
            <a
              href="https://t.me/+6rJbDLqdMxA3ZTUx"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-blue-400 transition-colors flex items-center justify-center sm:justify-start"
            >
              <FaTelegram className="mr-2" />
              <span>Telegram</span>
            </a>
            <a
              href="https://discord.gg/6zrsCgkf"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-blue-400 transition-colors flex items-center justify-center sm:justify-start"
            >
              <FaDiscord className="mr-2" />
              <span>Discord</span>
            </a>
            <a
              href="mailto:aquads.info@gmail.com"
              className="hover:text-blue-400 transition-colors flex items-center justify-center sm:justify-start"
            >
              <FaEnvelope className="mr-2" />
              <span>Email</span>
            </a>
            <Link
              to="/whitepaper"
              className="hover:text-blue-400 transition-colors flex items-center justify-center sm:justify-start"
            >
              <FaFileAlt className="mr-2" />
              <span>Whitepaper</span>
            </Link>
            <Link
              to="/affiliate"
              className="hover:text-blue-400 transition-colors flex items-center justify-center sm:justify-start"
            >
              <FaFileAlt className="mr-2" />
              <span>Affiliate</span>
            </Link>
            <Link
              to="/terms"
              className="hover:text-blue-400 transition-colors flex items-center justify-center sm:justify-start"
            >
              <FaFileAlt className="mr-2" />
              <span>Terms</span>
            </Link>
          </div>
          <div className="text-sm text-gray-400 text-center md:text-right">
            © {new Date().getFullYear()} Aquads. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer; 