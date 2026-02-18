import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { TaskRepository } from '../repositories/taskRepository';
import { TaskService } from './taskService';
import { HttpError } from '../presentation/http/errors/httpError';
import fs from 'fs';
import { config } from '../config';

describe('TaskService', () => {
  let db: any;
  let repo: TaskRepository;
  let service: TaskService;

  beforeEach(() => {
    db = new Database(':memory:');
    // Load schema
    const schema = fs.readFileSync(config.dbSchema, 'utf8');
    db.exec(schema);

    repo = new TaskRepository(db);
    service = new TaskService(repo);
  });

  describe('list', () => {
    it('returns empty array when no tasks exist', () => {
      const result = service.list();
      expect(result).toEqual([]);
    });

    it('returns tasks when they exist', () => {
      service.create({ title: 'Task 1' });
      service.create({ title: 'Task 2' });
      const result = service.list();
      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('Task 1');
      expect(result[1].title).toBe('Task 2');
    });
  });

  describe('getById', () => {
    it('returns task by id', () => {
      const created = service.create({ title: 'Find me' });
      const found = service.getById(created.id);
      expect(found.title).toBe('Find me');
    });

    it('throws 404 if task not found', () => {
      expect(() => service.getById(999)).toThrow(HttpError);
      try {
        service.getById(999);
      } catch (err: any) {
        expect(err.status).toBe(404);
        expect(err.message).toBe('Task not found');
      }
    });
  });

  describe('create', () => {
    it('creates a task with trimmed title', () => {
      const task = service.create({ title: '  Trim Me   ' });
      expect(task.title).toBe('Trim Me');
      expect(task.status).toBe('backlog');
    });

    it('throws 400 if title is missing or empty', () => {
      expect(() => service.create({ title: '' })).toThrow(HttpError);
      expect(() => service.create({ title: '   ' })).toThrow(HttpError);
    });
  });

  describe('update', () => {
    it('updates task fields and normalizes strings', () => {
      const task = service.create({ title: 'Original' });
      const updated = service.update(task.id, {
        title: ' Updated ',
        status: 'in_progress',
        due_date: ' 2024-12-31 '
      });

      expect(updated.title).toBe('Updated');
      expect(updated.status).toBe('in_progress');
      expect(updated.due_date).toBe('2024-12-31');
    });

    it('throws 400 if no fields to update', () => {
      const task = service.create({ title: 'Original' });
      expect(() => service.update(task.id, {})).toThrow(HttpError);
    });

    it('throws 400 for invalid status', () => {
      const task = service.create({ title: 'Original' });
      // @ts-expect-error testing invalid status
      expect(() => service.update(task.id, { status: 'invalid' })).toThrow(HttpError);
    });

    it('throws 404 if task does not exist', () => {
      expect(() => service.update(999, { title: 'New' })).toThrow(HttpError);
    });
  });

  describe('delete', () => {
    it('deletes a task', () => {
      const task = service.create({ title: 'Delete me' });
      service.delete(task.id);
      expect(service.list()).toHaveLength(0);
    });

    it('throws 404 if task does not exist', () => {
      expect(() => service.delete(999)).toThrow(HttpError);
    });
  });
});
