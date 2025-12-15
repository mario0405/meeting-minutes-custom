#!/usr/bin/env node
const { spawn } = require('child_process');

const port = process.env.PORT || process.argv[2] || '3118';
console.log(`Starting Next static server on port ${port} (detached)...`);

// Spawn pnpm start -p <port> detached so this script exits quickly and
// the server keeps running for Tauri to connect to.
const child = spawn('pnpm', ['start', '-p', port], {
  shell: true,
  detached: true,
  stdio: 'ignore'
});

child.unref();
console.log('Next static server started (detached).');
process.exit(0);
