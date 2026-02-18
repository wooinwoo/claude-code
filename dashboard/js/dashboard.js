// ─── Dashboard: Overview tab, SSE, stats, cards, charts, usage ───
import { app } from './state.js';
import { esc, timeAgo, showToast, fmtTok, timeUntil, row } from './utils.js';

// ─── Notifications ───
if ('Notification' in window && Notification.permission === 'default') {
  Notification.requestPermission();
}

export function notifySessionChange(projectId, oldState, newState) {
  if (!app.notifyEnabled || Notification.permission !== 'granted') return;
  if (!isNotifEnabledForProject(projectId)) return;
  const project = app.projectList.find(p => p.id === projectId);
  const name = project?.name || projectId;
  const wasActive = oldState === 'busy' || oldState === 'waiting';
  if (wasActive && newState === 'idle') {
    new Notification(`${name} — Session Complete`, {
      body: 'Claude session finished.',
      icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%2334d399"><circle cx="12" cy="12" r="10"/></svg>',
      tag: `session-${projectId}`, silent: false,
    });
  } else if (wasActive && (newState === 'no_data' || newState === 'no_sessions')) {
    new Notification(`${name} — Session Ended`, {
      body: 'Claude session disconnected.',
      icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23f87171"><circle cx="12" cy="12" r="10"/></svg>',
      tag: `session-${projectId}`, silent: false,
    });
  }
}

