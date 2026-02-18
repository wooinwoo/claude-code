import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export async function getGitHubPRs(project) {
  try {
    const cwd = project.path.replace(/\//g, '\\');
    const { stdout } = await execFileAsync(
      'gh',
      ['pr', 'list', '--json', 'number,title,state,headRefName,author,updatedAt,reviewDecision,isDraft', '--limit', '5'],
      { cwd, timeout: 15000 }
    );

    const prs = JSON.parse(stdout || '[]');
    return {
      projectId: project.id,
      prs: prs.map(pr => ({
        number: pr.number,
        title: pr.title,
        branch: pr.headRefName,
        author: pr.author?.login || 'unknown',
        updatedAt: pr.updatedAt,
        reviewDecision: pr.reviewDecision || 'PENDING',
        isDraft: pr.isDraft
      }))
    };
  } catch {
    return { projectId: project.id, prs: [] };
  }
}
