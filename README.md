# SERP Forecaster — Google Core & Spam Update Predictions

> **SERP Forecaster** is a free, open-source tool that predicts the likely window for the **next Google core update** and **next Google spam update**, based on the cadence and seasonality of every confirmed update since 2018.

**[▶ Open the live forecaster](https://bogdankrupin.github.io/serp-forecaster/)** · Data refreshed daily from the official Google Search Status Dashboard.

---

## What is SERP Forecaster?

SERP Forecaster is a **Google Core Update Forecaster** and **Google Spam Update Forecaster** in one. It reads the full, confirmed history of Google ranking updates, measures how far apart updates tend to land (**cadence**) and which months they cluster in (**seasonality**), and projects a probable date window for the next one. It is a statistical forecast, not a guarantee — Google does not publish a schedule — but it turns a vague "an update is probably coming soon" into a concrete window you can watch.

The whole thing is a single static HTML page plus a daily data job. No backend, no tracking, no cost.

<!-- FORECAST:START -->
## Latest forecast

*As of 29 June 2026 — recalculated automatically every day on the live site.*

- **Next Google core update window:** ~**15 July 2026 → 3 September 2026**
- **Central estimate:** ~**3 August 2026**
- **Last confirmed core update:** May 2026 Core (started 21 May 2026)
- **Basis:** median of the last 6 core-update intervals (73.5 days), with the window bounded by the 25th–75th percentile of recent intervals.

The forecast combines update cadence and seasonality; see [How the prediction works](#how-the-prediction-works).
<!-- FORECAST:END -->

---

## How the prediction works

The forecast combines two independent signals derived from the launch dates of confirmed core updates:

1. **Cadence.** The interval between consecutive core-update launches. The window centre is the last launch date plus the **median of the last six intervals**; the window's edges are the **25th and 75th percentiles** of those intervals. Using recent intervals lets the forecast adapt as Google's release rhythm changes.
2. **Seasonality.** The distribution of past updates across the calendar year. When the cadence projection lands in a month that has historically hosted many updates, confidence is higher.

The same method runs on spam updates when you switch the model to **core + spam**. Spam updates are more irregular, so their window is wider.

## How often does Google release core updates?

Based on the confirmed history since 2018:

- Google has released roughly **3–4 core updates per year** (about **3.3/year** on average).
- In 2026 the rhythm tightened noticeably, with core updates landing roughly every **50–56 days**.
- **March is the most common month** for core updates; **April has never had one**. Updates also cluster in May, June, August, November and December.

| Month | Core updates since 2018 |
|------|:--:|
| January | 1 |
| February | 1 |
| March | **6** |
| April | 0 |
| May | 3 |
| June | 3 |
| July | 1 |
| August | 3 |
| September | 2 |
| October | 1 |
| November | 3 |
| December | 3 |

---

## FAQ

### When is the next Google core update?
No one can name the exact date — Google does not announce updates in advance. SERP Forecaster projects the **most likely window** from historical cadence and seasonality. As of the latest data it points to **mid-July to early September 2026**, centred on early August. The live site recalculates this every day.

### When is the next Google spam update?
Spam updates follow a more irregular schedule than core updates, and Google confirms fewer of them. SERP Forecaster can model them too — switch the forecast model to **core + spam** — but treat the spam window as a looser estimate than the core window.

### Can you predict Google algorithm updates?
Not precisely. Exact dates are not predictable because Google controls them and keeps them unannounced. What *is* predictable is the **rough rhythm**: core updates have arrived on a fairly regular cadence for years, so a statistically likely window can be projected. SERP Forecaster does exactly that, and is transparent that the output is a probability window, not a date.

### What months does Google release core updates most often?
**March** is by far the most common, with six core updates since 2018. April has never seen one. The other busy months are May, June, August, November and December.

### Is SERP Forecaster an official Google tool?
No. It is an independent, open-source project. It uses Google's **public** Search Status Dashboard as its data source, but it is not affiliated with or endorsed by Google.

### How accurate is it?
It forecasts a window, not a day. The window is built from the spread of recent intervals, so it widens or narrows as Google's behaviour changes. Use it as a monitoring cue — a heads-up to watch your rankings and freeze risky changes — rather than a deadline.

---

## Data sources & methodology

- **Primary source:** the official [Google Search Status Dashboard](https://status.search.google.com/summary) `incidents.json` feed, filtered to the **Ranking** product (confirmed updates from 2021 onward).
- **Historical seed:** a curated record of confirmed core and spam updates from **2018–2020** (the period before the dashboard's ranking history), cross-checked against Search Engine Land and Search Engine Roundtable.
- The two are merged daily, deduplicated by update name, with the dashboard supplying authoritative start/end dates.

Every figure in this README is computed from that dataset (`data.json`). The methodology is intentionally simple and fully visible in [`scripts/build-data.mjs`](scripts/build-data.mjs) and [`index.html`](index.html) — no black box.

## Run it locally

`fetch` needs HTTP, so serve the folder rather than opening the file from disk:

```bash
python3 -m http.server 8000      # then open http://localhost:8000
node scripts/build-data.mjs      # refresh data.json by hand (Node 18+)
```

## How the daily update works

A GitHub Action runs every day, pulls the latest confirmed updates from the Google Search Status Dashboard, merges them with the curated seed, and commits the refreshed `data.json`. GitHub Pages redeploys automatically. "Today" is computed in the browser, so the *now* marker and the countdown stay current between data refreshes.

```
index.html                          the forecaster (loads ./data.json)
data.json                           generated dataset the page reads
data/seed.json                      curated source of truth (edit history + notes here)
scripts/build-data.mjs              fetch + merge + classify -> data.json
.github/workflows/update-data.yml   daily cron + Pages deploy
```

## Disclaimer

SERP Forecaster is not a prophecy and not financial or business advice. Google does not publish an update schedule and confirms only its larger updates. The forecast is a statistical projection from past behaviour; real updates can land outside the window.

## Author & license

Built by [Bogdan Krupin](https://github.com/bogdankrupin). Released under the MIT License — free to use, fork, and adapt with attribution. Update data belongs to Google and is used from its public Search Status Dashboard.

If this saved you a "is an update coming?" panic, a ⭐ on the repo is appreciated.
