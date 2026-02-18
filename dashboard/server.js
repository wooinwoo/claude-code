import { createServer } from 'node:http';
import { readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { readFileSync, existsSync, unlinkSync, watch, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import { createRequire } from 'node:module';
import { randomBytes } from 'node:crypto';
import { networkInterfaces } from 'node:os';
import { getProjects, PORT, POLL_INTERVALS, getProjectById, addProject, updateProject, deleteProject } from './lib/config.js';
import { detectSessionState, getProjectSessions, getRecentActivity, discoverProjects } from './lib/claude-data.js';
import { getGitStatus, getBranches } from './lib/git-service.js';
import { getGitHubPRs } from './lib/github-service.js';
import { computeUsage, getStatsCache } from './lib/cost-service.js';
import { startSession, resumeSession } from './lib/session-control.js';
import { Poller } from './lib/poller.js';
import { showNotification } from './lib/notify.js';
import { generateQRSvg } from './lib/qr.js';

// node-pty and ws are CJS modules
const require = createRequire(import.meta.url);
const pty = require('node-pty');
const { WebSocketServer } = require('ws');

const __dirname = dirname(fileURLToPath(import.meta.url));
const poller = new Poller();

// State file lives in install directory (wiped on reinstall)
const STATE_FILE = join(__dirname, 'session-state.json');

// ──────────── Perf helpers ────────────
const execFileAsync = promisify(execFile);
// Cache index.html in memory (reload on file change in dev)
let _cachedHTML = null;
async function getCachedHTML() {
  if (!_cachedHTML) _cachedHTML = await readFile(join(__dirname, 'index.html'), 'utf8');
  return _cachedHTML;
}
// Invalidate cache when file changes (dev convenience)
try { watch(join(__dirname, 'index.html'), () => { _cachedHTML = null; }); } catch {}

// Git concurrency: serialize git ops per project to prevent lock conflicts
const _gitLocks = new Map();
async function withGitLock(projectId, fn) {
  if (!_gitLocks.has(projectId)) _gitLocks.set(projectId, Promise.resolve());
  const prev = _gitLocks.get(projectId);
  const next = prev.then(fn, fn);
  const wrapped = next.catch(() => {});
  _gitLocks.set(projectId, wrapped);
  // Clean up when chain settles and no new ops were queued
  wrapped.then(() => { if (_gitLocks.get(projectId) === wrapped) _gitLocks.delete(projectId); });
  return next;
}

// ──────────── LAN Auth ────────────
const TOKEN_FILE = join(__dirname, '.cockpit-token');
const TOKEN_COOKIE = 'cockpit-token';
const COOKIE_MAX_AGE = 365 * 24 * 3600; // 1 year

function loadOrCreateToken() {
  try {
    if (existsSync(TOKEN_FILE)) {
      const saved = readFileSync(TOKEN_FILE, 'utf8').trim();
      if (saved.length >= 16) return saved;
    }
  } catch {}
  const token = randomBytes(16).toString('hex');
  try { writeFileSync(TOKEN_FILE, token); } catch {}
  return token;
}
const LAN_TOKEN = loadOrCreateToken();

function isLocalhost(req) {
  const addr = req.socket.remoteAddress;
  return addr === '127.0.0.1' || addr === '::1' || addr === '::ffff:127.0.0.1';
}

function parseCookies(req) {
  const obj = {};
  const hdr = req.headers.cookie;
  if (!hdr) return obj;
  for (const pair of hdr.split(';')) {
    const [k, ...v] = pair.split('=');
    obj[k.trim()] = v.join('=').trim();
  }
  return obj;
}

function isAuthenticated(req) {
  if (isLocalhost(req)) return true;
  const url = new URL(req.url, `http://localhost:${PORT}`);
  if (url.searchParams.get('token') === LAN_TOKEN) return true;
  const cookies = parseCookies(req);
  if (cookies[TOKEN_COOKIE] === LAN_TOKEN) return true;
  return false;
}

function serveLoginPage(res) {
  const html = `<!DOCTYPE html>
<html><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Cockpit - Login</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{background:#0f172a;color:#e2e8f0;font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh}
  .card{background:#1e293b;border:1px solid #334155;border-radius:12px;padding:2rem;max-width:400px;width:90%}
  h1{font-size:1.3rem;margin-bottom:.5rem}
  p{color:#94a3b8;font-size:.85rem;margin-bottom:1.2rem;line-height:1.5}
  input{width:100%;padding:.6rem .8rem;border:1px solid #475569;border-radius:6px;background:#0f172a;color:#e2e8f0;font-size:.9rem;font-family:monospace;margin-bottom:.8rem}
  input:focus{outline:none;border-color:#818cf8}
  button{width:100%;padding:.6rem;background:#818cf8;color:#fff;border:none;border-radius:6px;font-size:.9rem;cursor:pointer}
  button:hover{background:#6366f1}
  .err{color:#f87171;font-size:.8rem;margin-bottom:.5rem;display:none}
</style>
</head><body>
<div class="card">
  <h1>Cockpit Dashboard</h1>
  <p>LAN access requires authentication.<br>Enter the token shown in the server console.</p>
  <div class="err" id="err">Invalid token</div>
  <form onsubmit="return doLogin()">
    <input id="tok" placeholder="Access token" autofocus autocomplete="off">
    <button type="submit">Login</button>
  </form>
</div>
<script>
function doLogin(){
  var t=document.getElementById('tok').value.trim();
  if(!t)return false;
  document.cookie='${TOKEN_COOKIE}='+t+';path=/;max-age=${COOKIE_MAX_AGE};SameSite=Lax';
  fetch('/api/health',{credentials:'same-origin'}).then(function(r){
    if(r.ok){location.href='/';}
    else{document.getElementById('err').style.display='block';}
  });
  return false;
}
</script>
</body></html>`;
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
}

// ──────────── Router ────────────
const routes = [];

function addRoute(method, pattern, handler) {
  const paramNames = [];
  const regexStr = pattern.replace(/:(\w+)/g, (_, name) => {
    paramNames.push(name);
    return '([^/]+)';
  });
  routes.push({ method, regex: new RegExp(`^${regexStr}$`), paramNames, handler });
}

function matchRoute(method, pathname) {
  for (const route of routes) {
    if (route.method !== method) continue;
    const match = pathname.match(route.regex);
    if (match) {
      const params = {};
      route.paramNames.forEach((name, i) => params[name] = match[i + 1]);
      return { handler: route.handler, params };
    }
  }
  return null;
}

function json(res, data, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString();
  try { return JSON.parse(raw); } catch { return {}; }
}

// ──────────── Routes ────────────

// Health check (for PM2, uptime monitors, etc.)
addRoute('GET', '/api/health', (_req, res) => {
  json(res, {
    status: 'ok',
    uptime: Math.round(process.uptime()),
    memory: Math.round(process.memoryUsage().rss / 1024 / 1024),
    projects: getProjects().length,
    terminals: terminals?.size ?? 0,
    sseClients: poller.sseClients.size
  });
});

// LAN connection info (localhost only — for desktop app UI)
function getNetworkIPs() {
  const result = [];
  try {
    const nets = networkInterfaces();
    for (const name of Object.keys(nets)) {
      for (const net of nets[name]) {
        if (net.family !== 'IPv4' || net.internal) continue;
        const oct1 = parseInt(net.address.split('.')[0]);
        const oct2 = parseInt(net.address.split('.')[1]);
        // Tailscale uses 100.64-127.x.x (CGNAT range)
        const type = (oct1 === 100 && oct2 >= 64 && oct2 <= 127) ? 'tailscale' : 'lan';
        result.push({ ip: net.address, type });
      }
    }
  } catch {}
  // Tailscale first (works remotely), then LAN
  result.sort((a, b) => (a.type === 'tailscale' ? -1 : 1) - (b.type === 'tailscale' ? -1 : 1));
  return result;
}

addRoute('GET', '/api/lan-info', (req, res) => {
  if (!isLocalhost(req)) { json(res, { error: 'Forbidden' }, 403); return; }
  json(res, { token: LAN_TOKEN, ips: getNetworkIPs(), port: PORT });
});

addRoute('GET', '/api/qr-code', (req, res) => {
  if (!isLocalhost(req)) { res.writeHead(403); res.end(); return; }
  const data = req.query.data;
  if (!data) { res.writeHead(400); res.end('Missing data param'); return; }
  const svg = generateQRSvg(data);
  res.writeHead(200, { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'no-store' });
  res.end(svg);
});

// Serve frontend
addRoute('GET', '/', async (_req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(await getCachedHTML());
});

// Serve static assets (style.css, app.js, js/*.js modules)
const STATIC_TYPES = { '.css': 'text/css', '.js': 'text/javascript', '.map': 'application/json' };
for (const file of ['style.css', 'app.js']) {
  const ext = file.slice(file.lastIndexOf('.'));
  addRoute('GET', `/${file}`, async (_req, res) => {
    try {
      const content = await readFile(join(__dirname, file), 'utf8');
      res.writeHead(200, { 'Content-Type': `${STATIC_TYPES[ext]}; charset=utf-8` });
      res.end(content);
    } catch { res.writeHead(404); res.end('Not found'); }
  });
}
// Serve PWA files
addRoute('GET', '/manifest.json', async (_req, res) => {
  try {
    const content = await readFile(join(__dirname, 'manifest.json'), 'utf8');
    res.writeHead(200, { 'Content-Type': 'application/manifest+json; charset=utf-8' });
    res.end(content);
  } catch { res.writeHead(404); res.end('Not found'); }
});
addRoute('GET', '/sw.js', async (_req, res) => {
  try {
    const content = await readFile(join(__dirname, 'sw.js'), 'utf8');
    res.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8', 'Service-Worker-Allowed': '/' });
    res.end(content);
  } catch { res.writeHead(404); res.end('Not found'); }
});
// Serve JS modules from js/ directory
addRoute('GET', '/js/:filename', async (req, res) => {
  const filename = req.params.filename;
  if (!filename.endsWith('.js')) { res.writeHead(404); res.end('Not found'); return; }
  try {
    const content = await readFile(join(__dirname, 'js', filename), 'utf8');
    res.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8' });
    res.end(content);
  } catch { res.writeHead(404); res.end('Not found'); }
});

// SSE endpoint
addRoute('GET', '/api/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });

  // Send initial state
  const devList = [];
  for (const [pid, ds] of devServers) {
    devList.push({ projectId: pid, command: ds.command, startedAt: ds.startedAt, port: ds.port });
  }
  const init = {
    sessions: poller.getAllCached('session:'),
    git: poller.getAllCached('git:'),
    prs: poller.getAllCached('pr:'),
    costs: poller.getCached('cost:daily'),
    activity: poller.getCached('activity'),
    devServers: devList
  };
  res.write(`event: init\ndata: ${JSON.stringify(init)}\n\n`);

  let sseClosed = false;
  const keepAlive = setInterval(() => {
    if (sseClosed) return;
    try { res.write(':ping\n\n'); } catch { sseClosed = true; clearInterval(keepAlive); }
  }, 15000);

  poller.addClient(res);

  req.on('close', () => {
    sseClosed = true;
    clearInterval(keepAlive);
    poller.removeClient(res);
  });
});

// Projects list
addRoute('GET', '/api/projects', (_req, res) => {
  const data = getProjects().map(p => ({
    ...p,
    session: poller.getCached(`session:${p.id}`),
    git: poller.getCached(`git:${p.id}`),
    prs: poller.getCached(`pr:${p.id}`)
  }));
  json(res, data);
});

// Project CRUD
addRoute('POST', '/api/projects', async (req, res) => {
  const body = await readBody(req);
  if (!body.name || !body.path) return json(res, { error: 'name and path required' }, 400);
  const project = addProject(body);
  registerProjectPollers(project);
  json(res, project, 201);
});

addRoute('PUT', '/api/projects/:id', async (req, res) => {
  const body = await readBody(req);
  const updated = updateProject(req.params.id, body);
  if (!updated) return json(res, { error: 'Not found' }, 404);
  json(res, updated);
});

addRoute('DELETE', '/api/projects/:id', (req, res) => {
  const ok = deleteProject(req.params.id);
  if (!ok) return json(res, { error: 'Not found' }, 404);
  poller.unregister(`session:${req.params.id}`);
  poller.unregister(`git:${req.params.id}`);
  poller.unregister(`pr:${req.params.id}`);
  json(res, { deleted: true });
});

// Adaptive polling speed (browser visibility)
addRoute('POST', '/api/polling-speed', async (req, res) => {
  const body = await readBody(req);
  const multiplier = parseFloat(body.multiplier) || 1;
  poller.setSpeed(multiplier);
  json(res, { speed: poller._speedMultiplier });
});

// Directory browser for path picker
addRoute('GET', '/api/browse', async (_req, res) => {
  const url = new URL(_req.url, `http://localhost`);
  const dir = (url.searchParams.get('dir') || '').replace(/\\/g, '/');
  if (!dir) {
    // Return drive roots on Windows
    const drives = [];
    for (const letter of 'CDEFGHIJKLMNOPQRSTUVWXYZ'.split('')) {
      try { await stat(`${letter}:/`); drives.push({ name: `${letter}:/`, path: `${letter}:/`, isDir: true }); } catch {}
    }
    return json(res, { parent: null, entries: drives });
  }
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    const dirs = entries
      .filter(e => e.isDirectory() && !e.name.startsWith('.') && e.name !== 'node_modules')
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(e => ({ name: e.name, path: `${dir.replace(/\/$/, '')}/${e.name}`, isDir: true }));
    const parent = dir.replace(/\/$/, '').split('/').slice(0, -1).join('/') || null;
    json(res, { current: dir, parent, entries: dirs });
  } catch (err) {
    json(res, { error: err.message }, 400);
  }
});

