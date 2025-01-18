import React from 'react';
import { FaGlobe, FaTwitter, FaTelegram, FaDiscord, FaGithub, FaReddit } from 'react-icons/fa';

const TokenDetails = ({
  token,
  onClose,
  chartRef,
  selectedTimeRange,
  onTimeRangeChange,
}) => {
  const timeRanges = [
    { label: '24h', value: '1' },
    { label: '7d', value: '7' },
    { label: '30d', value: '30' },
    { label: '90d', value: '90' },
    { label: '1y', value: '365' },
    { label: 'Max', value: 'max' }
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-900 bg-opacity-75" onClick={onClose}></div>

        <div className="inline-block w-full max-w-4xl px-4 pt-5 pb-4 overflow-hidden text-left align-bottom transition-all transform bg-gray-800 rounded-lg shadow-xl sm:my-8 sm:align-middle sm:p-6">
          <div className="absolute top-0 right-0 pt-4 pr-4">
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white focus:outline-none"
            >
              <span className="sr-only">Close</span>
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="sm:flex sm:items-start">
            <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
              <div className="flex items-center mb-4">
                <img
                  src={token.image}
                  alt={token.name}
                  className="w-12 h-12 rounded-full mr-4"
                />
                <div>
                  <h3 className="text-2xl font-bold text-white">
                    {token.name} ({token.symbol.toUpperCase()})
                  </h3>
                  <p className="text-gray-400">
                    Rank #{token.marketCapRank}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-700/50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-400 mb-2">Price</h4>
                  <p className="text-xl font-bold text-white">
                    ${token.currentPrice.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 6
                    })}
                  </p>
                  <p className={`text-sm ${
                    token.priceChangePercentage24h >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {token.priceChangePercentage24h.toFixed(2)}% (24h)
                  </p>
                </div>

                <div className="bg-gray-700/50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-400 mb-2">Market Cap</h4>
                  <p className="text-xl font-bold text-white">
                    ${token.marketCap.toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-400">
                    Volume: ${token.totalVolume.toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-medium text-white">Price Chart</h4>
                  <div className="flex space-x-2">
                    {timeRanges.map(range => (
                      <button
                        key={range.value}
                        onClick={() => onTimeRangeChange(range.value)}
                        className={`px-3 py-1 rounded text-sm ${
                          selectedTimeRange === range.value
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                      >
                        {range.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="bg-gray-700/50 p-4 rounded-lg" style={{ height: '400px' }}>
                  <canvas ref={chartRef}></canvas>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-gray-700/50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-400 mb-2">24h High</h4>
                  <p className="text-lg font-bold text-white">
                    ${token.high24h?.toLocaleString() || 'N/A'}
                  </p>
                </div>

                <div className="bg-gray-700/50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-400 mb-2">24h Low</h4>
                  <p className="text-lg font-bold text-white">
                    ${token.low24h?.toLocaleString() || 'N/A'}
                  </p>
                </div>

                <div className="bg-gray-700/50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-400 mb-2">All Time High</h4>
                  <p className="text-lg font-bold text-white">
                    ${token.ath?.toLocaleString() || 'N/A'}
                  </p>
                  <p className="text-sm text-red-400">
                    {token.athChangePercentage?.toFixed(2)}%
                  </p>
                </div>

                <div className="bg-gray-700/50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-400 mb-2">Circulating Supply</h4>
                  <p className="text-lg font-bold text-white">
                    {token.circulatingSupply?.toLocaleString() || 'N/A'}
                  </p>
                  {token.maxSupply && (
                    <p className="text-sm text-gray-400">
                      Max: {token.maxSupply.toLocaleString()}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-4">
                {token.links?.homepage && (
                  <a
                    href={token.links.homepage}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center px-4 py-2 bg-gray-700 rounded-lg text-gray-300 hover:text-white hover:bg-gray-600 transition-colors"
                  >
                    <FaGlobe className="mr-2" />
                    Website
                  </a>
                )}
                {token.links?.twitter_screen_name && (
                  <a
                    href={`https://twitter.com/${token.links.twitter_screen_name}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center px-4 py-2 bg-gray-700 rounded-lg text-gray-300 hover:text-white hover:bg-gray-600 transition-colors"
                  >
                    <FaTwitter className="mr-2" />
                    Twitter
                  </a>
                )}
                {token.links?.telegram_channel_identifier && (
                  <a
                    href={`https://t.me/${token.links.telegram_channel_identifier}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center px-4 py-2 bg-gray-700 rounded-lg text-gray-300 hover:text-white hover:bg-gray-600 transition-colors"
                  >
                    <FaTelegram className="mr-2" />
                    Telegram
                  </a>
                )}
                {token.links?.discord && (
                  <a
                    href={token.links.discord}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center px-4 py-2 bg-gray-700 rounded-lg text-gray-300 hover:text-white hover:bg-gray-600 transition-colors"
                  >
                    <FaDiscord className="mr-2" />
                    Discord
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TokenDetails; 