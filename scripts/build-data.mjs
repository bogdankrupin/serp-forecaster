// build-data.mjs
// Refreshes data.json from the official Google Search Status Dashboard,
// merged with the curated seed (notes + pre-2021 history), then rewrites the
// "Latest forecast" block in README.md so the published numbers stay fresh.
// Run by GitHub Actions on a daily cron. Requires Node 18+ (global fetch).

import fs from "node:fs";
import path from "node:path";

const ROOT   = path.resolve(import.meta.dirname, "..");
const SEED   = path.join(ROOT, "data", "seed.json");
const OUT    = path.join(ROOT, "data.json");
const README = path.join(ROOT, "README.md");

const FEED = "https://status.search.google.com/incidents.json";
const RANKING_SERVICE = "Ranking";
const DAY = 86400000;

const normName = s =>
  String(s).toLowerCase()
    .replace(/[\u201c\u201d"']/g, "")
    .replace(/\bupdate\b/g, "")
    .replace(/\s+/g, " ")
    .trim();

const isoDay = s => new Date(s).toISOString().slice(0, 10);

const MONTHS = ["January","February","March","April","May","June",
  "July","August","September","October","November","December"];
const fmtLong = d => `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;

const median = a => { const s=[...a].sort((x,y)=>x-y); const m=s.length>>1; return s.length%2?s[m]:(s[m-1]+s[m])/2; };
function percentile(a,p){ const s=[...a].sort((x,y)=>x-y); const i=(s.length-1)*p, lo=Math.floor(i), hi=Math.ceil(i);
  return lo===hi?s[lo]:s[lo]+(s[hi]-s[lo])*(i-lo); }
const addDays = (d,n) => new Date(d.getTime()+n*DAY);

function classify(text){
  const t = text.toLowerCase();
  if (t.includes("spam")) return "spam";
  if (t.includes("core")) return "core";
  if (/(helpful content|reviews|site reputation)/.test(t)) return "other";
  return "other";
}

async function fetchDashboard(){
  const res = await fetch(FEED, { headers: { "User-Agent": "serp-forecaster (github actions)" } });
  if (!res.ok) throw new Error(`Feed HTTP ${res.status}`);
  const incidents = await res.json();
  return incidents
    .filter(i => i.service_name === RANKING_SERVICE ||
      (i.affected_products || []).some(p => p.title === RANKING_SERVICE))
    .filter(i => new Date(i.begin).getUTCFullYear() >= 2021)
    .map(i => {
      const desc = i.external_desc || "";
      const recent = i.most_recent_update?.text || "";
      return {
        start: isoDay(i.begin),
        end:   isoDay(i.end || i.begin),
        type:  classify(desc + " " + recent),
        name:  desc.replace(/\bupdate\b/i, "").trim().replace(/\b\w/g, c => c.toUpperCase()) || desc,
        note:  ""
      };
    });
}

function load(file, fallback){
  try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return fallback; }
}

// Project the next core-update window from recent cadence.
function forecast(updates){
  const core = updates.filter(u => u.type === "core")
    .map(u => ({ d: new Date(u.start + "T00:00:00Z"), name: u.name }))
    .sort((a,b) => a.d - b.d);
  if (core.length < 4) return null;
  const dates = core.map(c => c.d);
  const gaps = [];
  for (let i=1;i<dates.length;i++) gaps.push(Math.round((dates[i]-dates[i-1])/DAY));
  const recent = gaps.slice(-6);
  const last = core[core.length-1];
  const med = median(recent);
  return {
    lastDate: last.d, lastName: last.name, med,
    winStart: addDays(last.d, Math.round(percentile(recent,0.25))),
    center:   addDays(last.d, Math.round(med)),
    winEnd:   addDays(last.d, Math.round(percentile(recent,0.75)))
  };
}

function updateReadme(fc){
  if (!fc) return;
  let md;
  try { md = fs.readFileSync(README, "utf8"); } catch { return; }
  const block =
`## Latest forecast

*As of ${fmtLong(new Date())} — recalculated automatically every day on the live site.*

- **Next Google core update window:** ~**${fmtLong(fc.winStart)} \u2192 ${fmtLong(fc.winEnd)}**
- **Central estimate:** ~**${fmtLong(fc.center)}**
- **Last confirmed core update:** ${fc.lastName} (started ${fmtLong(fc.lastDate)})
- **Basis:** median of the last 6 core-update intervals (${fc.med} days), with the window bounded by the 25th\u201375th percentile of recent intervals.

The forecast combines update cadence and seasonality; see [How the prediction works](#how-the-prediction-works).`;
  const re = /<!-- FORECAST:START -->[\s\S]*?<!-- FORECAST:END -->/;
  if (re.test(md)) {
    md = md.replace(re, `<!-- FORECAST:START -->\n${block}\n<!-- FORECAST:END -->`);
    fs.writeFileSync(README, md);
    console.log("README forecast block updated.");
  } else {
    console.log("README forecast markers not found, skipped.");
  }
}

async function main(){
  const seed = load(SEED, []);
  const byKey = new Map();
  for (const u of seed) byKey.set(normName(u.name), { ...u });

  let live = [];
  try { live = await fetchDashboard(); }
  catch (e) { console.error("Dashboard fetch failed, keeping seed only:", e.message); }

  for (const u of live) {
    const key = normName(u.name);
    if (byKey.has(key)) {
      const cur = byKey.get(key);
      cur.start = u.start; cur.end = u.end;
      if (!cur.type) cur.type = u.type;
    } else {
      byKey.set(key, { start: u.start, end: u.end, type: u.type, name: u.name, note: u.note });
    }
  }

  const updates = [...byKey.values()].sort((a,b) => a.start.localeCompare(b.start));
  const out = {
    generated: new Date().toISOString(),
    source: "Google Search Status Dashboard (Ranking, 2021+) merged with curated seed",
    count: updates.length,
    updates
  };
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + "\n");
  console.log(`Wrote ${updates.length} updates (${live.length} live, ${seed.length} seed).`);

  updateReadme(forecast(updates));
}

main();
