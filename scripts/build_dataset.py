from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from arx_scoring.behavioral_features import add_synthetic_behavioral_features
from arx_scoring.config import ModelConfig, ProjectPaths
from arx_scoring.financial_features import (
    build_weekly_financial_features,
    load_online_retail,
    prepare_retail_transactions,
)
from arx_scoring.labels import add_future_labels
from arx_scoring.rule_score import add_rule_scores


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build ARX MVP weekly training data.")
    parser.add_argument("--input", default="Online Retail.xlsx", help="Path to UCI xlsx")
    parser.add_argument(
        "--output", default=None, help="Output CSV path. Defaults to data/processed."
    )
    parser.add_argument("--companies", type=int, default=80)
    parser.add_argument("--seed", type=int, default=42)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    paths = ProjectPaths(ROOT)
    config = ModelConfig(random_seed=args.seed, synthetic_company_count=args.companies)
    output = Path(args.output) if args.output else paths.default_training_csv
    output.parent.mkdir(parents=True, exist_ok=True)

    input_path = Path(args.input)
    if not input_path.is_absolute():
        input_path = ROOT / input_path

    raw = load_online_retail(input_path)
    transactions = prepare_retail_transactions(raw)
    financial = build_weekly_financial_features(
        transactions, company_count=config.synthetic_company_count
    )
    behavioral = add_synthetic_behavioral_features(
        financial, seed=config.random_seed
    )
    scored = add_rule_scores(behavioral)
    labeled = add_future_labels(
        scored, min_mrr=config.min_mrr_for_label
    )

    labeled.to_csv(output, index=False)

    metadata = {
        "input_file": str(input_path),
        "output_file": str(output),
        "rows": int(len(labeled)),
        "companies": int(labeled["company_id"].nunique()),
        "week_min": str(labeled["week_start"].min().date()),
        "week_max": str(labeled["week_start"].max().date()),
        "financial_source": "UCI Online Retail workbook, transformed into company-week financial proxies",
        "synthetic_fields": [
            "acceptance_rate",
            "regeneration_rate",
            "session_count",
            "active_users",
            "events_per_session",
            "session_duration_change_pct",
            "champion_user_rate",
            "frustration_score",
            "support_ticket_count",
        ],
        "primary_label": "bad_outcome_8w",
        "positive_rate_8w": float(labeled.loc[labeled["is_trainable_8w"], "bad_outcome_8w"].mean()),
        "trainable_rows_8w": int(labeled["is_trainable_8w"].sum()),
    }
    with paths.default_metadata_json.open("w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)

    print(json.dumps(metadata, indent=2))


if __name__ == "__main__":
    main()
