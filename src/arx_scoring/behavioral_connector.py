"""turn raw product-analytics events into CompanySignals.
source-agnostic replacement for the synthetic generator 
identical to ``handoff/anish_behavioral_connector_sample.csv`` -- not real data.

Pipeline position::
    raw events (Mixpanel/Amplitude)
        -> ConnectorConfig (per-company event-name mapping)
        -> compute_weekly_signals()
        -> CompanySignals rows  ==  sample CSV columns

"""
from __future__ import annotations
from dataclasses import dataclass, field
from pathlib import Path
from typing import Protocol

import json
import re
import numpy as np
import pandas as pd


# output object: CompanySignals
# These 8 fields are the "output contract" from anish_config_template.json.
# the raw data came from.
CONTRACT_FIELDS: list[str] = [
    "company_id",
    "week_start",
    "acceptance_rate",
    "session_count",
    "session_duration_change_pct",
    "active_users",
    "events_per_session",
    "champion_user_rate",
]

# Extra provenance columns
PROVENANCE_FIELDS: list[str] = [
    "company_identity_note",
    "data_sources",
    "behavioral_feature_source",
]

FEATURE_SOURCE_TAG = "behavioral_connector_v1"


@dataclass(frozen=True)
class CompanySignals:
    """One company's product-behavior signals for a single week.

    This is the clean, analytics-source-agnostic shape every downstream
    consumer depends on. One ``CompanySignals`` == one row of the output CSV.
    """

    company_id: str
    week_start: pd.Timestamp
    acceptance_rate: float
    session_count: int
    session_duration_change_pct: float
    active_users: int
    events_per_session: float
    champion_user_rate: float

    def as_record(self) -> dict:
        return {
            "company_id": self.company_id,
            "week_start": self.week_start,
            "acceptance_rate": self.acceptance_rate,
            "session_count": self.session_count,
            "session_duration_change_pct": self.session_duration_change_pct,
            "active_users": self.active_users,
            "events_per_session": self.events_per_session,
            "champion_user_rate": self.champion_user_rate,
        }


# event-name mapping
# Every company names their AI accept/regenerate/session events differently
def _parse_min_sessions(rule: str | None, default: int = 3) -> int:
    """Pull the integer out of a champion rule like '>=3 sessions per week'."""
    if not rule:
        return default
    match = re.search(r"\d+", rule)
    return int(match.group()) if match else default


@dataclass(frozen=True)
class ConnectorConfig:
    """Maps a single company's raw event names onto the ARX standard fields."""

    company_id: str
    analytics_sources: list[str]
    session_start_event: str
    session_end_event: str | None
    accepted_output_events: list[str]
    rejected_output_events: list[str]
    duration_property: str
    active_user_event: str
    champion_min_sessions_per_week: int
    output_contract: list[str] = field(default_factory=lambda: list(CONTRACT_FIELDS))

    @classmethod
    def from_dict(cls, data: dict) -> "ConnectorConfig":
        mixpanel = data.get("mixpanel", {})
        amplitude = data.get("amplitude", {})

        session_start = (
            mixpanel.get("session_start_event")
            or amplitude.get("session_event")
            or "session_start"
        )
        return cls(
            company_id=data.get("company_id", "unknown_company"),
            analytics_sources=data.get("analytics_sources", []),
            session_start_event=session_start,
            session_end_event=mixpanel.get("session_end_event"),
            accepted_output_events=list(mixpanel.get("accepted_output_events", [])),
            rejected_output_events=list(mixpanel.get("rejected_output_events", [])),
            duration_property=mixpanel.get("duration_property", "duration_seconds"),
            active_user_event=amplitude.get("active_user_event", "_active"),
            champion_min_sessions_per_week=_parse_min_sessions(
                amplitude.get("champion_user_rule")
            ),
            output_contract=list(data.get("output_contract", CONTRACT_FIELDS)),
        )

    @classmethod
    def from_json(cls, path: str | Path) -> "ConnectorConfig":
        with Path(path).open("r", encoding="utf-8") as f:
            return cls.from_dict(json.load(f))

#  where the events come from
# every source must return these columns:
#   company_id : str
#   user_id    : str        
#   event_name : str          
#   timestamp  : datetime     
#   duration : float        
RAW_EVENT_COLUMNS = ["company_id", "user_id", "event_name", "timestamp"]


class RawEventSource(Protocol):
    """Anything that can hand the connector raw events for a date range."""

    def fetch_events(
        self, company_id: str, start: pd.Timestamp, end: pd.Timestamp
    ) -> pd.DataFrame:
        ...


