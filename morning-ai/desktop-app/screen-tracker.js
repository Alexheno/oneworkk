'use strict';

const { app }   = require('electron');
const fs        = require('fs');
const path      = require('path');
const { spawn } = require('child_process');

// ─── App display map: processName (lowercase) → { name, color, category } ─────
const APP_MAP = {
  // ── Microsoft Office ────────────────────────────────────
  'excel':         { name: 'Microsoft Excel',       color: '#217346', category: 'documents'     },
  'winword':       { name: 'Microsoft Word',         color: '#2B579A', category: 'documents'     },
  'powerpnt':      { name: 'PowerPoint',             color: '#B7472A', category: 'documents'     },
  'onenote':       { name: 'OneNote',                color: '#7719AA', category: 'documents'     },
  'msaccess':      { name: 'Access',                 color: '#A4373A', category: 'documents'     },
  'mspub':         { name: 'Publisher',              color: '#077568', category: 'documents'     },
  'visio':         { name: 'Visio',                  color: '#3955A3', category: 'documents'     },
  'onedrive':      { name: 'OneDrive',               color: '#0078D4', category: 'documents'     },
  // ── Microsoft Communication ─────────────────────────────
  'outlook':       { name: 'Outlook',                color: '#0078D4', category: 'communication' },
  'hxoutlook':     { name: 'Outlook',                color: '#0078D4', category: 'communication' },
  'hxmail':        { name: 'Outlook',                color: '#0078D4', category: 'communication' },
  'teams':         { name: 'Microsoft Teams',        color: '#6264A7', category: 'communication' },
  'msteams':       { name: 'Microsoft Teams',        color: '#6264A7', category: 'communication' },
  'skype':         { name: 'Skype',                  color: '#00AFF0', category: 'communication' },
  'lync':          { name: 'Skype for Business',     color: '#006BAA', category: 'communication' },
  // ── Microsoft Browser & System ──────────────────────────
  'msedge':        { name: 'Microsoft Edge',         color: '#0087C0', category: 'browser'       },
  'iexplore':      { name: 'Internet Explorer',      color: '#1EAAFC', category: 'browser'       },
  'explorer':      { name: 'File Explorer',          color: '#FFC107', category: 'other'         },
  'notepad':       { name: 'Notepad',                color: '#78909C', category: 'documents'     },
  'mspaint':       { name: 'Paint',                  color: '#E91E63', category: 'other'         },
  'calc':          { name: 'Calculatrice',            color: '#607D8B', category: 'other'         },
  'snippingtool':  { name: 'Outil Capture',          color: '#455A64', category: 'other'         },
  // ── Dev Tools ───────────────────────────────────────────
  'code':          { name: 'VS Code',                color: '#007ACC', category: 'documents'     },
  'cursor':        { name: 'Cursor',                 color: '#676799', category: 'documents'     },
  'devenv':        { name: 'Visual Studio',          color: '#68217A', category: 'documents'     },
  'idea64':        { name: 'IntelliJ IDEA',          color: '#FE315D', category: 'documents'     },
  'pycharm64':     { name: 'PyCharm',                color: '#21D789', category: 'documents'     },
  'webstorm64':    { name: 'WebStorm',               color: '#00B9F5', category: 'documents'     },
  'datagrip64':    { name: 'DataGrip',               color: '#9775F8', category: 'documents'     },
  'rider64':       { name: 'Rider',                  color: '#EF318B', category: 'documents'     },
  'sublime_text':  { name: 'Sublime Text',           color: '#FF9800', category: 'documents'     },
  'atom':          { name: 'Atom',                   color: '#66595C', category: 'documents'     },
  'notepad++':     { name: 'Notepad++',              color: '#90C53F', category: 'documents'     },
  'typora':        { name: 'Typora',                 color: '#6DBF67', category: 'documents'     },
  'obsidian':      { name: 'Obsidian',               color: '#7C3AED', category: 'documents'     },
  'terminal':      { name: 'Terminal',               color: '#263238', category: 'other'         },
  'windowsterminal':{ name: 'Windows Terminal',      color: '#2D2D30', category: 'other'         },
  'cmd':           { name: 'Command Prompt',         color: '#263238', category: 'other'         },
  'powershell':    { name: 'PowerShell',             color: '#012456', category: 'other'         },
  'git-bash':      { name: 'Git Bash',               color: '#F05032', category: 'other'         },
  // ── Browsers ────────────────────────────────────────────
  'chrome':        { name: 'Google Chrome',          color: '#4285F4', category: 'browser'       },
  'firefox':       { name: 'Firefox',                color: '#FF7139', category: 'browser'       },
  'brave':         { name: 'Brave',                  color: '#FB542B', category: 'browser'       },
  'opera':         { name: 'Opera',                  color: '#FF1B2D', category: 'browser'       },
  'vivaldi':       { name: 'Vivaldi',                color: '#EF3939', category: 'browser'       },
  'arc':           { name: 'Arc',                    color: '#7C3AED', category: 'browser'       },
  // ── Communication / Social ──────────────────────────────
  'slack':         { name: 'Slack',                  color: '#4A154B', category: 'communication' },
  'discord':       { name: 'Discord',                color: '#5865F2', category: 'communication' },
  'telegram':      { name: 'Telegram',               color: '#229ED9', category: 'communication' },
  'whatsapp':      { name: 'WhatsApp',               color: '#25D366', category: 'communication' },
  'signal':        { name: 'Signal',                 color: '#3A76F0', category: 'communication' },
  // ── Meetings ────────────────────────────────────────────
  'zoom':          { name: 'Zoom',                   color: '#2D8CFF', category: 'meetings'      },
  'webex':         { name: 'Cisco Webex',            color: '#00B0F0', category: 'meetings'      },
  'gotomeeting':   { name: 'GoToMeeting',            color: '#F68D2E', category: 'meetings'      },
  // ── Creative ────────────────────────────────────────────
  'photoshop':     { name: 'Photoshop',              color: '#31A8FF', category: 'documents'     },
  'illustrator':   { name: 'Illustrator',            color: '#FF9A00', category: 'documents'     },
  'figma':         { name: 'Figma',                  color: '#F24E1E', category: 'documents'     },
  'xd':            { name: 'Adobe XD',               color: '#FF61F6', category: 'documents'     },
  'afterfx':       { name: 'After Effects',          color: '#9999FF', category: 'documents'     },
  'premiere':      { name: 'Premiere Pro',           color: '#9999FF', category: 'documents'     },
  'acrobat':       { name: 'Adobe Acrobat',          color: '#FF0000', category: 'documents'     },
  'acrord32':      { name: 'Adobe Acrobat',          color: '#FF0000', category: 'documents'     },
  // ── Productivity ────────────────────────────────────────
  'notion':        { name: 'Notion',                 color: '#000000', category: 'documents'     },
  'miro':          { name: 'Miro',                   color: '#FFDD00', category: 'documents'     },
  'todoist':       { name: 'Todoist',                color: '#DB4035', category: 'documents'     },
  'trello':        { name: 'Trello',                 color: '#0052CC', category: 'documents'     },
  // ── Media / Entertainment ────────────────────────────── (lowers score)
  'vlc':           { name: 'VLC',                    color: '#FF8800', category: 'other'         },
  'spotify':       { name: 'Spotify',                color: '#1DB954', category: 'other'         },
  'netflix':       { name: 'Netflix',                color: '#E50914', category: 'other'         },
};

