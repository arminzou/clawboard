import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { ProjectRepository } from '../repositories/projectRepository';
import { ProjectService } from './projectService';
import { HttpError } from '../presentation/http/errors/httpError';

describe('ProjectService', () => {
  let db: any;
  let repo: ProjectRepository;
  let service: ProjectService;

  beforeEach(() => {
    db = new Database(':memory:');
    const schemaPath = path.join(__dirname, '../../db/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    db.exec(schema);

    repo = new ProjectRepository(db);
    service = new ProjectService(repo);
  });

  it('lists and gets projects', () => {
    db.prepare('INSERT INTO projects (name, slug, path) VALUES (?, ?, ?)').run('Alpha', 'alpha', '/tmp/alpha');

    const list = service.list();
    expect(list).toHaveLength(1);

    const project = service.getById(list[0].id);
    expect(project.name).toBe('Alpha');
  });

  it('updates project fields', () => {
    db.prepare('INSERT INTO projects (name, slug, path) VALUES (?, ?, ?)').run('Alpha', 'alpha', '/tmp/alpha');
    const project = repo.list()[0];

    const updated = service.update(project.id, { description: 'Updated' });
    expect(updated.description).toBe('Updated');
  });

  it('deletes projects with cleanup', () => {
    db.prepare('INSERT INTO projects (name, slug, path) VALUES (?, ?, ?)').run('Alpha', 'alpha', '/tmp/alpha');
    const project = repo.list()[0];
    db.prepare('INSERT INTO tasks (title, status, project_id) VALUES (?, ?, ?)').run('Task', 'backlog', project.id);

    service.delete(project.id, true);
    expect(repo.list()).toHaveLength(0);
    const tasks = db.prepare('SELECT * FROM tasks').all();
    expect(tasks).toHaveLength(0);
  });

  it('throws 404 for missing project', () => {
    expect(() => service.getById(999)).toThrow(HttpError);
  });

  it('returns stats and summary stats', () => {
    db.prepare('INSERT INTO projects (name, slug, path) VALUES (?, ?, ?)').run('Alpha', 'alpha', '/tmp/alpha');
    const project = repo.list()[0];
    db.prepare('INSERT INTO tasks (title, status, project_id) VALUES (?, ?, ?)').run('Task', 'backlog', project.id);

    const stats = service.getStats(project.id);
    expect(stats.project_id).toBe(project.id);

    const summary = service.getSummaryStats();
    expect(summary.projects.total).toBe(1);
  });
});
