/**
 * Shared helpers for RSS job sync (CryptoJobsList, We Work Remotely, etc.)
 */

function parseSalary(title, description) {
  const text = `${title} ${description}`.toLowerCase();

  const salaryPatterns = [
    /\$(\d+)k?\s*-\s*\$?(\d+)?k?\s*(?:\/hr|per\s*hour|hourly)/i,
    /\$(\d+)\s*(?:\/hr|per\s*hour|hourly)/i,
    /\$(\d+)k?\s*-\s*\$?(\d+)?k?\s*(?:\/yr|per\s*year|yearly|annual)/i,
    /\$(\d+)k?\s*-\s*\$?(\d+)?k/i,
    /\$(\d{1,3}),?(\d{3})/,
    /(\d+)k?\s*-\s*(\d+)k/i,
  ];

  const isHourly = text.includes('/hr') || text.includes('per hour') || text.includes('hourly');

  for (const pattern of salaryPatterns) {
    const match = text.match(pattern);
    if (match) {
      const amount = parseInt(match[1].replace(',', ''));

      if (isHourly) {
        return { payAmount: amount, payType: 'hour' };
      }

      return {
        payAmount: amount >= 1000 ? amount : amount * 1000,
        payType: 'year',
      };
    }
  }

  return null;
}

function parseSalaryFromField(salaryStr) {
  if (!salaryStr) return null;

  const salaryLower = salaryStr.toLowerCase();

  if (
    salaryLower.includes('eur') ||
    salaryLower.includes('gbp') ||
    salaryLower.includes('£') ||
    salaryLower.includes('€') ||
    salaryLower.includes('cad') ||
    salaryLower.includes('aud')
  ) {
    if (!salaryLower.includes('usd') && !salaryLower.includes('$')) {
      return null;
    }
  }

  const isHourly = salaryLower.includes('/hr') || salaryLower.includes('per hour') || salaryLower.includes('hourly');
  const isMonthly = salaryLower.includes('month') || salaryLower.includes('/mo');

  const match = salaryStr.match(/\$?(\d+,?\d*)[kK]?/);
  if (match) {
    const amountStr = match[1].replace(',', '');
    let amount = parseInt(amountStr, 10);

    if (salaryStr.toLowerCase().includes('k')) {
      amount *= 1000;
    }

    if (isHourly) {
      return { payAmount: amount, payType: 'hour' };
    }
    if (isMonthly) {
      return { payAmount: amount, payType: 'month' };
    }
    if (amount < 500) {
      return { payAmount: amount, payType: 'hour' };
    }
    return { payAmount: amount >= 1000 ? amount : amount * 1000, payType: 'year' };
  }

  return null;
}

function extractCompany(title, item = {}, defaultCompany = 'Company') {
  if (item.company) return item.company.trim();
  if (item.creator) return item.creator.trim();

  const atPattern = /at\s+([^-–\n]+?)(?:\s*[-–]|$)/i;
  const dashPattern = /^([^-–]+?)\s*[-–]/;
  const colonPattern = /^([^:]+?):\s/;

  let match = title.match(atPattern);
  if (match) return match[1].trim();

  match = title.match(dashPattern);
  if (match) return match[1].trim();

  match = title.match(colonPattern);
  if (match) return match[1].trim();

  return defaultCompany;
}

function extractRequirements(description) {
  const reqPatterns = [
    /(?:📋\s*)?requirements?[:\s]*([\s\S]*?)(?=📋|────|$)/i,
    /(?:📋\s*)?qualifications?[:\s]*([\s\S]*?)(?=📋|────|$)/i,
    /(?:📋\s*)?what you['']?ll need[:\s]*([\s\S]*?)(?=📋|────|$)/i,
    /(?:📋\s*)?what we['']?re looking for[:\s]*([\s\S]*?)(?=📋|────|$)/i,
    /(?:📋\s*)?must have[:\s]*([\s\S]*?)(?=📋|────|$)/i,
    /(?:📋\s*)?skills?[:\s]*([\s\S]*?)(?=📋|────|$)/i,
  ];

  for (const pattern of reqPatterns) {
    const match = description.match(pattern);
    if (match && match[1] && match[1].trim().length > 20) {
      return match[1].trim().substring(0, 1500);
    }
  }

  const bulletPattern = /(?:•[^\n]+\n?){3,}/;
  const bulletMatch = description.match(bulletPattern);
  if (bulletMatch) {
    return bulletMatch[0].trim().substring(0, 1000);
  }

  return description.substring(0, 600).trim() || 'See job description for requirements';
}

function formatRequirements(requirements) {
  if (!requirements) return 'See job description for requirements';

  let formatted = requirements;
  formatted = formatted.replace(/^[\-\*]\s+/gm, '• ');

  if (!formatted.includes('•')) {
    formatted = formatted.replace(/^(\d+)\.\s+/gm, '• ');
  }

  if (!formatted.includes('•') && !formatted.includes('\n')) {
    const sentences = formatted.split(/(?<=[.!])\s+/);
    if (sentences.length > 2) {
      formatted = sentences
        .filter((s) => s.trim().length > 10)
        .map((s) => `• ${s.trim()}`)
        .join('\n');
    }
  }

  formatted = formatted.replace(/\n{3,}/g, '\n\n').replace(/^\s+/gm, '').trim();

  return formatted || 'See job description for requirements';
}

function removeRequirementsFromDescription(description) {
  const removalPatterns = [
    /\n*(?:📋\s*)?requirements?[:\s]*[\s\S]*?(?=\n📋|\n📌|\n────|$)/i,
    /\n*(?:📋\s*)?qualifications?[:\s]*[\s\S]*?(?=\n📋|\n📌|\n────|$)/i,
    /\n*(?:📋\s*)?what you['']?ll need[:\s]*[\s\S]*?(?=\n📋|\n📌|\n────|$)/i,
    /\n*(?:📋\s*)?what we['']?re looking for[:\s]*[\s\S]*?(?=\n📋|\n📌|\n────|$)/i,
    /\n*(?:📋\s*)?must have[:\s]*[\s\S]*?(?=\n📋|\n📌|\n────|$)/i,
  ];

  for (const pattern of removalPatterns) {
    const match = description.match(pattern);
    if (match && match[0].trim().length > 20) {
      return description.replace(match[0], '').replace(/\n{3,}/g, '\n\n').trim();
    }
  }

  return description;
}

module.exports = {
  parseSalary,
  parseSalaryFromField,
  extractCompany,
  extractRequirements,
  formatRequirements,
  removeRequirementsFromDescription,
};
