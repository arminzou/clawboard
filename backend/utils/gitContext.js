const { execSync } = require('child_process');
const path = require('path');

/**
 * Detects the current git context for a given directory.
 * Returns { key: string, type: 'branch'|'worktree'|null }
 */
function getGitContext(projectPath) {
    try {
        // 1. Get current branch
        const branch = execSync('git rev-parse --abbrev-ref HEAD', { 
            cwd: projectPath, 
            stdio: ['ignore', 'pipe', 'ignore'] 
        }).toString('utf8').trim();

        // 2. Check if it's a worktree
        const isWorktree = execSync('git rev-parse --is-inside-work-tree', { 
            cwd: projectPath, 
            stdio: ['ignore', 'pipe', 'ignore'] 
        }).toString('utf8').trim() === 'true';

        // Get the absolute path of the git main directory to see if it differs from projectPath
        const gitDir = execSync('git rev-parse --git-common-dir', { 
            cwd: projectPath, 
            stdio: ['ignore', 'pipe', 'ignore'] 
        }).toString('utf8').trim();
        
        const gitCommonDir = path.resolve(projectPath, gitDir);
        const projectAbsPath = path.resolve(projectPath);

        // If the common dir is outside the project path, it's definitely a worktree
        // Or if it's a subfolder in a known worktree structure
        if (gitCommonDir !== path.join(projectAbsPath, '.git') && gitCommonDir !== projectAbsPath) {
            return {
                key: path.basename(projectPath), // Use folder name as the context key for worktrees
                type: 'worktree'
            };
        }

        if (branch && branch !== 'HEAD') {
            return {
                key: branch,
                type: 'branch'
            };
        }
    } catch (err) {
        // Not a git repo or other error
    }

    return { key: null, type: null };
}

module.exports = { getGitContext };
