# BitcoinTracker

> A Svelte + Vite powered educational trading / market analysis dashboard focused on Bitcoin (and selected crypto assets) with real-time charting, market sentiment, dominance metrics, and locally computed technical indicators.

## Table of Contents
1. Vision & Goals
2. Key Features
3. Tech Stack
4. Architecture Overview
5. Folder Structure
6. Data & External Integrations
7. Technical Indicators Engine
8. Caching Strategy
9. Internationalization (i18n)
10. UI / Styling
11. Development Setup
12. NPM Scripts Reference
13. Testing Strategy (Unit + E2E + Accessibility)
14. Deployment
15. Performance & Reliability Notes
16. Roadmap / Backlog (Excerpt)
17. Contributing
18. License

---
## 1. Vision & Goals
BitcoinTracker aims to be a lean, transparent, and easily extensible market analysis tool. Core principles:
- Prefer free, rate-limited public APIs over paid vendors.
- Calculate as many indicators locally as possible to reduce dependency and cost.
- Offer clear sentiment & dominance context (Fear & Greed Index, BTC vs market) alongside price action.
- Keep architecture frontend-first; evolve backend only when necessary (aggregation, historical persistence, auth, alerts).

## 2. Key Features
- Real-time / on-demand price visualization using `lightweight-charts`.
- Local computation of classic indicators: MACD, RSI, ATR, SMA(20/50), EMA(9/21), Stochastic, Bollinger Bands.
- Market sentiment: Fear & Greed Index (Alternative.me).
- Market structure: BTC & ETH dominance, global market cap & volume (CoinGecko).
- Crypto ranking snapshot (market cap ordered) via CoinGecko.
- Caching layer to reduce API call frequency (in-memory TTL cache).
- Multi-language support via `svelte-i18n` (see accessibility & i18n tests).
- Responsive UI with Svelte + Tailwind + Skeleton UI components & Lucide icons.
- Automated test suite: unit (Vitest + Testing Library) & end-to-end (Playwright) & accessibility checks.
- GitHub Pages deployment (`/BitcoinTracker/` base path in production).

## 3. Tech Stack
| Layer | Technology |
|-------|------------|
| Framework | Svelte 5 + Vite |
| Styling | Tailwind CSS + Skeleton UI + custom app styles |
| Icons | Lucide Svelte |
| Charts | `lightweight-charts` |
| HTTP | `fetch` (native) + `axios` (TAAPI service placeholder) |
| Indicators | `technicalindicators` (local calculations) |
| i18n | `svelte-i18n` |
| Routing | `svelte-spa-router` |
| Testing (Unit) | Vitest + @testing-library/svelte + jsdom |
| Testing (E2E) | Playwright (Chromium + Firefox projects) |
| Deployment | GitHub Pages (`gh-pages` npm package) |

## 4. Architecture Overview
Pure frontend (for now). Data flows:
1. UI components request market metrics (fear & greed, dominance, ranking) via small service functions in `src/lib/market-indicators.ts`.
2. Price/ohlcv data (future expansion: Binance, Coinglass, etc.) will feed `technical-indicators.ts` for local indicator computation.
3. Indicators & market metrics passed into chart / widget components for display and interpretation.
4. In-memory cache (Map + TTL) prevents redundant fetches inside the session.
5. Testing layers validate both computation logic and user-facing accessibility & i18n strings.

Future backend (outlined in `BACKEND_ARCHITECTURE.md`) may provide aggregation, normalization, historical storage, push signals, and API key management.

## 5. Folder Structure (Simplified)
```
/knowledge               # Reference documentation about APIs & libraries
/e2e-tests               # Playwright specs & helpers
/src
  /components            # Svelte UI components (widgets, headers, charts)
  /lib                   # Service & calculation modules (indicators, APIs, helpers)
  /assets                # Static assets (images, etc.)
  /styles                # Global / shared style assets
  /test                  # Unit test setup & utilities
/public/crypto-icons     # Local cached crypto icons (stability & performance)
```
Config files: `vite.config.ts`, `svelte.config.js`, `vitest.config.ts`, `playwright.config.ts`, Tailwind & tsconfigs.

## 6. Data & External Integrations
Current live integrations (no auth required):
- Alternative.me Fear & Greed Index: simple JSON endpoint, daily updates.
- CoinGecko Global + Markets: global market metrics & selected crypto ranking.

Planned / documented (see `knowledge/` & focused docs):
- Binance (Spot & Futures, Long/Short Ratio)
- Coinglass (Derivatives data)
- Alpha Vantage / yfinance (DXY index proxy)
- Trading Economics (Macro calendar)
- TAAPI (Indicators as a service) — partially stubbed via `taapi-service.ts` with `axios`.

Rate Limits & Considerations:
- CoinGecko: public endpoints ~10-50 calls/minute; caching helps avoid throttling.
- Alternative.me: lightweight, low frequency needed (1–2 calls per hour typically enough).

## 7. Technical Indicators Engine (`technical-indicators.ts`)
Local computation advantages:
- Independence from vendor outages / pricing.
- Immediate recalculation for alternative timeframes/hypothetical scenarios.

Implemented Indicators:
- MACD(12,26,9), RSI(14), ATR(14)
- SMA(20,50), EMA(9,21)
- Stochastic(14,3,3)
- Bollinger Bands(20,2)

Extras:
- Trend inference (bullish / bearish / neutral) combining price vs SMA, MACD, RSI.
- Interpretation helpers: textual classification for RSI, MACD, ATR, Stochastic.
- Series generator for chart overlays (SMA/EMA/Bollinger/MACD arrays).

