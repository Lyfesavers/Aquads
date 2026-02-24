/**
 * On-Chain Resume API Routes
 * 
 * Endpoints for managing freelancer on-chain resumes via EAS
 */

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  prepareAttestationData,
  saveAttestationRecord,
  getPublicResume,
  calculateTrustScore
} = require('../services/onChainResumeService');

/**
 * GET /api/on-chain-resume/prepare
 * Prepare attestation data for minting
 * Requires authentication
 */
router.get('/prepare', auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const data = await prepareAttestationData(userId);
    
    res.json(data);
  } catch (error) {
    console.error('Error preparing attestation data:', error);
    res.status(500).json({ 
      error: 'Failed to prepare attestation data',
      message: error.message 
    });
  }
});

/**
 * POST /api/on-chain-resume/save
 * Save attestation record after successful mint
 * Requires authentication
 */
router.post('/save', auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { uid, txHash, walletAddress, score, badgeCount } = req.body;

    console.log('Save attestation request:', { userId, uid, txHash, walletAddress, score, badgeCount });

    // Validate required fields
    if (!uid || !txHash || !walletAddress) {
      console.error('Missing required fields:', { uid: !!uid, txHash: !!txHash, walletAddress: !!walletAddress });
      return res.status(400).json({ 
        error: 'Missing required fields: uid, txHash, walletAddress' 
      });
    }

    const result = await saveAttestationRecord(userId, {
      uid,
      txHash,
      walletAddress,
      score: score || 0,
      badgeCount: badgeCount || 0
    });

    console.log('Save attestation result:', result);
    res.json(result);
  } catch (error) {
    console.error('Error saving attestation record:', error);
    res.status(500).json({ 
      error: 'Failed to save attestation record',
      message: error.message 
    });
  }
});

/**
 * GET /api/on-chain-resume/status
 * Get current on-chain resume status for authenticated user
 */
router.get('/status', auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const User = require('../models/User');
    
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const hasResume = user.onChainResume?.trustScoreAttestation?.uid;
    
    if (!hasResume) {
      // Calculate current score even if no resume minted yet
      const scoreData = await calculateTrustScore(userId);
      return res.json({
        hasMinted: false,
        currentScore: scoreData.trustScore,
        canMint: user.userType === 'freelancer'
      });
    }

    // Get current score for comparison
    const currentData = await calculateTrustScore(userId);
    const verifiedScore = user.onChainResume.trustScoreAttestation.score;
    const scoreDifference = currentData.trustScore - verifiedScore;

    res.json({
      hasMinted: true,
      currentScore: currentData.trustScore,
      verifiedScore: verifiedScore,
      scoreDifference,
      shouldUpdate: Math.abs(scoreDifference) >= 5,
      attestation: {
        uid: user.onChainResume.trustScoreAttestation.uid,
        mintedAt: user.onChainResume.trustScoreAttestation.mintedAt,
        txHash: user.onChainResume.trustScoreAttestation.txHash
      },
      walletAddress: user.onChainResume.walletAddress,
      publicResumeSlug: user.onChainResume.publicResumeSlug,
      historyCount: (user.onChainResume.attestationHistory || []).length
    });
  } catch (error) {
    console.error('Error getting resume status:', error);
    res.status(500).json({ 
      error: 'Failed to get resume status',
      message: error.message 
    });
  }
});

/**
 * GET /api/on-chain-resume/public/:slug
 * Get public resume data by slug (no auth required)
 */
router.get('/public/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    
    const resumeData = await getPublicResume(slug);
    
    if (!resumeData) {
      return res.status(404).json({ error: 'Resume not found' });
    }

    res.json(resumeData);
  } catch (error) {
    console.error('Error getting public resume:', error);
    res.status(500).json({ 
      error: 'Failed to get public resume',
      message: error.message 
    });
  }
});

/**
 * GET /api/on-chain-resume/verify/:uid
 * Verify an attestation UID belongs to an Aquads user
 */
router.get('/verify/:uid', async (req, res) => {
  try {
    const { uid } = req.params;
    const User = require('../models/User');
    
    const user = await User.findOne({
      'onChainResume.trustScoreAttestation.uid': uid
    }).lean();

    if (!user) {
      // Check history too
      const userFromHistory = await User.findOne({
        'onChainResume.attestationHistory.uid': uid
      }).lean();
      
      if (!userFromHistory) {
        return res.json({ 
          verified: false, 
          message: 'Attestation not found in Aquads records' 
        });
      }

      // Found in history
      const historyEntry = userFromHistory.onChainResume.attestationHistory.find(
        h => h.uid === uid
      );

      return res.json({
        verified: true,
        isCurrentAttestation: false,
        username: userFromHistory.username,
        mintedAt: historyEntry?.mintedAt,
        score: historyEntry?.score,
        message: 'This is a previous attestation. User has a newer on-chain resume.'
      });
    }

    res.json({
      verified: true,
      isCurrentAttestation: true,
      username: user.username,
      mintedAt: user.onChainResume.trustScoreAttestation.mintedAt,
      score: user.onChainResume.trustScoreAttestation.score,
      publicResumeUrl: `/resume/${user.onChainResume.publicResumeSlug}`
    });
  } catch (error) {
    console.error('Error verifying attestation:', error);
    res.status(500).json({ 
      error: 'Failed to verify attestation',
      message: error.message 
    });
  }
});

module.exports = router;

