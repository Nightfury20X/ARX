# ARX MVP Scoring Model

This workspace builds an MVP version of the ARX scoring engine from the available
UCI Online Retail workbook plus synthetic ARX-native product behavior.

## Data Choice

Primary public anchor:

- `Online Retail.xlsx`
- Source role: financial / transaction proxy
- What it gives us: invoice dates, customer IDs, transaction revenue, returns,
  cancellation-like rows, customer concentration, weekly revenue movement

Synthetic ARX layer:

- `acceptance_rate`
- `session_duration_change_pct`
- `champion_user_rate`
- `frustration_score`
- `session_count`
- `events_per_session`
- `support_ticket_count`
- AI accept / regenerate counts

The synthetic behavior is intentionally generated as an early-warning signal that
weakens before future revenue deterioration. This matches the ARX thesis but
should not be treated as real validation until design-partner data is available.

## Boundary In Code

- `src/arx_scoring/financial_features.py`
  - reads UCI Retail
  - creates weekly company-level financial proxy features
  - derives `mrr`, `arr`, `mrr_change_pct`, `top_customer_concentration`

- `src/arx_scoring/behavioral_features.py`
  - generates synthetic AI-product behavior
  - creates the variables missing from public data

- `src/arx_scoring/rule_score.py`
  - implements the ARX PDF threshold score

- `src/arx_scoring/model.py`
  - trains a CatBoost model if available
  - falls back to a scikit-learn gradient boosting model if CatBoost is not installed

## Prediction Horizon

The MVP trains on `bad_outcome_8w`, meaning deterioration within the next 8
weeks. It also generates 4-week and 12-week labels for comparison.

Because ARX updates weekly, the model should be rerun every week and should show:

- 4-week risk: immediate warning
- 8-week risk: primary underwriting score
- 12-week risk: portfolio monitoring signal

## Run

```powershell
& "C:\Users\kiran\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe" scripts\build_dataset.py --input "Online Retail.xlsx"
& "C:\Users\kiran\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe" scripts\train_model.py
```

Outputs:

- `data/processed/arx_weekly_training.csv`
- `data/processed/arx_dataset_metadata.json`
- `models/arx_mvp_risk_model.pkl`
- `models/metrics.json`
- `data/processed/latest_arx_scores.csv`

## Dashboard UI

The ARX Intelligence Dashboard lives in `ui/`. The repository is treated as a
monorepo: scoring/model work stays at the root, while all frontend code,
frontend tests, UI docs, and agent context belong under `ui/`.

```bash
cd ui
npm install
npm run dev
```

The first dashboard implementation reads the dashboard CSVs from `handoff/` and
uses `capital_ready_score` as the primary higher-is-healthier founder-facing
score.

## Iranian Churn Dataset

The UCI Iranian Churn dataset is useful as a later external sanity check for
churn prediction, but it should not be the first base dataset for ARX. It is
closer to customer churn classification, while ARX needs company-week level
financial behavior plus product-health signals.

Use it later to test whether the model architecture can accept another
time-aware churn dataset, not as proof that ARX underwriting works.
