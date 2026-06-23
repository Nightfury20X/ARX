import { readFile } from "node:fs/promises";
import path from "node:path";
import { parse } from "csv-parse/sync";

import { buildPortfolioSummary, sortTrend } from "@/lib/domain/dashboard";
import type { DashboardRepository } from "@/lib/data/dashboard-repository";
import type { DashboardData, ScoreRecord, TrendRecord } from "@/types/dashboard";

type CsvRow = Record<string, string | undefined>;

const LATEST_SCORES_PATH = path.resolve(
  process.cwd(),
  "..",
  "handoff",
  "vaibhav_dashboard_latest_scores.csv"
);

const TREND_PATH = path.resolve(
  process.cwd(),
  "..",
  "handoff",
  "vaibhav_dashboard_8_week_trend.csv"
);

function numberFrom(row: CsvRow, key: string): number {
  const raw = row[key];
  if (raw === undefined || raw.trim() === "") {
    return 0;
  }
  const value = Number(raw);
  return Number.isFinite(value) ? value : 0;
}

function nullableNumberFrom(row: CsvRow, key: string): number | null {
  const raw = row[key];
  if (raw === undefined || raw.trim() === "") {
    return null;
  }
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

function tierFrom(row: CsvRow): 1 | 2 | 3 | 4 {
  const value = Math.trunc(numberFrom(row, "final_tier"));
  if (value === 1 || value === 2 || value === 3 || value === 4) {
    return value;
  }
  return 4;
}

function dataSourcesFrom(row: CsvRow): string[] {
  return (row.data_sources ?? "")
    .split(",")
    .map((source) => source.trim())
    .filter(Boolean);
}

export function mapScoreRow(row: CsvRow): ScoreRecord {
  return {
    companyId: row.company_id ?? "unknown",
    companyIdentityNote: row.company_identity_note ?? "",
    scoringDate: row.scoring_date ?? "",
    capitalReadyScore: numberFrom(row, "capital_ready_score"),
    legacyRiskScore: numberFrom(row, "composite_risk_score_legacy"),
    tier: tierFrom(row),
    creditAction: (row.final_credit_action ?? "Declined") as ScoreRecord["creditAction"],
    advanceRate: numberFrom(row, "final_advance_rate"),
    badOutcomeProbability8w: numberFrom(row, "ml_bad_outcome_probability_8w"),
    outputAcceptanceScore: numberFrom(row, "output_acceptance_score"),
    engagementScore: numberFrom(row, "engagement_score"),
    retentionScore: numberFrom(row, "retention_score"),
    concentrationScore: numberFrom(row, "concentration_score"),
    sentimentScore: nullableNumberFrom(row, "sentiment_score"),
    arr: numberFrom(row, "arr"),
    mrr: numberFrom(row, "mrr"),
    ruleAdvanceRateApplied: numberFrom(row, "advance_rate_applied"),
    dataSources: dataSourcesFrom(row)
  };
}

export function mapTrendRow(row: CsvRow): TrendRecord {
  return {
    ...mapScoreRow(row),
    weekStart: row.week_start ?? row.scoring_date ?? ""
  };
}

async function readCsvRows(filePath: string): Promise<CsvRow[]> {
  const content = await readFile(filePath, "utf8");
  return parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true
  }) as CsvRow[];
}

export class CsvDashboardRepository implements DashboardRepository {
  async getLatestScores(): Promise<ScoreRecord[]> {
    const rows = await readCsvRows(LATEST_SCORES_PATH);
    return rows
      .map(mapScoreRow)
      .sort((a, b) => b.capitalReadyScore - a.capitalReadyScore);
  }

  async getTrendRecords(): Promise<TrendRecord[]> {
    const rows = await readCsvRows(TREND_PATH);
    return sortTrend(rows.map(mapTrendRow));
  }

  async getDashboardData(): Promise<DashboardData> {
    const [latestScores, trendRecords] = await Promise.all([
      this.getLatestScores(),
      this.getTrendRecords()
    ]);

    return {
      latestScores,
      trendRecords,
      summary: buildPortfolioSummary(latestScores)
    };
  }

  async getCompanyScore(companyId: string): Promise<ScoreRecord | undefined> {
    const scores = await this.getLatestScores();
    return scores.find((score) => score.companyId === companyId);
  }

  async getCompanyTrend(companyId: string): Promise<TrendRecord[]> {
    const trend = await this.getTrendRecords();
    return trend.filter((record) => record.companyId === companyId);
  }
}

export const csvDashboardRepository = new CsvDashboardRepository();
