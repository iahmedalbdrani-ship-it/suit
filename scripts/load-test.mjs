// Simple load test for the public quote API.
// Usage: node scripts/load-test.mjs [baseUrl] [requests] [concurrency]
const base = process.argv[2] ?? "http://localhost:3000";
const total = Number(process.argv[3] ?? 400);
const concurrency = Number(process.argv[4] ?? 20);
const day = (n) => new Date(Date.now() + 3 * 3600e3 + n * 86400e3).toISOString().slice(0, 10);
const slugs = ["riyadh-hittin-family-3br", "jeddah-rawdah-cozy-1br", "madinah-quba-calm-2br", "khobar-corniche-1br"];
const times = []; let errors = 0; let next = 0;
async function worker() {
  while (next < total) {
    const i = next++;
    const start = 120 + (i % 60);
    const url = `${base}/api/quote?slug=${slugs[i % slugs.length]}&checkIn=${day(start)}&checkOut=${day(start + 3)}&guests=2`;
    const t = performance.now();
    try {
      const r = await fetch(url, { headers: { "x-forwarded-for": `10.0.${i % 250}.${i % 7}` } });
      if (!r.ok) errors++; else await r.json();
    } catch { errors++; }
    times.push(performance.now() - t);
  }
}
const t0 = performance.now();
await Promise.all(Array.from({ length: concurrency }, worker));
const secs = (performance.now() - t0) / 1000;
times.sort((a, b) => a - b);
const p = (q) => times[Math.min(times.length - 1, Math.floor(q * times.length))].toFixed(1);
console.log(JSON.stringify({ requests: total, concurrency, errors, rps: Math.round(total / secs), p50_ms: p(0.5), p95_ms: p(0.95), p99_ms: p(0.99) }));
