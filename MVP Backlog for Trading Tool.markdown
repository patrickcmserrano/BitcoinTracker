# MVP Backlog for Trading Tool

This backlog outlines the tasks required to develop the Minimum Viable Product (MVP) for a trading tool based on Alexander Elder's Triple Screen System and LOTUS Academy principles. The project uses the `svelte-ts-skeleton-starter` template (Svelte 5, TypeScript, Skeleton UI, Vite) and is frontend-only, leveraging `ccxt` for Binance integration and `localStorage` for data persistence. Tasks are organized into epics, prioritized for user value and feasibility, and planned for 2-week sprints.

## MVP Scope
- **Triple Screen Panel**: Charts (weekly, daily, H1) for BTC/USD with MMEs, MACD, Stochastic, and convergence alerts.
- **Trade Planner**: Form for entry, stop-loss, take-profit, and 2% risk rule calculation.
- **Binance Integration**: Real-time prices and manual order execution.
- **Trading Journal**: Basic trade logging in `localStorage`.
- **Focus**: BTC/USD, web app, no backend.

## Epics and Tasks

### Epic 1: Project Setup
**Objective**: Adapt the Svelte template for the trading tool.

1. **Task 1: Initialize project from template**
   - Description: Clone `svelte-ts-skeleton-starter`, create new repo, install dependencies.
   - Estimate: 2 hours.
   - Dependencies: None.
   - Acceptance Criteria: Project runs locally (`npm run dev`) at `http://localhost:5173`.

2. **Task 2: Set up trading folder structure**
   - Description: Create `/src/components/trading`, `/src/lib/trading`, `/src/styles/trading`.
   - Estimate: 4 hours.
   - Dependencies: Task 1.
   - Acceptance Criteria: Folders created, test component in `/components/trading`.

3. **Task 3: Integrate ccxt for Binance**
   - Description: Add `ccxt`, configure initial call to fetch BTC/USD price.
   - Estimate: 6 hours.
   - Dependencies: Task 1.
   - Acceptance Criteria: Function in `/lib/trading/binance.ts` logs BTC/USD price.

### Epic 2: Triple Screen Panel
**Objective**: Build multi-timeframe analysis interface.

4. **Task 4: Add charting library**
   - Description: Integrate `lightweight-charts` or `chart.js` for candlestick display.
   - Estimate: 8 hours.
   - Dependencies: Task 2.
   - Acceptance Criteria: `<Chart>` component shows static weekly BTC/USD chart.

5. **Task 5: Integrate real-time prices**
   - Description: Use `ccxt` WebSocket to update chart with live BTC/USD prices.
   - Estimate: 10 hours.
   - Dependencies: Task 3, Task 4.
   - Acceptance Criteria: Weekly chart updates with new candles in real-time.

6. **Task 6: Implement Triple Screen panel**
   - Description: Create `<TripleScreen>` component with weekly, daily, H1 charts using Skeleton UI.
   - Estimate: 12 hours.
   - Dependencies: Task 5.
   - Acceptance Criteria: Interface shows three synced charts (tabs or split layout).

7. **Task 7: Add technical indicators**
   - Description: Implement MMEs (12/26), MACD (12/26/9), Stochastic (14,3,3) using `ta-lib` or custom logic.
   - Estimate: 14 hours.
   - Dependencies: Task 6.
   - Acceptance Criteria: Indicators display on all charts, configurable parameters.

8. **Task 8: Implement convergence alerts**
   - Description: Highlight signal convergences (e.g., rising MME + MACD crossover) with Skeleton UI toasts.
   - Estimate: 8 hours.
   - Dependencies: Task 7.
   - Acceptance Criteria: Visual alerts appear for signal convergences.

### Epic 3: Trade Planner
**Objective**: Enable trade planning with risk management.

9. **Task 9: Create planning form**
   - Description: Build `<TradePlanner>` component with fields for entry, SL, TP, position size, motive (Skeleton UI).
   - Estimate: 8 hours.
   - Dependencies: Task 2.
   - Acceptance Criteria: Form saves plan to `localStorage`.

