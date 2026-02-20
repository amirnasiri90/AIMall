#!/usr/bin/env node
/**
 * نوشتن frontend/public/release.json با releaseId از گیت یا تاریخ.
 * قبل یا بعد از بیلد فراخوانی شود تا هر بیلد یک شناسهٔ یکتا داشته باشد.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

let releaseId = '0';
try {
  releaseId = execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();
} catch {
  releaseId = 'build-' + new Date().toISOString().slice(0, 19).replace(/[-:T]/g, '');
}

const dir = path.join(__dirname, '..', 'public');
const file = path.join(dir, 'release.json');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(file, JSON.stringify({ releaseId }) + '\n', 'utf-8');
console.log('release.json:', { releaseId });
