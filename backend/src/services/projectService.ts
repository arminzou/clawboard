import os from 'os';
import path from 'path';
import { HttpError } from '../presentation/http/errors/httpError';
import type { ProjectRepository } from '../repositories/projectRepository';
import type { Project } from '../domain/project';

function normalizeString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return base || 'project';
}

const ENV_VAR_PATTERN = /\$\{([A-Z0-9_]+)\}|\$([A-Z0-9_]+)/gi;
const HAS_ENV_VAR_PATTERN = /\$\{([A-Z0-9_]+)\}|\$([A-Z0-9_]+)/i;

function expandPath(rawPath: string): string | null {
  let out = rawPath;
  if (out.startsWith('~')) {
    out = path.join(os.homedir(), out.slice(1));
  }

  out = out.replace(ENV_VAR_PATTERN, (match, a, b) => {
    const key = String(a || b || '');
    const resolved = process.env[key];
    return resolved === undefined ? match : resolved;
  });

  if (HAS_ENV_VAR_PATTERN.test(out)) return null;
  return path.resolve(out);
}

export class ProjectService {
  constructor(
    private readonly repo: ProjectRepository,
    private readonly broadcast?: (data: unknown) => void,
  ) {}

  list(): Project[] {
    return this.repo.list();
  }

  getById(id: number): Project {
    const project = this.repo.getById(id);
    if (!project) throw new HttpError(404, 'Project not found');
    return project;
  }

  createManual(body: { name?: unknown; path?: unknown; description?: unknown }): Project {
    const name = normalizeString(body.name);
    const rawPath = normalizeString(body.path);
    const description = normalizeString(body.description) || null;

    if (!name) throw new HttpError(400, 'name is required');
    if (!rawPath) throw new HttpError(400, 'path is required');

    const resolvedPath = expandPath(rawPath);
    if (!resolvedPath) throw new HttpError(400, 'path contains unresolved environment variables');
    if (!path.isAbsolute(resolvedPath)) throw new HttpError(400, 'path must resolve to an absolute path');

    const existingByPath = this.repo.list().find((project) => project.path === resolvedPath);
    if (existingByPath) throw new HttpError(409, 'Project path already registered');

    const baseSlug = slugify(name);
    let slug = baseSlug;
    let suffix = 2;
    while (this.repo.getBySlug(slug)) {
      slug = `${baseSlug}-${suffix}`;
      suffix += 1;
    }

    try {
      const created = this.repo.create({
        name,
        slug,
        path: resolvedPath,
        description,
      });
      this.broadcast?.({ type: 'projects_updated', data: { created: 1, project: created } });
      return created;
    } catch (err) {
      if (err instanceof Error && /UNIQUE/i.test(err.message)) {
        throw new HttpError(409, 'Project already exists');
      }
      throw err;
    }
  }

  update(id: number, patch: Partial<Pick<Project, 'name' | 'description' | 'icon' | 'color'>>): Project {
    try {
      const updated = this.repo.update(id, patch);
      this.broadcast?.({ type: 'projects_updated', data: { updated: 1, project: updated } });
      return updated;
    } catch (err) {
      if (err instanceof Error && err.message === 'Project not found') {
        throw new HttpError(404, 'Project not found');
      }
      throw err;
    }
  }

  delete(id: number, cleanupTasks: boolean): void {
    try {
      this.repo.delete(id, cleanupTasks);
    } catch (err) {
      if (err instanceof Error && err.message === 'Project not found') {
        throw new HttpError(404, 'Project not found');
      }
      throw err;
    }
  }

  assignUnassignedTasks(id: number) {
    this.getById(id);
    return this.repo.assignUnassignedTasks(id);
  }

  discover() {
    // Interop with legacy JS utility
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { syncProjects } = require('../../utils/syncProjects');
    const db = this.repo.db;
    const result = syncProjects(db, this.broadcast);
    const total = (db.prepare('SELECT COUNT(*) as count FROM projects').get() as { count: number }).count;
    return { ...result, total };
  }

  getStats(id: number) {
    try {
      return this.repo.getProjectStats(id);
    } catch (err) {
      if (err instanceof Error && err.message === 'Project not found') {
        throw new HttpError(404, 'Project not found');
      }
      throw err;
    }
  }

  getSummaryStats() {
    return this.repo.getSummaryStats();
  }

  getGitContext(id: number) {
    const project = this.getById(id);
    if (!project.path) return { key: null, type: null };

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { getGitContext } = require('../../utils/gitContext');

    try {
      return getGitContext(project.path);
    } catch (err) {
      console.error(`Failed to get git context for project ${id}:`, err);
      return { key: null, type: null };
    }
  }
}
