from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from arx_scoring.config import ModelConfig, ProjectPaths
from arx_scoring.model import add_model_scores, save_train_result, train_risk_model


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Train ARX MVP deterioration model.")
    parser.add_argument("--input", default=None)
    parser.add_argument("--target", default="bad_outcome_8w")
    parser.add_argument("--model-output", default=None)
    parser.add_argument("--metrics-output", default=None)
    parser.add_argument("--latest-output", default=None)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    paths = ProjectPaths(ROOT)
    config = ModelConfig()

    input_path = Path(args.input) if args.input else paths.default_training_csv
    model_path = Path(args.model_output) if args.model_output else paths.default_model_pickle
    metrics_path = Path(args.metrics_output) if args.metrics_output else paths.default_metrics_json
    latest_path = Path(args.latest_output) if args.latest_output else paths.default_latest_scores_csv

    weekly = pd.read_csv(input_path, parse_dates=["week_start"])
    result = train_risk_model(weekly, target_column=args.target)
    save_train_result(result, model_path=model_path, metrics_path=metrics_path)

    scored = add_model_scores(
        weekly,
        result,
        rule_weight=config.rule_score_weight,
        ml_weight=config.ml_score_weight,
    )
    latest_week = scored["week_start"].max()
    latest = scored[scored["week_start"] == latest_week].copy()
    latest = latest[
        [
            "company_id",
            "week_start",
            "mrr",
            "arr",
            "capital_ready_rule_score",
            "ml_bad_outcome_probability_8w",
            "ml_health_score",
            "capital_ready_score",
            "final_tier",
            "final_credit_action",
            "final_advance_rate",
            "acceptance_rate",
            "session_duration_change_pct",
            "champion_user_rate",
            "frustration_score",
            "top_customer_concentration",
            "mrr_change_pct",
        ]
    ].sort_values(["final_tier", "capital_ready_score"], ascending=[True, False])
    latest_path.parent.mkdir(parents=True, exist_ok=True)
    latest.to_csv(latest_path, index=False)

    summary = {
        "model_type": result.model_type,
        "target": result.target_column,
        "model_path": str(model_path),
        "metrics_path": str(metrics_path),
        "latest_scores_path": str(latest_path),
        "metrics": result.metrics,
        "split_weeks": result.split_weeks,
    }
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
