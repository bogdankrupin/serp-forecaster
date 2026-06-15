# SERP Forecaster

An interactive predictor for Google algorithm updates. It reads the confirmed
update history, measures **cadence** (intervals between launches) and
**seasonality** (which months updates cluster in), and projects a likely window
for the next core update. Static site — no backend, no build tooling.

> It is not a prophecy. Google doesn't publish a schedule and confirms only the
> larger updates. The window is a monitoring cue, not a deadline.

## How the daily update works

Two things keep it current, both free:

1. **The data** (`data.json`) is refreshed every day by a GitHub Action that
   pulls the official, no-auth feed at
   `https://status.search.google.com/incidents.json`, keeps the `Ranking`
   incidents from 2021 onward, and merges them with `data/seed.json` (curated
   pre-2021 history + notes). New confirmed updates appear automatically.
2. **"Today"** is computed in the browser at view time, so the *now* marker and
   the countdown stay correct between data refreshes.

```
index.html              the page (loads ./data.json, falls back to a built-in list)
data.json               generated artifact the page reads
data/seed.json          your source of truth — edit names/notes/old updates here
scripts/build-data.mjs  fetch + merge + classify -> data.json
.github/workflows/update-data.yml   daily cron + Pages deploy
```

## Setup (about 3 minutes)

1. Create a new GitHub repo and push these files (default branch `main`).
2. **Settings → Pages → Build and deployment → Source: GitHub Actions.**
3. **Settings → Actions → General → Workflow permissions: Read and write.**
4. Open the **Actions** tab and run *Update data & deploy* once (or just wait
   for the daily run). Your site goes live at
   `https://<user>.github.io/<repo>/`.

The workflow runs daily at 06:17 UTC, on every push to `main`, and on demand
from the Actions tab.

## Run it locally

`fetch` needs HTTP, so don't open `index.html` from disk — serve the folder:

```bash
python3 -m http.server 8000      # then visit http://localhost:8000
node scripts/build-data.mjs      # refresh data.json by hand (Node 18+)
```

## Editing the data

Add or correct entries in `data/seed.json` — each is
`{ "start": "YYYY-MM-DD", "end": "YYYY-MM-DD", "type": "core|spam|other", "name": "...", "note": "..." }`.
The merge matches dashboard entries to seed entries by normalized name, so your
names and notes win while the dashboard supplies authoritative dates.

## Sources

- [Google Search Status Dashboard](https://status.search.google.com/summary) — `incidents.json` (live, 2021+)
- Curated seed for 2018–2020, cross-checked against Search Engine Land and Search Engine Roundtable
