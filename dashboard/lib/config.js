import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { readFileSync, existsSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const HOME = homedir().replace(/\\/g, '/');
const __dirname = dirname(fileURLToPath(import.meta.url));

export const CLAUDE_DIR = `${HOME}/.claude`;
export const CLAUDE_PROJECTS_DIR = `${CLAUDE_DIR}/projects`;
export const STATS_CACHE_PATH = `${CLAUDE_DIR}/stats-cache.json`;
export const HISTORY_PATH = `${CLAUDE_DIR}/history.jsonl`;

// Data lives in install directory (currentUser mode = %LOCALAPPDATA%, writable)
// Uninstall/reinstall wipes everything clean — users back up projects.json manually
const PROJECTS_FILE = join(__dirname, '..', 'projects.json');

const COLOR_PALETTE = [
  '#3B82F6', '#10B981', '#8B5CF6', '#F59E0B',
  '#EF4444', '#EC4899', '#06B6D4', '#84CC16',
  '#F97316', '#6366F1', '#14B8A6', '#E11D48'
];

export function generateColor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return COLOR_PALETTE[Math.abs(hash) % COLOR_PALETTE.length];
}

const ALLOWED_FIELDS = ['name', 'path', 'stack', 'color', 'devCmd', 'github'];

function loadProjectsFile() {
  try {
    if (!existsSync(PROJECTS_FILE)) return { projects: [] };
    const data = JSON.parse(readFileSync(PROJECTS_FILE, 'utf8'));
    const before = data.projects?.length || 0;
    data.projects = (data.projects || [])
      .filter(p => p.path && existsSync(p.path))
      .map(p => {
        const id = p.id || p.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
          || `project-${Date.now().toString(36)}`;
        const clean = { id };
        for (const k of ALLOWED_FIELDS) { if (p[k] !== undefined) clean[k] = p[k]; }
        return clean;
      });
    if (data.projects.length < before) {
      console.log(`[Config] Removed ${before - data.projects.length} projects with missing paths`);
    }
    return data;
  } catch { return { projects: [] }; }
}

function saveProjectsFile(data) {
  // In-memory state is already updated; persist asynchronously
  writeFile(PROJECTS_FILE, JSON.stringify(data, null, 2), 'utf8')
    .catch(err => console.error('[Config] Save error:', err.message));
}

let _data = loadProjectsFile();

export function getProjects() {
  return _data.projects;
}

export function getProjectById(id) {
  return _data.projects.find(p => p.id === id);
}

export function addProject(project) {
  let id = project.id || project.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    || `project-${Date.now().toString(36)}`;
  // Ensure unique ID
  const existingIds = new Set(_data.projects.map(p => p.id));
  if (existingIds.has(id)) {
    let suffix = 2;
    while (existingIds.has(`${id}-${suffix}`)) suffix++;
    id = `${id}-${suffix}`;
  }
  const clean = { id };
  for (const k of ALLOWED_FIELDS) { if (project[k] !== undefined) clean[k] = project[k]; }
  if (!clean.color) clean.color = generateColor(clean.name);
  _data.projects.push(clean);
  saveProjectsFile(_data);
  return clean;
}

export function updateProject(id, updates) {
  const idx = _data.projects.findIndex(p => p.id === id);
  if (idx === -1) return null;
  const clean = {};
  for (const k of ALLOWED_FIELDS) { if (updates[k] !== undefined) clean[k] = updates[k]; }
  _data.projects[idx] = { ..._data.projects[idx], ...clean, id };
  saveProjectsFile(_data);
  return _data.projects[idx];
}

export function deleteProject(id) {
  const idx = _data.projects.findIndex(p => p.id === id);
  if (idx === -1) return false;
  _data.projects.splice(idx, 1);
  saveProjectsFile(_data);
  return true;
}

export const POLL_INTERVALS = {
  sessionStatus: 5000,
  gitStatus: 30000,
  prStatus: 120000,
  costData: 60000,
  activity: 10000
};

export const PORT = 3847;

export function toClaudeProjectDir(projectPath) {
  return projectPath.replace(/\//g, '-').replace(/^([A-Z]):/, (_, l) => l.toLowerCase() + '-');
}
