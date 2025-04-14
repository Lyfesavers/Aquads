/**
 * Format a number as currency
 * @param {number} amount - The amount to format
 * @param {string} currencyCode - The currency code (default: USD)
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount, currencyCode = 'USD') => {
  if (amount === undefined || amount === null) return '';
  
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  } catch (error) {
    // Fallback for unsupported currency codes
    return `${currencyCode} ${amount.toFixed(2)}`;
  }
};

/**
 * Format a date string
 * @param {string|Date} date - The date to format
 * @param {boolean} includeTime - Whether to include time in the output
 * @returns {string} Formatted date string
 */
export const formatDate = (date, includeTime = false) => {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) return '';
  
  if (includeTime) {
    return dateObj.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }
  
  return dateObj.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}; 