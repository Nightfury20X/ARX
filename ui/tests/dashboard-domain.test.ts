import { describe, expect, it } from "vitest";

import {
  buildPortfolioSummary,
  calculateAdvanceAmount,
  calculateBehavioralLift,
  getScoreTone,
  getWeakestSignals
} from "@/lib/domain/dashboard";
import { mapScoreRow, mapTrendRow } from "@/lib/data/csv-dashboard-repository";
import type { ScoreRecord } from "@/types/dashboard";

const baseRow = {
  company_id: "arx_001",
  company_identity_note: "Synthetic borrower bucket",
  scoring_date: "2011-12-05",
  capital_ready_score: "89.5",
  composite_risk_score_legacy: "10.5",
  final_tier: "1",
  final_credit_action: "Advance eligible",
  final_advance_rate: "0.875",
  ml_bad_outcome_probability_8w: "0.12",
  output_acceptance_score: "92",
  engagement_score: "75",
  retention_score: "45",
  concentration_score: "18",
  sentiment_score: "",
  arr: "450000",
  mrr: "37500",
  advance_rate_applied: "0.875",
  data_sources: "uci_retail_proxy,synthetic_behavior"
};

describe("dashboard data normalization", () => {
  it("maps latest-score CSV rows to the UI contract", () => {
    const record = mapScoreRow(baseRow);

    expect(record.companyId).toBe("arx_001");
    expect(record.capitalReadyScore).toBe(89.5);
    expect(record.legacyRiskScore).toBe(10.5);
    expect(record.tier).toBe(1);
    expect(record.creditAction).toBe("Advance eligible");
    expect(record.sentimentScore).toBeNull();
    expect(record.dataSources).toEqual(["uci_retail_proxy", "synthetic_behavior"]);
  });

  it("maps trend rows with week_start for chart rendering", () => {
    const trendRecord = mapTrendRow({ ...baseRow, week_start: "2011-11-21" });

    expect(trendRecord.weekStart).toBe("2011-11-21");
    expect(trendRecord.capitalReadyScore).toBe(89.5);
  });
});

describe("dashboard business logic", () => {
  it("uses capital-ready score as higher-is-healthier", () => {
    expect(getScoreTone(90)).toBe("green");
    expect(getScoreTone(70)).toBe("amber");
    expect(getScoreTone(40)).toBe("red");
  });

  it("finds the two weakest non-null signals", () => {
    const record = mapScoreRow(baseRow);
    const weakest = getWeakestSignals(record);

    expect(weakest.map((signal) => signal.label)).toEqual([
      "Concentration",
      "Retention"
    ]);
  });

  it("calculates current advance from six months of ARR and company advance rate", () => {
    expect(calculateAdvanceAmount(450000, 0.875)).toBe(196875);
    expect(calculateAdvanceAmount(450000, 0)).toBe(0);
    expect(calculateAdvanceAmount(-1, 0.875)).toBe(0);
  });

  it("calculates behavioral lift comparison from fixed baseline and Tier 1 rates", () => {
    const lift = calculateBehavioralLift(450000);

    expect(lift.withoutBehavioral).toBe(129375);
    expect(lift.withBehavioral).toBe(196875);
    expect(lift.lift).toBe(67500);
  });

  it("summarizes portfolio KPIs", () => {
    const records: ScoreRecord[] = [
      mapScoreRow(baseRow),
      mapScoreRow({
        ...baseRow,
        company_id: "arx_002",
        capital_ready_score: "58",
        final_tier: "3",
        final_credit_action: "Review",
        final_advance_rate: "0.575",
        arr: "100000",
        mrr: "8333.33"
      })
    ];

    const summary = buildPortfolioSummary(records);

    expect(summary.companyCount).toBe(2);
    expect(summary.actionCounts["Advance eligible"]).toBe(1);
    expect(summary.actionCounts.Review).toBe(1);
    expect(summary.tierCounts[1]).toBe(1);
    expect(summary.tierCounts[3]).toBe(1);
    expect(summary.totalArr).toBe(550000);
  });
});
