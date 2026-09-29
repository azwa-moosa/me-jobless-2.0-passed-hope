import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID, createHash } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import type { SecurityContext } from '@bml/policy';
import { logger } from './logger';

export interface RequestState {
  correlationId: string;
  ipHash: string | null;
  ctx?: SecurityContext;
}

export const requestStore = new AsyncLocalStorage<RequestState>();
export const currentRequest = (): RequestState | undefined => requestStore.getStore();

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Correlation ID on every request + access log line (no bodies, no query strings). */
export function correlationMiddleware(req: Request, res: Response, next: NextFunction) {
  const incoming = req.header('x-correlation-id');
  const correlationId = incoming && UUID.test(incoming) ? incoming : randomUUID();
  const ipHash = req.ip ? createHash('sha256').update(req.ip).digest('hex').slice(0, 32) : null;
  res.setHeader('x-correlation-id', correlationId);
  const started = Date.now();
  res.on('finish', () => {
    logger.info({ correlationId, method: req.method, path: req.path, status: res.statusCode, ms: Date.now() - started,
      user: requestStore.getStore()?.ctx?.userId }, 'request');
  });
  requestStore.run({ correlationId, ipHash }, () => next());
}
