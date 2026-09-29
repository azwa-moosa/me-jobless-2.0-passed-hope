import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import type { Request, Response } from 'express';
import { PolicyDenied } from '@bml/policy';
import { currentRequest } from './request-context';
import { logger } from './logger';
import type { AuditService } from '../audit/audit.service';

export class ApiError extends HttpException {
  constructor(status: number, title: string, detail?: string, public readonly extra?: Record<string, unknown>) {
    super({ title, detail, ...extra }, status);
  }
}
export const forbidden = (detail = 'You do not have permission for this resource') => new ApiError(403, 'Forbidden', detail);
export const notFound = (detail = 'Resource not found') => new ApiError(404, 'Not found', detail);
export const conflict = (detail: string, extra?: Record<string, unknown>) => new ApiError(409, 'Conflict', detail, extra);
export const invalid = (detail: string) => new ApiError(422, 'Validation failed', detail);

/** RFC 7807 problem+json with correlation ID. 403s are audited as access.denied (PLT-002). */
@Catch()
export class ProblemFilter implements ExceptionFilter {
  constructor(private readonly audit: AuditService) {}

  async catch(err: unknown, host: ArgumentsHost) {
    const http = host.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();
    const correlationId = currentRequest()?.correlationId ?? 'unknown';

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let title = 'Internal error';
    let detail: string | undefined = 'An unexpected error occurred. Quote the correlation ID to support.';
    let extra: Record<string, unknown> = {};

    if (err instanceof PolicyDenied) {
      status = 403; title = 'Forbidden'; detail = 'You do not have permission for this action';
    } else if (err instanceof HttpException) {
      status = err.getStatus();
      const body = err.getResponse() as any;
      title = body?.title ?? body?.error ?? err.message;
      detail = body?.detail ?? (typeof body?.message === 'string' ? body.message : Array.isArray(body?.message) ? body.message.join('; ') : undefined);
      const { title: _t, detail: _d, message: _m, error: _e, statusCode: _s, ...rest } = body ?? {};
      extra = rest;
    } else if ((err as any)?.code === '42501') {
      status = 403; title = 'Forbidden'; detail = 'Operation not permitted';
    } else {
      logger.error({ correlationId, err: { message: (err as Error)?.message, stack: (err as Error)?.stack } }, 'unhandled');
    }

    if (status === 403) {
      await this.audit.recordStandalone({
        eventType: 'access.denied', module: 'platform', resourceType: 'route', resourceId: `${req.method} ${req.route?.path ?? req.path}`.slice(0, 64),
        outcome: 'DENIED', sensitivity: 'CONF', summary: { path: req.path.slice(0, 120) },
      }).catch(() => undefined);
    }

    res.status(status).type('application/problem+json').json({
      type: `https://bml-people-er.internal/problems/${status}`, title, status, detail, instance: req.path, correlationId, ...extra,
    });
  }
}
