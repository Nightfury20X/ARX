import type {
  ApplicationRecord,
  BehavioralRecord,
  DashboardData,
  FinancialMetricRecord,
  ScoreRecord,
  TrendRecord
} from "@/types/dashboard";

export interface DashboardRepository {
  getDashboardData(): Promise<DashboardData>;
  getLatestScores(): Promise<ScoreRecord[]>;
  getTrendRecords(): Promise<TrendRecord[]>;
  getApplicationRecords(): Promise<ApplicationRecord[]>;
  getBehavioralRecords(): Promise<BehavioralRecord[]>;
  getFinancialMetrics(): Promise<FinancialMetricRecord[]>;
  getCompanyScore(companyId: string): Promise<ScoreRecord | undefined>;
  getCompanyTrend(companyId: string): Promise<TrendRecord[]>;
}
