import type { DashboardData, ScoreRecord, TrendRecord } from "@/types/dashboard";

export interface DashboardRepository {
  getDashboardData(): Promise<DashboardData>;
  getLatestScores(): Promise<ScoreRecord[]>;
  getTrendRecords(): Promise<TrendRecord[]>;
  getCompanyScore(companyId: string): Promise<ScoreRecord | undefined>;
  getCompanyTrend(companyId: string): Promise<TrendRecord[]>;
}