// ─── Clock ───
export function updateClock() {
  const now = new Date();
  document.getElementById('header-clock').textContent = now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function startClock() {
  app._clockTimer = setInterval(updateClock, 1000);
  updateClock();
}

// ─── SSE ───
export function connectSSE() {
  if (app._sseReconnTimer) { clearTimeout(app._sseReconnTimer); app._sseReconnTimer = null; }
  const es = new EventSource('/api/events');
  es.addEventListener('init', e => {
    app._sseBackoff = 1000;
    app._sseConnectedAt = Date.now();
    const d = JSON.parse(e.data);
    if (d.sessions) Object.entries(d.sessions).forEach(([k, v]) => {
      if (v) { upd(k, 'session', v); app.prevSessionStates.set(k, v.state); }
    });
    if (d.git) Object.entries(d.git).forEach(([k, v]) => { if (v) upd(k, 'git', v); });
    if (d.prs) Object.entries(d.prs).forEach(([k, v]) => { if (v) upd(k, 'prs', v); });
    if (d.costs) { app.state.usage = d.costs; renderCosts(); renderUsage(); }
    if (d.devServers) { app.devServerState = d.devServers; window.updateDevBadge?.(); }
    const changedIds = new Set();
    if (d.sessions) Object.keys(d.sessions).forEach(k => changedIds.add(k));
    if (d.git) Object.keys(d.git).forEach(k => changedIds.add(k));
    if (d.prs) Object.keys(d.prs).forEach(k => changedIds.add(k));
    if (changedIds.size > 0) changedIds.forEach(id => renderCard(id));
    else app.projectList.forEach(p => renderCard(p.id));
    updateSummaryStats();
    fetchUsage();
    setConn(true);
  });
  es.addEventListener('session:status', e => {
    const d = JSON.parse(e.data);
    const oldState = app.prevSessionStates.get(d.projectId);
    const newState = d.state;
    if (oldState && oldState !== newState) notifySessionChange(d.projectId, oldState, newState);
    app.prevSessionStates.set(d.projectId, newState);
    upd(d.projectId, 'session', d);
    renderCard(d.projectId);
    updateSummaryStats();
    window.debouncedUpdateTermHeaders?.();
  });
  es.addEventListener('git:update', e => {
    const d = JSON.parse(e.data);
    upd(d.projectId, 'git', d);
    renderCard(d.projectId);
    updateSummaryStats();
    window.debouncedUpdateTermHeaders?.();
    if (document.getElementById('diff-view')?.classList.contains('active')) {
      const sel = document.getElementById('diff-project');
      if (sel?.value === d.projectId) window.debouncedLoadDiff?.();
    }
  });
  es.addEventListener('pr:update', e => {
    const d = JSON.parse(e.data);
    upd(d.projectId, 'prs', d);
    renderCard(d.projectId);
    updateSummaryStats();
  });
  es.addEventListener('cost:update', e => {
    app.state.usage = JSON.parse(e.data);
    renderCosts();
    renderUsage();
    updateSummaryStats();
  });
  es.addEventListener('dev:status', e => {
    const d = JSON.parse(e.data);
    const newRunning = d.running || [];
    const runIds = new Set(newRunning.map(ds => ds.projectId));
    for (const key of app._knownPorts) {
      if (!runIds.has(key.split(':')[0])) app._knownPorts.delete(key);
    }
    app.devServerState = newRunning;
    for (const ds of newRunning) {
      if (ds.port && app._devStartTimeouts.has(ds.projectId)) {
        clearTimeout(app._devStartTimeouts.get(ds.projectId));
        app._devStartTimeouts.delete(ds.projectId);
      }
    }
    window.updateDevBadge?.();
    app.devServerState.forEach(ds => renderCard(ds.projectId));
    app.projectList.forEach(p => {
      if (!app.devServerState.some(ds => ds.projectId === p.id)) renderCard(p.id);
    });
  });
  es.onerror = () => {
    setConn(false);
    es.close();
    if (app._sseConnectedAt && Date.now() - app._sseConnectedAt > 30000) app._sseBackoff = 1000;
    const jitter = Math.random() * 500;
    app._sseBackoff = Math.min(app._sseBackoff * 1.5, 10000);
    app._sseReconnTimer = setTimeout(connectSSE, app._sseBackoff + jitter);
  };
}

function upd(id, k, v) {
  if (!app.state.projects.has(id)) app.state.projects.set(id, {});
  app.state.projects.get(id)[k] = v;
}

function setConn(v) {
  app.state.connected = v;
  document.getElementById('conn-dot').className = 'conn-dot' + (v ? '' : ' off');
}

// ─── Summary Stats ───
export function updateSummaryStats() {
  let active = 0, totalPrs = 0, totalUncommitted = 0;
  for (const [, p] of app.state.projects) {
    if (p.session?.state === 'busy' || p.session?.state === 'waiting') active++;
    totalPrs += p.prs?.prs?.length || 0;
    totalUncommitted += p.git?.uncommittedCount || 0;
  }
  document.getElementById('stat-active').textContent = active;
  document.getElementById('stat-prs').textContent = totalPrs;
  document.getElementById('stat-uncommitted').textContent = totalUncommitted;
  if (app.state.usage?.today) {
    document.getElementById('stat-today').textContent = fmtTok(app.state.usage.today.outputTokens || 0);
  }
  document.title = active > 0 ? `(${active}) Cockpit` : 'Cockpit';
  updateFavicon(active);
}

// ─── Dynamic Favicon ───
function updateFavicon(activeCount) {
  if (!app._faviconLink) {
    app._faviconLink = document.querySelector('link[rel="icon"]');
    if (!app._faviconLink) {
      app._faviconLink = document.createElement('link');
      app._faviconLink.rel = 'icon';
      app._faviconLink.type = 'image/svg+xml';
      document.head.appendChild(app._faviconLink);
    }
  }
  const color = activeCount > 0 ? '%2334d399' : '%23818cf8';
  app._faviconLink.href = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="${color}"/>${activeCount > 0 ? `<text x="50" y="68" text-anchor="middle" font-size="50" font-weight="bold" fill="white">${activeCount}</text>` : '<path d="M35 50L45 60L65 40" stroke="white" stroke-width="8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'}</svg>`;
}

// ─── View Switching ───
export function switchView(name) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById(`${name}-view`).classList.add('active');
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  document.querySelector(`.nav-tab[onclick*="${name}"]`).classList.add('active');
  if (name === 'terminal') window.renderLayout?.();
  if (name === 'diff') window.loadDiff?.();
  try { localStorage.setItem('dl-view', name); } catch {}
}

// ─── Cards ───
export function renderCard(id) {
  const el = document.getElementById(`card-${id}`);
  if (!el) return;
  const p = app.state.projects.get(id) || {};
  const s = p.session || {}, g = p.git || {}, prs = p.prs?.prs || [];
  const st = s.state || 'no_data';
  el.querySelector('.status').className = `status ${st}`;
  el.querySelector('.status').innerHTML = `<span class="dot"></span>${{ busy: 'Busy', waiting: 'Waiting', idle: 'Idle', no_data: 'No Data', no_sessions: 'No Sessions' }[st] || st}`;
  const q = c => el.querySelector(c);
  if (q('.branch-val')) q('.branch-val').textContent = g.branch || '-';
  if (q('.uncommitted-val')) {
    q('.uncommitted-val').textContent = g.uncommittedCount ?? '-';
    q('.uncommitted-val').classList.toggle('has-changes', (g.uncommittedCount || 0) > 0);
  }
  if (q('.model-val')) q('.model-val').textContent = s.model || '-';
  if (q('.last-val')) q('.last-val').textContent = s.lastActivity ? timeAgo(s.lastActivity) : '-';
  const cl = q('.commits');
  if (cl && g.recentCommits) cl.innerHTML = g.recentCommits.slice(0, 3).map(c => `<li><span style="color:var(--accent-bright)">${c.hash}</span> ${esc(c.message)}</li>`).join('');
  const pl = q('.pr-list');
  if (pl) pl.innerHTML = prs.length ? prs.slice(0, 2).map(pr => `<div class="pr-item"><span class="pr-num">#${pr.number}</span><span class="pr-title">${esc(pr.title)}</span><span class="pr-review ${pr.reviewDecision}">${pr.reviewDecision === 'APPROVED' ? 'OK' : pr.reviewDecision === 'CHANGES_REQUESTED' ? 'Changes' : 'Pending'}</span></div>`).join('') : '';
  const resumeBtn = document.getElementById(`resume-last-${id}`);
  if (resumeBtn) {
    const hasSession = s.sessionId && s.state !== 'no_data' && s.state !== 'no_sessions';
    resumeBtn.style.display = hasSession ? '' : 'none';
    if (hasSession) resumeBtn.title = `Resume session (${s.state})`;
  }
  const devBtn = document.getElementById(`dev-btn-${id}`);
  if (devBtn) {
    const proj = app.projectList.find(pp => pp.id === id);
    const hasCmd = !!proj?.devCmd;
    const isRunning = app.devServerState.some(d => d.projectId === id);
    if (hasCmd) {
      const dsInfo = app.devServerState.find(d => d.projectId === id);
      const hasPort = !!dsInfo?.port;
      const isStarting = isRunning && !hasPort;
      const dotClass = isStarting ? 'spin' : isRunning ? 'on' : 'off';
      const btnClass = isStarting ? ' starting' : isRunning ? ' running' : '';
      const label = isStarting ? 'Starting...' : isRunning ? 'Stop' : 'Dev';
      const portKey = `${id}:${dsInfo?.port}`;
      const isNewPort = hasPort && !app._knownPorts.has(portKey);
      if (isNewPort) app._knownPorts.add(portKey);
      const portTag = hasPort ? `<span class="dev-port${isNewPort ? ' pop' : ''}" onclick="event.stopPropagation();window.open('http://localhost:${dsInfo.port}','_blank')">:${dsInfo.port}</span>` : '';
      devBtn.className = 'btn dev-btn' + btnClass;
      devBtn.innerHTML = `<span class="dev-dot ${dotClass}"></span>${label}${portTag}`;
      devBtn.setAttribute('onclick', `toggleDevServer('${id}')`);
      devBtn.title = proj.devCmd + (hasPort ? ` → localhost:${dsInfo.port}` : '');
    } else {
      devBtn.className = 'btn dev-btn';
      devBtn.innerHTML = `<span class="dev-dot none"></span>Dev`;
      devBtn.setAttribute('onclick', `promptDevCmd('${id}')`);
      devBtn.title = 'Set dev command';
    }
  }
  const ghBtn = document.getElementById(`github-btn-${id}`);
  if (ghBtn) {
    const proj = app.projectList.find(pp => pp.id === id);
    const ghUrl = proj?.github || g.remoteUrl || '';
    ghBtn.style.display = ghUrl ? '' : 'none';
  }
}

export function cardHTML(p) {
  const isPinned = app.pinnedProjects.has(p.id);
  return `<div class="card" id="card-${p.id}">
      <div class="card-accent" style="background:${p.color};--card-color:${p.color}"></div>
      <div class="card-body">
        <div class="card-header" onclick="jumpToChanges('${p.id}')" style="cursor:pointer" title="View changes">
          <div><span class="card-name">${esc(p.name)}</span></div>
          <div class="card-actions">
            <span class="card-stack">${esc(p.stack || '')}</span>
            <button class="card-edit-btn" onclick="event.stopPropagation();editProject('${p.id}')" title="Edit project settings"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><path d="M12.22 2h-.44a2 2 0 00-2 2v.18a2 2 0 01-1 1.73l-.43.25a2 2 0 01-2 0l-.15-.08a2 2 0 00-2.73.73l-.22.38a2 2 0 00.73 2.73l.15.1a2 2 0 011 1.72v.51a2 2 0 01-1 1.74l-.15.09a2 2 0 00-.73 2.73l.22.38a2 2 0 002.73.73l.15-.08a2 2 0 012 0l.43.25a2 2 0 011 1.73V20a2 2 0 002 2h.44a2 2 0 002-2v-.18a2 2 0 011-1.73l.43-.25a2 2 0 012 0l.15.08a2 2 0 002.73-.73l.22-.39a2 2 0 00-.73-2.73l-.15-.08a2 2 0 01-1-1.74v-.5a2 2 0 011-1.74l.15-.09a2 2 0 00.73-2.73l-.22-.38a2 2 0 00-2.73-.73l-.15.08a2 2 0 01-2 0l-.43-.25a2 2 0 01-1-1.73V4a2 2 0 00-2-2z"/><circle cx="12" cy="12" r="3"/></svg></button>
            <button class="card-pin ${isPinned ? 'pinned' : ''}" onclick="event.stopPropagation();togglePin('${p.id}')" title="${isPinned ? 'Unpin' : 'Pin to front'}"><svg viewBox="0 0 24 24" fill="${isPinned ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14 2 9.27l6.91-1.01L12 2z"/></svg></button>
          </div>
        </div>
        <div style="margin-bottom:8px"><span class="status no_data"><span class="dot"></span>Loading</span></div>
        <div class="card-info">
          <div class="info-row"><span class="info-label">Branch</span><span class="info-value branch branch-val">-</span></div>
          <div class="info-row"><span class="info-label">Uncommitted</span><span class="info-value uncommitted-val" onclick="jumpToChanges('${p.id}')" title="View changes">-</span></div>
          <div class="info-row"><span class="info-label">Model</span><span class="info-value model-val">-</span></div>
          <div class="info-row"><span class="info-label">Last</span><span class="info-value last-val">-</span></div>
        </div>
        <ul class="commits"></ul>
        <div class="pr-list"></div>
        <div class="card-foot">
          <div class="card-btn-row">
            <button class="btn primary" onclick="openTermWith('${p.id}','claude')" title="New Claude session">Claude</button>
            <button class="btn" onclick="openTermWith('${p.id}','claude --continue')" title="Resume last conversation">Resume</button>
            <button class="btn resume-last-btn" id="resume-last-${p.id}" onclick="resumeLastSession('${p.id}')" style="display:none" title="Resume last session in external terminal">Last</button>
            <button class="btn" onclick="openTermWith('${p.id}','')" title="Open shell">Shell</button>
            <button class="btn dev-btn" id="dev-btn-${p.id}" onclick="${p.devCmd ? `toggleDevServer('${p.id}')` : `promptDevCmd('${p.id}')`}" title="${p.devCmd ? esc(p.devCmd) : 'Set dev command'}"><span class="dev-dot ${p.devCmd ? 'off' : 'none'}"></span>Dev</button>
          </div>
          <div class="card-btn-row">
            <button class="btn" onclick="openIDE('${p.id}','code')" title="VS Code"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg> VS</button>
            <button class="btn" onclick="openIDE('${p.id}','cursor')" title="Cursor">Cursor</button>
            <button class="btn" onclick="openIDE('${p.id}','antigravity')" title="Antigravity">AG</button>
            <button class="btn card-github-btn" id="github-btn-${p.id}" onclick="openGitHub('${p.id}')" style="display:none">GitHub</button>
            <button class="btn" onclick="showSessionHistory('${p.id}')" title="Session history">Sessions</button>
            <button class="btn" onclick="showGitLog('${p.id}')" title="Git log">Log</button>
          </div>
        </div>
      </div>
    </div>`;
}

export function renderAllCards(projects) {
  const grid = document.getElementById('project-grid');
  const newIds = projects.map(p => p.id);
  if (app._renderedCardIds.length === newIds.length && app._renderedCardIds.every((id, i) => id === newIds[i])) {
    projects.forEach(p => renderCard(p.id));
  } else {
    grid.innerHTML = projects.map(p => cardHTML(p)).join('');
    app._renderedCardIds = newIds;
  }
  setTimeout(updateScrollIndicators, 50);
}

export function renderSkeletons(count) {
  document.getElementById('project-grid').innerHTML = Array(count).fill('<div class="skeleton skeleton-card"></div>').join('');
}

// ─── Charts ───
export function setChartPeriod(days) {
  app.chartPeriod = days;
  localStorage.setItem('dl-chart-period', days);
  document.querySelectorAll('.chart-period button').forEach(b => b.classList.toggle('active', parseInt(b.textContent) === days));
  const lbl = document.getElementById('chart-period-label');
  if (lbl) lbl.textContent = `(${days}d)`;
  renderCosts();
}

export function renderCosts() {
  const u = app.state.usage;
  if (!u?.daily) return;
  const allDaily = u.daily;
  const daily = allDaily.slice(-app.chartPeriod);
  const labels = daily.map(d => d.date?.slice(5) || '');
  const tokens = daily.map(d => d.outputTokens || 0);
  const chartColors = { line: '#818cf8', fill: 'rgba(129,140,248,.08)', grid: 'rgba(255,255,255,.03)', tick: '#565868' };
  if (app.dailyChart) {
    app.dailyChart.data.labels = labels;
    app.dailyChart.data.datasets[0].data = tokens;
    app.dailyChart.update('none');
  } else {
    app.dailyChart = new Chart(document.getElementById('daily-chart'), {
      type: 'line',
      data: { labels, datasets: [{ data: tokens, borderColor: chartColors.line, backgroundColor: chartColors.fill, fill: true, tension: 0.3, borderWidth: 2, pointRadius: 1.5, pointHoverRadius: 4 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: chartColors.tick, font: { size: 9 } }, grid: { color: chartColors.grid } }, y: { ticks: { color: chartColors.tick, callback: v => fmtTok(v), font: { size: 9 } }, grid: { color: chartColors.grid } } } },
    });
  }
  const mm = {};
  daily.forEach(d => (d.modelBreakdowns || []).forEach(m => { const n = m.modelName || '?'; mm[n] = (mm[n] || 0) + (m.outputTokens || 0); }));
  if (app.modelChart) {
    app.modelChart.data.labels = Object.keys(mm);
    app.modelChart.data.datasets[0].data = Object.values(mm);
    app.modelChart.update('none');
  } else {
    app.modelChart = new Chart(document.getElementById('model-chart'), {
      type: 'doughnut',
      data: { labels: Object.keys(mm), datasets: [{ data: Object.values(mm), backgroundColor: ['#818cf8', '#34d399', '#fbbf24', '#f87171', '#60a5fa'], borderWidth: 0 }] },
      options: { responsive: true, maintainAspectRatio: false, cutout: '65%', plugins: { legend: { position: 'bottom', labels: { color: '#9395a5', font: { size: 10 }, padding: 8 } } }, tooltip: { callbacks: { label: ctx => fmtTok(ctx.raw) + ' tok' } } },
    });
  }
}

