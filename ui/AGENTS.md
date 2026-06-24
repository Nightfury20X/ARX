# ARX UI Agent Context

This folder contains the frontend package for ARX Intelligence. Treat this repo as a
monorepo: Python scoring/model code remains at the repository root, and all user
interface work belongs in `ui/`.

## What ARX Is Building

ARX, AI Revenue Exchange, advances capital to AI software companies against their
subscription contracts. The product differentiator is weekly behavioral
intelligence: ARX reads aggregate product-health signals from systems such as
Mixpanel, Amplitude, Stripe, and Segment to detect repayment and churn risk before
it appears in bank statements.

The UI is now both the judge/investor-facing presentation website and the
founder-facing dashboard. It must explain the ARX product story, market, data
flow, scoring model, application workflow, company health score, signal
breakdown, trend history, and the Advance Amount Simulator that explains how
behavioral data can unlock better capital terms.

## Vaibhav's UI Responsibilities

Vaibhav owns:

- ARX Intelligence Dashboard.
- Advance Amount Simulator.
- Behavioral-data rate boost explanation.
- UI architecture and data adapter decisions.
- Second-pass validation that Kiran/NightFury20X scoring output is displayed with
  the correct semantics.

## Score Semantics

Use `capital_ready_score` as the primary score.

- Higher = healthier.
- It is the canonical founder-facing score for this UI package.
- `composite_risk_score_legacy` is secondary only and exists for older
  lower-is-healthier PDF logic.
- Do not relabel `capital_ready_score` as risk, decline likelihood, or
  lower-is-healthier.

## Data Sources

The first UI PR uses local handoff CSVs:

- Latest score records: `../handoff/vaibhav_dashboard_latest_scores.csv`
- Trend records: `../handoff/vaibhav_dashboard_8_week_trend.csv`
- Behavioral connector sample: `../handoff/anish_behavioral_connector_sample.csv`
- Financial visualization metrics: `../handoff/financial_data_metrics_for_visualization.csv`
- Demo applications: `../handoff/mike_application_demo_companies.csv`

These records are synthetic/demo data built from UCI Online Retail proxy data and
synthetic ARX behavior. They are not live Stripe, Mixpanel, Amplitude, or Segment
data.

## Folder Structure

- `app/`: Next.js app routes and global styles.
- `components/`: UI components.
- `lib/data/`: data repository contracts and CSV adapter.
- `lib/domain/`: dashboard calculations, score helpers, and display logic.
- `types/`: shared TypeScript contracts.
- `tests/`: Vitest unit tests.
- `docs/design-systems/`: Google Stitch-ready design-system template specs.
- `public/`: static assets.

## Commands

Run from `ui/`:

```bash
npm run dev
npm run build
npm run typecheck
npm run test
```

## Design Direction

Default implementation: `Capital Command`.

This direction borrows from Anish's hero-page video: near-black background,
electric-blue CTAs, restrained glow, white typography, and premium AI-finance
positioning. The dashboard itself should stay dense and operational: compact cards,
tables, score badges, signal bars, and trend charts.

Five Stitch-ready template specs are documented in `docs/design-systems/`:

- Capital Command.
- Credit Ops Console.
- Signal Radar.
- Boardroom Intelligence.
- Data Flow Narrative.

## Do And Do Not

Do:

- Keep UI code inside `ui/`.
- Keep data access behind the dashboard repository interface.
- Preserve the demo/proxy-data warning.
- Keep secrets out of git.
- Use `capital_ready_score` as primary.
- Prefer compact, scan-friendly SaaS dashboard UI over marketing-page layout.

Do not:

- Put UI app files at the repository root.
- Commit `.env`, `.next/`, or `node_modules/`.
- Treat `composite_risk_score_legacy` as the main score.
- Change Kiran/NightFury20X scoring scripts as part of UI-only work.
- Require live Airtable credentials for the CSV-backed dashboard.

## Future Airtable Adapter

The UI currently reads CSV files through `CsvDashboardRepository`. Future Airtable
work should implement the same `DashboardRepository` interface so dashboard
components do not care whether data came from CSV or Airtable.

Expected future env vars:

- `AIRTABLE_API_KEY`
- `AIRTABLE_BASE_ID`
- `AIRTABLE_SCORES_TABLE`
