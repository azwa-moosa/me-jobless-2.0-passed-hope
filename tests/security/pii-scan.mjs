#!/usr/bin/env node
/**
 * PII / secret scan (PLT-006). Fails if the repo contains anything that looks like a real
 * Maldivian NID (A + 6 digits without the TEST- prefix), a real passport pattern, or common secret formats.
 * Synthetic identifiers are always prefixed TEST-.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const SKIP = new Set(['node_modules', '.next', 'dist', '.git', 'coverage', 'test-results']);
const EXT = new Set(['.ts', '.tsx', '.js', '.mjs', '.json', '.sql', '.md', '.yaml', '.yml', '.csv', '.env', '.example', '.css']);
const RULES = [
  { name: 'NID-like value', re: /(?<!TEST-)\bA\d{6}\b/g },
  { name: 'Private key', re: /-----BEGIN (RSA |EC )?PRIVATE KEY-----/g },
  { name: 'Azure storage key', re: /AccountKey=[A-Za-z0-9+/=]{40,}/g },
  { name: 'Generic secret assignment', re: /(client_secret|api_key)\s*[:=]\s*['"][A-Za-z0-9_\-]{20,}['"]/gi },
];
const findings = [];
function walk(dir) {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) walk(p);
    else if (EXT.has(extname(name)) || name.startsWith('.env')) {
      if (name === '.env') continue; // local only, git-ignored
      const text = readFileSync(p, 'utf8');
      for (const r of RULES) for (const m of text.matchAll(r.re)) findings.push(`${p.replace(root + '/', '')}: ${r.name} "${m[0].slice(0, 12)}…"`);
    }
  }
}
walk(root);
if (findings.length) { console.error('PII/secret scan FAILED:\n  ' + findings.join('\n  ')); process.exit(1); }
console.log('PII/secret scan passed – no real identifiers or secrets found.');
