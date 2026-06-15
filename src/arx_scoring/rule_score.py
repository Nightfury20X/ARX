from __future__ import annotations

import numpy as np
import pandas as pd


def _bucket_score(values: pd.Series, edges: list[float], scores: list[float]) -> pd.Series:
    conditions = [values >= edge for edge in edges]
    return pd.Series(np.select(conditions, scores[:-1], default=scores[-1]), index=values.index)


def _inverse_bucket_score(
    values: pd.Series, edges: list[float], scores: list[float]
) -> pd.Series:
    conditions = [values <= edge for edge in edges]
    return pd.Series(np.select(conditions, scores[:-1], default=scores[-1]), index=values.index)


def tier_from_score(score: float) -> int:
    if score >= 85:
        return 1
    if score >= 70:
        return 2
    if score >= 55:
        return 3
    return 4


def credit_action_from_tier(tier: int) -> str:
    return {
        1: "Advance eligible",
        2: "Monitor",
        3: "Review",
        4: "Declined",
    }[tier]


def advance_rate_from_tier(tier: int) -> float:
    return {
        1: 0.875,
        2: 0.750,
        3: 0.575,
        4: 0.000,
    }[tier]


def add_rule_scores(weekly: pd.DataFrame) -> pd.DataFrame:
    """Apply the PDF threshold score with higher score meaning healthier."""
    out = weekly.copy()

    out["output_acceptance_score"] = _bucket_score(
        out["acceptance_rate"],
        edges=[0.70, 0.60, 0.45],
        scores=[92.0, 75.0, 45.0, 18.0],
    )
    out["engagement_score"] = _bucket_score(
        out["session_duration_change_pct"],
        edges=[0.00, -0.05, -0.20],
        scores=[92.0, 75.0, 45.0, 18.0],
    )
    out["sentiment_score"] = _inverse_bucket_score(
        out["frustration_score"],
        edges=[5.0, 10.0, 20.0],
        scores=[92.0, 75.0, 45.0, 18.0],
    )
    out["champion_user_score"] = _bucket_score(
        out["champion_user_rate"],
        edges=[0.40, 0.25, 0.10],
        scores=[92.0, 75.0, 45.0, 18.0],
    )
    out["mrr_trend_score"] = _bucket_score(
        out["mrr_change_pct"],
        edges=[0.00, -0.05, -0.20],
        scores=[92.0, 75.0, 45.0, 18.0],
    )
    out["retention_score"] = (
        0.65 * out["champion_user_score"] + 0.35 * out["mrr_trend_score"]
    )
    out["concentration_score"] = _inverse_bucket_score(
        out["top_customer_concentration"],
        edges=[0.20, 0.35, 0.50],
        scores=[92.0, 75.0, 45.0, 18.0],
    )

    out["capital_ready_rule_score"] = (
        0.25 * out["output_acceptance_score"]
        + 0.20 * out["engagement_score"]
        + 0.20 * out["retention_score"]
        + 0.20 * out["sentiment_score"]
        + 0.15 * out["concentration_score"]
    ).round(2)
    out["rule_tier"] = out["capital_ready_rule_score"].map(tier_from_score)
    out["credit_action"] = out["rule_tier"].map(credit_action_from_tier)
    out["advance_rate_applied"] = out["rule_tier"].map(advance_rate_from_tier)
    out["model_version"] = "canary-hybrid-mvp-v0.1"
    return out
