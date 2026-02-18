import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

async function git(projectPath, args) {
  try {
    const { stdout } = await execFileAsync('git', ['-C', projectPath, ...args], { timeout: 10000 });
    return stdout.trim();
  } catch {
    return '';
  }
}

export async function getGitStatus(project) {
  const [branch, status, log, worktreeRaw] = await Promise.all([
    git(project.path, ['branch', '--show-current']),
    git(project.path, ['status', '--porcelain']),
    git(project.path, ['log', '--oneline', '-5', '--format=%h|%s|%cr']),
    git(project.path, ['worktree', 'list', '--porcelain'])
  ]);

  const statusLines = status ? status.split('\n').filter(Boolean) : [];
  const commits = log ? log.split('\n').filter(Boolean).map(line => {
    const [hash, ...rest] = line.split('|');
    return { hash, message: rest[0] || '', ago: rest[1] || '' };
  }) : [];

  const worktrees = [];
  if (worktreeRaw) {
    let current = {};
    for (const line of worktreeRaw.split('\n')) {
      if (line.startsWith('worktree ')) current.path = line.slice(9).replace(/\\/g, '/');
      else if (line.startsWith('branch ')) current.branch = line.slice(7).replace('refs/heads/', '');
      else if (line === '') { if (current.path) worktrees.push(current); current = {}; }
    }
    if (current.path) worktrees.push(current);
  }

  // GitHub URL from remote
  const remoteRaw = await git(project.path, ['remote', 'get-url', 'origin']);
  let remoteUrl = '';
  if (remoteRaw) {
    remoteUrl = remoteRaw
      .replace(/\.git$/, '')
      .replace(/^git@github\.com:/, 'https://github.com/')
      .replace(/^ssh:\/\/git@github\.com\//, 'https://github.com/');
  }

  return {
    projectId: project.id,
    branch: branch || 'unknown',
    uncommittedCount: statusLines.length,
    uncommittedFiles: statusLines.slice(0, 10).map(l => ({
      status: l.substring(0, 2).trim(),
      file: l.substring(3)
    })),
    recentCommits: commits,
    worktrees: worktrees.filter(w => w.branch),
    remoteUrl
  };
}

export async function getBranches(project) {
  const [local, remote, currentBranch] = await Promise.all([
    git(project.path, ['branch', '--format=%(refname:short)']),
    git(project.path, ['branch', '-r', '--format=%(refname:short)']),
    git(project.path, ['branch', '--show-current'])
  ]);
  return {
    current: currentBranch || '',
    local: local ? local.split('\n').filter(Boolean) : [],
    remote: remote ? remote.split('\n').filter(Boolean).filter(b => !b.includes('/HEAD')) : []
  };
}
