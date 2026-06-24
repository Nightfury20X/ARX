export type CreditAction = "Advance eligible" | "Monitor" | "Review" | "Declined";

export type SignalKey =
  | "outputAcceptance"
  | "engagement"
  | "retention"
  | "concentration"
  | "sentiment";

export interface SignalScore {
  key: SignalKey;
  label: string;
  description: string;
  value: number | null;
}

export interface ScoreRecord {
  companyId: string;
  companyIdentityNote: string;
  scoringDate: string;
  capitalReadyScore: number;
  legacyRiskScore: number;
  tier: 1 | 2 | 3 | 4;
  creditAction: CreditAction;
  advanceRate: number;
  badOutcomeProbability8w: number;
  outputAcceptanceScore: number;
  engagementScore: number;
  retentionScore: number;
  concentrationScore: number;
  sentimentScore: number | null;
  arr: number;
  mrr: number;
  ruleAdvanceRateApplied: number;
  dataSources: string[];
}

export interface TrendRecord extends ScoreRecord {
  weekStart: string;
}

export interface DashboardSummary {
  companyCount: number;
  averageCapitalReadyScore: number;
  totalArr: number;
  totalMrr: number;
  actionCounts: Record<CreditAction, number>;
  tierCounts: Record<1 | 2 | 3 | 4, number>;
}

export interface ApplicationRecord {
  companyName: string;
  companyId: string;
  companyIdentityNote: string;
  arr: number;
  behavioralConsent: boolean;
  submissionDate: string;
  capitalReadyScore: number;
  tier: 1 | 2 | 3 | 4;
  advanceRate: number;
}

export interface BehavioralRecord {
  companyId: string;
  companyIdentityNote: string;
  weekStart: string;
  acceptanceRate: number;
  sessionCount: number;
  sessionDurationChangePct: number;
  activeUsers: number;
  eventsPerSession: number;
  championUserRate: number;
  dataSources: string[];
}

export interface FinancialMetricRecord {
  companyId: string;
  companyIdentityNote: string;
  weekStart: string;
  grossRevenue: number;
  netRevenue: number;
  mrr: number;
  arr: number;
  mrrChangePct: number;
  cancellationRate: number;
  activeCustomers: number;
  topCustomerConcentration: number;
  capitalReadyScore: number;
  tier: 1 | 2 | 3 | 4;
  advanceRate: number;
  creditAction: CreditAction;
}

export interface DashboardData {
  latestScores: ScoreRecord[];
  trendRecords: TrendRecord[];
  applicationRecords: ApplicationRecord[];
  behavioralRecords: BehavioralRecord[];
  financialMetrics: FinancialMetricRecord[];
  summary: DashboardSummary;
}
