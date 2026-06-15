from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd


REQUIRED_COLUMNS = {
    "InvoiceNo",
    "Quantity",
    "InvoiceDate",
    "UnitPrice",
    "CustomerID",
    "Country",
}


def load_online_retail(path: Path) -> pd.DataFrame:
    """Load the UCI Online Retail workbook and validate its expected columns."""
    df = pd.read_excel(path, sheet_name="Online Retail")
    missing = REQUIRED_COLUMNS - set(df.columns)
    if missing:
        raise ValueError(f"Online Retail workbook is missing columns: {sorted(missing)}")
    return df


def prepare_retail_transactions(raw: pd.DataFrame) -> pd.DataFrame:
    """Clean retail rows and create transaction-level financial proxy fields."""
    df = raw.copy()
    df = df.dropna(subset=["CustomerID", "InvoiceDate", "UnitPrice", "Quantity"])
    df = df[df["UnitPrice"] > 0].copy()

    df["customer_id"] = df["CustomerID"].astype(int).astype(str)
    df["invoice_no"] = df["InvoiceNo"].astype(str)
    df["invoice_date"] = pd.to_datetime(df["InvoiceDate"], errors="coerce")
    df = df.dropna(subset=["invoice_date"])

    df["line_revenue"] = df["Quantity"] * df["UnitPrice"]
    df["is_cancellation"] = (df["Quantity"] < 0) | df["invoice_no"].str.startswith("C")
    df["gross_line_revenue"] = np.where(df["line_revenue"] > 0, df["line_revenue"], 0.0)
    df["cancellation_line_amount"] = np.where(
        df["is_cancellation"], np.abs(df["line_revenue"]), 0.0
    )
    df["week_start"] = df["invoice_date"].dt.to_period("W-SUN").dt.start_time
    return df


def assign_customers_to_companies(
    transactions: pd.DataFrame, company_count: int = 80
) -> pd.DataFrame:
    """Map retail customers into synthetic ARX borrower companies.

    UCI Retail has many end customers, but ARX needs borrower companies with many
    subscribers. We create balanced synthetic borrower companies by assigning
    high-revenue customers greedily to the currently smallest company bucket.
    """
    if company_count < 2:
        raise ValueError("company_count must be at least 2")

    customer_revenue = (
        transactions.groupby("customer_id")["gross_line_revenue"]
        .sum()
        .sort_values(ascending=False)
    )
    loads = np.zeros(company_count, dtype=float)
    assignment: dict[str, str] = {}

    for customer_id, revenue in customer_revenue.items():
        company_idx = int(loads.argmin())
        assignment[customer_id] = f"arx_{company_idx:03d}"
        loads[company_idx] += float(revenue)

    df = transactions.copy()
    df["company_id"] = df["customer_id"].map(assignment)
    return df


def build_weekly_financial_features(
    transactions: pd.DataFrame, company_count: int = 80
) -> pd.DataFrame:
    """Aggregate UCI Retail into weekly company-level financial proxy features."""
    df = assign_customers_to_companies(transactions, company_count=company_count)

    weekly = (
        df.groupby(["company_id", "week_start"], as_index=False)
        .agg(
            gross_revenue=("gross_line_revenue", "sum"),
            net_revenue=("line_revenue", "sum"),
            cancellation_amount=("cancellation_line_amount", "sum"),
            invoice_count=("invoice_no", "nunique"),
            cancellation_count=("is_cancellation", "sum"),
            active_customers=("customer_id", "nunique"),
            units_sold=("Quantity", "sum"),
        )
    )

    customer_week = (
        df[df["gross_line_revenue"] > 0]
        .groupby(["company_id", "week_start", "customer_id"], as_index=False)
        .agg(customer_revenue=("gross_line_revenue", "sum"))
    )
    top_customer = (
        customer_week.groupby(["company_id", "week_start"], as_index=False)
        .agg(top_customer_revenue=("customer_revenue", "max"))
    )
    weekly = weekly.merge(top_customer, on=["company_id", "week_start"], how="left")

    companies = sorted(df["company_id"].dropna().unique())
    weeks = pd.date_range(
        weekly["week_start"].min(), weekly["week_start"].max(), freq="W-MON"
    )
    full_index = pd.MultiIndex.from_product(
        [companies, weeks], names=["company_id", "week_start"]
    )
    weekly = (
        weekly.set_index(["company_id", "week_start"])
        .reindex(full_index)
        .reset_index()
        .fillna(
            {
                "gross_revenue": 0.0,
                "net_revenue": 0.0,
                "cancellation_amount": 0.0,
                "invoice_count": 0.0,
                "cancellation_count": 0.0,
                "active_customers": 0.0,
                "units_sold": 0.0,
                "top_customer_revenue": 0.0,
            }
        )
    )

    weekly["top_customer_concentration"] = (
        weekly["top_customer_revenue"] / weekly["gross_revenue"].replace(0, np.nan)
    ).fillna(0.0)
    weekly["cancellation_rate"] = (
        weekly["cancellation_count"]
        / (weekly["invoice_count"] + weekly["cancellation_count"]).replace(0, np.nan)
    ).fillna(0.0)

    weekly = weekly.sort_values(["company_id", "week_start"]).reset_index(drop=True)
    group = weekly.groupby("company_id", group_keys=False)
    weekly["rolling_4w_revenue"] = group["gross_revenue"].transform(
        lambda s: s.rolling(4, min_periods=1).mean()
    )
    weekly["mrr"] = weekly["rolling_4w_revenue"] * 4.345
    weekly["arr"] = weekly["mrr"] * 12.0
    weekly["mrr_change_pct"] = group["mrr"].pct_change(4)
    weekly["mrr_change_pct"] = (
        weekly["mrr_change_pct"].replace([np.inf, -np.inf], np.nan).fillna(0.0)
    )
    weekly["mrr_change_pct"] = weekly["mrr_change_pct"].clip(-1.0, 3.0)
    weekly["active_customer_change_pct"] = group["active_customers"].pct_change(4)
    weekly["active_customer_change_pct"] = (
        weekly["active_customer_change_pct"]
        .replace([np.inf, -np.inf], np.nan)
        .fillna(0.0)
        .clip(-1.0, 3.0)
    )
    weekly["financial_feature_source"] = "uci_online_retail_proxy"
    return weekly
