from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class ModelConfig:
    """Shared defaults for the MVP scoring pipeline."""

    random_seed: int = 42
    synthetic_company_count: int = 80
    primary_horizon_weeks: int = 8
    rule_score_weight: float = 0.65
    ml_score_weight: float = 0.35
    min_mrr_for_label: float = 50.0


@dataclass(frozen=True)
class ProjectPaths:
    root: Path

    @property
    def data_processed(self) -> Path:
        return self.root / "data" / "processed"

    @property
    def models(self) -> Path:
        return self.root / "models"

    @property
    def default_training_csv(self) -> Path:
        return self.data_processed / "arx_weekly_training.csv"

    @property
    def default_metadata_json(self) -> Path:
        return self.data_processed / "arx_dataset_metadata.json"

    @property
    def default_latest_scores_csv(self) -> Path:
        return self.data_processed / "latest_arx_scores.csv"

    @property
    def default_model_pickle(self) -> Path:
        return self.models / "arx_mvp_risk_model.pkl"

    @property
    def default_metrics_json(self) -> Path:
        return self.models / "metrics.json"