@dataclass
class StaticEventSource:
    """Wraps an in-memory DataFrame of raw events. Used for tests / demos."""

    events: pd.DataFrame

    def fetch_events(
        self, company_id: str, start: pd.Timestamp, end: pd.Timestamp
    ) -> pd.DataFrame:
        df = self.events
        mask = (
            (df["company_id"] == company_id)
            & (df["timestamp"] >= start)
            & (df["timestamp"] < end)
        )
        return df.loc[mask].copy()


@dataclass
class MixpanelEventSource:
    """Pulls raw events from Mixpanel's Export API.

    TODO(anish): implement once a design partner exists and provides credentials.
    The Raw Event Export endpoint is:
        GET https://data.mixpanel.com/api/2.0/export
        auth: HTTP basic with the project API secret
        params: from_date, to_date (YYYY-MM-DD); response is newline-delimited JSON
    Map each returned event onto RAW_EVENT_COLUMNS (event -> event_name,
    properties.distinct_id -> user_id, properties.time -> timestamp,
    properties[config.duration_property] -> duration).
    """

    api_secret: str
    project_id: str | None = None

    def fetch_events(
        self, company_id: str, start: pd.Timestamp, end: pd.Timestamp
    ) -> pd.DataFrame:
        raise NotImplementedError(
            "Live Mixpanel pull not implemented yet -- no design partners. "
            "Feed compute_weekly_signals a raw-events DataFrame for now."
        )


@dataclass
class AmplitudeEventSource:
    """Pulls raw events from Amplitude's Export API.

    TODO(anish): implement once a design partner exists and provides credentials.
    The Export endpoint is:
        GET https://amplitude.com/api/2/export?start=YYYYMMDDTHH&end=YYYYMMDDTHH
        auth: HTTP basic with (api_key, secret_key); response is a zip of gzipped JSON.
    Map each event onto RAW_EVENT_COLUMNS (event_type -> event_name,
    user_id/amplitude_id -> user_id, event_time -> timestamp).
    """

    api_key: str
    secret_key: str

    def fetch_events(
        self, company_id: str, start: pd.Timestamp, end: pd.Timestamp
    ) -> pd.DataFrame:
        raise NotImplementedError(
            "Live Amplitude pull not implemented yet -- no design partners. "
            "Feed compute_weekly_signals a raw-events DataFrame for now."
        )


#  raw events -> weekly CompanySignals

def compute_weekly_signals(
    events: pd.DataFrame, config: ConnectorConfig, week_rule: str = "W-SUN"
) -> pd.DataFrame:
    """Aggregate raw events into one weekly CompanySignals row per company-week.

    ``week_rule`` matches the financial pipeline (``W-SUN`` -> Monday week_start),
    so behavioral and financial weeks line up for the model join.
    """
    if events.empty:
        return pd.DataFrame(columns=CONTRACT_FIELDS)

    df = events.copy()
    df["timestamp"] = pd.to_datetime(df["timestamp"], errors="coerce")
    df = df.dropna(subset=["timestamp"])
    df["week_start"] = df["timestamp"].dt.to_period(week_rule).dt.start_time

    accepted = set(config.accepted_output_events)
    rejected = set(config.rejected_output_events)
    df["is_session_start"] = df["event_name"] == config.session_start_event
    df["is_accepted"] = df["event_name"].isin(accepted)
    df["is_rejected"] = df["event_name"].isin(rejected)

    keys = ["company_id", "week_start"]

    # Base per week counts.
    agg = df.groupby(keys).agg(
        total_events=("event_name", "size"),
        session_count=("is_session_start", "sum"),
        accepted_count=("is_accepted", "sum"),
        rejected_count=("is_rejected", "sum"),
        active_users=("user_id", "nunique"),  # distinct active users (any event)
    )

    # acceptance_rate = accepted / (accepted + rejected) | 0 if no graded outputs.
    graded = agg["accepted_count"] + agg["rejected_count"]
    agg["acceptance_rate"] = (agg["accepted_count"] / graded.replace(0, np.nan)).fillna(
        0.0
    )

    # events_per_session = total events / sessions | 0 if no sessions.
    agg["events_per_session"] = (
        agg["total_events"] / agg["session_count"].replace(0, np.nan)
    ).fillna(0.0)

    # champion_user_rate = share of users with >= N sessions that week.
    sessions_per_user = (
        df[df["is_session_start"]]
        .groupby(keys + ["user_id"])
        .size()
        .rename("user_sessions")
        .reset_index()
    )
    sessions_per_user["is_champion"] = (
        sessions_per_user["user_sessions"] >= config.champion_min_sessions_per_week
    )
    champ = sessions_per_user.groupby(keys).agg(
        champion_users=("is_champion", "sum"),
        users_with_sessions=("user_id", "nunique"),
    )
    agg = agg.join(champ)
    agg["champion_user_rate"] = (
        agg["champion_users"]
        / agg["users_with_sessions"].replace(0, np.nan)
    ).fillna(0.0)

    # avg session duration -> session_duration_change_pct vs 4 weeks prior.
    if config.duration_property in df.columns:
        dur = df
        if config.session_end_event and (
            df["event_name"] == config.session_end_event
        ).any():
            dur = df[df["event_name"] == config.session_end_event]
        dur = dur.dropna(subset=[config.duration_property])
        avg_dur = dur.groupby(keys)[config.duration_property].mean()
        agg = agg.join(avg_dur.rename("avg_session_duration"))
    else:
        agg["avg_session_duration"] = np.nan

    out = agg.reset_index().sort_values(keys).reset_index(drop=True)
    out["session_duration_change_pct"] = (
        out.groupby("company_id")["avg_session_duration"]
        .pct_change(4)
        .replace([np.inf, -np.inf], np.nan)
        .fillna(0.0)
        .clip(-1.0, 3.0)
    )

    out["session_count"] = out["session_count"].astype(int)
    out["active_users"] = out["active_users"].astype(int)
    return out[CONTRACT_FIELDS]


