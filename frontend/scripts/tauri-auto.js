#!/usr/bin/env node
/**
 * Auto-detect GPU and run Tauri with appropriate features
 */

const { execSync, spawn } = require('child_process');
const path = require('path');
const chokidar = require('chokidar');

// Get the command (dev or build)
const command = process.argv[2];
if (!command || !['dev', 'build'].includes(command)) {
  console.error('Usage: node tauri-auto.js [dev|build]');
  process.exit(1);
}

// Detect GPU feature
let feature = '';
try {
  const result = execSync('node scripts/auto-detect-gpu.js', {
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'inherit']
  });
  feature = result.trim();
} catch (err) {
  // If detection fails, continue with no features
}

console.log(''); // Empty line for spacing

const tauriBaseCmd = `tauri ${command}`;
const tauriWithFeatures = feature ? `${tauriBaseCmd} -- --features ${feature}` : tauriBaseCmd;

if (command === 'build') {
  console.log(`🚀 Running: ${tauriWithFeatures}`);
  try {
    execSync(tauriWithFeatures, { stdio: 'inherit' });
  } catch (err) {
    process.exit(err.status || 1);
  }
  process.exit(0);
}

// DEV flow: manage static Next server + tauri process and watch for layout/provider changes
console.log(`🚀 Starting dev environment (features: ${feature || 'none'})`);

function spawnServer() {
  console.log('🔧 Building Next (prebuilt assets)...');
  execSync('pnpm build', { stdio: 'inherit' });

  console.log('🔁 Starting Next static server (next start -p 3118)...');
  const server = spawn('pnpm', ['start', '-p', '3118'], { shell: true, stdio: 'inherit' });
  return server;
}

let serverProcess = spawnServer();

// Wait for server to become available
try {
  execSync('npx wait-on http://127.0.0.1:3118', { stdio: 'inherit' });
} catch (err) {
  console.error('Server did not start in time.');
}

function spawnTauri() {
  const cmd = feature ? `tauri dev -- --features ${feature}` : 'tauri dev';
  console.log(`🚀 Spawning: ${cmd}`);
  const tauri = spawn('tauri', ['dev'].concat(feature ? ['--', '--features', feature] : []), { shell: true, stdio: 'inherit' });
  return tauri;
}

let tauriProcess = spawnTauri();

// Watch layout and provider files and require a full restart on changes
const watchPaths = [
  path.join(process.cwd(), 'src', 'app', 'layout.tsx'),
  path.join(process.cwd(), 'src', 'components'),
  path.join(process.cwd(), 'src', 'contexts')
];

const watcher = chokidar.watch(watchPaths, { ignored: /node_modules/, ignoreInitial: true });
watcher.on('all', async (event, changedPath) => {
  console.log(`⚠️  Detected change (${event}) in ${changedPath}. Rebuilding and restarting...`);

  try {
    // Rebuild Next assets
    execSync('pnpm build', { stdio: 'inherit' });
  } catch (err) {
    console.error('Build failed:', err);
    return;
  }

  // Restart server and tauri to ensure full restart
  if (tauriProcess && !tauriProcess.killed) {
    console.log('🛑 Stopping tauri process...');
    try { tauriProcess.kill(); } catch (e) {}
  }
  if (serverProcess && !serverProcess.killed) {
    console.log('🛑 Stopping Next static server...');
    try { serverProcess.kill(); } catch (e) {}
  }

  // Respawn server and tauri
  serverProcess = spawnServer();
  try {
    execSync('npx wait-on http://127.0.0.1:3118', { stdio: 'inherit' });
  } catch (err) {
    console.error('Server did not start after rebuild.');
  }
  tauriProcess = spawnTauri();
});

// Forward signals to children and cleanup
function cleanupAndExit(code) {
  watcher.close();
  if (tauriProcess && !tauriProcess.killed) tauriProcess.kill();
  if (serverProcess && !serverProcess.killed) serverProcess.kill();
  process.exit(code || 0);
}

process.on('SIGINT', () => cleanupAndExit(0));
process.on('SIGTERM', () => cleanupAndExit(0));
