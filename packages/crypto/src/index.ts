import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

/**
 * Field-level encryption for Highly Restricted narrative fields (ER summaries, chronology text).
 * AES-256-GCM, format: v1.<iv b64>.<tag b64>.<ciphertext b64>.
 * DEV key comes from env; UAT/PROD key must come from Key Vault (PLT-007, DR-03).
 */
export class FieldCipher {
  private readonly key: Buffer;
  constructor(keyB64: string) {
    const key = Buffer.from(keyB64, 'base64');
    if (key.length !== 32) throw new Error('FIELD_ENCRYPTION_KEY must be 32 bytes (base64)');
    this.key = key;
  }
  encrypt(plain: string): string {
    const iv = randomBytes(12);
    const c = createCipheriv('aes-256-gcm', this.key, iv);
    const ct = Buffer.concat([c.update(plain, 'utf8'), c.final()]);
    return ['v1', iv.toString('base64'), c.getAuthTag().toString('base64'), ct.toString('base64')].join('.');
  }
  decrypt(token: string): string {
    const [v, iv, tag, ct] = token.split('.');
    if (v !== 'v1') throw new Error('Unknown cipher version');
    const d = createDecipheriv('aes-256-gcm', this.key, Buffer.from(iv, 'base64'));
    d.setAuthTag(Buffer.from(tag, 'base64'));
    return Buffer.concat([d.update(Buffer.from(ct, 'base64')), d.final()]).toString('utf8');
  }
}

export const sha256Hex = (s: string) => createHash('sha256').update(s).digest('hex');