// ─── Usage Dashboard ───
export function fetchUsage() {
  fetch('/api/usage').then(r => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  }).then(data => {
    app.state.usage = data;
    app._usageLastUpdated = Date.now();
    app._usageRetryCount = 0;
    renderUsage();
    renderCosts();
    updateUsageTimestamp();
  }).catch(err => {
    app._usageRetryCount++;
    if (app._usageRetryCount <= 3) {
      console.warn(`[Usage] Retry ${app._usageRetryCount}/3: ${err.message}`);
      setTimeout(fetchUsage, 5000 * app._usageRetryCount);
    }
    updateUsageTimestamp();
  });
}

export function renderUsage() {
  const u = app.state.usage;
  if (!u) return;
  const t = u.today || {};
  const w = u.week || {};
  document.getElementById('today-output').textContent = fmtTok(t.outputTokens || 0);
  document.getElementById('today-msgs').textContent = t.messages || 0;
  document.getElementById('stat-today').textContent = fmtTok(t.outputTokens || 0);
  document.getElementById('uc-today-date').textContent = t.date || '';
  document.getElementById('uc-today-output').textContent = fmtTok(t.outputTokens || 0) + ' tok';
  document.getElementById('uc-today-stats').innerHTML = [row('Messages', t.messages || 0), row('Sessions', t.sessions || 0), row('Tool Calls', t.toolCalls || 0)].join('');
  const todayModels = t.models || {};
  const totalOut = t.outputTokens || 1;
  const modelsEl = document.getElementById('uc-today-models');
  const mEntries = Object.entries(todayModels).sort((a, b) => (b[1].outputTokens || 0) - (a[1].outputTokens || 0));
  modelsEl.innerHTML = mEntries.length ? mEntries.map(([name, m]) => { const pct = ((m.outputTokens || 0) / totalOut * 100).toFixed(1); return `<div class="uc-model-row"><span class="name">${name}</span><span class="val">${fmtTok(m.outputTokens || 0)}<span class="pct">(${pct}%)</span></span></div>`; }).join('') : '';
  document.getElementById('uc-today-cost').textContent = `API Equiv. ~$${(t.apiEquivCost || 0).toFixed(2)}`;
  document.getElementById('uc-week-output').textContent = fmtTok(w.outputTokens || 0) + ' tok';
  if (w.resetAt) document.getElementById('uc-week-reset').textContent = `resets ${timeUntil(w.resetAt)}`;
  document.getElementById('uc-week-stats').innerHTML = [row('Messages', w.messages || 0)].join('');
  const weekModels = w.models || {};
  const wmEl = document.getElementById('uc-week-models');
  const wmEntries = Object.entries(weekModels).sort((a, b) => (b[1].outputTokens || 0) - (a[1].outputTokens || 0));
  wmEl.innerHTML = wmEntries.length ? wmEntries.map(([name, m]) => `<div class="uc-model-row"><span class="name">${name}</span><span class="val">${fmtTok(m.outputTokens || 0)}</span></div>`).join('') : '';
  document.getElementById('uc-week-cost').textContent = `API Equiv. ~$${(w.apiEquivCost || 0).toFixed(2)}`;
  document.getElementById('uc-overview-stats').innerHTML = [row('Total Sessions', t.sessions || 0), row('Cache Read', fmtTok(t.cacheReadTokens || 0) + ' tok'), row('Cache Write', fmtTok(t.cacheCreationTokens || 0) + ' tok'), row('Input Tokens', fmtTok(t.inputTokens || 0))].join('');
  const daily = u.daily || [];
  const allTimeCost = daily.reduce((s, d) => s + (d.totalCost || 0), 0);
  const planEl = document.getElementById('uc-plan-info');
  if (planEl) planEl.textContent = `30-day API equiv: ~$${allTimeCost.toFixed(2)}`;
}

