const { chromium } = require('playwright');

class PlaywrightVerificationService {
  constructor() {
    this.browser = null;
    this.context = null;
    this.page = null;
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      // Launch browser with realistic settings
      this.browser = await chromium.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor'
        ]
      });

      // Create context with realistic user agent
      this.context = await this.browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1920, height: 1080 },
        extraHTTPHeaders: {
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
        }
      });

      this.page = await this.context.newPage();
      this.isInitialized = true;
      
      console.log('Playwright verification service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Playwright:', error);
      throw error;
    }
  }

  async cleanup() {
    try {
      if (this.page) await this.page.close();
      if (this.context) await this.context.close();
      if (this.browser) await this.browser.close();
      this.isInitialized = false;
      console.log('Playwright verification service cleaned up');
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }

  async scrapeTweetMetrics(tweetUrl) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      console.log(`Scraping metrics for: ${tweetUrl}`);
      
      // Wait for page to load completely
      await this.page.goto(tweetUrl, { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });

      // Wait for Twitter to load content
      await this.page.waitForTimeout(3000);

      // Try multiple selectors for different Twitter layouts
      const metrics = await this.page.evaluate(() => {
        // Function to extract number from text
        const extractNumber = (text) => {
          if (!text) return 0;
          const cleaned = text.replace(/[^\d.,]/g, '');
          if (cleaned.includes(',')) {
            return parseInt(cleaned.replace(/,/g, ''));
          }
          if (cleaned.includes('.') && cleaned.endsWith('K')) {
            return Math.floor(parseFloat(cleaned) * 1000);
          }
          if (cleaned.endsWith('K')) {
            return Math.floor(parseInt(cleaned) * 1000);
          }
          if (cleaned.includes('.') && cleaned.endsWith('M')) {
            return Math.floor(parseFloat(cleaned) * 1000000);
          }
          if (cleaned.endsWith('M')) {
            return Math.floor(parseInt(cleaned) * 1000000);
          }
          return parseInt(cleaned) || 0;
        };

        // Multiple selector strategies for different Twitter layouts
        const selectors = {
          likes: [
            '[data-testid="like"] span',
            '[aria-label*="like" i] span',
            '[data-testid="like"] [role="button"] span',
            'div[data-testid="like"] span',
            '[data-testid="like"] div span',
            'button[data-testid="like"] span'
          ],
          retweets: [
            '[data-testid="retweet"] span',
            '[aria-label*="retweet" i] span',
            '[data-testid="retweet"] [role="button"] span',
            'div[data-testid="retweet"] span',
            '[data-testid="retweet"] div span',
            'button[data-testid="retweet"] span'
          ],
          replies: [
            '[data-testid="reply"] span',
            '[aria-label*="repl" i] span',
            '[data-testid="reply"] [role="button"] span',
            'div[data-testid="reply"] span',
            '[data-testid="reply"] div span',
            'button[data-testid="reply"] span'
          ]
        };

        const result = { likes: 0, retweets: 0, replies: 0 };

        // Try each selector strategy
        for (const [metric, selectorList] of Object.entries(selectors)) {
          for (const selector of selectorList) {
            try {
              const elements = document.querySelectorAll(selector);
              for (const element of elements) {
                const text = element.textContent?.trim();
                if (text && text !== '0' && !isNaN(extractNumber(text))) {
                  result[metric] = Math.max(result[metric], extractNumber(text));
                  break;
                }
              }
              if (result[metric] > 0) break;
            } catch (e) {
              continue;
            }
          }
        }

        // Alternative approach: look for engagement group
        if (result.likes === 0 && result.retweets === 0 && result.replies === 0) {
          try {
            const engagementGroup = document.querySelector('[role="group"]');
            if (engagementGroup) {
              const buttons = engagementGroup.querySelectorAll('[role="button"]');
              buttons.forEach((button, index) => {
                const span = button.querySelector('span');
                if (span) {
                  const text = span.textContent?.trim();
                  const number = extractNumber(text);
                  if (number > 0) {
                    if (index === 0) result.replies = number;
                    else if (index === 1) result.retweets = number;
                    else if (index === 2) result.likes = number;
                  }
                }
              });
            }
          } catch (e) {
            console.log('Alternative scraping failed:', e);
          }
        }

        return result;
      });

      console.log(`Scraped metrics:`, metrics);
      return metrics;

    } catch (error) {
      console.error('Error scraping tweet metrics:', error);
      return { likes: 0, retweets: 0, replies: 0, error: error.message };
    }
  }

  async verifyTweetInteraction(tweetUrl, expectedIncrease = {}) {
    try {
      // Get initial metrics
      const initialMetrics = await this.scrapeTweetMetrics(tweetUrl);
      
      // Wait for user to complete actions (this would be called after user reports completion)
      console.log('Initial metrics:', initialMetrics);
      
      return {
        success: true,
        initialMetrics,
        message: 'Initial metrics captured successfully'
      };

    } catch (error) {
      console.error('Error in verification process:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async verifyAfterUserAction(tweetUrl, initialMetrics, minDelay = 5000) {
    try {
      // Wait minimum delay to allow metrics to update
      await new Promise(resolve => setTimeout(resolve, minDelay));
      
      // Get final metrics
      const finalMetrics = await this.scrapeTweetMetrics(tweetUrl);
      
      // Calculate differences
      const differences = {
        likes: finalMetrics.likes - initialMetrics.likes,
        retweets: finalMetrics.retweets - initialMetrics.retweets,
        replies: finalMetrics.replies - initialMetrics.replies
      };

      // Determine if verification passed
      const hasLikeIncrease = differences.likes > 0;
      const hasRetweetIncrease = differences.retweets > 0;
      const hasReplyIncrease = differences.replies > 0;

      const verificationPassed = hasLikeIncrease && hasRetweetIncrease && hasReplyIncrease;

      return {
        success: true,
        verified: verificationPassed,
        initialMetrics,
        finalMetrics,
        differences,
        details: {
          hasLikeIncrease,
          hasRetweetIncrease,
          hasReplyIncrease
        }
      };

    } catch (error) {
      console.error('Error in final verification:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Method to run full verification cycle
  async runFullVerification(tweetUrl, userCompletionCallback) {
    try {
      // Step 1: Get initial metrics
      const initialResult = await this.verifyTweetInteraction(tweetUrl);
      if (!initialResult.success) {
        return initialResult;
      }

      // Step 2: Wait for user to complete actions
      // This would be handled by your frontend/callback system
      console.log('Waiting for user to complete Twitter actions...');
      
      // Step 3: Verify after user reports completion
      // This would be called separately when user reports completion
      return {
        success: true,
        stage: 'initial_metrics_captured',
        initialMetrics: initialResult.initialMetrics,
        message: 'Ready for user actions. Call verifyAfterUserAction when complete.'
      };

    } catch (error) {
      console.error('Error in full verification:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Method to check if tweet exists and is accessible
  async validateTweetExists(tweetUrl) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const response = await this.page.goto(tweetUrl, { 
        waitUntil: 'networkidle',
        timeout: 15000 
      });

      if (response.status() === 404) {
        return { exists: false, error: 'Tweet not found' };
      }

      if (response.status() !== 200) {
        return { exists: false, error: `HTTP ${response.status()}` };
      }

      // Check if tweet content is loaded
      await this.page.waitForTimeout(2000);
      
      const hasTweetContent = await this.page.evaluate(() => {
        return document.querySelector('[data-testid="tweet"]') !== null ||
               document.querySelector('article') !== null ||
               document.querySelector('[role="article"]') !== null;
      });

      return { 
        exists: hasTweetContent, 
        accessible: true,
        status: response.status()
      };

    } catch (error) {
      return { 
        exists: false, 
        accessible: false, 
        error: error.message 
      };
    }
  }
}

// Singleton instance
let verificationService = null;

const getVerificationService = () => {
  if (!verificationService) {
    verificationService = new PlaywrightVerificationService();
  }
  return verificationService;
};

module.exports = {
  PlaywrightVerificationService,
  getVerificationService
}; 