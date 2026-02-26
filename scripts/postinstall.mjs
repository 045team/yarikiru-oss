#!/usr/bin/env node
/**
 * Postinstall: build .next if missing (for global install from git).
 * Skips when .next/server already exists.
 */
import { existsSync } from 'fs';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgRoot = dirname(__dirname);
const serverDir = `${pkgRoot}/.next/server`;

if (!existsSync(serverDir)) {
  console.log('YARIKIRU OSS: Building Next.js app (first install)...');
  const r = spawnSync('npm', ['run', 'build'], { stdio: 'inherit', cwd: pkgRoot });
  if (r.status !== 0) {
    console.warn('Build finished with warnings. Run "yarikiru ui" to verify.');
  }
}
