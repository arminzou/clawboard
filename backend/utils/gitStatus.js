const { execSync } = require('child_process');

/**
 * Returns a map of file_path -> git_status ('modified'|'added'|'deleted'|'untracked'|'clean')
 */
function getGitStatusMap(cwd) {
  const map = new Map();
  try {
    const out = execSync('git status --porcelain', { cwd, stdio: ['ignore', 'pipe', 'ignore'] })
      .toString('utf8')
      .trim();
    if (!out) return map;

    for (const line of out.split('\n')) {
      // XY <path>
      const xy = line.slice(0, 2);
      const file = line.slice(3).trim();
      let status = 'modified';
      if (xy.includes('A')) status = 'added';
      else if (xy.includes('D')) status = 'deleted';
      else if (xy === '??') status = 'untracked';
      else if (xy.includes('M')) status = 'modified';
      map.set(file, status);
    }
  } catch {
    // not a git repo or git missing
  }
  return map;
}

module.exports = { getGitStatusMap };
