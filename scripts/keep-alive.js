/**
 * Render Keep-Alive Heartbeat Pinger
 * 
 * Periodically visits the 3 Render-hosted services to keep them warm and prevent
 * Render Free Tier from spinning down after 15 minutes of inactivity.
 *
 * Usage:
 *   node scripts/keep-alive.js
 *   node scripts/keep-alive.js --interval 5   (minutes, default: 5)
 */

const SERVICES = [
  {
    name: 'Frontend Web App',
    url: 'https://dating-agent-83nz.onrender.com',
    type: 'Frontend'
  },
  {
    name: 'Express Backend API',
    url: 'https://dating-agent-backend2.onrender.com/health',
    type: 'Backend'
  },
  {
    name: 'FastAPI AI Engine',
    url: 'https://dating-agent-ai.onrender.com/health',
    type: 'AI Service'
  }
];

// Parse interval from command line argument (e.g. --interval 5) or env var (default: 5 min)
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

// Banner
console.log(`\n============================================================`);
console.log(`🚀 Render Services Keep-Alive Heartbeat Initialized`);
console.log(`Targeting 3 Hosted Endpoints:`);
SERVICES.forEach((s) => console.log(`  • ${s.name} (${s.type}): ${s.url}`));
console.log(`Check Interval: Every ${INTERVAL_MINUTES} minutes (${INTERVAL_MS / 1000}s)`);
console.log(`Press Ctrl+C to terminate anytime.`);
console.log(`============================================================`);

// Immediate initial run
runHeartbeat();

// Scheduled recurring interval
const intervalHandle = setInterval(runHeartbeat, INTERVAL_MS);

// Handle clean shutdown
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
