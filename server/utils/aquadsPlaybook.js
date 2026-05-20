const fs = require('fs');
const path = require('path');

const PLAYBOOK_PATH = path.join(__dirname, '../data/skipper-aquads-playbook.md');
const MAX_PLAYBOOK_CHARS = Number(process.env.PROJECT_AGENT_PLAYBOOK_MAX_CHARS) || 8000;

let cachedPlaybook = null;
let cachedMtime = 0;

function loadAquadsPlaybook() {
  try {
    const stat = fs.statSync(PLAYBOOK_PATH);
    if (cachedPlaybook && stat.mtimeMs === cachedMtime) {
      return cachedPlaybook;
    }
    const raw = fs.readFileSync(PLAYBOOK_PATH, 'utf8').trim();
    cachedPlaybook =
      raw.length <= MAX_PLAYBOOK_CHARS
        ? raw
        : `${raw.slice(0, MAX_PLAYBOOK_CHARS)}\n…[playbook truncated]`;
    cachedMtime = stat.mtimeMs;
    return cachedPlaybook;
  } catch {
    return '';
  }
}

module.exports = { loadAquadsPlaybook, MAX_PLAYBOOK_CHARS };
