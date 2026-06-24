# ARX Presentation Website And Dashboard

This package contains the ARX presentation website and Intelligence Dashboard. It
is isolated under `ui/` because the ARX repository is a monorepo: the Python
scoring pipeline stays at the root, and all frontend work lives here.

## Quick Start

```bash
cd ui
npm install
npm run dev
```

Open the local Next.js URL printed by the dev server.

## Scripts

```bash
npm run dev
npm run build
npm run typecheck
npm run test
```

## Data Source

The first UI implementation is CSV-first:

- `../handoff/vaibhav_dashboard_latest_scores.csv`
- `../handoff/vaibhav_dashboard_8_week_trend.csv`
- `../handoff/anish_behavioral_connector_sample.csv`
- `../handoff/financial_data_metrics_for_visualization.csv`
- `../handoff/mike_application_demo_companies.csv`

The data is synthetic UCI Retail proxy data plus synthetic ARX behavior. It is not
live Stripe, Mixpanel, Amplitude, or Segment data.

## Score Semantics

`capital_ready_score` is the primary score and higher is healthier.

`composite_risk_score_legacy` is shown only as a secondary legacy value for older
lower-is-healthier logic.

## What The Site Includes

The site includes:

- Investor/judge-facing ARX product hero.
- Market, business-model, data-flow, and scoring-explanation sections.
- Portfolio KPI summary.
- Sortable/filterable latest-score table.
- Selected-company scorecard.
- Credit tier and action badges.
- Five-signal breakdown.
- 8-week trend chart.
- Advance Amount Simulator.
- Behavioral-data lift comparison.
- Demo application workflow section.
- Synthetic/proxy-data caveats.

## Design

Default design direction: `Capital Command`.

The visual system uses ARX's public-site hero cues: dark surfaces, electric-blue
actions, compact financial cards, and high-contrast founder-facing numbers. Other
Stitch-ready design-system specs are in `docs/design-systems/`.

## Future Airtable Integration

This PR keeps Airtable optional. The CSV data adapter implements the dashboard
repository interface first. A future Airtable adapter should return the same
normalized TypeScript records and use these env vars:

```bash
AIRTABLE_API_KEY=
AIRTABLE_BASE_ID=
AIRTABLE_SCORES_TABLE=arx_scores
```