export function updateUsageTimestamp() {
  let el = document.getElementById('usage-last-updated');
  if (!el) {
    const container = document.querySelector('.usage-section .section-header') || document.querySelector('.usage-grid');
    if (container) {
      el = document.createElement('span');
      el.id = 'usage-last-updated';
      el.style.cssText = 'font-size:.7rem;color:var(--text-3);margin-left:auto;cursor:pointer';
      el.title = 'Click to refresh';
      el.addEventListener('click', () => fetchUsage());
      container.appendChild(el);
    }
  }
  if (el) {
    if (app._usageLastUpdated) {
      const ago = Math.round((Date.now() - app._usageLastUpdated) / 1000);
      el.textContent = ago < 60 ? `${ago}s ago` : `${Math.round(ago / 60)}m ago`;
      el.style.color = ago > 300 ? 'var(--yellow)' : 'var(--text-3)';
    } else if (app._usageRetryCount > 0) {
      el.textContent = `error (retry ${app._usageRetryCount})`;
      el.style.color = 'var(--red)';
    }
  }
}

// ─── Recent Conversations ───
export async function showConvList() {
  const overlay = document.getElementById('conv-overlay');
  const body = document.getElementById('conv-body');
  body.innerHTML = '<div class="conv-empty">Loading...</div>';
  overlay.classList.remove('hidden');
  try {
    const res = await fetch('/api/activity');
    const data = await res.json();
    if (!data.length) { body.innerHTML = '<div class="conv-empty">No recent conversations</div>'; return; }
    let html = '', lastDate = '';
    for (const e of data) {
      const d = e.timestamp?.slice(0, 10) || '';
      if (d !== lastDate) {
        const label = d === new Date().toISOString().slice(0, 10) ? 'Today' : d === new Date(Date.now() - 86400000).toISOString().slice(0, 10) ? 'Yesterday' : d;
        html += `<div class="conv-group-date">${label}</div>`;
        lastDate = d;
      }
      const msg = (e.command || '').replace(/\[Pasted text[^\]]*\]\s*/g, '').trim() || '(no message)';
      const time = e.timestamp ? new Date(e.timestamp).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) : '';
      const proj = app.projectList.find(p => e.projectPath && p.path.replace(/\\/g, '/').toLowerCase() === e.projectPath.toLowerCase());
      const pid = proj ? proj.id : '';
      html += `<div class="conv-item${pid ? ' clickable' : ''}" ${pid ? `onclick="closeConvList();openTermWith('${pid}','claude --continue')" style="cursor:pointer" title="Open terminal with --continue"` : ''}>
        <span class="conv-project" title="${esc(e.projectPath || '')}">${esc(e.project || '?')}</span>
        <div class="conv-info">
          <div class="conv-msg" title="${esc(msg)}">${esc(msg)}</div>
          <div class="conv-time">${time}</div>
        </div>
      </div>`;
    }
    body.innerHTML = html;
  } catch (err) {
    body.innerHTML = `<div class="conv-empty">Error: ${err.message}</div>`;
  }
}

