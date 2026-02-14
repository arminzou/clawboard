import express from 'express';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { applyCommonMiddleware } from '../../src/presentation/http/middleware/commonMiddleware';
import { registerRoutes } from '../../src/presentation/http/routes';

export function createTestDb(): Database {
  const db = new Database(':memory:');
  const schemaPath = path.join(__dirname, '../../db/schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  db.exec(schema);
  return db;
}

export function createTestApp({
  broadcast,
  syncDocs,
}: {
  broadcast?: (data: unknown) => void;
  syncDocs?: (opts?: { workspaceRoot?: string }) => unknown;
} = {}) {
  const app = express();
  const db = createTestDb();

  app.locals.db = db;
  app.locals.broadcast = broadcast ?? (() => {});
  if (syncDocs) app.locals.syncDocs = syncDocs;

  applyCommonMiddleware(app);
  registerRoutes(app, db, app.locals.broadcast);

  return { app, db };
}
