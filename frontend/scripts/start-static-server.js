#!/usr/bin/env node
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

const port = process.env.PORT || process.argv[2] || '3118';
const logFile = path.resolve(__dirname, 'start-static-server.log');

console.log(`Starting Next static server on port ${port} (detached)...`);
console.log(`Server logs will be written to ${logFile}`);

// For Next projects configured with `output: 'export'` we need to run an export
// and serve the generated `out` folder. Use `serve` (via npx) to serve statics.
const cmd = `pnpm build && pnpm export && npx serve@latest out -l ${port} > "${logFile}" 2>&1`;
const child = spawn(cmd, {
  shell: true,
  detached: true,
  stdio: 'ignore'
});

child.unref();
console.log('Next static server started (detached).');

// Poll the server to check it becomes available, otherwise print a helpful hint
const url = `http://127.0.0.1:${port}/`;
let attempts = 0;
const maxAttempts = 30;
const delay = 1000;

function check() {
  attempts++;
  http.get(url, (res) => {
    console.log(`Frontend dev server is responding (status ${res.statusCode}).`);
    process.exit(0);
  }).on('error', () => {
    if (attempts >= maxAttempts) {
      console.error(`Failed to reach frontend on ${url} after ${attempts} attempts.`);
      try {
        const tail = fs.readFileSync(logFile, 'utf8').split('\n').slice(-200).join('\n');
        console.error('Last 200 lines of server log:\n', tail);
      } catch (e) {
        console.error('Could not read log file:', e.message);
      }
      process.exit(1);
    }
    setTimeout(check, delay);
  });
}

check();