// Usage
addRoute('GET', '/api/usage', async (_req, res) => {
  const data = await computeUsage();
  json(res, data);
});

// Single project git
addRoute('GET', '/api/projects/:id/git', async (req, res) => {
  const project = getProjectById(req.params.id);
  if (!project) return json(res, { error: 'Not found' }, 404);
  json(res, await getGitStatus(project));
});

// Single project PRs
addRoute('GET', '/api/projects/:id/prs', async (req, res) => {
  const project = getProjectById(req.params.id);
  if (!project) return json(res, { error: 'Not found' }, 404);
  json(res, await getGitHubPRs(project));
});

// Single project sessions
addRoute('GET', '/api/projects/:id/sessions', (req, res) => {
  const project = getProjectById(req.params.id);
  if (!project) return json(res, { error: 'Not found' }, 404);
  json(res, getProjectSessions(project));
});

// Cost data
addRoute('GET', '/api/cost/daily', async (_req, res) => {
  const cached = poller.getCached('cost:daily');
  json(res, cached || await computeUsage());
});

// Stats cache
addRoute('GET', '/api/stats', (_req, res) => {
  json(res, getStatsCache() || {});
});

// Activity
addRoute('GET', '/api/activity', (_req, res) => {
  const cached = poller.getCached('activity');
  json(res, cached || getRecentActivity());
});

