import { readdirSync, statSync, existsSync, openSync, readSync, closeSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CLAUDE_PROJECTS_DIR, HISTORY_PATH, CLAUDE_DIR, toClaudeProjectDir } from './config.js';

/**
 * Read last N lines from a file efficiently (reads from end)
 */
function readLastLines(filePath, numLines = 5) {
  try {
    const st = statSync(filePath);
    if (st.size === 0) return [];
    const fd = openSync(filePath, 'r');
    const bufSize = Math.min(st.size, 16384);
    const buf = Buffer.alloc(bufSize);
    readSync(fd, buf, 0, bufSize, Math.max(0, st.size - bufSize));
    closeSync(fd);
    const lines = buf.toString('utf8').split('\n').filter(Boolean);
    return lines.slice(-numLines);
  } catch {
    return [];
  }
}

/**
 * Parse a single JSONL line safely
 */
function parseJsonLine(line) {
  try {
    return JSON.parse(line);
  } catch {
    return null;
  }
}

/**
 * Get the Claude project directory path for a project
 */
function getProjectJsonlDir(projectPath) {
  const dirName = toClaudeProjectDir(projectPath);
  const fullPath = join(CLAUDE_PROJECTS_DIR, dirName);
  if (existsSync(fullPath)) return fullPath;

  // Try scanning for partial matches
  try {
    const dirs = readdirSync(CLAUDE_PROJECTS_DIR);
    const baseName = projectPath.split('/').pop();
    const match = dirs.find(d => d.toLowerCase().endsWith(baseName));
    if (match) return join(CLAUDE_PROJECTS_DIR, match);
  } catch { /* ignore */ }

  return null;
}

/**
 * Detect session state for a project based on JSONL file activity
 */
export function detectSessionState(project) {
  const dir = getProjectJsonlDir(project.path);
  if (!dir) return { projectId: project.id, state: 'no_data', sessionId: null, lastActivity: null, model: null };

  let files;
  try {
    files = readdirSync(dir)
      .filter(f => f.endsWith('.jsonl'))
      .map(f => {
        const st = statSync(join(dir, f));
        return { name: f, sessionId: f.replace('.jsonl', ''), mtime: st.mtimeMs, size: st.size };
      })
      .sort((a, b) => b.mtime - a.mtime);
  } catch {
    return { projectId: project.id, state: 'no_data', sessionId: null, lastActivity: null, model: null };
  }

  if (files.length === 0) {
    return { projectId: project.id, state: 'no_sessions', sessionId: null, lastActivity: null, model: null };
  }

  const latest = files[0];
  const ageMs = Date.now() - latest.mtime;
  const lastActivity = new Date(latest.mtime).toISOString();

  // Read last few lines to determine state
  const lastLines = readLastLines(join(dir, latest.name), 3);
  let lastEntry = null;
  let model = null;
  for (let i = lastLines.length - 1; i >= 0; i--) {
    const parsed = parseJsonLine(lastLines[i]);
    if (parsed) {
      lastEntry = parsed;
      if (parsed.message?.model) {
        model = parsed.message.model
          .replace('claude-', '')
          .replace(/-\d{8}$/, '');
      }
      break;
    }
  }

  let state = 'idle';
  if (ageMs < 15000) {
    state = 'busy';
  } else if (ageMs < 300000) {
    state = lastEntry?.type === 'assistant' ? 'waiting' : 'idle';
  }

  return {
    projectId: project.id,
    state,
    sessionId: latest.sessionId,
    lastActivity,
    model,
    sessionCount: files.length
  };
}

/**
 * Get list of sessions for a project
 */
export function getProjectSessions(project, limit = 10) {
  const dir = getProjectJsonlDir(project.path);
  if (!dir) return [];

  try {
    return readdirSync(dir)
      .filter(f => f.endsWith('.jsonl'))
      .map(f => {
        const st = statSync(join(dir, f));
        return {
          sessionId: f.replace('.jsonl', ''),
          lastModified: new Date(st.mtimeMs).toISOString(),
          sizeKB: Math.round(st.size / 1024)
        };
      })
      .sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified))
      .slice(0, limit);
  } catch {
    return [];
  }
}

/**
 * Get recent activity across all projects from history.jsonl
 * Uses efficient tail-read instead of loading entire file
 */
export function getRecentActivity(limit = 30) {
  // Read from end of file efficiently
  const lines = readLastLines(HISTORY_PATH, limit * 3);
  const entries = [];

  for (let i = lines.length - 1; i >= 0; i--) {
    const entry = parseJsonLine(lines[i]);
    if (entry && entry.project) {
      entries.push({
        command: entry.display || '',
        project: entry.project.replace(/\\/g, '/').split('/').pop(),
        projectPath: entry.project.replace(/\\/g, '/'),
        sessionId: entry.sessionId,
        timestamp: new Date(entry.timestamp).toISOString()
      });
      if (entries.length >= limit) break;
    }
  }

  return entries;
}

/**
 * Discover all projects Claude Code has been used with.
 * Reads ~/.claude/projects dirs + history.jsonl for real paths.
 */
