import React from 'react';

const BLOCKCHAIN_OPTIONS = [
  { value: 'all', label: 'All Blockchains' },
  { value: 'ethereum', label: 'Ethereum' },
  { value: 'bsc', label: 'Binance Smart Chain' },
  { value: 'polygon', label: 'Polygon' },
  { value: 'solana', label: 'Solana' },
  { value: 'avalanche', label: 'Avalanche' },
  { value: 'arbitrum', label: 'Arbitrum' },
  { value: 'optimism', label: 'Optimism' },
  { value: 'base', label: 'Base' },
  { value: 'sui', label: 'Sui' },
  { value: 'near', label: 'NEAR' },
  { value: 'fantom', label: 'Fantom' },
  { value: 'tron', label: 'TRON' },
  { value: 'cronos', label: 'Cronos' },
  { value: 'celo', label: 'Celo' },
  { value: 'harmony', label: 'Harmony' },
  { value: 'polkadot', label: 'Polkadot' },
  { value: 'cosmos', label: 'Cosmos' },
  { value: 'aptos', label: 'Aptos' },
  { value: 'flow', label: 'Flow' },
  { value: 'cardano', label: 'Cardano' },
  { value: 'moonbeam', label: 'Moonbeam' },
  { value: 'moonriver', label: 'Moonriver' },
  { value: 'hedera', label: 'Hedera' },
  { value: 'kadena', label: 'Kadena' },
  { value: 'stacks', label: 'Stacks' },
  { value: 'oasis', label: 'Oasis' },
  { value: 'zilliqa', label: 'Zilliqa' },
  { value: 'multiversx', label: 'MultiversX' },
  { value: 'kava', label: 'Kava' },
  { value: 'injective', label: 'Injective' },
  { value: 'algorand', label: 'Algorand' },
  { value: 'stellar', label: 'Stellar' },
  { value: 'ton', label: 'TON' },
  { value: 'tezos', label: 'Tezos' }
];

const FilterControls = ({ 
  currentBlockchain, 
  onBlockchainChange, 
  currentPage,
  totalPages,
  onPageChange,
  itemsPerPage,
  totalItems
}) => {
  const renderPageNumbers = () => {
    const pageNumbers = [];
    const maxPagesToShow = 5;

    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

    if (endPage - startPage + 1 < maxPagesToShow) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(
        <button
          key={i}
          onClick={() => onPageChange(i)}
          className={`px-3 py-1 rounded-md ${
            currentPage === i
              ? 'bg-purple-600 text-white'
              : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
          } mx-1`}
        >
          {i}
        </button>
      );
    }

    return pageNumbers;
  };

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);
  
  return (
    <div className="filter-controls bg-gray-900/80 backdrop-blur-md p-4 rounded-lg shadow-lg border border-purple-500/30 mb-4 sticky top-[4.5rem] z-[9] transition-all duration-300 ease-in-out hover:border-purple-500/50">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="blockchain-filter">
          <label htmlFor="blockchain-select" className="block text-sm font-medium text-gray-300 mb-1 flex items-center">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
            </svg>
            Filter by Blockchain
          </label>
          <select
            id="blockchain-select"
            value={currentBlockchain}
            onChange={(e) => onBlockchainChange(e.target.value)}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white 
                      focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all duration-200"
          >
            {BLOCKCHAIN_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        
        <div className="pagination flex flex-col justify-center">
          <div className="text-sm text-gray-400 mb-1 flex items-center">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"></path>
            </svg>
            Showing {startItem}-{endItem} of {totalItems} projects
          </div>
          <div className="flex items-center justify-between">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className={`px-3 py-1 rounded-md ${
                currentPage === 1
                  ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                  : 'bg-gray-700 text-white hover:bg-gray-600 transition-colors duration-200'
              }`}
            >
              Prev
            </button>
            
            <div className="hidden md:flex space-x-1">
              {renderPageNumbers()}
            </div>
            
            <div className="md:hidden text-gray-300">
              Page {currentPage} of {totalPages}
            </div>
            
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className={`px-3 py-1 rounded-md ${
                currentPage === totalPages
                  ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                  : 'bg-gray-700 text-white hover:bg-gray-600 transition-colors duration-200'
              }`}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FilterControls; 