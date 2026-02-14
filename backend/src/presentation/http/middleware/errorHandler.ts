import type { NextFunction, Request, Response } from 'express';
import { isHttpError } from '../errors/httpError';

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  const msg = err instanceof Error ? err.message : String(err);
  const status = isHttpError(err) ? err.status : 500;

  // Avoid leaking internals by default; this is a personal tool but still good hygiene.
  if (status >= 500) {
    // eslint-disable-next-line no-console
    console.error(err);
  }

  res.status(status).json({ error: msg });
}
