/**
 * PM2 ecosystem config for AIMall.
 * Use from project root: pm2 start ecosystem.config.cjs
 * Uses absolute paths so PM2 always runs from this repo, no matter where you run pm2 from.
 */
const path = require('path');
const root = path.resolve(__dirname);

module.exports = {
  apps: [
    {
      name: 'aimall-backend',
      cwd: path.join(root, 'backend'),
      script: 'node',
      args: 'dist/main.js',
      env: { NODE_ENV: 'production' },
      env_file: '.env',
    },
    {
      name: 'aimall-frontend',
      cwd: path.join(root, 'frontend'),
      script: 'npm',
      args: 'run start',
      env: { NODE_ENV: 'production' },
    },
  ],
};
