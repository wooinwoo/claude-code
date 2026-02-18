import { spawn } from 'node:child_process';

export function startSession(project, options = {}) {
  const claudeArgs = [];
  if (options.resume) claudeArgs.push('--continue');
  if (options.model) claudeArgs.push('--model', options.model);
  if (options.prompt) claudeArgs.push('-p', options.prompt);

  const winPath = project.path.replace(/\//g, '\\');

  // Build wt command with array args — no string interpolation, no shell injection
  const wtArgs = ['/c', 'start', 'wt', '-w', '0', 'nt', '-d', winPath, '--title', project.name, 'claude', ...claudeArgs];

  const child = spawn('cmd', wtArgs, {
    detached: true,
    stdio: 'ignore',
    windowsHide: true
  });
  child.unref();

  return { launched: true, projectId: project.id };
}

export function resumeSession(project, sessionId) {
  const winPath = project.path.replace(/\//g, '\\');
  const claudeArgs = sessionId
    ? ['--resume', sessionId]
    : ['--continue'];

  const wtArgs = ['/c', 'start', 'wt', '-w', '0', 'nt', '-d', winPath, '--title', project.name, 'claude', ...claudeArgs];

  const child = spawn('cmd', wtArgs, {
    detached: true,
    stdio: 'ignore',
    windowsHide: true
  });
  child.unref();

  return { launched: true, projectId: project.id };
}
