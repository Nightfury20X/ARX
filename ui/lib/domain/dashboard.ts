import type {
  CreditAction,
  DashboardSummary,
  ScoreRecord,
  SignalScore,
  TrendRecord
} from "@/types/dashboard";

export const CREDIT_ACTIONS: CreditAction[] = [
  "Advance eligible",
  "Monitor",
  "Review",
  "Declined"
];

export const TIER_LABELS: Record<1 | 2 | 3 | 4, string> = {
  1: "Tier 1 - Advance eligible",
  2: "Tier 2 - Monitor",
  3: "Tier 3 - Review",
  4: "Tier 4 - Declined"
};

export const ACTION_TONE: Record<CreditAction, "green" | "amber" | "red" | "blue"> = {
  "Advance eligible": "green",
  Monitor: "blue",
  Review: "amber",
  Declined: "red"
};

export function currency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(Number.isFinite(value) ? value : 0);
}

export function percent(value: number, maximumFractionDigits = 1): string {
  return new Intl.NumberFormat("en-US", {
    style: "percent",
    maximumFractionDigits
  }).format(Number.isFinite(value) ? value : 0);
}

export function formatScore(value: number): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 1
  }).format(Number.isFinite(value) ? value : 0);
}

export function getSignals(record: ScoreRecord): SignalScore[] {
  return [
    {
      key: "outputAcceptance",
      label: "Output acceptance",
      description: "Did users keep what the AI produced, or regenerate and walk away?",
      value: record.outputAcceptanceScore
    },
    {
      key: "engagement",
      label: "Engagement",
      description: "Session depth and product usage momentum.",
      value: record.engagementScore
    },
    {
      key: "retention",
      label: "Retention",
      description: "MRR trend and champion-user durability.",
      value: record.retentionScore
    },
    {
      key: "concentration",
      label: "Concentration",
      description: "Customer concentration risk in the revenue base.",
      value: record.concentrationScore
    },
    {
      key: "sentiment",
      label: "Sentiment",
      description: "NLP frustration signal. This can be unavailable in Phase 1.",
      value: record.sentimentScore
    }
  ];
}

export function getWeakestSignals(record: ScoreRecord, count = 2): SignalScore[] {
  return getSignals(record)
    .filter((signal): signal is SignalScore & { value: number } => signal.value !== null)
    .sort((a, b) => a.value - b.value)
    .slice(0, count);
}

export function calculateAdvanceAmount(arr: number, advanceRate: number): number {
  if (!Number.isFinite(arr) || arr <= 0 || !Number.isFinite(advanceRate) || advanceRate <= 0) {
    return 0;
  }
  return roundMoney((arr / 2) * advanceRate);
}

export function calculateBehavioralLift(arr: number): {
  withoutBehavioral: number;
  withBehavioral: number;
  lift: number;
} {
  const normalizedArr = Number.isFinite(arr) && arr > 0 ? arr : 0;
  const sixMonthValue = normalizedArr / 2;
  const withoutBehavioral = roundMoney(sixMonthValue * 0.575);
  const withBehavioral = roundMoney(sixMonthValue * 0.875);
  return {
    withoutBehavioral,
    withBehavioral,
    lift: roundMoney(withBehavioral - withoutBehavioral)
  };
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function getScoreTone(score: number): "green" | "amber" | "red" {
  if (score >= 85) {
    return "green";
  }
  if (score >= 55) {
    return "amber";
  }
  return "red";
}

export function buildPortfolioSummary(records: ScoreRecord[]): DashboardSummary {
  const actionCounts = Object.fromEntries(CREDIT_ACTIONS.map((action) => [action, 0])) as Record<
    CreditAction,
    number
  >;
  const tierCounts: Record<1 | 2 | 3 | 4, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };

  const totals = records.reduce(
    (acc, record) => {
      acc.score += record.capitalReadyScore;
      acc.arr += record.arr;
      acc.mrr += record.mrr;
      actionCounts[record.creditAction] += 1;
      tierCounts[record.tier] += 1;
      return acc;
    },
    { score: 0, arr: 0, mrr: 0 }
  );

  return {
    companyCount: records.length,
    averageCapitalReadyScore: records.length ? totals.score / records.length : 0,
    totalArr: totals.arr,
    totalMrr: totals.mrr,
    actionCounts,
    tierCounts
  };
}

export function sortTrend(records: TrendRecord[]): TrendRecord[] {
  return [...records].sort((a, b) => a.weekStart.localeCompare(b.weekStart));
}
