/**
 * Extracts the username from a tweet URL
 * @param {string} tweetUrl - The URL of the tweet
 * @returns {string|null} - The extracted username or null if not found
 */
function extractUsernameFromTweetUrl(tweetUrl) {
  try {
    // Handle both twitter.com and x.com domains
    if (!tweetUrl || (!tweetUrl.includes('twitter.com/') && !tweetUrl.includes('x.com/'))) {
      return null;
    }
    
    // Parse the URL
    const url = new URL(tweetUrl);
    const pathParts = url.pathname.split('/');
    
    // The username should be the first part after the domain
    // Example: https://twitter.com/username/status/1234567890
    if (pathParts.length >= 3) {
      return pathParts[1].toLowerCase();
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting username from tweet URL:', error);
    return null;
  }
}

/**
 * Verifies that the tweet URL belongs to the specified username
 * @param {string} tweetUrl - The URL of the tweet
 * @param {string} providedUsername - The username to verify against
 * @returns {Object} - Verification result with success status and message
 */
function verifyTweetOwnership(tweetUrl, providedUsername) {
  try {
    if (!tweetUrl || !providedUsername) {
      return {
        success: false,
        message: 'Tweet URL and username are required'
      };
    }
    
    // Normalize the provided username (remove @ if present)
    const normalizedProvidedUsername = providedUsername.startsWith('@') 
      ? providedUsername.substring(1).toLowerCase() 
      : providedUsername.toLowerCase();
    
    // Extract username from the tweet URL
    const extractedUsername = extractUsernameFromTweetUrl(tweetUrl);
    
    if (!extractedUsername) {
      return {
        success: false,
        message: 'Could not extract username from the tweet URL'
      };
    }
    
    // Compare the usernames
    if (extractedUsername !== normalizedProvidedUsername) {
      return {
        success: false,
        message: `Username mismatch: Tweet URL shows @${extractedUsername} but you provided @${normalizedProvidedUsername}`,
        extractedUsername,
        providedUsername: normalizedProvidedUsername
      };
    }
    
    return {
      success: true,
      message: 'Tweet ownership verified',
      username: extractedUsername
    };
  } catch (error) {
    console.error('Error verifying tweet ownership:', error);
    return {
      success: false,
      message: 'Error verifying tweet ownership'
    };
  }
}

module.exports = {
  extractUsernameFromTweetUrl,
  verifyTweetOwnership
}; 