"""Run the ARX behavioral connector end-to-end.

Reads a per-company config (event-name mapping), takes raw analytics events,
and writes weekly CompanySignals rows in the handoff sample-CSV shape.

With no real Mixpanel/Amplitude account yet, run it in demo mode -- it
fabricates raw events so you can see the full transform produce the contract
columns:

    python scripts/run_behavioral_connector.py --demo

Once a design partner exists, export their raw events to a CSV with columns
company_id,user_id,event_name,timestamp,<duration_property> and pass it:

    python scripts/run_behavioral_connector.py --events partner_events.csv
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from arx_scoring.behavioral_connector import (  # noqa: E402
    ConnectorConfig,
    compute_weekly_signals,
    simulate_raw_events,
    to_output_frame,
    validate_against_contract,
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run the ARX behavioral connector.")
    parser.add_argument(
        "--config",
        default=str(ROOT / "handoff" / "anish_config_template.json"),
        help="Per-company event-name mapping JSON.",
    )
    parser.add_argument(
        "--events",
        default=None,
        help="Raw events CSV. If omitted, demo events are generated.",
    )
    parser.add_argument(
        "--output",
        default=str(ROOT / "data" / "processed" / "behavioral_signals.csv"),
        help="Where to write the weekly CompanySignals CSV.",
    )
    parser.add_argument("--demo", action="store_true", help="Force demo event mode.")
    parser.add_argument("--companies", type=int, default=10)
    parser.add_argument("--weeks", type=int, default=8)
    parser.add_argument("--seed", type=int, default=42)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    config = ConnectorConfig.from_json(args.config)

    if args.events and not args.demo:
        events = pd.read_csv(args.events)
        identity_note = ""
        print(f"Loaded {len(events):,} raw events from {args.events}")
    else:
        company_ids = [f"arx_{i:03d}" for i in range(2, 2 + args.companies)]
        events = simulate_raw_events(
            config, company_ids, n_weeks=args.weeks, seed=args.seed
        )
        identity_note = "DEMO synthetic events; not real Mixpanel/Amplitude data"
        print(f"Generated {len(events):,} DEMO raw events for {len(company_ids)} companies")

    signals = compute_weekly_signals(events, config)
    validate_against_contract(signals, config)
    out_df = to_output_frame(signals, config, identity_note=identity_note)

    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    out_df.to_csv(output, index=False)

    print(f"\nWrote {len(out_df):,} CompanySignals rows -> {output}")
    print(f"Contract fields present: {config.output_contract}")
    print("\nPreview:")
    with pd.option_context("display.max_columns", None, "display.width", 200):
        print(out_df.head(8).to_string(index=False))


if __name__ == "__main__":
    main()