export function closeConvList() {
  document.getElementById('conv-overlay').classList.add('hidden');
}

// ─── Theme Toggle ───
export function applyTheme(theme) {
  app.currentTheme = theme;
  document.body.classList.toggle('light-theme', theme === 'light');
  document.getElementById('theme-icon-dark').style.display = theme === 'dark' ? '' : 'none';
  document.getElementById('theme-icon-light').style.display = theme === 'light' ? '' : 'none';
}

export function toggleTheme() {
  app._themeManual = true;
  applyTheme(app.currentTheme === 'dark' ? 'light' : 'dark');
  localStorage.setItem('dl-theme', app.currentTheme);
  showToast(`${app.currentTheme === 'light' ? 'Light' : 'Dark'} theme`, 'info');
}

// ─── Project Pin ───
export function savePins() {
  localStorage.setItem('dl-pinned', JSON.stringify([...app.pinnedProjects]));
}

export function togglePin(id) {
  if (app.pinnedProjects.has(id)) app.pinnedProjects.delete(id);
  else app.pinnedProjects.add(id);
  savePins();
  sortAndRenderProjects();
}

export function setProjectSort(sortBy) {
  app._cardSortBy = sortBy;
  localStorage.setItem('dl-card-sort', sortBy);
  const sel = document.getElementById('card-sort-select');
  if (sel) sel.value = sortBy;
  sortAndRenderProjects();
}

