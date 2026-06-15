// build-data.mjs
// Refreshes data.json from the official Google Search Status Dashboard,
// merged with the curated seed (which holds notes + pre-2021 history).
// Run by GitHub Actions on a daily cron. Requires Node 18+ (global fetch).

import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const SEED = path.join(ROOT, "data", "seed.json");
const OUT  = path.join(ROOT, "data.json");

// Official, no-auth JSON feed of all Google Search incidents.
const FEED = "https://status.search.google.com/incidents.json";
const RANKING_SERVICE = "Ranking"; // service_name we keep

// Turn a name into a stable key so dashboard + seed entries dedupe cleanly.
const normName = s =>
  String(s).toLowerCase()
    .replace(/[\u201c\u201d"']/g, "")
    .replace(/\bupdate\b/g, "")
    .replace(/\s+/g, " ")
    .trim();

const isoDay = s => new Date(s).toISOString().slice(0, 10);

// Classify a dashboard incident into core | spam | other.
function classify(text) {
  const t = text.toLowerCase();
  if (t.includes("spam")) return "spam";
  if (t.includes("core")) return "core";              // catches "Discover core update"
  if (/(helpful content|reviews|site reputation)/.test(t)) return "other";
  return "other";
}

async function fetchDashboard() {
  const res = await fetch(FEED, { headers: { "User-Agent": "serp-forecaster (github actions)" } });
  if (!res.ok) throw new Error(`Feed HTTP ${res.status}`);
  const incidents = await res.json();
  return incidents
    .filter(i =>
      i.service_name === RANKING_SERVICE ||
      (i.affected_products || []).some(p => p.title === RANKING_SERVICE))
    .filter(i => new Date(i.begin).getUTCFullYear() >= 2021) // pre-2021 comes from seed
    .map(i => {
      const desc = i.external_desc || "";
      const recent = i.most_recent_update?.text || "";
      return {
        start: isoDay(i.begin),
        end:   isoDay(i.end || i.begin),
        type:  classify(desc + " " + recent),
        name:  desc.replace(/\bupdate\b/i, "").trim()
                   .replace(/\b\w/g, c => c.toUpperCase()) || desc,
        note:  "",
        _ongoing: !i.end
      };
    });
}

function load(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); }
  catch { return fallback; }
}

async function main() {
  const seed = load(SEED, []);
  const byKey = new Map();
  for (const u of seed) byKey.set(normName(u.name), { ...u });

  let live = [];
  try {
    live = await fetchDashboard();
  } catch (e) {
    console.error("Dashboard fetch failed, keeping seed only:", e.message);
  }

  for (const u of live) {
    const key = normName(u.name);
    if (byKey.has(key)) {
      // Keep the curated name + note, refresh authoritative dates.
      const cur = byKey.get(key);
      cur.start = u.start;
      cur.end = u.end;
      if (!cur.type) cur.type = u.type;
    } else {
      byKey.set(key, { start: u.start, end: u.end, type: u.type, name: u.name, note: u.note });
    }
  }

  const updates = [...byKey.values()].sort((a, b) => a.start.localeCompare(b.start));
  const out = {
    generated: new Date().toISOString(),
    source: "Google Search Status Dashboard (Ranking, 2021+) merged with curated seed",
    count: updates.length,
    updates
  };
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + "\n");
  console.log(`Wrote ${updates.length} updates (${live.length} live, ${seed.length} seed).`);
}

main();
