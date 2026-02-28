import os from 'os';
import path from 'path';
import type { AnchorSource, Task } from '../domain/task';
import { config } from '../config';
import type { ProjectRepository } from '../repositories/projectRepository';

type AnchorResolution = {
  resolved_anchor: string | null;
  anchor_source: AnchorSource;
};

const ENV_VAR_PATTERN = /\$\{([A-Z0-9_]+)\}|\$([A-Z0-9_]+)/gi;
const HAS_ENV_VAR_PATTERN = /\$\{([A-Z0-9_]+)\}|\$([A-Z0-9_]+)/i;

function normalizePathInput(raw: string | null | undefined): string | null {
  if (typeof raw !== 'string') return null;
  let value = raw.trim();
  if (!value) return null;

  if (value.startsWith('~')) {
    value = path.join(os.homedir(), value.slice(1));
  }

  value = value.replace(ENV_VAR_PATTERN, (match, a, b) => {
    const key = String(a || b || '');
    const resolved = process.env[key];
    return resolved === undefined ? match : resolved;
  });

  if (HAS_ENV_VAR_PATTERN.test(value)) {
    return null;
  }

  try {
    const resolved = path.resolve(value);
    if (!path.isAbsolute(resolved)) return null;
    return resolved;
  } catch {
    return null;
  }
}

export class AnchorService {
  constructor(private readonly projects: Pick<ProjectRepository, 'getById'>) {}

  resolve(task: Pick<Task, 'id' | 'project_id' | 'anchor' | 'non_agent' | 'tags'>): AnchorResolution {
    if (task.non_agent) {
      return { resolved_anchor: null, anchor_source: null };
    }

    const explicitTaskAnchor = normalizePathInput(task.anchor);
    if (explicitTaskAnchor) {
      return { resolved_anchor: explicitTaskAnchor, anchor_source: 'task' };
    }

    if (task.project_id != null) {
      const project = this.projects.getById(task.project_id);
      const projectAnchor = normalizePathInput(project?.path ?? null);
      if (projectAnchor) {
        return { resolved_anchor: projectAnchor, anchor_source: 'project' };
      }
    }

    const categoryDefaults = config.categoryDefaults;
    for (const rawTag of task.tags ?? []) {
      const key = String(rawTag).trim().toLowerCase();
      if (!key) continue;
      const configured = categoryDefaults[key];
      const categoryAnchor = normalizePathInput(configured ?? null);
      if (categoryAnchor) {
        return { resolved_anchor: categoryAnchor, anchor_source: 'category' };
      }
    }

    if (config.allowScratchFallback) {
      const scratchRoot = normalizePathInput(config.scratchRoot);
      if (scratchRoot) {
        const scratchPath = config.scratchPerTask
          ? path.join(scratchRoot, 'tasks', String(task.id))
          : scratchRoot;
        const normalizedScratch = normalizePathInput(scratchPath);
        if (normalizedScratch) {
          return { resolved_anchor: normalizedScratch, anchor_source: 'scratch' };
        }
      }
    }

    return { resolved_anchor: null, anchor_source: null };
  }

  enrich<T extends Task>(task: T): T {
    return {
      ...task,
      ...this.resolve(task),
    };
  }

  enrichMany<T extends Task>(tasks: T[]): T[] {
    return tasks.map((task) => this.enrich(task));
  }
}