10. **Task 10: Implement risk calculator**
    - Description: Calculate position size based on 2% risk rule (capital, risk, SL distance).
    - Estimate: 6 hours.
    - Dependencies: Task 9.
    - Acceptance Criteria: Form shows position size, alerts if risk > 2%.

11. **Task 11: Integrate plan with chart**
    - Description: Display entry, SL, TP as lines on H1 chart.
    - Estimate: 10 hours.
    - Dependencies: Task 6, Task 9.
    - Acceptance Criteria: Saved plan reflects lines on H1 chart.

### Epic 4: Binance Integration (Execution)
**Objective**: Enable trade execution.

12. **Task 12: Set up Binance authentication**
    - Description: Create `<BinanceAuth>` component to input API key/secret (stored in `localStorage`).
    - Estimate: 6 hours.
    - Dependencies: Task 3.
    - Acceptance Criteria: Component saves keys, validates Binance connection.

13. **Task 13: Implement order submission**
    - Description: Add button in `<TradePlanner>` to send buy/sell orders via `ccxt`.
    - Estimate: 10 hours.
    - Dependencies: Task 10, Task 12.
    - Acceptance Criteria: Order sent to Binance, confirmation shown.

14. **Task 14: Display order status**
    - Description: Create `<OrderStatus>` component for open/closed orders.
    - Estimate: 6 hours.
    - Dependencies: Task 13.
    - Acceptance Criteria: Table shows recent order statuses.

### Epic 5: Trading Journal
**Objective**: Build basic trade logging.

15. **Task 15: Create journal interface**
    - Description: Develop `<TradeJournal>` component for result, motive, learnings.
    - Estimate: 8 hours.
    - Dependencies: Task 2.
    - Acceptance Criteria: Form saves entries to `localStorage`.

16. **Task 16: Integrate journal with orders**
    - Description: Auto-populate journal with executed order data.
    - Estimate: 6 hours.
    - Dependencies: Task 13, Task 15.
    - Acceptance Criteria: Executed trades appear in journal with price/result.

### Epic 6: Validation and Deploy
**Objective**: Ensure quality and publish MVP.

17. **Task 17: Write unit tests**
    - Description: Test indicators, risk calculations, Binance integration with Vitest.
    - Estimate: 10 hours.
    - Dependencies: Task 7, Task 10, Task 13.
    - Acceptance Criteria: >70% coverage for critical functions.

18. **Task 18: Write E2E tests**
    - Description: Test navigation, planning, execution, journaling with Playwright.
    - Estimate: 8 hours.
    - Dependencies: Task 14, Task 16.
    - Acceptance Criteria: Tests verify end-to-end flow.

19. **Task 19: Conduct usability tests**
    - Description: Test with 2-3 traders (e.g., LOTUS students) for feedback.
    - Estimate: 8 hours.
    - Dependencies: Task 16.
    - Acceptance Criteria: Feedback report with prioritized improvements.

20. **Task 20: Deploy to GitHub Pages**
    - Description: Configure GitHub Pages, deploy via GitHub Actions.
    - Estimate: 4 hours.
    - Dependencies: Task 18.
    - Acceptance Criteria: MVP accessible online.

## Sprint Plan
- **Sprint 1 (Tasks 1-5)**: Setup, Binance integration, real-time chart (30 hours).
- **Sprint 2 (Tasks 6-8)**: Triple Screen panel, indicators, alerts (34 hours).
- **Sprint 3 (Tasks 9-14)**: Planner, risk calculator, order execution (46 hours).
- **Sprint 4 (Tasks 15-20)**: Journal, tests, deploy (44 hours).

**Total Estimate**: ~154 hours (~8 weeks, 4 sprints for 1-2 developers).

## Notes
- **i18n**: Prioritize Portuguese and English translations for trading terms.
- **Security**: Warn users about `localStorage` risks for API keys.
- **Future Iterations**: Add backend for persistence, multi-asset support, advanced analytics.
- **Feedback**: Validate with LOTUS traders in Sprint 4.