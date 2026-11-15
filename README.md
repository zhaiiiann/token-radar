# Token Radar

![Node 22](https://img.shields.io/badge/runtime-Node_22-339933)
![MIT](https://img.shields.io/badge/license-MIT-0f7a5a)
![Offline](https://img.shields.io/badge/dashboard-offline-16211c)

A comps-calibrated research dashboard for the [make.fun token launch radar bounty](https://make.fun/c/token-radar-01).

## Run

From this directory, using Node 22.18 or later and no packages:

    MAKEFUN_OUTPUT_DIR=out /opt/node22/bin/node main.ts --input input/snapshot.json

Open `out/dashboard/index.html`. The static dashboard reads `../data.js`; opening the source HTML before building will not load data. Default grader paths remain `/input/snapshot.json` and `/output`.

## Universe and value model

The board includes every snapshot watchlist slug and all eligible strict pre-token records (market cap, CoinGecko ID and symbol all null), without the watchlist TVL floor. Exclusions cover Bridge, Canonical Bridge, Cross Chain Bridge, Liquid Staking, Liquid Restaking, Restaked BTC and CEX; version-suffixed names; whole words wrapped/staked/staking; and exchange-prefixed names (Binance, Coinbase, Bybit, Kraken, Bitget, OKX, Bitfinex, Gemini). The snapshot has no parentProtocol field. This produces 197 rows: 40 watchlist and 157 additional records. The 92 products removed from the previous board appear in a separate unranked Wrapped, bridged & staked tab with exclusion reasons, no implied values and no farm plans. The 53 previously excluded CEX/version records remain excluded. Another 402 token-recorded non-CEX records appear separately with observed caps or explicit missing-cap labels. No token recorded is not proof a token does not exist.

`calibrate` computes the median positive market-cap/TVL ratio from 119 token-recorded, non-CEX snapshot records. Categories with at least 3 priced peers use their exact category median; sparse or missing categories use the overall 0.2459877056611089 median. This declared sample-size rule prevents one extreme comparable from dictating an entire category. The dashboard exposes all raw medians, counts and applied multiples. Shared token caps across protocols, stale observations and circulating-cap/FDV differences remain limitations.

`impliedValue` scores every row with the same formula:

    round(TVL × applied_multiple × (1 + clamp(change_7d, -60, 120)/100 × 0.5)
          × (0.6 + min(age_days, 1095)/1095 × 0.4))

Age is measured at snapshot `as_of` from `listed_at`, clamped at zero. Missing growth uses zero; missing age uses 365 days. This is implied protocol capitalization, not a token price, allocation, launch forecast or return estimate. Product exclusions change selection only; the comps calibration and single valuation formula remain unchanged. The board starts with steakhouse-financial, sentora-curator, gauntlet, veda and usdd.

Six-step farm plans are derived once from category, chains, TVL and listing age, then serialized to the board and dashboard together. They contain estimated costs and time, conditional interactions, a monitoring window and an exit plan. They do not assert unverified rewards or eligibility.

## Dashboard

Sortable ranks, names, TVL, growth, listed age and implied capitalization; search by name/slug; category and chain filters; watchlist-only switch and minimum TVL. Select any ranked row for exact inputs, base/growth/maturity bridge, the same six farm steps as board.json and closest comparable live tokens. Live market caps occupy a separate tab. System fonts and local scripts only.

## Verification

    /opt/node22/bin/node browser-check.mjs
    MAKEFUN_OUTPUT_DIR=out /opt/node22/bin/node main.ts --input input/snapshot.json
    /opt/node22/bin/node verify.mjs

The browser check requires installed Google Chrome and uses Node standard-library WebSocket/CDP; no npm packages. It captures exactly three screenshots from the final rendered dashboard, verifies filters/sorting/details and checks JavaScript errors and network requests. Rebuild main.ts after changing screenshots or dashboard source. `verify.mjs` independently checks the seven artifact gates and determinism. The sealed official scorer and transcript gates are server-only and are not claimed as verified. Nothing is submitted automatically.

MIT license. Snapshot is read-only. Build outputs and local Chrome state are ignored by Git.

---
Built for [make.fun](https://make.fun/?ref=7r4vz9fy).