// File preview (read-only, for drag-drop file viewer)
addRoute('GET', '/api/file', async (req, res) => {
  const filePath = new URL(req.url, 'http://localhost').searchParams.get('path');
  if (!filePath) return json(res, { error: 'Missing path' }, 400);
  // Path traversal guard: only allow files inside registered project directories
  const normalPath = filePath.replace(/\\/g, '/').toLowerCase();
  const allowed = getProjects().some(p => normalPath.startsWith(p.path.replace(/\\/g, '/').toLowerCase()));
  if (!allowed) return json(res, { error: 'Access denied: path outside project directories' }, 403);
  try {
    const st = await stat(filePath);
    if (st.size > 2 * 1024 * 1024) return json(res, { error: 'File too large (>2MB)' }, 413);
    const content = await readFile(filePath, 'utf8');
    json(res, { path: filePath, name: filePath.replace(/\\/g, '/').split('/').pop(), size: st.size, content });
  } catch (e) { json(res, { error: e.message }, 404); }
});

// Open a file in IDE
addRoute('POST', '/api/open-in-ide', async (req, res) => {
  const body = await readBody(req);
  const filePath = body.path;
  const ide = body.ide || 'code';
  if (!filePath) return json(res, { error: 'Missing path' }, 400);
  const known = ['code', 'cursor', 'windsurf', 'antigravity'];
  if (!known.includes(ide)) return json(res, { error: 'Unknown IDE' }, 400);
  const winPath = filePath.replace(/\//g, '\\');
  spawn(ide, [winPath], { detached: true, stdio: 'ignore', shell: true, windowsHide: true }).unref();
  json(res, { opened: true });
});

// Open containing folder in Explorer
addRoute('POST', '/api/open-folder', async (req, res) => {
  const body = await readBody(req);
  if (!body.path) return json(res, { error: 'Missing path' }, 400);
  const winPath = body.path.replace(/\//g, '\\');
  spawn('explorer', ['/select,', winPath], { detached: true, stdio: 'ignore', shell: false, windowsHide: true }).unref();
  json(res, { opened: true });
});

// Notification toggle (syncs client toggle to server-side notifications)
addRoute('POST', '/api/notify/toggle', async (req, res) => {
  const body = await readBody(req);
  _notifyEnabled = body.enabled !== false;
  json(res, { enabled: _notifyEnabled });
});

// Session control
addRoute('POST', '/api/sessions/:id/start', async (req, res) => {
  const project = getProjectById(req.params.id);
  if (!project) return json(res, { error: 'Not found' }, 404);
  const body = await readBody(req);
  json(res, startSession(project, body));
});

addRoute('POST', '/api/sessions/:id/resume', async (req, res) => {
  const project = getProjectById(req.params.id);
  if (!project) return json(res, { error: 'Not found' }, 404);
  const body = await readBody(req);
  json(res, resumeSession(project, body.sessionId));
});

// Git diff viewer
addRoute('GET', '/api/projects/:id/diff', async (req, res) => {
  const project = getProjectById(req.params.id);
  if (!project) return json(res, { error: 'Not found' }, 404);
  const winPath = project.path.replace(/\//g, '\\');
  const opts = { timeout: 10000, maxBuffer: 5 * 1024 * 1024 };
  // Parse files + stats directly from diff output (avoids extra git commands)
  const parseDiffFiles = (diffText) => {
    if (!diffText || !diffText.trim()) return [];
    const files = [];
    const chunks = diffText.split(/(?=^diff --git )/m);
    for (const chunk of chunks) {
      if (!chunk.startsWith('diff ')) continue;
      const m = chunk.match(/^diff --git a\/.+ b\/(.+)$/m);
      if (!m) continue;
      const file = m[1];
      let status = 'M';
      if (/^new file mode/m.test(chunk)) status = 'A';
      else if (/^deleted file mode/m.test(chunk)) status = 'D';
      else if (/^rename from/m.test(chunk)) status = 'R';
      let additions = 0, deletions = 0;
      for (const line of chunk.split('\n')) {
        if (line.startsWith('+') && !line.startsWith('+++')) additions++;
        else if (line.startsWith('-') && !line.startsWith('---')) deletions++;
      }
      files.push({ file, status, additions, deletions });
    }
    return files;
  };
  try {
    const maxLines = 3000;
    const gitArgs = (extra) => ['git', ['-C', winPath, ...extra], opts];
    const [stagedDiff, unstagedDiff] = await Promise.all([
      execFileAsync(...gitArgs(['diff', '--cached', '-U3'])),
      execFileAsync(...gitArgs(['diff', '-U3'])),
    ]);
    const stagedFiles = parseDiffFiles(stagedDiff.stdout);
    const unstagedFiles = parseDiffFiles(unstagedDiff.stdout);
    const truncate = (text) => {
      const lines = text.split('\n');
      if (lines.length <= maxLines) return text;
      return lines.slice(0, maxLines).join('\n') + '\n\n... truncated (' + lines.length + ' total lines) ...';
    };
    json(res, {
      projectId: project.id,
      staged: { diff: truncate(stagedDiff.stdout), files: stagedFiles },
      unstaged: { diff: truncate(unstagedDiff.stdout), files: unstagedFiles }
    });
  } catch {
    json(res, { projectId: project.id, staged: { diff: '', files: [] }, unstaged: { diff: '', files: [] } });
  }
});

// ──────────── Auto Commit (Haiku AI) ────────────

function callClaude(prompt, { timeoutMs = 60000, model = 'haiku' } = {}) {
  return new Promise((resolve, reject) => {
    // Use .cmd extension on Windows (required for npm global bins without shell:true)
    const claudeBin = process.platform === 'win32' ? 'claude.cmd' : 'claude';
    const child = spawn(claudeBin, ['-p', '--model', model], {
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true
    });
    let stdout = '', stderr = '', done = false;
    const timer = setTimeout(() => {
      if (done) return;
      done = true;
      try { child.kill('SIGKILL'); } catch {}
      reject(new Error('Claude CLI timed out'));
    }, timeoutMs);
    child.stdout.on('data', chunk => { stdout += chunk; });
    child.stderr.on('data', chunk => { stderr += chunk; });
    child.on('error', err => { if (!done) { done = true; clearTimeout(timer); reject(new Error(`Failed to run claude CLI: ${err.message}`)); } });
    child.on('close', code => {
      if (done) return;
      done = true; clearTimeout(timer);
      if (code !== 0) reject(new Error(stderr.trim() || `claude exited with code ${code}`));
      else resolve(stdout.trim());
    });
    child.stdin.write(prompt);
    child.stdin.end();
  });
}

addRoute('POST', '/api/projects/:id/generate-commit-msg', async (req, res) => {
  const project = getProjectById(req.params.id);
  if (!project) return json(res, { error: 'Not found' }, 404);
  const winPath = project.path.replace(/\//g, '\\');
  const opts = { timeout: 10000, maxBuffer: 5 * 1024 * 1024 };
  try {
    const result = await withGitLock(project.id, async () => {
      const [statusOut, diffOut] = await Promise.all([
        execFileAsync('git', ['-C', winPath, 'diff', '--cached', '--stat'], opts),
        execFileAsync('git', ['-C', winPath, 'diff', '--cached', '-U2'], opts),
      ]);
      return { stat: statusOut.stdout.trim(), diff: diffOut.stdout };
    });
    if (!result.stat) return json(res, { error: 'No staged changes' }, 400);
    const diff = result.diff.length > 15000 ? result.diff.slice(0, 15000) + '\n...(truncated)' : result.diff;
    const prompt = `Generate a concise git commit message for these staged changes. Use conventional commits format (feat:, fix:, refactor:, docs:, style:, chore:, test:). Return ONLY the commit message, nothing else. No quotes, no explanation.\n\nStat:\n${result.stat}\n\nDiff:\n${diff}`;
    const message = await callClaude(prompt);
    const clean = message.replace(/^["'`]+|["'`]+$/g, '').replace(/^```\n?|```$/g, '').trim();
    json(res, { message: clean });
  } catch (err) {
    json(res, { error: err.message }, 500);
  }
});

addRoute('POST', '/api/projects/:id/auto-commit/plan', async (req, res) => {
  const project = getProjectById(req.params.id);
  if (!project) return json(res, { error: 'Not found' }, 404);

  const winPath = project.path.replace(/\//g, '\\');
  const opts = { timeout: 15000, maxBuffer: 5 * 1024 * 1024 };

  try {
    const gitResult = await withGitLock(project.id, async () => {
      const [statusOut, stagedDiffOut, unstagedDiffOut] = await Promise.all([
        execFileAsync('git', ['-C', winPath, 'status', '--porcelain'], opts),
        execFileAsync('git', ['-C', winPath, 'diff', '--cached', '-U2'], opts),
        execFileAsync('git', ['-C', winPath, 'diff', '-U2'], opts),
      ]);
      return { status: statusOut.stdout.trim(), stagedDiff: stagedDiffOut.stdout, unstagedDiff: unstagedDiffOut.stdout };
    });

    const status = gitResult.status;
    if (!status) return json(res, { commits: [], message: 'No changes to commit' });

    const allDiff = (gitResult.stagedDiff + '\n' + gitResult.unstagedDiff).trim();
    const diffTruncated = allDiff.length > 20000;
    const truncatedDiff = diffTruncated ? allDiff.slice(0, 20000) + '\n...(truncated)' : allDiff;

    // Use model from request body if provided (default haiku)
    const body = await readBody(req).catch(() => ({}));
    const model = body.model || 'haiku';

    const prompt = `Analyze these git changes and group them into logical commits. Return ONLY valid JSON, no markdown fences.
${diffTruncated ? '\n⚠ NOTE: Diff was truncated. Rely on git status for the full file list. Group unknown files by directory/purpose.\n' : ''}
Git status:
${status}

Diff (context for grouping):
${truncatedDiff}

Return JSON in this exact format:
{"commits":[{"message":"type: description","files":["file1","file2"],"reasoning":"why grouped"}]}

Example output for reference:
{"commits":[
  {"message":"feat: add user authentication middleware","files":["src/middleware/auth.ts","src/types/auth.ts","src/config/jwt.ts"],"reasoning":"All related to the new auth feature"},
  {"message":"fix: resolve date formatting in reports","files":["src/utils/date.ts","src/components/ReportTable.tsx"],"reasoning":"Bug fix for date display issue"},
  {"message":"chore: update dependencies and config","files":["package.json","package-lock.json",".eslintrc.js"],"reasoning":"Dependency updates and tooling config"}
]}

Rules:
- Group related changes (same feature/fix/refactor) together
- Conventional commits: feat: (new feature), fix: (bug fix), refactor: (restructure), docs:, style: (formatting), chore: (deps/config/build), test:
- Concise but descriptive messages in English
- Include ALL files from git status (use the file paths from status, not diff headers)
- File paths from status are in column 4+ (after the 2-char status and a space)
- For renamed files (R status), use the new path
- Order: dependencies/config first, then core logic, then UI, then tests
- Prefer fewer commits (2-5) with clear logical grouping over many tiny commits
- If unsure about a file's purpose, group it with nearby directory siblings`;

    const text = await callClaude(prompt, { model });

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return json(res, { error: 'Failed to parse AI response', raw: text }, 500);

    const plan = JSON.parse(jsonMatch[0]);
    if (diffTruncated) plan.truncated = true;
    json(res, plan);
  } catch (err) {
    json(res, { error: err.message }, 500);
  }
});

addRoute('POST', '/api/projects/:id/auto-commit/execute', async (req, res) => {
  const project = getProjectById(req.params.id);
  if (!project) return json(res, { error: 'Not found' }, 404);

  const body = await readBody(req);
  const { message, files } = body;
  if (!message || !files?.length) return json(res, { error: 'message and files required' }, 400);

  const winPath = project.path.replace(/\//g, '\\');
  const opts = { timeout: 10000, maxBuffer: 1024 * 1024 };

  try {
    const result = await withGitLock(project.id, async () => {
      await execFileAsync('git', ['-C', winPath, 'reset', 'HEAD'], opts).catch(() => {});
      await execFileAsync('git', ['-C', winPath, 'add', '--', ...files], opts);
      await execFileAsync('git', ['-C', winPath, 'commit', '-m', message], opts);
      const newStatus = await execFileAsync('git', ['-C', winPath, 'status', '--porcelain'], opts).catch(() => ({ stdout: '' }));
      return newStatus.stdout.trim().split('\n').filter(Boolean).length;
    });
    json(res, { success: true, message, files, remaining: result });
  } catch (err) {
    json(res, { error: err.message }, 500);
  }
});

// ──────────── Git Stage / Unstage / Discard / Commit ────────────

addRoute('POST', '/api/projects/:id/git/stage', async (req, res) => {
  const project = getProjectById(req.params.id);
  if (!project) return json(res, { error: 'Not found' }, 404);
  const body = await readBody(req);
  const files = body.files; // array of file paths, or ['--all']
  if (!files?.length) return json(res, { error: 'files required' }, 400);
  const winPath = project.path.replace(/\//g, '\\');
  const gopts = { timeout: 10000, maxBuffer: 1024 * 1024 };
  try {
    await withGitLock(project.id, () =>
      files[0] === '--all'
        ? execFileAsync('git', ['-C', winPath, 'add', '-A'], gopts)
        : execFileAsync('git', ['-C', winPath, 'add', '--', ...files], gopts)
    );
    json(res, { success: true });
  } catch (err) { json(res, { error: err.message }, 500); }
});

addRoute('POST', '/api/projects/:id/git/unstage', async (req, res) => {
  const project = getProjectById(req.params.id);
  if (!project) return json(res, { error: 'Not found' }, 404);
  const body = await readBody(req);
  const files = body.files;
  if (!files?.length) return json(res, { error: 'files required' }, 400);
  const winPath = project.path.replace(/\//g, '\\');
  const gopts = { timeout: 10000, maxBuffer: 1024 * 1024 };
  try {
    await withGitLock(project.id, () =>
      files[0] === '--all'
        ? execFileAsync('git', ['-C', winPath, 'reset', 'HEAD'], gopts)
        : execFileAsync('git', ['-C', winPath, 'reset', 'HEAD', '--', ...files], gopts)
    );
    json(res, { success: true });
  } catch (err) { json(res, { error: err.message }, 500); }
});

addRoute('POST', '/api/projects/:id/git/discard', async (req, res) => {
  const project = getProjectById(req.params.id);
  if (!project) return json(res, { error: 'Not found' }, 404);
  const body = await readBody(req);
  const files = body.files;
  if (!files?.length) return json(res, { error: 'files required' }, 400);
  const winPath = project.path.replace(/\//g, '\\');
  const gopts = { timeout: 10000, maxBuffer: 1024 * 1024 };
  try {
    await withGitLock(project.id, async () => {
      // Restore tracked files
      await execFileAsync('git', ['-C', winPath, 'checkout', '--', ...files], gopts).catch(() => {});
      // Clean untracked files (batched in single call)
      await execFileAsync('git', ['-C', winPath, 'clean', '-f', '--', ...files], gopts).catch(() => {});
    });
    json(res, { success: true });
  } catch (err) { json(res, { error: err.message }, 500); }
});

addRoute('POST', '/api/projects/:id/git/commit', async (req, res) => {
  const project = getProjectById(req.params.id);
  if (!project) return json(res, { error: 'Not found' }, 404);
  const body = await readBody(req);
  const message = body.message;
  if (!message) return json(res, { error: 'message required' }, 400);
  const winPath = project.path.replace(/\//g, '\\');
  try {
    await withGitLock(project.id, () =>
      execFileAsync('git', ['-C', winPath, 'commit', '-m', message], { timeout: 10000, maxBuffer: 1024 * 1024 })
    );
    json(res, { success: true });
  } catch (err) { json(res, { error: err.message }, 500); }
});

addRoute('POST', '/api/projects/:id/git/checkout', async (req, res) => {
  const project = getProjectById(req.params.id);
  if (!project) return json(res, { error: 'Not found' }, 404);
  const body = await readBody(req);
  const branch = body.branch;
  if (!branch) return json(res, { error: 'branch required' }, 400);
  const winPath = project.path.replace(/\//g, '\\');
  const gopts = { timeout: 15000, maxBuffer: 1024 * 1024 };
  try {
    await withGitLock(project.id, async () => {
      try { await execFileAsync('git', ['-C', winPath, 'switch', branch], gopts); }
      catch { await execFileAsync('git', ['-C', winPath, 'checkout', branch], gopts); }
    });
    json(res, { success: true, branch });
  } catch (err) { json(res, { error: err.message }, 500); }
});

addRoute('POST', '/api/projects/:id/push', async (req, res) => {
  const project = getProjectById(req.params.id);
  if (!project) return json(res, { error: 'Not found' }, 404);

  const winPath = project.path.replace(/\//g, '\\');

  try {
    const result = await withGitLock(project.id, () =>
      execFileAsync('git', ['-C', winPath, 'push'], { timeout: 30000, maxBuffer: 1024 * 1024 })
    );
    json(res, { success: true, output: (result.stdout + ' ' + result.stderr).trim() });
  } catch (err) {
    json(res, { error: err.message }, 500);
  }
});

// ──────────── Git Pull / Fetch / Stash / Branch ────────────

addRoute('POST', '/api/projects/:id/pull', async (req, res) => {
  const project = getProjectById(req.params.id);
  if (!project) return json(res, { error: 'Not found' }, 404);
  const winPath = project.path.replace(/\//g, '\\');
  try {
    const result = await withGitLock(project.id, () =>
      execFileAsync('git', ['-C', winPath, 'pull'], { timeout: 30000, maxBuffer: 1024 * 1024 })
    );
    json(res, { success: true, output: (result.stdout + ' ' + result.stderr).trim() });
  } catch (err) { json(res, { error: err.message }, 500); }
});

addRoute('POST', '/api/projects/:id/fetch', async (req, res) => {
  const project = getProjectById(req.params.id);
  if (!project) return json(res, { error: 'Not found' }, 404);
  const winPath = project.path.replace(/\//g, '\\');
  try {
    const result = await withGitLock(project.id, () =>
      execFileAsync('git', ['-C', winPath, 'fetch', '--all', '--prune'], { timeout: 30000, maxBuffer: 1024 * 1024 })
    );
    json(res, { success: true, output: (result.stdout + ' ' + result.stderr).trim() });
  } catch (err) { json(res, { error: err.message }, 500); }
});

addRoute('POST', '/api/projects/:id/git/stash', async (req, res) => {
  const project = getProjectById(req.params.id);
  if (!project) return json(res, { error: 'Not found' }, 404);
  const body = await readBody(req);
  const winPath = project.path.replace(/\//g, '\\');
  const gopts = { timeout: 10000, maxBuffer: 1024 * 1024 };
  try {
    await withGitLock(project.id, async () => {
      const args = ['-C', winPath, 'stash', 'push', '-m', body.message || `Cockpit stash ${new Date().toLocaleString()}`];
      if (body.includeUntracked) args.push('-u');
      await execFileAsync('git', args, gopts);
    });
    json(res, { success: true });
  } catch (err) { json(res, { error: err.message }, 500); }
});

addRoute('POST', '/api/projects/:id/git/stash-pop', async (req, res) => {
  const project = getProjectById(req.params.id);
  if (!project) return json(res, { error: 'Not found' }, 404);
  const body = await readBody(req);
  const winPath = project.path.replace(/\//g, '\\');
  try {
    await withGitLock(project.id, () => {
      const args = ['-C', winPath, 'stash', 'pop'];
      if (body.ref) args.push(body.ref);
      return execFileAsync('git', args, { timeout: 10000, maxBuffer: 1024 * 1024 });
    });
    json(res, { success: true });
  } catch (err) { json(res, { error: err.message }, 500); }
});

addRoute('POST', '/api/projects/:id/git/stash-apply', async (req, res) => {
  const project = getProjectById(req.params.id);
  if (!project) return json(res, { error: 'Not found' }, 404);
  const body = await readBody(req);
  const ref = body.ref || 'stash@{0}';
  const winPath = project.path.replace(/\//g, '\\');
  try {
    await withGitLock(project.id, () =>
      execFileAsync('git', ['-C', winPath, 'stash', 'apply', ref], { timeout: 10000, maxBuffer: 1024 * 1024 })
    );
    json(res, { success: true });
  } catch (err) { json(res, { error: err.message }, 500); }
});

addRoute('POST', '/api/projects/:id/git/stash-drop', async (req, res) => {
  const project = getProjectById(req.params.id);
  if (!project) return json(res, { error: 'Not found' }, 404);
  const body = await readBody(req);
  const ref = body.ref || 'stash@{0}';
  const winPath = project.path.replace(/\//g, '\\');
  try {
    await withGitLock(project.id, () =>
      execFileAsync('git', ['-C', winPath, 'stash', 'drop', ref], { timeout: 10000, maxBuffer: 1024 * 1024 })
    );
    json(res, { success: true });
  } catch (err) { json(res, { error: err.message }, 500); }
});

addRoute('GET', '/api/projects/:id/stash-list', async (req, res) => {
  const project = getProjectById(req.params.id);
  if (!project) return json(res, { error: 'Not found' }, 404);
  const winPath = project.path.replace(/\//g, '\\');
  try {
    const { stdout } = await execFileAsync('git', ['-C', winPath, 'stash', 'list', '--format=%gd|%s|%cr'], { timeout: 5000 });
    const stashes = stdout.trim() ? stdout.trim().split('\n').map(line => {
      const [ref, msg, ago] = line.split('|');
      return { ref, message: msg || '', ago: ago || '' };
    }) : [];
    json(res, { projectId: project.id, stashes });
  } catch { json(res, { projectId: project.id, stashes: [] }); }
});

addRoute('POST', '/api/projects/:id/git/create-branch', async (req, res) => {
  const project = getProjectById(req.params.id);
  if (!project) return json(res, { error: 'Not found' }, 404);
  const body = await readBody(req);
  const branch = body.branch;
  if (!branch || !/^[a-zA-Z0-9._\-/]+$/.test(branch)) return json(res, { error: 'Invalid branch name' }, 400);
  const winPath = project.path.replace(/\//g, '\\');
  try {
    await withGitLock(project.id, () =>
      execFileAsync('git', ['-C', winPath, 'checkout', '-b', branch], { timeout: 10000, maxBuffer: 1024 * 1024 })
    );
    json(res, { success: true, branch });
  } catch (err) { json(res, { error: err.message }, 500); }
});

addRoute('POST', '/api/projects/:id/git/delete-branch', async (req, res) => {
  const project = getProjectById(req.params.id);
  if (!project) return json(res, { error: 'Not found' }, 404);
  const body = await readBody(req);
  const branch = body.branch;
  if (!branch) return json(res, { error: 'branch required' }, 400);
  if (['main', 'master'].includes(branch)) return json(res, { error: 'Cannot delete main/master' }, 400);
  const winPath = project.path.replace(/\//g, '\\');
  try {
    await withGitLock(project.id, () =>
      execFileAsync('git', ['-C', winPath, 'branch', '-D', branch], { timeout: 10000, maxBuffer: 1024 * 1024 })
    );
    json(res, { success: true, branch });
  } catch (err) { json(res, { error: err.message }, 500); }
});

// Git log (commit history)
addRoute('GET', '/api/projects/:id/git/log', async (req, res) => {
  const project = getProjectById(req.params.id);
  if (!project) return json(res, { error: 'Not found' }, 404);
  const winPath = project.path.replace(/\//g, '\\');
  const limit = Math.min(parseInt(new URL(req.url, 'http://x').searchParams.get('limit') || '30'), 100);
  try {
    const { stdout } = await execFileAsync('git', [
      '-C', winPath, 'log', `--max-count=${limit}`,
      '--format=%H|%h|%an|%ae|%ar|%s'
    ], { timeout: 10000, maxBuffer: 1024 * 512 });
    const commits = stdout.trim() ? stdout.trim().split('\n').map(line => {
      const [hash, short, author, email, ago, ...msgParts] = line.split('|');
      return { hash, short, author, email, ago, message: msgParts.join('|') };
    }) : [];
    json(res, { projectId: project.id, commits });
  } catch { json(res, { projectId: project.id, commits: [] }); }
});

// Settings export
addRoute('GET', '/api/settings/export', (_req, res) => {
  json(res, { projects: getProjects() });
});

// Settings import
addRoute('POST', '/api/settings/import', async (req, res) => {
  try {
    const body = await readBody(req);
    const imported = body.projects || [];
    let added = 0;
    const existingPaths = new Set(getProjects().map(p => p.path.replace(/\\/g, '/').toLowerCase()));
    for (const p of imported) {
      if (!p.name || !p.path) continue;
      const normalPath = p.path.replace(/\\/g, '/');
      if (existingPaths.has(normalPath.toLowerCase())) continue;
      const project = addProject({ name: p.name, path: normalPath, stack: p.stack, devCmd: p.devCmd, github: p.github, color: p.color });
      registerProjectPollers(project);
      existingPaths.add(normalPath.toLowerCase());
      added++;
    }
    json(res, { success: true, imported: added });
  } catch (err) { json(res, { error: err.message }, 500); }
});

// Discover Claude projects
addRoute('GET', '/api/discover-projects', (_req, res) => {
  const existingPaths = getProjects().map(p => p.path.replace(/\\/g, '/'));
  json(res, discoverProjects(existingPaths));
});

// Bulk add discovered projects
addRoute('POST', '/api/discover-projects/add', async (req, res) => {
  const body = await readBody(req);
  const paths = body.projects; // array of { path, name }
  if (!paths?.length) return json(res, { error: 'projects required' }, 400);
  let added = 0;
  const existingPaths = new Set(getProjects().map(p => p.path.replace(/\\/g, '/').toLowerCase()));
  for (const p of paths) {
    if (!p.path || !p.name) continue;
    const normalPath = p.path.replace(/\\/g, '/');
    if (existingPaths.has(normalPath.toLowerCase())) continue;
    const project = addProject({ name: p.name, path: normalPath });
    registerProjectPollers(project);
    existingPaths.add(normalPath.toLowerCase());
    added++;
  }
  json(res, { success: true, added });
});

// ──────────── Polling ────────────

const _prevSessionStates = new Map();
let _notifyEnabled = true;

function registerProjectPollers(project) {
  poller.register(`session:${project.id}`, () => {
    const result = detectSessionState(project);
    const prev = _prevSessionStates.get(project.id);
    _prevSessionStates.set(project.id, result.state);
    if (_notifyEnabled && prev && prev !== result.state) {
      const wasActive = prev === 'busy' || prev === 'waiting';
      if (wasActive && result.state === 'idle') {
        showNotification(`${project.name} — Session Complete`, 'Claude session finished.');
      }
    }
    return result;
  }, POLL_INTERVALS.sessionStatus, 'session:status');
  poller.register(`git:${project.id}`, () => getGitStatus(project), POLL_INTERVALS.gitStatus, 'git:update');
  poller.register(`pr:${project.id}`, () => getGitHubPRs(project), POLL_INTERVALS.prStatus, 'pr:update');
}

for (const project of getProjects()) {
  registerProjectPollers(project);
}

poller.register('cost:daily', computeUsage, POLL_INTERVALS.costData, 'cost:update');
poller.register('activity', () => getRecentActivity(), POLL_INTERVALS.activity, 'activity:new');

// ──────────── IDE Launcher ────────────

addRoute('POST', '/api/projects/:id/open-ide', async (req, res) => {
  const project = getProjectById(req.params.id);
  if (!project) return json(res, { error: 'Not found' }, 404);
  const body = await readBody(req);
  const ide = body.ide || 'code';
  const winPath = project.path.replace(/\//g, '\\');

  const known = ['code', 'cursor', 'windsurf', 'antigravity'];
  if (!known.includes(ide)) return json(res, { error: 'Unknown IDE' }, 400);

  spawn(ide, [winPath], { detached: true, stdio: 'ignore', shell: true, windowsHide: true }).unref();
  json(res, { opened: true, ide, projectId: project.id });
});

// Branches + worktrees for terminal creation
addRoute('GET', '/api/projects/:id/branches', async (req, res) => {
  const project = getProjectById(req.params.id);
  if (!project) return json(res, { error: 'Not found' }, 404);
  const branches = await getBranches(project);
  const gitData = poller.getCached(`git:${project.id}`);
  json(res, { ...branches, worktrees: gitData?.worktrees || [] });
});

// ──────────── Package.json Scripts ────────────
addRoute('GET', '/api/scripts-by-path', async (req, res) => {
  const projectPath = req.query?.path;
  if (!projectPath) return json(res, { error: 'path required' }, 400);
  const pkgPath = join(projectPath.replace(/\//g, '\\'), 'package.json');
  try {
    const raw = await readFile(pkgPath, 'utf8');
    const pkg = JSON.parse(raw);
    json(res, { scripts: pkg.scripts || {} });
  } catch {
    json(res, { scripts: {} });
  }
});

// ──────────── Dev Server Management ────────────
const devServers = new Map(); // projectId → { process, command, startedAt, port }

function broadcastDevStatus() {
  const list = [];
  for (const [pid, ds] of devServers) {
    list.push({ projectId: pid, command: ds.command, startedAt: ds.startedAt, port: ds.port });
  }
  poller.broadcast('dev:status', { running: list });
}

addRoute('GET', '/api/dev-servers', (req, res) => {
  const list = [];
  for (const [pid, ds] of devServers) {
    const p = getProjectById(pid);
    list.push({ projectId: pid, name: p?.name || pid, command: ds.command, startedAt: ds.startedAt, port: ds.port });
  }
  json(res, { running: list });
});

addRoute('POST', '/api/projects/:id/dev-server/start', async (req, res) => {
  const project = getProjectById(req.params.id);
  if (!project) return json(res, { error: 'Not found' }, 404);
  if (devServers.has(project.id)) return json(res, { error: 'Already running' }, 409);
  const cmd = project.devCmd;
  if (!cmd) return json(res, { error: 'No devCmd configured' }, 400);
  const winPath = project.path.replace(/\//g, '\\');
  const child = spawn(cmd, [], { cwd: winPath, stdio: ['ignore', 'pipe', 'pipe'], shell: true, windowsHide: true });
  child.unref();
  const ds = { process: child, command: cmd, startedAt: Date.now(), port: null };
  devServers.set(project.id, ds);
  // Scan stdout/stderr for port numbers (e.g. "localhost:3000", ":5173", "port 8080")
  const portRe = /(?:localhost|127\.0\.0\.1|0\.0\.0\.0):(\d{4,5})\b|(?:port\s*[=:]?\s*)(\d{4,5})\b|https?:\/\/[^:/\s]+:(\d{4,5})\b/i;
  const scanPort = (data) => {
    if (ds.port) return;
    const m = data.toString().match(portRe);
    if (m) {
      const port = parseInt(m[1] || m[2] || m[3], 10);
      if (port >= 1024 && port <= 65535) { ds.port = port; broadcastDevStatus(); }
    }
  };
  if (child.stdout) child.stdout.on('data', scanPort);
  if (child.stderr) child.stderr.on('data', scanPort);
  child.on('exit', () => { devServers.delete(project.id); broadcastDevStatus(); });
  broadcastDevStatus();
  json(res, { started: true, projectId: project.id });
});

addRoute('POST', '/api/projects/:id/dev-server/stop', async (req, res) => {
  const project = getProjectById(req.params.id);
  if (!project) return json(res, { error: 'Not found' }, 404);
  const ds = devServers.get(project.id);
  if (!ds) return json(res, { error: 'Not running' }, 404);
  try {
    if (process.platform === 'win32') {
      execFile('taskkill', ['/pid', String(ds.process.pid), '/T', '/F'], { timeout: 5000 }, () => {});
    } else {
      process.kill(-ds.process.pid, 'SIGTERM');
    }
  } catch {}
  devServers.delete(project.id);
  broadcastDevStatus();
  json(res, { stopped: true, projectId: project.id });
});

// ──────────── Server ────────────

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  // LAN auth: token via query param sets cookie and redirects
  if (!isLocalhost(req) && url.searchParams.get('token') === LAN_TOKEN) {
    res.writeHead(200, {
      'Set-Cookie': `${TOKEN_COOKIE}=${LAN_TOKEN};path=/;max-age=${COOKIE_MAX_AGE};SameSite=Lax`,
      'Content-Type': 'text/html'
    });
    res.end(`<html><head><meta http-equiv="refresh" content="0;url=/"></head><body>Redirecting...</body></html>`);
    return;
  }

  // LAN auth: block unauthenticated requests
  if (!isAuthenticated(req)) {
    serveLoginPage(res);
    return;
  }

  const route = matchRoute(req.method, url.pathname);

  if (route) {
    req.params = route.params;
    req.query = Object.fromEntries(url.searchParams);
    try {
      await route.handler(req, res);
    } catch (err) {
      console.error('[Server]', err);
      if (!res.writableEnded) json(res, { error: 'Internal error' }, 500);
    }
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

// ──────────── WebSocket Terminal ────────────

const wss = new WebSocketServer({
  server,
  verifyClient: ({ req }) => isAuthenticated(req)
});

// Clean env for child terminals: remove CLAUDECODE to allow nested claude launches
const cleanEnv = { ...process.env, TERM: 'xterm-256color' };
delete cleanEnv.CLAUDECODE;

// Track active PTY processes: Map<termId, { pty, projectId, buffer, command }>
const terminals = new Map();
const MAX_BUFFER = 50000;
// Optimized buffer: append to array, join on read
function bufAppend(entry, data) {
  entry._bufArr.push(data);
  entry._bufLen += data.length;
  while (entry._bufLen > MAX_BUFFER && entry._bufArr.length > 1) {
    entry._bufLen -= entry._bufArr.shift().length;
  }
}
function bufRead(entry) { return entry._bufArr.join(''); }

// ── Session State Persistence (tmux-resurrect style) ──

let _saveQueued = false;
function saveTerminalState() {
  if (_saveQueued) return; // debounce
  _saveQueued = true;
  queueMicrotask(async () => {
    _saveQueued = false;
    const st = [];
    for (const [id, t] of terminals) {
      st.push({ termId: id, projectId: t.projectId, command: t.command || '' });
    }
    if (st.length === 0 && !existsSync(STATE_FILE)) return;
    try {
      await writeFile(STATE_FILE, JSON.stringify({ terminals: st, timestamp: Date.now() }));
      if (st.length > 0) console.log(`[State] Saved ${st.length} terminal(s)`);
    } catch (err) {
      console.error('[State] Save error:', err.message);
    }
  });
}

function loadTerminalState() {
  try {
    if (!existsSync(STATE_FILE)) return null;
    const data = JSON.parse(readFileSync(STATE_FILE, 'utf8'));
    // Only restore if less than 24 hours old
    if (Date.now() - data.timestamp > 24 * 60 * 60 * 1000) {
      try { unlinkSync(STATE_FILE); } catch {}
      return null;
    }
    return data;
  } catch { return null; }
}

function restoreTerminals() {
  const saved = loadTerminalState();
  if (!saved?.terminals?.length) return null;

  const idMap = {};
  const restored = [];

  for (const entry of saved.terminals) {
    const project = getProjectById(entry.projectId);
    if (!project) continue;

    const newTermId = `${entry.projectId}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const shell = process.platform === 'win32' ? 'powershell.exe' : 'bash';
    const cwd = project.path.replace(/\//g, '\\');

    const term = pty.spawn(shell, [], {
      name: 'xterm-256color',
      cols: 120, rows: 30, cwd,
      env: cleanEnv
    });

    term.onData((data) => {
      const e = terminals.get(newTermId);
      if (e) bufAppend(e, data);
      const msg = JSON.stringify({ type: 'output', termId: newTermId, data });
      for (const client of wss.clients) {
        try { client.send(msg); } catch {}
      }
    });

    term.onExit(({ exitCode }) => {
      terminals.delete(newTermId);
      const msg = JSON.stringify({ type: 'exit', termId: newTermId, exitCode });
      for (const client of wss.clients) {
        try { client.send(msg); } catch {}
      }
    });

    terminals.set(newTermId, { pty: term, projectId: entry.projectId, _bufArr: [], _bufLen: 0, command: entry.command || '' });
    idMap[entry.termId] = newTermId;
    restored.push({ termId: newTermId, projectId: entry.projectId });

    // Re-run the command that was running (claude, claude --continue, etc.)
    if (entry.command) {
      setTimeout(() => term.write(entry.command + '\r'), 500);
    }
  }

  // Clean up state file after successful restore
  try { unlinkSync(STATE_FILE); } catch {}

  console.log(`[State] Restored ${restored.length} terminal(s) from saved state`);
  return { idMap, restored };
}

// Auto-save terminal state every 30 seconds
setInterval(saveTerminalState, 30000);

// Save on shutdown
function onShutdown() {
  saveTerminalState();
  for (const [, t] of terminals) { try { t.pty.kill(); } catch {} }
  // Kill dev server processes
  for (const [, ds] of devServers) {
    try {
      if (process.platform === 'win32') {
        execFile('taskkill', ['/pid', String(ds.process.pid), '/T', '/F'], { timeout: 3000 }, () => {});
      } else {
        process.kill(-ds.process.pid, 'SIGTERM');
      }
    } catch {}
  }
  devServers.clear();
}
process.on('SIGINT', () => { onShutdown(); process.exit(0); });
process.on('SIGTERM', () => { onShutdown(); process.exit(0); });

let _terminalsRestored = false;
wss.on('connection', (ws) => {
  let currentTermId = null;

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    switch (msg.type) {
      case 'create': {
        // Create a new PTY terminal for a project
        const project = getProjectById(msg.projectId);
        if (!project) { ws.send(JSON.stringify({ type: 'error', message: 'Unknown project' })); return; }

        const termId = `${msg.projectId}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const projectPath = (msg.cwd || project.path).replace(/\\/g, '/');
        // Detect WSL path: //wsl$/distro/... or //wsl.localhost/distro/...
        const wslMatch = projectPath.match(/^\/\/wsl[\$.](?:localhost)?\/([^/]+)(\/.*)/i);
        let shell, shellArgs, cwd;
        if (wslMatch) {
          const distro = wslMatch[1];
          const wslCwd = wslMatch[2]; // Linux-style path
          shell = 'wsl.exe';
          shellArgs = ['-d', distro, '--cd', wslCwd];
          cwd = process.env.SYSTEMROOT || 'C:\\Windows';
        } else {
          shell = process.platform === 'win32' ? 'powershell.exe' : 'bash';
          shellArgs = [];
          cwd = projectPath.replace(/\//g, '\\');
        }

        const term = pty.spawn(shell, shellArgs, {
          name: 'xterm-256color',
          cols: msg.cols || 120,
          rows: msg.rows || 30,
          cwd,
          env: cleanEnv
        });

        term.onData((data) => {
          const entry = terminals.get(termId);
          if (entry) bufAppend(entry, data);
          // Broadcast to all connected WS clients (serialize once)
          const msg = JSON.stringify({ type: 'output', termId, data });
          for (const client of wss.clients) {
            try { client.send(msg); } catch {}
          }
        });

        term.onExit(({ exitCode }) => {
          terminals.delete(termId);
          const msg = JSON.stringify({ type: 'exit', termId, exitCode });
          for (const client of wss.clients) {
            try { client.send(msg); } catch {}
          }
        });

        terminals.set(termId, { pty: term, projectId: msg.projectId, _bufArr: [], _bufLen: 0, command: msg.command || '' });
        currentTermId = termId;

        // Notify all clients about the new terminal
        const createdMsg = JSON.stringify({ type: 'created', termId, projectId: msg.projectId });
        for (const client of wss.clients) {
          try { client.send(createdMsg); } catch {}
        }

        // Auto-run claude if requested
        if (msg.command) {
          term.write(msg.command + '\r');
        }
        break;
      }

      case 'input': {
        const t = terminals.get(msg.termId);
        if (t) t.pty.write(msg.data);
        break;
      }

      case 'resize': {
        const t = terminals.get(msg.termId);
        if (t) t.pty.resize(msg.cols, msg.rows);
        break;
      }

      case 'kill': {
        const t = terminals.get(msg.termId);
        if (t) { t.pty.kill(); terminals.delete(msg.termId); }
        break;
      }
    }
  });

  ws.on('close', () => {
    // Don't kill terminals on disconnect — they persist
    // User can reconnect and resume
  });

  // On connect: restore from saved state if no active terminals (once only)
  let idMap = null;
  if (terminals.size === 0 && !_terminalsRestored) {
    _terminalsRestored = true;
    const result = restoreTerminals();
    if (result) idMap = result.idMap;
  }

  // Send list of active terminals (+ idMap if restored)
  const active = [];
  for (const [id, t] of terminals) {
    active.push({ termId: id, projectId: t.projectId, buffer: bufRead(t) });
  }
  const msg = { type: 'terminals', active };
  if (idMap) msg.idMap = idMap;
  ws.send(JSON.stringify(msg));
});

// ──────────── Start ────────────

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n  Claude Code Dashboard`);
  console.log(`  http://localhost:${PORT}`);
  // Show network IPs + auth token for mobile access
  const netIPs = getNetworkIPs();
  for (const { ip, type } of netIPs) {
    const label = type === 'tailscale' ? 'Tailscale' : 'LAN';
    console.log(`  http://${ip}:${PORT}?token=${LAN_TOKEN} (${label})`);
  }
  if (netIPs.length) {
    console.log(`\n  Token: ${LAN_TOKEN}`);
    console.log(`  (localhost requires no token)`);
  }
  console.log('');
  if (!process.argv.includes('--no-open')) {
    spawn('cmd', ['/c', 'start', `http://localhost:${PORT}`], { detached: true, stdio: 'ignore' }).unref();
  }
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n  Port ${PORT} is already in use.`);
    console.error(`  Kill the existing process or change PORT in lib/config.js\n`);
    process.exit(1);
  }
  throw err;
});
