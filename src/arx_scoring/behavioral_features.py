from __future__ import annotations

import numpy as np
import pandas as pd


SEGMENTS = np.array(["vertical_ai_agent", "ai_dev_tool", "horizontal_ai_saas"])


def add_synthetic_behavioral_features(
    financial_weekly: pd.DataFrame, seed: int = 42
) -> pd.DataFrame:
    """Add ARX-native product behavior features that do not exist in UCI Retail.

    The synthetic behavior is generated as an early-warning signal: behavior
    weakens before later financial deterioration. This is transparent MVP
    scaffolding, not real validation data.
    """
    rng = np.random.default_rng(seed)
    frames = []

    for company_id, group in financial_weekly.groupby("company_id", sort=True):
        g = group.sort_values("week_start").copy()
        n = len(g)
        company_risk = rng.beta(2.0, 5.0)
        company_activity = rng.uniform(0.8, 1.4)
        segment = rng.choice(SEGMENTS, p=[0.45, 0.35, 0.20])

        mrr = g["mrr"].replace(0, np.nan)
        future_mrr_change_8w = (mrr.shift(-8) / mrr) - 1.0
        future_pressure = ((-future_mrr_change_8w.fillna(0.0) - 0.08) / 0.35).clip(
            0.0, 1.0
        )
        current_pressure = (
            0.45 * g["cancellation_rate"].clip(0.0, 1.0)
            + 0.35 * g["top_customer_concentration"].clip(0.0, 1.0)
            + 0.20 * (-g["mrr_change_pct"].clip(-1.0, 0.0))
        ).clip(0.0, 1.0)

        seasonal = 0.05 * np.sin(np.linspace(0, 4 * np.pi, n))
        noise = rng.normal(0.0, 0.06, size=n)
        pressure = (
            0.50 * future_pressure.to_numpy()
            + 0.25 * current_pressure.to_numpy()
            + 0.20 * company_risk
            + seasonal
            + noise
        )
        pressure = np.clip(pressure, 0.0, 1.0)

        active_customers = g["active_customers"].to_numpy(dtype=float)
        active_users = np.maximum(
            1,
            np.round(
                active_customers
                * company_activity
                * rng.uniform(1.5, 4.5)
                * (1.10 - 0.45 * pressure)
            ),
        ).astype(int)

        sessions_per_user = np.clip(rng.normal(3.4 - 1.2 * pressure, 0.45), 0.5, 7.0)
        session_count = np.maximum(1, np.round(active_users * sessions_per_user)).astype(
            int
        )
        events_per_session = np.clip(rng.normal(8.5 - 2.5 * pressure, 1.0), 2.0, 18.0)

        acceptance_rate = np.clip(
            rng.normal(0.82 - 0.30 * pressure, 0.045), 0.25, 0.96
        )
        champion_user_rate = np.clip(
            rng.normal(0.43 - 0.27 * pressure, 0.04), 0.02, 0.75
        )
        frustration_score = np.clip(
            rng.normal(8.0 + 58.0 * pressure, 6.0), 0.0, 100.0
        )
        avg_session_duration_min = np.clip(
            rng.normal(18.0 - 8.5 * pressure, 1.8), 2.0, 45.0
        )

        generated_outputs = np.maximum(
            1, np.round(session_count * rng.uniform(1.2, 2.8))
        ).astype(int)
        accepted_outputs = np.round(generated_outputs * acceptance_rate).astype(int)
        regenerated_outputs = np.maximum(0, generated_outputs - accepted_outputs)
        support_ticket_count = rng.poisson(
            np.maximum(0.3, active_users * (0.015 + 0.055 * pressure))
        )

        g["company_segment"] = segment
        g["active_users"] = active_users
        g["session_count"] = session_count
        g["events_per_session"] = events_per_session
        g["generated_outputs"] = generated_outputs
        g["accepted_outputs"] = accepted_outputs
        g["regenerated_outputs"] = regenerated_outputs
        g["acceptance_rate"] = acceptance_rate
        g["regeneration_rate"] = 1.0 - acceptance_rate
        g["champion_user_rate"] = champion_user_rate
        g["frustration_score"] = frustration_score
        g["avg_session_duration_min"] = avg_session_duration_min
        g["support_ticket_count"] = support_ticket_count
        g["synthetic_pressure"] = pressure
        g["behavioral_feature_source"] = "synthetic_arx_behavior_v1"
        frames.append(g)

    out = pd.concat(frames, ignore_index=True)
    out = out.sort_values(["company_id", "week_start"]).reset_index(drop=True)
    out["session_duration_change_pct"] = (
        out.groupby("company_id")["avg_session_duration_min"]
        .pct_change(4)
        .replace([np.inf, -np.inf], np.nan)
        .fillna(0.0)
        .clip(-1.0, 3.0)
    )
    return out
