/**
 * Render Keep-Alive Heartbeat Pinger
 * 
 * Periodically visits the 3 Render-hosted services to keep them warm and prevent
 * Render Free Tier from spinning down after 15 minutes of inactivity.
 *
 * Reads all URLs dynamically from .env regardless of which folder it is executed from:
 *   - Root folder: node scripts/keep-alive.js
 *   - Backend folder: cd backend && node keep-alive.js (or npm run keep-alive)
 *   - Any subfolder: node path/to/keep-alive.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// -------------------------------------------------------------
// 1. Zero-Dependency .env Loader (searches multiple candidate locations)
// -------------------------------------------------------------
function loadEnvFile() {
  const candidatePaths = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), 'backend', '.env'),
    path.resolve(__dirname, '..', '.env'),
    path.resolve(__dirname, '..', 'backend', '.env'),
    path.resolve(__dirname, '.env'),
    path.resolve(process.cwd(), '..', '.env')
  ];

  const loadedFiles = [];

  for (const envPath of candidatePaths) {
    if (fs.existsSync(envPath) && !loadedFiles.includes(envPath)) {
      try {
        const content = fs.readFileSync(envPath, 'utf-8');
        const lines = content.split(/\r?\n/);
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#')) continue;
          const eqIdx = trimmed.indexOf('=');
          if (eqIdx !== -1) {
            const key = trimmed.slice(0, eqIdx).trim();
            let val = trimmed.slice(eqIdx + 1).trim();
            // Strip surrounding quotes if present
            if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
              val = val.slice(1, -1);
            }
            // Only set if not already present or if empty
            if (!process.env[key] && val) {
              process.env[key] = val;
            }
          }
        }
        loadedFiles.push(envPath);
      } catch (e) {
        // Ignore read errors
      }
    }
  }

  return loadedFiles;
}

const loadedEnvFiles = loadEnvFile();

// -------------------------------------------------------------
// 2. Resolve URLs dynamically from environment variables
// -------------------------------------------------------------
// Fallback defaults in case .env variables are completely missing
const DEFAULT_FRONTEND = 'https://dating-agent-83nz.onrender.com';
const DEFAULT_BACKEND = 'https://dating-agent-backend2.onrender.com';
const DEFAULT_AI = 'https://dating-agent-ai.onrender.com';

const rawFrontend = process.env.FRONTEND_URL || process.env.RENDER_FRONTEND_URL || DEFAULT_FRONTEND;
const rawBackend = process.env.BACKEND_URL || process.env.RENDER_BACKEND_URL || DEFAULT_BACKEND;
const rawAi =
  process.env.RENDER_AI_SERVICE_URL ||
  (process.env.AI_SERVICE_URL && process.env.AI_SERVICE_URL.includes('onrender') ? process.env.AI_SERVICE_URL : null) ||
  (process.env.AI_SERVICE_URL && !process.env.AI_SERVICE_URL.includes('127.0.0.1') && !process.env.AI_SERVICE_URL.includes('localhost') ? process.env.AI_SERVICE_URL : null) ||
  DEFAULT_AI;

// Helper to format clean URLs with health check endpoints
function formatEndpoint(base, subPath = '') {
  let clean = base.trim().replace(/\/+$/, '');
  if (subPath) {
    if (!clean.endsWith(subPath)) {
      clean = `${clean}${subPath}`;
    }
  }
  return clean;
}

const SERVICES = [
  {
    name: 'Frontend Web App',
    url: formatEndpoint(rawFrontend, ''),
    type: 'Frontend',
    envSource: process.env.FRONTEND_URL ? 'FRONTEND_URL' : 'Default Fallback'
  },
  {
    name: 'Express Backend API',
    url: formatEndpoint(rawBackend, '/health'),
    type: 'Backend',
    envSource: process.env.BACKEND_URL ? 'BACKEND_URL' : 'Default Fallback'
  },
  {
    name: 'FastAPI AI Engine',
    url: formatEndpoint(rawAi, '/health'),
    type: 'AI Service',
    envSource: process.env.RENDER_AI_SERVICE_URL
      ? 'RENDER_AI_SERVICE_URL'
      : process.env.AI_SERVICE_URL
      ? 'AI_SERVICE_URL'
      : 'Default Fallback'
  }
];

// -------------------------------------------------------------
// 3. Resolve Interval
// -------------------------------------------------------------
const getIntervalMinutes = () => {
  const args = process.argv.slice(2);
  const idx = args.indexOf('--interval');
  if (idx !== -1 && args[idx + 1]) {
    const parsed = parseFloat(args[idx + 1]);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  const envVal = parseFloat(process.env.KEEP_ALIVE_INTERVAL_MINUTES);
  if (!isNaN(envVal) && envVal > 0) return envVal;
  return 5; // Default: 5 minutes
};

const INTERVAL_MINUTES = getIntervalMinutes();
const INTERVAL_MS = INTERVAL_MINUTES * 60 * 1000;
const TIMEOUT_MS = 45 * 1000; // 45s timeout per request to allow for cold starts

const getTimestamp = () => {
  const now = new Date();
  return now.toTimeString().split(' ')[0];
};

async function pingUrl(service) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const startTime = Date.now();

  try {
    const response = await fetch(service.url, {
      method: 'GET',
      headers: {
        'User-Agent': 'RenderKeepAlivePinger/1.0',
        'Cache-Control': 'no-cache'
      },
      signal: controller.signal
    });

    clearTimeout(timer);
    const elapsed = Date.now() - startTime;
    const isOk = response.status >= 200 && response.status < 400;

    if (isOk) {
      console.log(
        `  [\x1b[32mOK ${response.status}\x1b[0m] ${service.name.padEnd(20)} | ${elapsed}ms | ${service.url}`
      );
      return { success: true, service: service.name, status: response.status, elapsed };
    } else {
      console.log(
        `  [\x1b[33mWARN ${response.status}\x1b[0m] ${service.name.padEnd(20)} | ${elapsed}ms | ${service.url}`
      );
      return { success: false, service: service.name, status: response.status, elapsed };
    }
  } catch (err) {
    clearTimeout(timer);
    const elapsed = Date.now() - startTime;
    const msg = err.name === 'AbortError' ? 'Request Timed Out (>45s)' : err.message;
    console.log(
      `  [\x1b[31mFAIL\x1b[0m] ${service.name.padEnd(20)} | ${elapsed}ms | Error: ${msg}`
    );
    return { success: false, service: service.name, error: msg, elapsed };
  }
}

let cycleCount = 0;

async function runHeartbeat() {
  cycleCount++;
  console.log(`\n============================================================`);
  console.log(`[${getTimestamp()}] 💓 Heartbeat Cycle #${cycleCount} — Pinging ${SERVICES.length} Render Services...`);
  console.log(`============================================================`);

  const results = await Promise.all(SERVICES.map((s) => pingUrl(s)));
  const successful = results.filter((r) => r.success).length;

  console.log(`------------------------------------------------------------`);
  console.log(
    `Cycle #${cycleCount} complete: ${successful}/${SERVICES.length} services active. Next check in ${INTERVAL_MINUTES} min.`
  );
}

// -------------------------------------------------------------
// 4. Initial Banner & Startup
// -------------------------------------------------------------
console.log(`\n============================================================`);
console.log(`🚀 Render Services Keep-Alive Heartbeat Initialized`);
if (loadedEnvFiles.length > 0) {
  console.log(`📂 Loaded .env configurations from:`);
  loadedEnvFiles.forEach((f) => console.log(`   - ${f}`));
} else {
  console.log(`⚠️  No .env file found in working directory or parents (using defaults).`);
}
console.log(`\n🌐 Configured Target Endpoints (from .env):`);
SERVICES.forEach((s) => {
  console.log(`   • ${s.name.padEnd(20)} [${s.envSource}] -> ${s.url}`);
});
console.log(`\n⏱️  Check Interval: Every ${INTERVAL_MINUTES} minutes (${INTERVAL_MS / 1000}s)`);
console.log(`   Working Directory: ${process.cwd()}`);
console.log(`   Press Ctrl+C to stop anytime.`);
console.log(`============================================================`);

// Immediate initial execution
runHeartbeat();

// Scheduled recurring interval
const intervalHandle = setInterval(runHeartbeat, INTERVAL_MS);

// Clean exit signals
process.on('SIGINT', () => {
  console.log(`\n[${getTimestamp()}] Keep-alive pinger stopped by user.`);
  clearInterval(intervalHandle);
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log(`\n[${getTimestamp()}] Keep-alive pinger received SIGTERM, exiting.`);
  clearInterval(intervalHandle);
  process.exit(0);
});