def to_output_frame(
    signals: pd.DataFrame,
    config: ConnectorConfig,
    identity_note: str = "",
    feature_source: str = FEATURE_SOURCE_TAG,
) -> pd.DataFrame:
    """Add provenance columns so output matches the handoff sample CSV layout."""
    df = signals.copy()
    df["company_identity_note"] = identity_note
    df["data_sources"] = ",".join(config.analytics_sources)
    df["behavioral_feature_source"] = feature_source
    ordered = [
        "company_id",
        "company_identity_note",
        "week_start",
        "acceptance_rate",
        "session_count",
        "session_duration_change_pct",
        "active_users",
        "events_per_session",
        "champion_user_rate",
        "data_sources",
        "behavioral_feature_source",
    ]
    return df[ordered]


def validate_against_contract(signals: pd.DataFrame, config: ConnectorConfig) -> None:
    """Raise if any contract field is missing from the produced signals."""
    missing = [c for c in config.output_contract if c not in signals.columns]
    if missing:
        raise ValueError(
            f"Connector output is missing contract fields: {missing}. "
            f"Got columns: {list(signals.columns)}"
        )


#  run the connector with no API yet

def simulate_raw_events(
    config: ConnectorConfig,
    company_ids: list[str],
    n_weeks: int = 8,
    start: str = "2011-10-17",
    seed: int = 42,
) -> pd.DataFrame:
    """Fabricate raw events (named per ``config``) for local end-to-end testing.

    This stands in for a real Mixpanel/Amplitude export. It is demo scaffolding,
    NOT validation data -- it only exists so you can watch raw events flow
    through ``compute_weekly_signals`` and produce the contract columns.
    """
    rng = np.random.default_rng(seed)
    start_ts = pd.Timestamp(start)
    accepted = config.accepted_output_events or ["output_used"]
    rejected = config.rejected_output_events or ["regenerate"]
    session_end = config.session_end_event or "session_end"
    records: list[tuple] = []

    for company_id in company_ids:
        base_users = int(rng.integers(3, 40))
        for w in range(n_weeks):
            week_start = start_ts + pd.Timedelta(weeks=w)
            n_users = max(1, int(base_users * rng.uniform(0.7, 1.3)))
            for u in range(n_users):
                user_id = f"{company_id}_u{u:03d}"
                n_sessions = int(np.clip(rng.poisson(3.0), 1, 12))
                for _ in range(n_sessions):
                    ts = week_start + pd.Timedelta(
                        seconds=int(rng.integers(0, 7 * 24 * 3600))
                    )
                    records.append(
                        (company_id, user_id, config.session_start_event, ts, np.nan)
                    )
                    for _ in range(int(np.clip(rng.poisson(4.0), 1, 15))):
                        is_ok = rng.random() < 0.80
                        ev = accepted[0] if is_ok else rejected[0]
                        records.append((company_id, user_id, ev, ts, np.nan))
                    duration = float(np.clip(rng.normal(600.0, 200.0), 30.0, 3600.0))
                    records.append((company_id, user_id, session_end, ts, duration))

    return pd.DataFrame.from_records(
        records,
        columns=["company_id", "user_id", "event_name", "timestamp",
                 config.duration_property],
    )
