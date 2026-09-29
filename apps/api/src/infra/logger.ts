import pino from 'pino';

/**
 * Structured logger with PII redaction (PLT-009). Restricted values (salary, NID, passport), narrative
 * free text, tokens and cookies never reach logs.
 */
export const REDACT_PATHS = [
  'req.headers.authorization', 'req.headers.cookie', 'headers.authorization', 'headers.cookie',
  '*.salary', '*.nid', '*.passport', '*.summary', '*.text', '*.narrative', '*.detail', '*.reason', '*.value',
  '*.*.salary', '*.*.nid', '*.*.passport', '*.*.summary', '*.*.text', '*.*.detail',
  'body', 'token', 'password',
];

export function createLogger(dest?: pino.DestinationStream) {
  return pino(
    {
      level: process.env.LOG_LEVEL ?? 'info',
      base: { service: 'bml-people-er-api', env: process.env.PLATFORM_ENV },
      redact: { paths: REDACT_PATHS, censor: '[REDACTED]' },
      timestamp: pino.stdTimeFunctions.isoTime,
    },
    dest,
  );
}

export const logger = createLogger();
