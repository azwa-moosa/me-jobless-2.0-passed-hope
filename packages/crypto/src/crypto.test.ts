import { describe, it, expect } from 'vitest';
import { FieldCipher } from './index';
const key = Buffer.alloc(32, 7).toString('base64');
describe('FieldCipher', () => {
  it('round-trips and does not leak plaintext', () => {
    const c = new FieldCipher(key);
    const t = c.encrypt('Alleged misconduct on 2026-09-01');
    expect(t).not.toContain('misconduct');
    expect(c.decrypt(t)).toBe('Alleged misconduct on 2026-09-01');
  });
  it('detects tampering', () => {
    const c = new FieldCipher(key);
    const parts = c.encrypt('x').split('.');
    parts[3] = Buffer.from('y').toString('base64');
    expect(() => c.decrypt(parts.join('.'))).toThrow();
  });
  it('rejects short keys', () => { expect(() => new FieldCipher('abc')).toThrow(); });
});