// ─── Categories (for aggregation, chart, score) ───────────────────────────────
const CATS = {
  communication: { label: 'Communication', color: '#0078D4' },
  meetings:      { label: 'Réunions',      color: '#6264A7' },
  documents:     { label: 'Documents',     color: '#217346' },
  browser:       { label: 'Navigateur',    color: '#FF6B2B' },
  other:         { label: 'Autre',         color: '#94a3b8' },
};

// ─── State ────────────────────────────────────────────────────────────────────
let psProcess    = null;
let todayData    = null;
let restartTimer = null;

// ─── Storage ─────────────────────────────────────────────────────────────────
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function dataPath() {
  return path.join(app.getPath('userData'), `ow-screen-${todayStr()}.json`);
}
function loadData() {
  try {
    if (fs.existsSync(dataPath())) {
      const raw = JSON.parse(fs.readFileSync(dataPath(), 'utf8'));
      if (raw.date === todayStr()) return raw;
    }
  } catch {}
  return { date: todayStr(), hourly: {} };
}
function saveData() {
  try { fs.writeFileSync(dataPath(), JSON.stringify(todayData), 'utf8'); } catch {}
}

// ─── App resolution ──────────────────────────────────────────────────────────
function resolveApp(proc) {
  const key = (proc || '').toLowerCase().replace(/\.exe$/i, '');
  if (APP_MAP[key]) return { key, ...APP_MAP[key] };
  for (const [k, v] of Object.entries(APP_MAP)) {
    if (key.includes(k)) return { key: k, ...v };
  }
  const displayName = key
    .replace(/[-_]/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, s => s.toUpperCase());
  return { key: key || 'other', name: displayName || 'Autre', color: '#94a3b8', category: 'other' };
}

function isMeetingByTitle(proc, title) {
  const p = (proc || '').toLowerCase();
  const t = (title || '').toLowerCase();
  return (p.includes('teams') || p.includes('zoom') || p.includes('webex')) &&
    (t.includes('meeting') || t.includes('réunion') || t.includes('call') || t.includes('appel'));
}

// ─── Record tick (10s) ────────────────────────────────────────────────────────
function recordTick(proc, title) {
  if (!todayData) todayData = loadData();
  if (todayData.date !== todayStr()) todayData = { date: todayStr(), hourly: {} };

  const appInfo = resolveApp(proc);
  const key     = isMeetingByTitle(proc, title) ? `${appInfo.key}__meeting` : appInfo.key;
  const hour    = new Date().getHours();

  if (!todayData.hourly[hour]) todayData.hourly[hour] = {};
  todayData.hourly[hour][key] = (todayData.hourly[hour][key] || 0) + 10;
  saveData();
}