export function sortAndRenderProjects() {
  const sorted = [...app.projectList].sort((a, b) => {
    // Pinned first
    const ap = app.pinnedProjects.has(a.id) ? 0 : 1;
    const bp = app.pinnedProjects.has(b.id) ? 0 : 1;
    if (ap !== bp) return ap - bp;
    // Then by selected sort
    const sort = app._cardSortBy || 'name';
    if (sort === 'activity') {
      const sa = app.state.projects.get(a.id)?.session;
      const sb = app.state.projects.get(b.id)?.session;
      const stateOrder = { busy: 0, waiting: 1, idle: 2, no_data: 3, no_sessions: 4 };
      const oa = stateOrder[sa?.state] ?? 3;
      const ob = stateOrder[sb?.state] ?? 3;
      if (oa !== ob) return oa - ob;
    }
    if (sort === 'recent') {
      const ta = app.state.projects.get(a.id)?.session?.lastActivity || '';
      const tb = app.state.projects.get(b.id)?.session?.lastActivity || '';
      if (ta !== tb) return ta > tb ? -1 : 1;
    }
    if (sort === 'uncommitted') {
      const ua = app.state.projects.get(a.id)?.git?.uncommittedCount || 0;
      const ub = app.state.projects.get(b.id)?.git?.uncommittedCount || 0;
      if (ua !== ub) return ub - ua;
    }
    return (a.name || '').localeCompare(b.name || '');
  });
  app._renderedCardIds = [];
  renderAllCards(sorted);
  app.projectList.forEach(p => {
    const s = app.state.projects.get(p.id);
    if (s) renderCard(p.id);
  });
}

