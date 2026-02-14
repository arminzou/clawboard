import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { ActivityRepository } from '../repositories/activityRepository';
import { ActivityService } from './activityService';
import { HttpError } from '../presentation/http/errors/httpError';

describe('ActivityService', () => {
  let db: any;
  let repo: ActivityRepository;
  let service: ActivityService;

  beforeEach(() => {
    db = new Database(':memory:');
    const schemaPath = path.join(__dirname, '../../db/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    db.exec(schema);

    repo = new ActivityRepository(db);
    service = new ActivityService(repo);
  });

  it('creates and lists activities', () => {
    const created = service.create({ agent: 'tee', activity_type: 'message', description: 'hi' });
    expect(created.id).toBeTruthy();

    const list = service.list({ agent: 'tee' });
    expect(list).toHaveLength(1);
    expect(list[0].description).toBe('hi');
  });

  it('lists by agent', () => {
    service.create({ agent: 'tee', activity_type: 'message', description: 'hi' });
    service.create({ agent: 'fay', activity_type: 'message', description: 'yo' });

    const list = service.listByAgent('tee', 10);
    expect(list).toHaveLength(1);
  });

  it('throws 400 for missing required fields', () => {
    expect(() => service.create({ agent: 'tee' } as any)).toThrow(HttpError);
  });

  it('returns stats', () => {
    service.create({ agent: 'tee', activity_type: 'message', description: 'hi' });
    const stats = service.getStats();
    expect(stats.total).toBeGreaterThan(0);
  });
});
