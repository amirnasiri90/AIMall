/**
 * PM2 ecosystem config for AIMall.
 * Use from project root: pm2 start ecosystem.config.cjs
 * Paths assume you run from repo root (e.g. /root/AIMall or ~/AIMall).
 */
module.exports = {
  apps: [
    {
      name: 'aimall-backend',
      cwd: './backend',
      script: 'node',
      args: 'dist/main.js',
      env: { NODE_ENV: 'production' },
      env_file: '.env',
    },
    {
      name: 'aimall-frontend',
      cwd: './frontend',
      script: 'npm',
      args: 'run start',
      env: { NODE_ENV: 'production' },
    },
  ],
};
