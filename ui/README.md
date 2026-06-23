# ARX Dashboard UI

This package contains Vaibhav's ARX Intelligence Dashboard. It is isolated under
`ui/` because the ARX repository is a monorepo: the Python scoring pipeline stays
at the root, and all frontend work lives here.

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

The data is synthetic UCI Retail proxy data plus synthetic ARX behavior. It is not
live Stripe, Mixpanel, Amplitude, or Segment data.

## Score Semantics

`capital_ready_score` is the primary score and higher is healthier.

`composite_risk_score_legacy` is shown only as a secondary legacy value for older
lower-is-healthier logic.

## UI Responsibilities

The dashboard includes:

- Portfolio KPI summary.
- Sortable/filterable latest-score table.
- Selected-company scorecard.
- Credit tier and action badges.
- Five-signal breakdown.
- 8-week trend chart.
- Advance Amount Simulator.
- Behavioral-data lift comparison.

## Design

Default design direction: `Capital Command`.

The visual system uses ARX's public-site cues from Anish's hero video: dark
surfaces, electric-blue actions, compact financial cards, and high-contrast
founder-facing numbers. Other Stitch-ready design-system specs are in
`docs/design-systems/`.

## Future Airtable Integration

This PR keeps Airtable optional. The CSV data adapter implements the dashboard
repository interface first. A future Airtable adapter should return the same
normalized TypeScript records and use these env vars:

```bash
AIRTABLE_API_KEY=
AIRTABLE_BASE_ID=
AIRTABLE_SCORES_TABLE=arx_scores
```

