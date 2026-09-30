#!/usr/bin/env node
/**
 * Design-token guard: colour literals (hex / rgb / hsl) may only appear in styles/tokens.css.
 * Components and pages must use semantic tokens so the BML identity can be changed centrally.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const src = join(root, 'apps/web/src');
const ALLOW_FILES = new Set(['styles/tokens.css']);
const ALLOW_LINE = /themeColor/; // <meta name="theme-color"> needs literal values
const RE = /#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(/g;
const hits = [];
(function walk(d) {
  for (const n of readdirSync(d)) {
    const p = join(d, n);
    if (statSync(p).isDirectory()) { walk(p); continue; }
    if (!/\.(tsx?|css)$/.test(n)) continue;
    const rel = relative(src, p);
    if (ALLOW_FILES.has(rel)) continue;
    readFileSync(p, 'utf8').split('\n').forEach((line, i) => {
      if (ALLOW_LINE.test(line) || /^\s*(\/\/|\*|\/\*)/.test(line)) return;
      const clean = line.replace(/&#\d+;/g, '');
      for (const m of clean.matchAll(RE)) hits.push(`${rel}:${i + 1}  ${m[0]}  ${line.trim().slice(0, 90)}`);
    });
  }
})(src);
if (hits.length) { console.error(`Hard-coded colours found (use tokens):\n  ${hits.join('\n  ')}`); process.exit(1); }
console.log('Colour lint passed – all component colours come from design tokens.');
