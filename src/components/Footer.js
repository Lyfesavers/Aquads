import React from 'react';
import { FaTwitter, FaTelegram, FaEnvelope, FaFileAlt } from 'react-icons/fa';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="bg-gray-800 text-gray-300 py-6 mt-auto">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center space-x-6 mb-4 md:mb-0">
            <a
              href="https://x.com/_Aquads_"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-blue-400 transition-colors flex items-center"
            >
              <FaTwitter className="mr-2" />
              <span>Twitter</span>
            </a>
            <a
              href="https://t.me/+6rJbDLqdMxA3ZTUx"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-blue-400 transition-colors flex items-center"
            >
              <FaTelegram className="mr-2" />
              <span>Telegram</span>
            </a>
            <a
              href="mailto:aquads.info@gmail.com"
              className="hover:text-blue-400 transition-colors flex items-center"
            >
              <FaEnvelope className="mr-2" />
              <span>Email</span>
            </a>
            <Link
              to="/whitepaper"
              className="hover:text-blue-400 transition-colors flex items-center"
            >
              <FaFileAlt className="mr-2" />
              <span>Whitepaper</span>
            </Link>
          </div>
          <div className="text-sm text-gray-400">
            © {new Date().getFullYear()} Aquads. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer; 