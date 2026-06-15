from __future__ import annotations

import json
import pickle
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

from arx_scoring.rule_score import (
    advance_rate_from_tier,
    credit_action_from_tier,
    tier_from_score,
)


FINANCIAL_FEATURES = [
    "mrr",
    "arr",
    "mrr_change_pct",
    "gross_revenue",
    "net_revenue",
    "cancellation_amount",
    "cancellation_rate",
    "top_customer_concentration",
    "active_customers",
    "active_customer_change_pct",
    "invoice_count",
]

BEHAVIORAL_FEATURES = [
    "acceptance_rate",
    "regeneration_rate",
    "session_count",
    "active_users",
    "events_per_session",
    "session_duration_change_pct",
    "champion_user_rate",
    "frustration_score",
    "support_ticket_count",
]

RULE_SCORE_FEATURES = [
    "output_acceptance_score",
    "engagement_score",
    "retention_score",
    "sentiment_score",
    "concentration_score",
    "capital_ready_rule_score",
]

CATEGORICAL_FEATURES = ["company_segment"]

MODEL_FEATURES = (
    FINANCIAL_FEATURES + BEHAVIORAL_FEATURES + RULE_SCORE_FEATURES + CATEGORICAL_FEATURES
)


@dataclass
class TrainResult:
    model: Any
    model_type: str
    feature_columns: list[str]
    categorical_features: list[str]
    target_column: str
    metrics: dict[str, Any]
    split_weeks: dict[str, str]


class NumpyLogisticRiskModel:
    """Small dependency-free fallback model.

    This is not the desired production model. It exists so the MVP pipeline runs
    when CatBoost/sklearn are not installed in the local runtime.
    """

    def __init__(
        self,
        numeric_features: list[str],
        categorical_features: list[str],
        iterations: int = 1200,
        learning_rate: float = 0.08,
        l2: float = 0.02,
        seed: int = 42,
    ) -> None:
        self.numeric_features = numeric_features
        self.categorical_features = categorical_features
        self.iterations = iterations
        self.learning_rate = learning_rate
        self.l2 = l2
        self.seed = seed
        self.numeric_medians: pd.Series | None = None
        self.numeric_means: pd.Series | None = None
        self.numeric_stds: pd.Series | None = None
        self.category_values: dict[str, list[str]] = {}
        self.weights: np.ndarray | None = None
        self.bias: float = 0.0

    def fit(self, x: pd.DataFrame, y: pd.Series) -> "NumpyLogisticRiskModel":
        self.numeric_medians = x[self.numeric_features].median(numeric_only=True)
        numeric = x[self.numeric_features].fillna(self.numeric_medians).astype(float)
        self.numeric_means = numeric.mean()
        self.numeric_stds = numeric.std().replace(0, 1.0).fillna(1.0)
        for col in self.categorical_features:
            self.category_values[col] = sorted(
                x[col].fillna("unknown").astype(str).unique().tolist()
            )

        x_mat = self._transform(x)
        y_arr = y.astype(float).to_numpy()
        rng = np.random.default_rng(self.seed)
        self.weights = rng.normal(0.0, 0.01, size=x_mat.shape[1])
        positive_rate = np.clip(y_arr.mean(), 1e-4, 1 - 1e-4)
        self.bias = float(np.log(positive_rate / (1 - positive_rate)))

        for step in range(self.iterations):
            pred = self._sigmoid(x_mat @ self.weights + self.bias)
            error = pred - y_arr
            lr = self.learning_rate / np.sqrt(1.0 + step / 200.0)
            grad_w = (x_mat.T @ error) / len(y_arr) + self.l2 * self.weights
            grad_b = float(error.mean())
            self.weights -= lr * grad_w
            self.bias -= lr * grad_b
        return self

    def predict_proba(self, x: pd.DataFrame) -> np.ndarray:
        if self.weights is None:
            raise ValueError("Model is not fitted")
        x_mat = self._transform(x)
        p1 = self._sigmoid(x_mat @ self.weights + self.bias)
        return np.column_stack([1.0 - p1, p1])

    def _transform(self, x: pd.DataFrame) -> np.ndarray:
        if self.numeric_medians is None or self.numeric_means is None or self.numeric_stds is None:
            raise ValueError("Model preprocessing is not fitted")

        numeric = x[self.numeric_features].fillna(self.numeric_medians).astype(float)
        numeric = (numeric - self.numeric_means) / self.numeric_stds
        parts = [numeric.to_numpy(dtype=float)]

        for col in self.categorical_features:
            values = x[col].fillna("unknown").astype(str)
            categories = self.category_values.get(col, [])
            encoded = np.zeros((len(x), len(categories)), dtype=float)
            category_to_idx = {cat: idx for idx, cat in enumerate(categories)}
            for row_idx, value in enumerate(values):
                if value in category_to_idx:
                    encoded[row_idx, category_to_idx[value]] = 1.0
            parts.append(encoded)

        return np.hstack(parts)

    @staticmethod
    def _sigmoid(z: np.ndarray) -> np.ndarray:
        z = np.clip(z, -35.0, 35.0)
        return 1.0 / (1.0 + np.exp(-z))


