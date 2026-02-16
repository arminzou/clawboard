import path from 'path';
import { HttpError } from '../presentation/http/errors/httpError';
import type { ProjectRepository } from '../repositories/projectRepository';
import type { Project } from '../domain/project';

export class ProjectService {
  constructor(
    private readonly repo: ProjectRepository,
    private readonly broadcast?: (data: unknown) => void
  ) {}

  list(): Project[] {
    return this.repo.list();
  }

  getById(id: number): Project {
    const project = this.repo.getById(id);
    if (!project) throw new HttpError(404, 'Project not found');
    return project;
  }

  update(id: number, patch: Partial<Pick<Project, 'name' | 'description' | 'icon' | 'color'>>): Project {
    try {
      return this.repo.update(id, patch);
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
    // We need the raw db from the repo to pass to the utility
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
      // The DB stores absolute paths from discovery
      return getGitContext(project.path);
    } catch (err) {
      console.error(`Failed to get git context for project ${id}:`, err);
      return { key: null, type: null };
    }
  }
}
