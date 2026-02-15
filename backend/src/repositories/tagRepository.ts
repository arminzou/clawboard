import type { Database } from 'better-sqlite3';

export class TagRepository {
  constructor(private readonly db: Database) {}

  private parseTaskTags(raw: unknown): string[] {
    if (typeof raw !== 'string') return [];
    const trimmed = raw.trim();
    if (!trimmed) return [];

    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed) as unknown;
        if (Array.isArray(parsed)) {
          return parsed.map((t) => String(t).trim()).filter(Boolean);
        }
      } catch {
        return [];
      }
    }

    return trimmed
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
  }

  list(): string[] {
    const rows = this.db.prepare('SELECT name FROM tags ORDER BY name ASC').all() as { name: string }[];
    if (rows.length) return rows.map((row) => row.name);

    const tasks = this.db.prepare('SELECT tags FROM tasks WHERE tags IS NOT NULL').all() as { tags: string }[];
    const names: string[] = [];
    for (const row of tasks) names.push(...this.parseTaskTags(row.tags));

    if (names.length) {
      const insert = this.db.prepare('INSERT INTO tags (name) VALUES (?) ON CONFLICT(name) DO NOTHING');
      const insertMany = this.db.transaction((list: string[]) => {
        for (const name of list) insert.run(name);
      });
      insertMany(names);
    }

    const seeded = this.db.prepare('SELECT name FROM tags ORDER BY name ASC').all() as { name: string }[];
    return seeded.map((row) => row.name);
  }
}
