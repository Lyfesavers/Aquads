const express = require('express');
const router = express.Router();
const { getVerificationService } = require('../services/playwrightVerification');
const auth = require('../middleware/auth');

// Store verification sessions (in production, use Redis or database)
const verificationSessions = new Map();

// Start verification process - capture initial metrics
router.post('/start-verification', auth, async (req, res) => {
  try {
    const { tweetUrl, raidId } = req.body;
    const userId = req.user.id;

    if (!tweetUrl || !raidId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Tweet URL and raid ID are required' 
      });
    }

    console.log(`Starting verification for user ${userId}, raid ${raidId}, tweet: ${tweetUrl}`);

    const verificationService = getVerificationService();
    
    // Validate tweet exists first
    const validation = await verificationService.validateTweetExists(tweetUrl);
    if (!validation.exists) {
      return res.status(400).json({
        success: false,
        error: validation.error || 'Tweet not found or not accessible'
      });
    }

    // Get initial metrics
    const result = await verificationService.verifyTweetInteraction(tweetUrl);
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error || 'Failed to capture initial metrics'
      });
    }

    // Store verification session
    const sessionId = `${userId}_${raidId}_${Date.now()}`;
    verificationSessions.set(sessionId, {
      userId,
      raidId,
      tweetUrl,
      initialMetrics: result.initialMetrics,
      startTime: new Date(),
      status: 'waiting_for_completion'
    });

    res.json({
      success: true,
      sessionId,
      initialMetrics: result.initialMetrics,
      message: 'Initial metrics captured. Please complete your Twitter actions (like, retweet, comment) and then call the complete-verification endpoint.'
    });

  } catch (error) {
    console.error('Error starting verification:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during verification startup'
    });
  }
});

// Complete verification process - check final metrics and verify completion
router.post('/complete-verification', auth, async (req, res) => {
  try {
    const { sessionId } = req.body;
    const userId = req.user.id;

    if (!sessionId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Session ID is required' 
      });
    }

    const session = verificationSessions.get(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Verification session not found or expired'
      });
    }

    if (session.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized access to verification session'
      });
    }

    if (session.status !== 'waiting_for_completion') {
      return res.status(400).json({
        success: false,
        error: 'Verification session is not in the correct state'
      });
    }

    console.log(`Completing verification for session ${sessionId}`);

    const verificationService = getVerificationService();
    
    // Verify after user actions
    const result = await verificationService.verifyAfterUserAction(
      session.tweetUrl,
      session.initialMetrics,
      5000 // Wait 5 seconds minimum
    );

    if (!result.success) {
      // Update session status
      session.status = 'failed';
      session.error = result.error;
      
      return res.status(500).json({
        success: false,
        error: result.error || 'Failed to complete verification'
      });
    }

    // Update session with results
    session.finalMetrics = result.finalMetrics;
    session.differences = result.differences;
    session.verified = result.verified;
    session.details = result.details;
    session.completedAt = new Date();
    session.status = result.verified ? 'completed_success' : 'completed_failed';

    // Clean up old sessions (basic cleanup)
    cleanupOldSessions();

    res.json({
      success: true,
      verified: result.verified,
      initialMetrics: result.initialMetrics,
      finalMetrics: result.finalMetrics,
      differences: result.differences,
      details: result.details,
      message: result.verified 
        ? 'Verification successful! All Twitter actions were completed.' 
        : 'Verification failed. Not all required actions were detected.'
    });

  } catch (error) {
    console.error('Error completing verification:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during verification completion'
    });
  }
});

// Get verification session status
router.get('/verification-status/:sessionId', auth, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;

    const session = verificationSessions.get(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Verification session not found'
      });
    }

    if (session.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized access to verification session'
      });
    }

    res.json({
      success: true,
      session: {
        sessionId,
        status: session.status,
        initialMetrics: session.initialMetrics,
        finalMetrics: session.finalMetrics,
        differences: session.differences,
        verified: session.verified,
        details: session.details,
        startTime: session.startTime,
        completedAt: session.completedAt
      }
    });

  } catch (error) {
    console.error('Error getting verification status:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Validate tweet URL endpoint
router.post('/validate-tweet', auth, async (req, res) => {
  try {
    const { tweetUrl } = req.body;

    if (!tweetUrl) {
      return res.status(400).json({ 
        success: false, 
        error: 'Tweet URL is required' 
      });
    }

    const verificationService = getVerificationService();
    const validation = await verificationService.validateTweetExists(tweetUrl);

    if (validation.exists) {
      // Also get current metrics for preview
      const metrics = await verificationService.scrapeTweetMetrics(tweetUrl);
      res.json({
        success: true,
        valid: true,
        accessible: validation.accessible,
        currentMetrics: metrics,
        message: 'Tweet is valid and accessible'
      });
    } else {
      res.json({
        success: true,
        valid: false,
        error: validation.error,
        message: 'Tweet not found or not accessible'
      });
    }

  } catch (error) {
    console.error('Error validating tweet:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during tweet validation'
    });
  }
});

// Cleanup function for old sessions
function cleanupOldSessions() {
  const now = new Date();
  const maxAge = 30 * 60 * 1000; // 30 minutes

  for (const [sessionId, session] of verificationSessions.entries()) {
    const age = now - session.startTime;
    if (age > maxAge) {
      verificationSessions.delete(sessionId);
      console.log(`Cleaned up expired verification session: ${sessionId}`);
    }
  }
}

// Cleanup endpoint for admin
router.post('/cleanup-sessions', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const initialCount = verificationSessions.size;
    cleanupOldSessions();
    const finalCount = verificationSessions.size;

    res.json({
      success: true,
      message: `Cleaned up ${initialCount - finalCount} expired sessions`,
      remainingSessions: finalCount
    });

  } catch (error) {
    console.error('Error during cleanup:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during cleanup'
    });
  }
});

// Run cleanup every 10 minutes
setInterval(cleanupOldSessions, 10 * 60 * 1000);

module.exports = router; 