export function discoverProjects(existingPaths) {
  const existingSet = new Set((existingPaths || []).map(p => p.replace(/\\/g, '/')));
  const discovered = new Map(); // path → info

  // 1. Read history.jsonl for all unique project paths
  try {
    if (existsSync(HISTORY_PATH)) {
      const content = readFileSync(HISTORY_PATH, 'utf8');
      for (const line of content.split('\n')) {
        if (!line.trim()) continue;
        const entry = parseJsonLine(line);
        if (entry?.project) {
          const p = entry.project.replace(/\\/g, '/');
          if (!existingSet.has(p) && !discovered.has(p)) {
            discovered.set(p, { path: p, name: p.split('/').pop(), source: 'history' });
          }
        }
      }
    }
  } catch { /* ignore */ }

  // 2. Scan ~/.claude/projects directories, extract cwd from JSONL files
  try {
    const dirs = readdirSync(CLAUDE_PROJECTS_DIR);
    for (const dirName of dirs) {
      const dirPath = join(CLAUDE_PROJECTS_DIR, dirName);
      try {
        const st = statSync(dirPath);
        if (!st.isDirectory()) continue;
      } catch { continue; }

      // Check if this dir already matches a discovered path
      const alreadyFound = [...discovered.keys()].some(p => {
        const encoded = p.replace(/[^a-zA-Z0-9]/g, '-');
        return encoded === dirName || encoded.toLowerCase() === dirName.toLowerCase();
      });
      if (alreadyFound) continue;

      // Also check existing projects
      const alreadyExisting = [...existingSet].some(p => {
        const encoded = p.replace(/[^a-zA-Z0-9]/g, '-');
        return encoded === dirName || encoded.toLowerCase() === dirName.toLowerCase();
      });
      if (alreadyExisting) continue;

      // Read most recent JSONL file to extract cwd
      try {
        const files = readdirSync(dirPath)
          .filter(f => f.endsWith('.jsonl'))
          .map(f => ({ name: f, mtime: statSync(join(dirPath, f)).mtimeMs }))
          .sort((a, b) => b.mtime - a.mtime);

        if (files.length > 0) {
          const lines = readLastLines(join(dirPath, files[0].name), 20);
          for (const line of lines) {
            const entry = parseJsonLine(line);
            if (entry?.cwd) {
              const p = entry.cwd.replace(/\\/g, '/');
              if (!existingSet.has(p) && !discovered.has(p)) {
                discovered.set(p, { path: p, name: p.split('/').pop(), source: 'session', sessionCount: files.length });
              }
              break;
            }
          }
          // If no cwd found, try reading from the start
          if (!files.some(() => [...discovered.values()].some(d => d.source === 'session'))) {
            const firstLines = readFirstLines(join(dirPath, files[0].name), 20);
            for (const line of firstLines) {
              const entry = parseJsonLine(line);
              if (entry?.cwd) {
                const p = entry.cwd.replace(/\\/g, '/');
                if (!existingSet.has(p) && !discovered.has(p)) {
                  discovered.set(p, { path: p, name: p.split('/').pop(), source: 'session', sessionCount: files.length });
                }
                break;
              }
            }
          }
        }
      } catch { /* ignore */ }
    }
  } catch { /* ignore */ }

  // 3. Enrich with metadata: check if path exists, has .git, session count
  const results = [];
  for (const [path, info] of discovered) {
    const winPath = path.replace(/\//g, '\\');
    let pathExists = false;
    let hasGit = false;
    try {
      statSync(winPath);
      pathExists = true;
      try { statSync(join(winPath, '.git')); hasGit = true; } catch {}
    } catch {}

    if (!pathExists) continue; // Skip paths that no longer exist

    // Get session count + last activity from claude projects dir
    let sessionCount = info.sessionCount || 0;
    let lastActivity = null;
    const dir = getProjectJsonlDir(path);
    if (dir) {
      try {
        const jsonls = readdirSync(dir).filter(f => f.endsWith('.jsonl'));
        if (!sessionCount) sessionCount = jsonls.length;
        if (jsonls.length > 0) {
          const stats = jsonls.map(f => statSync(join(dir, f)).mtimeMs);
          lastActivity = new Date(Math.max(...stats)).toISOString();
        }
      } catch {}
    }

    results.push({
      path,
      name: info.name,
      hasGit,
      sessionCount,
      lastActivity
    });
  }

  // Sort: most recent activity first, then by name
  results.sort((a, b) => {
    if (a.lastActivity && b.lastActivity) return new Date(b.lastActivity) - new Date(a.lastActivity);
    if (a.lastActivity) return -1;
    if (b.lastActivity) return 1;
    return a.name.localeCompare(b.name);
  });

  return results;
}

/**
 * Read first N lines from a file
 */
function readFirstLines(filePath, numLines = 20) {
  try {
    const fd = openSync(filePath, 'r');
    const bufSize = Math.min(statSync(filePath).size, 32768);
    const buf = Buffer.alloc(bufSize);
    readSync(fd, buf, 0, bufSize, 0);
    closeSync(fd);
    return buf.toString('utf8').split('\n').filter(Boolean).slice(0, numLines);
  } catch { return []; }
}

/**
 * Get usage facet for a session
 */
export function getSessionFacet(sessionId) {
  const facetsDir = join(CLAUDE_DIR, 'usage-data', 'facets');
  if (!existsSync(facetsDir)) return null;

  try {
    const files = readdirSync(facetsDir);
    for (const f of files) {
      const st = statSync(join(facetsDir, f));
      const fd = openSync(join(facetsDir, f), 'r');
      const buf = Buffer.alloc(st.size);
      readSync(fd, buf, 0, st.size, 0);
      closeSync(fd);
      const data = JSON.parse(buf.toString('utf8'));
      if (data.session_id === sessionId) return data;
    }
  } catch { /* ignore */ }
  return null;
}
