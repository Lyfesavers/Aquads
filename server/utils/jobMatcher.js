/**
 * Job Matcher Utility
 * Matches freelancer CV skills and education with job postings
 * Simple keyword matching - users control quality by adding more skills
 */

/**
 * Find jobs that match a user's CV skills and education
 * @param {Object} user - User object with cv data
 * @param {Array} jobs - Array of job objects to match against
 * @param {Number} limit - Maximum number of matched jobs to return
 * @returns {Array} - Array of matched jobs with match info
 */
function findMatchingJobs(user, jobs, limit = 3) {
  // Collect all keywords from user's CV (lowercase for matching)
  const userKeywords = new Set();
  
  // Add skills from CV
  const skills = user.cv?.skills || [];
  skills.forEach(skill => {
    if (skill && skill.trim()) {
      userKeywords.add(skill.toLowerCase().trim());
    }
  });
  
  // Add education fields (degree and field of study)
  const education = user.cv?.education || [];
  education.forEach(edu => {
    if (edu.field) userKeywords.add(edu.field.toLowerCase().trim());
    if (edu.degree) userKeywords.add(edu.degree.toLowerCase().trim());
  });
  
  // Add job positions from experience for additional matching
  const experience = user.cv?.experience || [];
  experience.forEach(exp => {
    if (exp.position) userKeywords.add(exp.position.toLowerCase().trim());
  });
  
  // If user has no keywords, return empty array
  if (userKeywords.size === 0) {
    return [];
  }
  
  // Match jobs that contain at least one keyword
  const matchedJobs = [];
  
  for (const job of jobs) {
    // Skip non-active jobs
    if (job.status !== 'active') continue;
    
    // Combine all job text for matching
    const jobText = `${job.title || ''} ${job.description || ''} ${job.requirements || ''}`.toLowerCase();
    
    // Find matching keywords
    const matchedKeywords = [];
    userKeywords.forEach(keyword => {
      // Use word boundary matching for better accuracy
      // This prevents partial matches like "java" matching "javascript"
      const wordPattern = new RegExp(`\\b${escapeRegExp(keyword)}\\b`, 'i');
      if (wordPattern.test(jobText) || jobText.includes(keyword)) {
        matchedKeywords.push(keyword);
      }
    });
    
    // Only include jobs with at least 1 match
    if (matchedKeywords.length > 0) {
      matchedJobs.push({
        job: job.toObject ? job.toObject() : job,
        matchedKeywords,
        matchCount: matchedKeywords.length,
        matchPercentage: Math.round((matchedKeywords.length / userKeywords.size) * 100)
      });
    }
  }
  
  // Sort by number of matches (most matches first)
  matchedJobs.sort((a, b) => b.matchCount - a.matchCount);
  
  // Return top matches
  return matchedJobs.slice(0, limit);
}

/**
 * Escape special regex characters
 */
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Check if a user has enough CV data for job matching
 * @param {Object} user - User object
 * @returns {Object} - { canMatch: boolean, reason: string }
 */
function canMatchJobs(user) {
  const skills = user.cv?.skills || [];
  const education = user.cv?.education || [];
  const experience = user.cv?.experience || [];
  
  const hasSkills = skills.length > 0;
  const hasEducation = education.some(edu => edu.field || edu.degree);
  const hasExperience = experience.some(exp => exp.position);
  
  if (!hasSkills && !hasEducation && !hasExperience) {
    return {
      canMatch: false,
      reason: 'Add skills to your CV to see matched jobs'
    };
  }
  
  return {
    canMatch: true,
    keywordCount: skills.length + 
      education.filter(e => e.field || e.degree).length +
      experience.filter(e => e.position).length
  };
}

module.exports = {
  findMatchingJobs,
  canMatchJobs
};

