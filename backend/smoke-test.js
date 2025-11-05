import fetch from 'node-fetch';

const port = process.env.PORT || 8080;
const base = `http://localhost:${port}`;

async function checkHealth() {
  try {
    const res = await fetch(`${base}/health`, { timeout: 5000 });
    const json = await res.json();
    if (res.ok) {
      console.log('OK: /health ->', json);
      return true;
    }
    console.error('ERROR: /health returned', res.status, json);
    return false;
  } catch (e) {
    console.error('ERROR: Failed to reach server:', e.message || e);
    return false;
  }
}

(async () => {
  const ok = await checkHealth();
  if (!ok) process.exit(2);
  console.log('Smoke test passed. Server is responding.');
  process.exit(0);
})();