Edge Cases:
- Warns when insufficient data (<50 candles) for full set.
- Defensive `try/catch` around each indicator to isolate failures.

## 8. Caching Strategy (`market-indicators.ts`)
Simple in-memory Map with TTL (5 minutes). Functions:
- `getFromCache` / `saveToCache` / `isCacheValid` internal helpers.
- Reduces API pressure and rate limit risk.
- `clearCache()` available for manual invalidation (testing / force refresh).

Potential Enhancements:
- Layered stale-while-revalidate pattern.
- Persist minimal snapshot to `localStorage` for UX continuity on reload.

## 9. Internationalization (i18n)
Using `svelte-i18n` with test coverage (`i18n.spec.ts`, accessibility specs). Strategy:
- Lazy load locale dictionaries.
- Provide semantic keys for widgets, chart labels, and indicator interpretations.
- Accessibility tests ensure translated content preserves ARIA attributes & semantics.

## 10. UI / Styling
- Tailwind CSS for utility-first styling; configuration in `tailwind.config.js`.
- Skeleton UI components for layout & theming convenience.
- Lucide icon set (`@lucide/svelte`).
- Responsive design targeted at desktop first; mobile optimization ongoing.

## 11. Development Setup
Prerequisites:
- Node.js (recommend LTS 18+ or 20+)
- Git

Install:
```powershell
npm install
```

Run dev server:
```powershell
npm run dev
```
Access at: http://localhost:5173

Type checking & Svelte diagnostics:
```powershell
npm run check
```

## 12. NPM Scripts Reference
| Script | Purpose |
|--------|---------|
| `dev` | Start Vite dev server |
| `build` | Production build to `dist/` |
| `preview` | Preview built app locally |
| `check` | Run `svelte-check` + TypeScript compile checks |
| `test` | Run unit tests (watch) |
| `test:run` | Run unit tests once |
| `test:coverage` / `coverage` | Generate coverage reports (text/json/html) |
| `test:candlechart` | Run a specific component test example |
| `e2e` | Playwright end-to-end test suite |
| `e2e:ui` | Interactive Playwright test runner UI |
| `e2e:headed` | Run Playwright tests with visible browser windows |
| `e2e:debug` | Debug mode with Playwright inspector |
| `e2e:report` | Open the HTML Playwright report |
| `deploy` | Push `dist/` to GitHub Pages (runs `predeploy` automatically) |
| `test:all` | Sequential unit then e2e tests |

## 13. Testing Strategy
Unit (Vitest):
- Environment: jsdom
- Coverage: V8 provider (`./coverage` folder) excluding config & test files.
- Setup file: `src/test/setup.ts` (globals / custom matchers).
- Focus: indicator logic, helper formatting, component rendering, i18n output.

E2E (Playwright):
- Directory: `e2e-tests/`
- Browsers: Chromium & Firefox projects.
- Configuration: parallel, retries in CI, HTML reporter.
- Web server auto-start: `npm run dev` reused locally.
- Accessibility and i18n specs ensure semantic integrity and translation presence.

Recommended Workflow:
```powershell
npm run test:run      # quick verification
npm run e2e           # full browser suite
npm run e2e:report    # view latest report
```

## 14. Deployment
- Target: GitHub Pages (gh-pages branch) via `npm run deploy`.
- Production base path configured in `vite.config.ts` (`/BitcoinTracker/`).
- Ensure repository name matches path for asset resolution.

Manual Steps:
```powershell
npm run build
npm run deploy
```

## 15. Performance & Reliability Notes
- Local indicator computation avoids API latency.
- Caching reduces redundant network calls (fear & greed, dominance, ranking).
- Defensive error handling yields partial data instead of full page failure.
- Potential future optimization: Web Workers for heavy indicator calculations on very large datasets.

## 16. Roadmap / Backlog (Highlights)
See: `MVP Backlog for Trading Tool.markdown` & `IMPLEMENTATION_PLAN.md`.
Planned:
- Integrate Binance OHLCV & aggregate to multiple timeframes.
- Add derivative metrics (long/short ratio, open interest) via Coinglass / Binance Futures.
- Introduce macro calendar (Trading Economics).
- Persist historical data for backtesting view.
- Alerting & Strategy scripting (Phase 2).
- Progressive Web App (PWA) packaging & offline indicator exploration.

## 17. Contributing
1. Fork & clone.
2. Create feature branch: `git checkout -b feature/your-feature`.
3. Install dependencies: `npm install`.
4. Run dev & implement changes.
5. Add / update tests (unit & e2e as relevant).
6. Run: `npm run test:all` (must pass) + ensure `npm run check` succeeds.
7. Submit PR with clear description & screenshots (if UI changes).

Coding Guidelines:
- Keep components small & composable.
- Prefer explicit types for public interfaces in `src/lib`.
- Wrap external calls with error handling + caching where appropriate.
- Provide fallbacks / skeleton loading states.

## 18. License
License not yet specified. Recommended: MIT for maximal openness. Add a `LICENSE` file to finalize.

---
## FAQ / Quick Answers
- Why not a backend yet? Frontend-only keeps iteration fast; most public metrics are queryable client-side. Backend comes later for persistence & advanced features.
- How to add a new indicator? Extend `technical-indicators.ts`: compute value with `technicalindicators`, add to `TechnicalAnalysis` & interpretation helper.
- Base path issue after deploy? Confirm `vite.config.ts` base matches repo name and assets load under `/BitcoinTracker/`.

## Acknowledgments
- Community-maintained APIs (Alternative.me, CoinGecko).
- Open-source libraries powering charts, indicators, and UI.

---
> Generated README: feel free to customize sections (license, roadmap details, screenshots) to reflect current project state.
