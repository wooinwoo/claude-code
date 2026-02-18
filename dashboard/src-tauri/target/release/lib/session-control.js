import { spawn } from 'node:child_process';

// Sanitize string for safe use inside cmd.exe /k context
function sanitizeForCmd(str) {
  return str.replace(/[&|<>^%!\r\n`]/g, '').replace(/"/g, "'");
}

export function startSession(project, options = {}) {
  const args = [];
  if (options.resume) {
    args.push('--continue');
  }
  if (options.model) {
    args.push('--model', options.model);
  }

  let claudeCmd;
  if (options.prompt) {
    const safePrompt = sanitizeForCmd(options.prompt);
    claudeCmd = `claude ${args.join(' ')} -p "${safePrompt}"`;
  } else {
    claudeCmd = `claude ${args.join(' ')}`;
  }

  const winPath = project.path.replace(/\//g, '\\');

  // Open in Windows Terminal new tab
  const child = spawn('cmd', ['/c', 'start', 'wt', '-w', '0', 'nt', '-d', winPath, '--title', project.name, 'cmd', '/k', claudeCmd], {
    detached: true,
    stdio: 'ignore',
    windowsHide: true
  });
  child.unref();

  return { launched: true, projectId: project.id };
}

export function resumeSession(project, sessionId) {
  const winPath = project.path.replace(/\//g, '\\');
  const claudeCmd = sessionId
    ? `claude --resume ${sessionId}`
    : `claude --continue`;

  const child = spawn('cmd', ['/c', 'start', 'wt', '-w', '0', 'nt', '-d', winPath, '--title', project.name, 'cmd', '/k', claudeCmd], {
    detached: true,
    stdio: 'ignore',
    windowsHide: true
  });
  child.unref();

  return { launched: true, projectId: project.id };
}