def _time_split(df: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    weeks = np.array(sorted(pd.to_datetime(df["week_start"]).unique()))
    if len(weeks) < 10:
        raise ValueError("Need at least 10 weekly periods for a time-based split")
    train_end = weeks[int(len(weeks) * 0.70)]
    val_end = weeks[int(len(weeks) * 0.85)]
    train = df[pd.to_datetime(df["week_start"]) <= train_end]
    val = df[
        (pd.to_datetime(df["week_start"]) > train_end)
        & (pd.to_datetime(df["week_start"]) <= val_end)
    ]
    test = df[pd.to_datetime(df["week_start"]) > val_end]
    return train, val, test


def _roc_auc(y_true: np.ndarray, proba: np.ndarray) -> float:
    y = y_true.astype(int)
    n_pos = int(y.sum())
    n_neg = int(len(y) - n_pos)
    if n_pos == 0 or n_neg == 0:
        return float("nan")
    ranks = pd.Series(proba).rank(method="average").to_numpy()
    rank_sum_pos = ranks[y == 1].sum()
    return float((rank_sum_pos - n_pos * (n_pos + 1) / 2) / (n_pos * n_neg))


def _average_precision(y_true: np.ndarray, proba: np.ndarray) -> float:
    order = np.argsort(-proba)
    y_sorted = y_true.astype(int)[order]
    positives = int(y_sorted.sum())
    if positives == 0:
        return float("nan")
    precision_at_k = np.cumsum(y_sorted) / (np.arange(len(y_sorted)) + 1)
    return float((precision_at_k * y_sorted).sum() / positives)


def _safe_metrics(y_true: pd.Series, proba: np.ndarray) -> dict[str, Any]:
    y_arr = y_true.astype(int).to_numpy()
    metrics: dict[str, Any] = {
        "rows": int(len(y_true)),
        "positive_rate": float(y_true.mean()) if len(y_true) else None,
    }
    if len(y_true) == 0 or y_true.nunique() < 2:
        metrics.update({"roc_auc": None, "average_precision": None, "brier": None})
        return metrics
    metrics["roc_auc"] = _roc_auc(y_arr, proba)
    metrics["average_precision"] = _average_precision(y_arr, proba)
    metrics["brier"] = float(np.mean((proba - y_arr) ** 2))
    return metrics


def _try_build_sklearn_model(numeric_features: list[str]) -> Any | None:
    try:
        from sklearn.compose import ColumnTransformer
        from sklearn.ensemble import HistGradientBoostingClassifier
        from sklearn.impute import SimpleImputer
        from sklearn.pipeline import Pipeline
        from sklearn.preprocessing import OneHotEncoder
    except Exception:
        return None

    try:
        encoder = OneHotEncoder(handle_unknown="ignore", sparse_output=False)
    except TypeError:
        encoder = OneHotEncoder(handle_unknown="ignore", sparse=False)

    preprocessor = ColumnTransformer(
        transformers=[
            ("num", SimpleImputer(strategy="median"), numeric_features),
            ("cat", encoder, CATEGORICAL_FEATURES),
        ],
        remainder="drop",
    )
    estimator = HistGradientBoostingClassifier(
        max_iter=250,
        learning_rate=0.05,
        max_leaf_nodes=15,
        l2_regularization=0.05,
        random_state=42,
    )
    return Pipeline([("preprocess", preprocessor), ("model", estimator)])


def train_risk_model(
    weekly: pd.DataFrame,
    target_column: str = "bad_outcome_8w",
) -> TrainResult:
    """Train CatBoost when installed; otherwise use a sklearn fallback."""
    data = weekly[weekly["is_trainable_8w"]].copy()
    data = data.dropna(subset=[target_column])
    if data.empty:
        raise ValueError("No trainable rows available")

    train, val, test = _time_split(data)
    numeric_features = [c for c in MODEL_FEATURES if c not in CATEGORICAL_FEATURES]
    feature_columns = MODEL_FEATURES.copy()

    for frame in (train, val, test):
        frame.loc[:, CATEGORICAL_FEATURES] = frame[CATEGORICAL_FEATURES].fillna("unknown")

    try:
        from catboost import CatBoostClassifier

        model_type = "catboost"
        model = CatBoostClassifier(
            iterations=300,
            depth=4,
            learning_rate=0.05,
            loss_function="Logloss",
            eval_metric="AUC",
            random_seed=42,
            verbose=False,
        )
        cat_indices = [feature_columns.index(c) for c in CATEGORICAL_FEATURES]
        model.fit(
            train[feature_columns],
            train[target_column],
            cat_features=cat_indices,
            eval_set=(val[feature_columns], val[target_column]),
        )
    except ImportError:
        model = _try_build_sklearn_model(numeric_features)
        if model is not None:
            model_type = "sklearn_hist_gradient_boosting"
        else:
            model_type = "numpy_logistic_fallback"
            model = NumpyLogisticRiskModel(
                numeric_features=numeric_features,
                categorical_features=CATEGORICAL_FEATURES,
            )
        model.fit(train[feature_columns], train[target_column])

    metrics = {
        "train": _safe_metrics(
            train[target_column], model.predict_proba(train[feature_columns])[:, 1]
        ),
        "validation": _safe_metrics(
            val[target_column], model.predict_proba(val[feature_columns])[:, 1]
        ),
        "test": _safe_metrics(
            test[target_column], model.predict_proba(test[feature_columns])[:, 1]
        ),
    }
    split_weeks = {
        "train_min": str(pd.to_datetime(train["week_start"]).min().date()),
        "train_max": str(pd.to_datetime(train["week_start"]).max().date()),
        "validation_min": str(pd.to_datetime(val["week_start"]).min().date()),
        "validation_max": str(pd.to_datetime(val["week_start"]).max().date()),
        "test_min": str(pd.to_datetime(test["week_start"]).min().date()),
        "test_max": str(pd.to_datetime(test["week_start"]).max().date()),
    }
    return TrainResult(
        model=model,
        model_type=model_type,
        feature_columns=feature_columns,
        categorical_features=CATEGORICAL_FEATURES,
        target_column=target_column,
        metrics=metrics,
        split_weeks=split_weeks,
    )


def save_train_result(result: TrainResult, model_path: Path, metrics_path: Path) -> None:
    model_path.parent.mkdir(parents=True, exist_ok=True)
    metrics_path.parent.mkdir(parents=True, exist_ok=True)
    bundle = {
        "model": result.model,
        "model_type": result.model_type,
        "feature_columns": result.feature_columns,
        "categorical_features": result.categorical_features,
        "target_column": result.target_column,
    }
    with model_path.open("wb") as f:
        pickle.dump(bundle, f)
    with metrics_path.open("w", encoding="utf-8") as f:
        json.dump(
            {
                "model_type": result.model_type,
                "target_column": result.target_column,
                "metrics": result.metrics,
                "split_weeks": result.split_weeks,
                "financial_features": FINANCIAL_FEATURES,
                "behavioral_features": BEHAVIORAL_FEATURES,
                "rule_score_features": RULE_SCORE_FEATURES,
            },
            f,
            indent=2,
        )


def add_model_scores(
    weekly: pd.DataFrame,
    result: TrainResult,
    rule_weight: float = 0.65,
    ml_weight: float = 0.35,
) -> pd.DataFrame:
    out = weekly.copy()
    out[CATEGORICAL_FEATURES] = out[CATEGORICAL_FEATURES].fillna("unknown")
    risk_probability = result.model.predict_proba(out[result.feature_columns])[:, 1]
    out["ml_bad_outcome_probability_8w"] = risk_probability
    out["ml_health_score"] = 100.0 * (1.0 - out["ml_bad_outcome_probability_8w"])
    out["capital_ready_score"] = (
        rule_weight * out["capital_ready_rule_score"] + ml_weight * out["ml_health_score"]
    ).round(2)
    out["final_tier"] = out["capital_ready_score"].map(tier_from_score)
    out["final_credit_action"] = out["final_tier"].map(credit_action_from_tier)
    out["final_advance_rate"] = out["final_tier"].map(advance_rate_from_tier)
    return out
