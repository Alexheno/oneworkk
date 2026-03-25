/**
 * launch.js — Launcher OneWork development
 * Removes ELECTRON_RUN_AS_NODE from environment before spawning Electron.
 * This env var (if set globally on Windows) prevents Electron from running
 * in browser/app mode and causes all Electron APIs to be unavailable.
 */
const { spawn, execSync } = require('child_process');
const path                = require('path');
const electronExe         = require('./node_modules/electron');

// Kill any existing Electron instance to prevent GPU cache conflicts
try { execSync('taskkill /F /IM electron.exe /T', { stdio: 'ignore' }); } catch (_) {}

// Build clean env without ELECTRON_RUN_AS_NODE
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

const child = spawn(electronExe, [
    '.',
    '--disable-gpu',
    '--disable-gpu-sandbox',
    '--no-sandbox',
], {
    stdio: 'inherit',
    env,
    cwd: __dirname,
});

child.on('exit', code => process.exit(code ?? 0));
child.on('error', err => { console.error('[launch] Erreur:', err.message); process.exit(1); });
