const User = require('../models/User');
const SuspiciousAffiliatesSnapshot = require('../models/SuspiciousAffiliatesSnapshot');
const { calculateAdvancedFraudScore } = require('../utils/fraudDetection');

const SNAPSHOT_KEY = 'suspiciousAffiliates';
const SUSPICIOUS_SCORE_CHUNK = 20;
const MIN_FLAGGED_RISK_SCORE = 50;

let scanInProgress = false;

function isScanRunning() {
  return scanInProgress;
}

/** Serialize user id for JSON / Mixed storage */
function normalizeRow(row) {
  if (!row || row.id == null) return row;
  return { ...row, id: row.id.toString ? row.id.toString() : row.id };
}

/**
 * Full scan: all users with affiliateCount >= minAffiliates, chunked scoring,
 * keep medium+ risk only, persist to DB.
 */
async function runSuspiciousAffiliatesScan(options = {}) {
  if (scanInProgress) {
    console.log('[SuspiciousAffiliatesScan] Skipped (already running).');
    return { skipped: true, reason: 'already_running' };
  }

  const minAffiliates = Math.max(1, parseInt(options.minAffiliates, 10) || 10);
  const started = Date.now();
  scanInProgress = true;

  try {
    const candidateUsers = await User.find({
      affiliateCount: { $gte: minAffiliates }
    })
      .select('username email createdAt ipAddress country deviceFingerprint lastActivity lastSeen emailVerified affiliateCount points affiliates pointsHistory tokenHistory image')
      .populate({
        path: 'affiliates',
        select: 'username email createdAt ipAddress country deviceFingerprint lastActivity lastSeen emailVerified points',
        options: { sort: { createdAt: -1 } }
      })
      .sort({ affiliateCount: -1 })
      .lean();

    const scoreOne = async (user) => {
      const fraudAnalysis = await calculateAdvancedFraudScore(user, user.affiliates);
      return normalizeRow({
        id: user._id,
        username: user.username,
        email: user.email,
        createdAt: user.createdAt,
        affiliateCount: user.affiliateCount,
        points: user.points,
        flags: fraudAnalysis.riskFactors,
        riskScore: fraudAnalysis.riskScore,
        activityScore: fraudAnalysis.activityAnalysis?.score || 0,
        loginFrequency: fraudAnalysis.loginAnalysis?.frequencyScore || 0,
        isDormant: fraudAnalysis.loginAnalysis?.isDormant || false,
        isHighlyDormant: fraudAnalysis.loginAnalysis?.isHighlyDormant || false,
        daysSinceLastSeen: fraudAnalysis.loginAnalysis?.daysSinceLastActivity || 999,
        accountAgeDays: fraudAnalysis.loginAnalysis?.accountAgeDays || 0,
        uniqueIPs: fraudAnalysis.networkAnalysis?.uniqueIPs || 0,
        uniqueCountries: fraudAnalysis.networkAnalysis?.uniqueCountries || 0,
        uniqueDevices: fraudAnalysis.networkAnalysis?.uniqueDevices || 0,
        recentSignups: fraudAnalysis.networkAnalysis?.rapidSignups || 0
      });
    };

    const allScored = [];
    for (let i = 0; i < candidateUsers.length; i += SUSPICIOUS_SCORE_CHUNK) {
      const chunk = candidateUsers.slice(i, i + SUSPICIOUS_SCORE_CHUNK);
      const part = await Promise.all(chunk.map(scoreOne));
      allScored.push(...part);
    }

    const flaggedUsers = allScored
      .filter((u) => u.riskScore >= MIN_FLAGGED_RISK_SCORE)
      .sort((a, b) => b.riskScore - a.riskScore);

    const summary = {
      totalEvaluated: allScored.length,
      totalFlagged: flaggedUsers.length,
      highRisk: flaggedUsers.filter((u) => u.riskScore >= 75).length,
      mediumRisk: flaggedUsers.filter((u) => u.riskScore >= 50 && u.riskScore < 75).length
    };

    const durationMs = Date.now() - started;

    await SuspiciousAffiliatesSnapshot.findOneAndUpdate(
      { key: SNAPSHOT_KEY },
      {
        $set: {
          minAffiliates,
          suspiciousUsers: flaggedUsers,
          summary,
          generatedAt: new Date(),
          durationMs,
          lastError: null
        }
      },
      { upsert: true, new: true }
    );

    console.log(
      `[SuspiciousAffiliatesScan] Done in ${durationMs}ms — evaluated ${summary.totalEvaluated}, flagged ${summary.totalFlagged} (min ${minAffiliates}+ affiliates).`
    );

    return {
      ok: true,
      suspiciousUsers: flaggedUsers,
      summary,
      generatedAt: new Date().toISOString(),
      durationMs
    };
  } catch (err) {
    console.error('[SuspiciousAffiliatesScan] Error:', err);
    await SuspiciousAffiliatesSnapshot.findOneAndUpdate(
      { key: SNAPSHOT_KEY },
      { $set: { lastError: err.message || String(err), generatedAt: new Date() } },
      { upsert: true }
    );
    return { ok: false, error: err.message || String(err) };
  } finally {
    scanInProgress = false;
  }
}

async function getSnapshotResponse(minAffiliatesQuery) {
  const doc = await SuspiciousAffiliatesSnapshot.findOne({ key: SNAPSHOT_KEY }).lean();
  const requestedMin = parseInt(minAffiliatesQuery, 10);
  const minMismatch = doc &&
    Number.isFinite(requestedMin) &&
    doc.minAffiliates !== undefined &&
    doc.minAffiliates !== requestedMin;

  const base = {
    suspiciousUsers: doc?.suspiciousUsers || [],
    summary: doc?.summary || {
      totalEvaluated: 0,
      totalFlagged: 0,
      highRisk: 0,
      mediumRisk: 0
    },
    generatedAt: doc?.generatedAt || null,
    durationMs: doc?.durationMs,
    minAffiliates: doc?.minAffiliates ?? 10,
    scanInProgress: scanInProgress,
    lastError: doc?.lastError || null
  };

  if (minMismatch) {
    base.note = `Snapshot was built with minAffiliates=${doc.minAffiliates}; your request was ${requestedMin}. Trigger a rescan or change the scheduled job threshold.`;
  }

  return base;
}

function scheduleRescan(minAffiliates = 10) {
  if (scanInProgress) {
    return { triggered: false, reason: 'already_running' };
  }
  setImmediate(() => {
    runSuspiciousAffiliatesScan({ minAffiliates }).catch((e) =>
      console.error('[SuspiciousAffiliatesScan] Background run failed:', e)
    );
  });
  return { triggered: true };
}

module.exports = {
  runSuspiciousAffiliatesScan,
  getSnapshotResponse,
  scheduleRescan,
  isScanRunning,
  MIN_FLAGGED_RISK_SCORE,
  SUSPICIOUS_SCORE_CHUNK
};
