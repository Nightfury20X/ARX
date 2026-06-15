from __future__ import annotations

import numpy as np
import pandas as pd


def _future_sum(series: pd.Series, horizon: int) -> pd.Series:
    total = pd.Series(0.0, index=series.index)
    for offset in range(1, horizon + 1):
        total = total + series.shift(-offset).fillna(0.0)
    return total


def add_future_labels(
    weekly: pd.DataFrame,
    horizons: tuple[int, ...] = (4, 8, 12),
    min_mrr: float = 50.0,
) -> pd.DataFrame:
    """Create future deterioration labels for weekly scoring experiments."""
    out = weekly.sort_values(["company_id", "week_start"]).copy()

    for horizon in horizons:
        out[f"mrr_change_next_{horizon}w"] = np.nan
        out[f"active_customer_change_next_{horizon}w"] = np.nan
        out[f"future_cancel_ratio_{horizon}w"] = np.nan
        out[f"label_available_{horizon}w"] = False

        for _, group in out.groupby("company_id", sort=False):
            idx = group.index
            mrr = group["mrr"].replace(0, np.nan)
            active = group["active_customers"].replace(0, np.nan)

            out.loc[idx, f"mrr_change_next_{horizon}w"] = (
                mrr.shift(-horizon) / mrr - 1.0
            )
            out.loc[idx, f"active_customer_change_next_{horizon}w"] = (
                active.shift(-horizon) / active - 1.0
            )
            future_cancel = _future_sum(group["cancellation_amount"], horizon)
            future_revenue = _future_sum(group["gross_revenue"], horizon)
            out.loc[idx, f"future_cancel_ratio_{horizon}w"] = (
                future_cancel / future_revenue.replace(0, np.nan)
            )
            out.loc[idx, f"label_available_{horizon}w"] = (
                group["week_start"].shift(-horizon).notna().to_numpy()
            )

        out[f"mrr_change_next_{horizon}w"] = out[
            f"mrr_change_next_{horizon}w"
        ].replace([np.inf, -np.inf], np.nan)
        out[f"active_customer_change_next_{horizon}w"] = out[
            f"active_customer_change_next_{horizon}w"
        ].replace([np.inf, -np.inf], np.nan)
        out[f"future_cancel_ratio_{horizon}w"] = out[
            f"future_cancel_ratio_{horizon}w"
        ].replace([np.inf, -np.inf], np.nan)

        bad = (
            (out[f"mrr_change_next_{horizon}w"] <= -0.15)
            | (out[f"active_customer_change_next_{horizon}w"] <= -0.20)
            | (out[f"future_cancel_ratio_{horizon}w"] >= 0.12)
        )
        out[f"bad_outcome_{horizon}w"] = (
            bad & out[f"label_available_{horizon}w"] & (out["mrr"] >= min_mrr)
        ).astype(int)

    out["is_trainable_8w"] = out["label_available_8w"] & (out["mrr"] >= min_mrr)
    return out