// ─── PowerShell persistent loop ───────────────────────────────────────────────
const PS_SCRIPT = [
  'Add-Type -TypeDefinition @"',
  'using System; using System.Runtime.InteropServices; using System.Text;',
  'namespace OW { public class FW {',
  '  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();',
  '  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);',
  '  [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr h, StringBuilder sb, int n);',
  '} }',
  '"@',
  'while ($true) {',
  '  try {',
  '    $h = [OW.FW]::GetForegroundWindow()',
  '    $pid = [uint32]0',
  '    [OW.FW]::GetWindowThreadProcessId($h, [ref]$pid) | Out-Null',
  '    $sb = New-Object System.Text.StringBuilder 512',
  '    [OW.FW]::GetWindowText($h, $sb, 512) | Out-Null',
  '    $p = (Get-Process -Id $pid -EA SilentlyContinue).ProcessName',
  '    Write-Output "$p|||$($sb.ToString())"',
  '    [Console]::Out.Flush()',
  '  } catch {}',
  '  Start-Sleep -Seconds 10',
  '}',
].join('\r\n');

function spawnPS(scriptPath) {
  psProcess = spawn('powershell', [
    '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', scriptPath,
  ], { windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'] });

  let buf = '';
  psProcess.stdout.on('data', chunk => {
    buf += chunk.toString();
    let nl;
    while ((nl = buf.indexOf('\n')) !== -1) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (line.includes('|||')) {
        const sep = line.indexOf('|||');
        recordTick(line.slice(0, sep), line.slice(sep + 3));
      }
    }
  });
  psProcess.on('error', err => console.error('[ScreenTracker]', err.message));
  psProcess.on('exit', code => {
    psProcess = null;
    console.log(`[ScreenTracker] PS exit (${code}), retry in 20s`);
    restartTimer = setTimeout(() => spawnPS(scriptPath), 20000);
  });
  console.log('[ScreenTracker] Started');
}

// ─── Public ───────────────────────────────────────────────────────────────────
function start() {
  todayData = loadData();
  const scriptPath = path.join(app.getPath('userData'), 'ow-tracker.ps1');
  try { fs.writeFileSync(scriptPath, PS_SCRIPT, 'utf8'); }
  catch (e) { console.error('[ScreenTracker] write error:', e.message); return; }
  spawnPS(scriptPath);
}

function stop() {
  if (restartTimer) { clearTimeout(restartTimer); restartTimer = null; }
  if (psProcess)    { psProcess.kill(); psProcess = null; }
}

function getScreenTimeData() {
  if (!todayData) todayData = loadData();

  // Per-app total seconds
  const appSecs = {};
  for (const hourData of Object.values(todayData.hourly)) {
    for (const [rawKey, secs] of Object.entries(hourData)) {
      const key = rawKey.replace('__meeting', '');
      appSecs[key] = (appSecs[key] || 0) + secs;
    }
  }

  // Build enriched app list
  const apps = Object.entries(appSecs)
    .map(([key, secs]) => {
      const info = resolveApp(key);
      return { ...info, seconds: secs, minutes: Math.round(secs / 60) };
    })
    .filter(a => a.minutes >= 1)
    .sort((a, b) => b.seconds - a.seconds)
    .slice(0, 20);

  // Category totals (seconds)
  const catSecs = { communication: 0, meetings: 0, documents: 0, browser: 0, other: 0 };
  for (const [rawKey, secs] of Object.entries(appSecs)) {
    const info = resolveApp(rawKey.replace('__meeting', ''));
    const cat  = rawKey.endsWith('__meeting') ? 'meetings' : info.category;
    catSecs[cat] = (catSecs[cat] || 0) + secs;
  }
  const totals = {};
  for (const [k, v] of Object.entries(catSecs)) totals[k] = Math.round(v / 60);

  // Hourly by category (for chart)
  const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17];
  const hourly = HOURS.map(h => {
    const d = todayData.hourly[h] || {};
    const bucket = { hour: h, communication: 0, meetings: 0, documents: 0, browser: 0, other: 0 };
    for (const [rawKey, secs] of Object.entries(d)) {
      const info = resolveApp(rawKey.replace('__meeting', ''));
      const cat  = rawKey.endsWith('__meeting') ? 'meetings' : info.category;
      bucket[cat] = (bucket[cat] || 0) + secs;
    }
    for (const k of Object.keys(bucket)) {
      if (k !== 'hour') bucket[k] = Math.round(bucket[k] / 60);
    }
    return bucket;
  });

  // Productivity score
  const prodSecs = catSecs.communication + catSecs.documents + catSecs.meetings;
  const totalSec = Object.values(catSecs).reduce((a, b) => a + b, 0);
  const score    = totalSec > 0 ? Math.min(100, Math.round((prodSecs / totalSec) * 100)) : null;

  return { hourly, totals, score, apps };
}

module.exports = { start, stop, getScreenTimeData, APP_MAP, CATS };