// ─── Notification Toggle ───
export function toggleNotifications() {
  app.notifyEnabled = !app.notifyEnabled;
  localStorage.setItem('dl-notify', app.notifyEnabled);
  const btn = document.getElementById('notify-toggle');
  if (btn) {
    btn.textContent = app.notifyEnabled ? 'On' : 'Off';
    btn.className = 'btn' + (app.notifyEnabled ? '' : ' off-btn');
  }
  showToast(app.notifyEnabled ? 'Notifications enabled' : 'Notifications disabled', 'info');
  fetch('/api/notify/toggle', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled: app.notifyEnabled }) }).catch(() => {});
}

// ─── Notification Filter (per-project) ───
export function isNotifEnabledForProject(projectId) {
  return app._notifFilter[projectId] !== false;
}

export function saveNotifFilter() {
  localStorage.setItem('dl-notif-filter', JSON.stringify(app._notifFilter));
}

export function toggleProjectNotif(projectId) {
  app._notifFilter[projectId] = !isNotifEnabledForProject(projectId);
  saveNotifFilter();
  window.renderNotifFilterList?.();
}

// ─── Project Search & Scroll Indicators ───
export function setProjectFilter(filter) {
  app._projectStatusFilter = filter;
  document.querySelectorAll('.pf-btn').forEach(b => b.classList.toggle('active', b.dataset.filter === filter));
  filterProjects();
}

