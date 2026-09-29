import { describe, it, expect } from 'vitest';
import { Writable } from 'node:stream';
import { createLogger } from './logger';

function capture() {
  const lines: string[] = [];
  const stream = new Writable({ write(chunk, _e, cb) { lines.push(chunk.toString()); cb(); } });
  return { log: createLogger(stream as any), lines };
}

describe('log redaction (PLT-009)', () => {
  it('redacts restricted fields, narrative text and auth headers', () => {
    const { log, lines } = capture();
    log.info({
      employee: { uid: 'S10001', salary: 45000, nid: 'TEST-A123456', passport: 'TEST-P1234567' },
      er: { summary: 'Alleged misconduct', text: 'witness statement' },
      req: { headers: { authorization: 'Bearer abc.def', cookie: 'session=x' } },
      body: { anything: 'secret' },
    }, 'test');
    const out = lines.join('');
    for (const leaked of ['45000', 'TEST-A123456', 'TEST-P1234567', 'Alleged misconduct', 'witness statement', 'abc.def', 'session=x', 'secret']) {
      expect(out).not.toContain(leaked);
    }
    expect(out).toContain('S10001');
    expect(out).toContain('[REDACTED]');
  });
});
