import { readFile } from "node:fs/promises";
import path from "node:path";
import { parse } from "csv-parse/sync";

import { buildPortfolioSummary, sortTrend } from "@/lib/domain/dashboard";
import type { DashboardRepository } from "@/lib/data/dashboard-repository";
import type {
  ApplicationRecord,
  BehavioralRecord,
  DashboardData,
  FinancialMetricRecord,
  ScoreRecord,
  TrendRecord
} from "@/types/dashboard";

type CsvRow = Record<string, string | undefined>;
type CompanyNameInfo = {
  companyName: string;
  companyCategory: string;
};
type CompanyNameMap = Map<string, CompanyNameInfo>;

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

const APPLICATIONS_PATH = path.resolve(
  process.cwd(),
  "..",
  "handoff",
  "mike_application_demo_companies.csv"
);

const BEHAVIORAL_PATH = path.resolve(
  process.cwd(),
  "..",
  "handoff",
  "anish_behavioral_connector_sample.csv"
);

const FINANCIAL_METRICS_PATH = path.resolve(
  process.cwd(),
  "..",
  "handoff",
  "financial_data_metrics_for_visualization.csv"
);

const COMPANY_NAME_MAP_PATH = path.resolve(
  process.cwd(),
  "..",
  "handoff",
  "company_name_map.csv"
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

function booleanFrom(row: CsvRow, key: string): boolean {
  return (row[key] ?? "").trim().toLowerCase() === "true";
}

function companyInfoFrom(
  row: CsvRow,
  companyNames: CompanyNameMap = new Map()
): CompanyNameInfo {
  const companyId = row.company_id ?? "unknown";
  const mapped = companyNames.get(companyId);
  return {
    companyName: mapped?.companyName ?? row.company_name ?? companyId,
    companyCategory: mapped?.companyCategory ?? row.company_category ?? "Demo company"
  };
}

export function mapScoreRow(row: CsvRow, companyNames?: CompanyNameMap): ScoreRecord {
  const companyInfo = companyInfoFrom(row, companyNames);
  return {
    companyId: row.company_id ?? "unknown",
    companyName: companyInfo.companyName,
    companyCategory: companyInfo.companyCategory,
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

export function mapTrendRow(row: CsvRow, companyNames?: CompanyNameMap): TrendRecord {
  return {
    ...mapScoreRow(row, companyNames),
    weekStart: row.week_start ?? row.scoring_date ?? ""
  };
}

export function mapApplicationRow(row: CsvRow, companyNames?: CompanyNameMap): ApplicationRecord {
  const companyInfo = companyInfoFrom(row, companyNames);
  return {
    companyName: companyInfo.companyName,
    companyId: row.company_id ?? "unknown",
    companyCategory: companyInfo.companyCategory,
    companyIdentityNote: row.company_identity_note ?? "",
    arr: numberFrom(row, "arr"),
    behavioralConsent: booleanFrom(row, "behavioral_consent"),
    submissionDate: row.submission_date ?? "",
    capitalReadyScore: numberFrom(row, "capital_ready_score"),
    tier: tierFrom(row),
    advanceRate: numberFrom(row, "final_advance_rate")
  };
}

export function mapBehavioralRow(row: CsvRow, companyNames?: CompanyNameMap): BehavioralRecord {
  const companyInfo = companyInfoFrom(row, companyNames);
  return {
    companyId: row.company_id ?? "unknown",
    companyName: companyInfo.companyName,
    companyCategory: companyInfo.companyCategory,
    companyIdentityNote: row.company_identity_note ?? "",
    weekStart: row.week_start ?? "",
    acceptanceRate: numberFrom(row, "acceptance_rate"),
    sessionCount: numberFrom(row, "session_count"),
    sessionDurationChangePct: numberFrom(row, "session_duration_change_pct"),
    activeUsers: numberFrom(row, "active_users"),
    eventsPerSession: numberFrom(row, "events_per_session"),
    championUserRate: numberFrom(row, "champion_user_rate"),
    dataSources: dataSourcesFrom(row)
  };
}

export function mapFinancialMetricRow(
  row: CsvRow,
  companyNames?: CompanyNameMap
): FinancialMetricRecord {
  const companyInfo = companyInfoFrom(row, companyNames);
  return {
    companyId: row.company_id ?? "unknown",
    companyName: companyInfo.companyName,
    companyCategory: companyInfo.companyCategory,
    companyIdentityNote: row.company_identity_note ?? "",
    weekStart: row.week_start ?? "",
    grossRevenue: numberFrom(row, "gross_revenue"),
    netRevenue: numberFrom(row, "net_revenue"),
    mrr: numberFrom(row, "mrr"),
    arr: numberFrom(row, "arr"),
    mrrChangePct: numberFrom(row, "mrr_change_pct"),
    cancellationRate: numberFrom(row, "cancellation_rate"),
    activeCustomers: numberFrom(row, "active_customers"),
    topCustomerConcentration: numberFrom(row, "top_customer_concentration"),
    capitalReadyScore: numberFrom(row, "capital_ready_score"),
    tier: tierFrom(row),
    advanceRate: numberFrom(row, "final_advance_rate"),
    creditAction: (row.final_credit_action ?? "Declined") as ScoreRecord["creditAction"]
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

async function readCompanyNameMap(): Promise<CompanyNameMap> {
  const rows = await readCsvRows(COMPANY_NAME_MAP_PATH);
  return new Map(
    rows
      .filter((row) => row.company_id && row.company_name)
      .map((row) => [
        row.company_id as string,
        {
          companyName: row.company_name as string,
          companyCategory: row.company_category ?? "Demo company"
        }
      ])
  );
}

export class CsvDashboardRepository implements DashboardRepository {
  async getLatestScores(): Promise<ScoreRecord[]> {
    const [rows, companyNames] = await Promise.all([
      readCsvRows(LATEST_SCORES_PATH),
      readCompanyNameMap()
    ]);
    return rows
      .map((row) => mapScoreRow(row, companyNames))
      .sort((a, b) => b.capitalReadyScore - a.capitalReadyScore);
  }

  async getTrendRecords(): Promise<TrendRecord[]> {
    const [rows, companyNames] = await Promise.all([
      readCsvRows(TREND_PATH),
      readCompanyNameMap()
    ]);
    return sortTrend(rows.map((row) => mapTrendRow(row, companyNames)));
  }

  async getApplicationRecords(): Promise<ApplicationRecord[]> {
    const [rows, companyNames] = await Promise.all([
      readCsvRows(APPLICATIONS_PATH),
      readCompanyNameMap()
    ]);
    return rows.map((row) => mapApplicationRow(row, companyNames));
  }

  async getBehavioralRecords(): Promise<BehavioralRecord[]> {
    const [rows, companyNames] = await Promise.all([
      readCsvRows(BEHAVIORAL_PATH),
      readCompanyNameMap()
    ]);
    return rows.map((row) => mapBehavioralRow(row, companyNames));
  }

  async getFinancialMetrics(): Promise<FinancialMetricRecord[]> {
    const [rows, companyNames] = await Promise.all([
      readCsvRows(FINANCIAL_METRICS_PATH),
      readCompanyNameMap()
    ]);
    return rows.map((row) => mapFinancialMetricRow(row, companyNames));
  }

  async getDashboardData(): Promise<DashboardData> {
    const [latestScores, trendRecords, applicationRecords, behavioralRecords, financialMetrics] =
      await Promise.all([
        this.getLatestScores(),
        this.getTrendRecords(),
        this.getApplicationRecords(),
        this.getBehavioralRecords(),
        this.getFinancialMetrics()
      ]);

    return {
      latestScores,
      trendRecords,
      applicationRecords,
      behavioralRecords,
      financialMetrics,
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