export function filterProjects() {
  const query = document.getElementById('project-search').value.toLowerCase().trim();
  const countEl = document.getElementById('project-search-count');
  let visible = 0;
  app.projectList.forEach(p => {
    const card = document.getElementById(`card-${p.id}`);
    if (!card) return;
    const pState = app.state.projects.get(p.id);
    const status = pState?.session?.state || 'no_data';
    const textMatch = !query || (p.name || '').toLowerCase().includes(query) || (p.stack || '').toLowerCase().includes(query) || status.toLowerCase().includes(query);
    let statusMatch = true;
    if (app._projectStatusFilter === 'active') statusMatch = status === 'busy' || status === 'waiting';
    else if (app._projectStatusFilter === 'idle') statusMatch = status === 'idle' || status === 'no_data' || status === 'no_sessions';
    card.style.display = textMatch && statusMatch ? '' : 'none';
    if (textMatch && statusMatch) visible++;
  });
  countEl.textContent = query || app._projectStatusFilter !== 'all' ? `${visible}/${app.projectList.length}` : '';
  updateScrollIndicators();
}

export async function fetchAllProjects() {
  const btn = event.target;
  btn.disabled = true;
  btn.textContent = 'Fetching...';
  let ok = 0, fail = 0;
  const promises = app.projectList.map(p => fetch(`/api/projects/${p.id}/fetch`, { method: 'POST' }).then(r => r.json()).then(d => { if (d.error) fail++; else ok++; }).catch(() => fail++));
  await Promise.all(promises);
  btn.disabled = false;
  btn.textContent = 'Fetch All';
  showToast(`Fetch All: ${ok} ok${fail ? `, ${fail} failed` : ''}`, fail ? 'error' : 'success');
}

export function updateScrollIndicators() {
  const grid = document.getElementById('project-grid');
  const left = document.getElementById('scroll-ind-left');
  const right = document.getElementById('scroll-ind-right');
  if (!grid || !left || !right) return;
  left.classList.toggle('hidden', grid.scrollLeft <= 5);
  right.classList.toggle('hidden', grid.scrollLeft + grid.clientWidth >= grid.scrollWidth - 5);
}

export function jumpToChanges(projectId) {
  switchView('diff');
  const sel = document.getElementById('diff-project');
  if (sel) { sel.value = projectId; window.loadDiff?.(); }
}

// ─── Adaptive Polling ───
export function onVisibilityChange() {
  if (document.hidden) {
    clearInterval(app._clockTimer); app._clockTimer = null;
    if (app.usageTimer) { clearInterval(app.usageTimer); app.usageTimer = null; }
  } else {
    if (!app._clockTimer) app._clockTimer = setInterval(updateClock, 1000);
    updateClock();
    if (!app.usageTimer) app.usageTimer = setInterval(fetchUsage, 60000);
  }
  fetch('/api/polling-speed', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ multiplier: document.hidden ? 5 : 1 }) }).catch(() => {});
}
