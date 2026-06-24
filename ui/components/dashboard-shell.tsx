"use client";

import {
  Activity,
  ArrowDownUp,
  BarChart3,
  CircleDollarSign,
  Database,
  Gauge,
  LineChart as LineChartIcon,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingUp
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import {
  ACTION_TONE,
  TIER_LABELS,
  calculateAdvanceAmount,
  calculateBehavioralLift,
  currency,
  formatScore,
  getScoreTone,
  getSignals,
  getWeakestSignals,
  percent,
  sortTrend
} from "@/lib/domain/dashboard";
import type { CreditAction, DashboardData, ScoreRecord, TrendRecord } from "@/types/dashboard";

type SortKey =
  | "companyId"
  | "capitalReadyScore"
  | "tier"
  | "creditAction"
  | "arr"
  | "mrr"
  | "badOutcomeProbability8w";

const SORT_LABELS: Record<SortKey, string> = {
  companyId: "Company",
  capitalReadyScore: "Score",
  tier: "Tier",
  creditAction: "Action",
  arr: "ARR",
  mrr: "MRR",
  badOutcomeProbability8w: "8w risk"
};

const ACTION_FILTERS: Array<CreditAction | "All"> = [
  "All",
  "Advance eligible",
  "Monitor",
  "Review",
  "Declined"
];

interface DashboardShellProps {
  data: DashboardData;
}

export function DashboardShell({ data }: DashboardShellProps) {
  const [selectedCompanyId, setSelectedCompanyId] = useState(
    data.latestScores[0]?.companyId ?? ""
  );
  const [query, setQuery] = useState("");
  const [actionFilter, setActionFilter] = useState<CreditAction | "All">("All");
  const [sortKey, setSortKey] = useState<SortKey>("capitalReadyScore");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const selectedCompany =
    data.latestScores.find((record) => record.companyId === selectedCompanyId) ??
    data.latestScores[0];

  const filteredScores = useMemo(() => {
    const loweredQuery = query.trim().toLowerCase();
    return [...data.latestScores]
      .filter((record) => {
        const matchesQuery =
          !loweredQuery ||
          record.companyId.toLowerCase().includes(loweredQuery) ||
          record.creditAction.toLowerCase().includes(loweredQuery);
        const matchesAction =
          actionFilter === "All" || record.creditAction === actionFilter;
        return matchesQuery && matchesAction;
      })
      .sort((a, b) => {
        const aValue = a[sortKey];
        const bValue = b[sortKey];
        const direction = sortDirection === "asc" ? 1 : -1;
        if (typeof aValue === "number" && typeof bValue === "number") {
          return (aValue - bValue) * direction;
        }
        return String(aValue).localeCompare(String(bValue)) * direction;
      });
  }, [actionFilter, data.latestScores, query, sortDirection, sortKey]);

  const selectedTrend = useMemo(() => {
    if (!selectedCompany) {
      return [];
    }
    return sortTrend(
      data.trendRecords.filter((record) => record.companyId === selectedCompany.companyId)
    );
  }, [data.trendRecords, selectedCompany]);

  if (!selectedCompany) {
    return (
      <main className="dashboard-shell flex min-h-screen items-center justify-center px-6">
        <section className="max-w-xl rounded-lg border border-arx-line bg-arx-panel p-8 text-center shadow-arx-card">
          <Database className="mx-auto h-9 w-9 text-arx-blue" />
          <h1 className="mt-4 text-2xl font-bold">No dashboard data found</h1>
          <p className="mt-3 text-sm leading-6 text-arx-muted">
            The UI expects dashboard CSV files at ../handoff. Add the latest score
            and trend CSVs to render the dashboard.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="dashboard-shell">
      <TopBar />
      <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <Hero summaryDate={selectedCompany.scoringDate} />
        <KpiGrid data={data} />

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_430px]">
          <div className="flex min-w-0 flex-col gap-6">
            <CompanyControls
              actionFilter={actionFilter}
              query={query}
              setActionFilter={setActionFilter}
              setQuery={setQuery}
              sortDirection={sortDirection}
              sortKey={sortKey}
              setSortDirection={setSortDirection}
              setSortKey={setSortKey}
            />
            <CompanyTable
              records={filteredScores}
              selectedCompanyId={selectedCompany.companyId}
              onSelect={setSelectedCompanyId}
              sortKey={sortKey}
              sortDirection={sortDirection}
              setSortDirection={setSortDirection}
              setSortKey={setSortKey}
            />
            <TrendPanel company={selectedCompany} trend={selectedTrend} />
          </div>

          <aside className="flex min-w-0 flex-col gap-6">
            <ScoreCard company={selectedCompany} />
            <SignalBreakdown company={selectedCompany} />
            <AdvanceSimulator company={selectedCompany} />
          </aside>
        </section>
      </div>
    </main>
  );
}

function TopBar() {
  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-arx-ink/88 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1500px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-arx-blue/50 bg-arx-blue/20 text-sm font-bold text-white">
            ARX
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">AI Revenue Exchange</p>
            <p className="truncate text-xs text-arx-muted">Founder intelligence dashboard</p>
          </div>
        </div>
        <div className="hidden items-center gap-2 md:flex">
          <Badge tone="blue">CSV handoff</Badge>
          <Badge tone="green">Capital-ready score</Badge>
          <Badge tone="amber">Demo data</Badge>
        </div>
      </div>
    </header>
  );
}

function Hero({ summaryDate }: { summaryDate: string }) {
  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.03] p-5 shadow-arx-card sm:p-6">
      <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 rounded-full border border-arx-blue/40 bg-arx-blue/15 px-3 py-1 text-xs font-medium text-blue-100">
            <Sparkles className="h-3.5 w-3.5" />
            ARX Intelligence dashboard - score, signals, trends, and advance guidance
          </div>
          <h1 className="mt-4 max-w-4xl text-3xl font-bold tracking-normal text-white sm:text-4xl lg:text-5xl">
            Capital readiness for AI companies, updated from ARX scoring signals.
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-arx-muted sm:text-base">
            This MVP reads ARX scoring data, ranks synthetic borrower buckets by
            capital-ready score, and turns the score into founder-facing advance
            guidance.
          </p>
        </div>
        <div className="rounded-lg border border-arx-line bg-arx-panel p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-arx-muted">Last score date</p>
          <p className="mt-2 text-2xl font-bold text-white">{summaryDate || "Unavailable"}</p>
          <p className="mt-2 max-w-xs text-xs leading-5 text-arx-muted">
            Synthetic UCI Retail proxy data. Not live Stripe, Mixpanel, or Amplitude data.
          </p>
        </div>
      </div>
    </section>
  );
}

function KpiGrid({ data }: { data: DashboardData }) {
  const cards = [
    {
      label: "Companies scored",
      value: data.summary.companyCount.toLocaleString(),
      detail: "Latest portfolio records",
      icon: Database
    },
    {
      label: "Average capital-ready",
      value: formatScore(data.summary.averageCapitalReadyScore),
      detail: "Higher score is healthier",
      icon: Gauge
    },
    {
      label: "Advance eligible",
      value: data.summary.actionCounts["Advance eligible"].toLocaleString(),
      detail: "Tier 1 companies",
      icon: ShieldCheck
    },
    {
      label: "Portfolio ARR",
      value: currency(data.summary.totalArr),
      detail: "Synthetic financial proxy",
      icon: CircleDollarSign
    }
  ];

  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div key={card.label} className="rounded-lg border border-arx-line bg-arx-panel p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-arx-muted">{card.label}</p>
              <Icon className="h-5 w-5 text-arx-cyan" />
            </div>
            <p className="mt-3 truncate text-3xl font-bold text-white">{card.value}</p>
            <p className="mt-2 text-xs text-arx-muted">{card.detail}</p>
          </div>
        );
      })}
    </section>
  );
}

function CompanyControls({
  actionFilter,
  query,
  setActionFilter,
  setQuery,
  sortDirection,
  sortKey,
  setSortDirection,
  setSortKey
}: {
  actionFilter: CreditAction | "All";
  query: string;
  setActionFilter: (value: CreditAction | "All") => void;
  setQuery: (value: string) => void;
  sortDirection: "asc" | "desc";
  sortKey: SortKey;
  setSortDirection: (value: "asc" | "desc") => void;
  setSortKey: (value: SortKey) => void;
}) {
  return (
    <section className="rounded-lg border border-arx-line bg-arx-panel p-4">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_220px]">
        <label className="relative min-w-0">
          <span className="sr-only">Search companies</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-arx-muted" />
          <input
            className="h-11 w-full rounded-lg border border-arx-line bg-arx-ink px-10 text-sm text-white outline-none transition focus:border-arx-blue"
            placeholder="Search company or action"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <select
          className="h-11 rounded-lg border border-arx-line bg-arx-ink px-3 text-sm text-white outline-none transition focus:border-arx-blue"
          value={actionFilter}
          onChange={(event) => setActionFilter(event.target.value as CreditAction | "All")}
        >
          {ACTION_FILTERS.map((action) => (
            <option key={action} value={action}>
              {action === "All" ? "All credit actions" : action}
            </option>
          ))}
        </select>
        <div className="flex gap-2">
          <select
            className="h-11 min-w-0 flex-1 rounded-lg border border-arx-line bg-arx-ink px-3 text-sm text-white outline-none transition focus:border-arx-blue"
            value={sortKey}
            onChange={(event) => setSortKey(event.target.value as SortKey)}
          >
            {Object.entries(SORT_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                Sort by {label}
              </option>
            ))}
          </select>
          <button
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-arx-line bg-arx-ink text-arx-muted transition hover:border-arx-blue hover:text-white"
            type="button"
            aria-label="Toggle sort direction"
            onClick={() => setSortDirection(sortDirection === "asc" ? "desc" : "asc")}
          >
            <ArrowDownUp className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  );
}

function CompanyTable({
  records,
  selectedCompanyId,
  onSelect,
  sortKey,
  sortDirection,
  setSortDirection,
  setSortKey
}: {
  records: ScoreRecord[];
  selectedCompanyId: string;
  onSelect: (companyId: string) => void;
  sortKey: SortKey;
  sortDirection: "asc" | "desc";
  setSortDirection: (value: "asc" | "desc") => void;
  setSortKey: (value: SortKey) => void;
}) {
  const headers: Array<{ key: SortKey; label: string; align?: "right" }> = [
    { key: "companyId", label: "Company" },
    { key: "capitalReadyScore", label: "Score", align: "right" },
    { key: "tier", label: "Tier", align: "right" },
    { key: "creditAction", label: "Action" },
    { key: "arr", label: "ARR", align: "right" },
    { key: "mrr", label: "MRR", align: "right" },
    { key: "badOutcomeProbability8w", label: "8w risk", align: "right" }
  ];

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
      return;
    }
    setSortKey(key);
    setSortDirection(key === "companyId" || key === "creditAction" ? "asc" : "desc");
  }

  return (
    <section className="overflow-hidden rounded-lg border border-arx-line bg-arx-panel">
      <div className="flex items-center justify-between gap-3 border-b border-arx-line px-4 py-4">
        <div>
          <h2 className="text-base font-semibold text-white">Latest score records</h2>
          <p className="mt-1 text-xs text-arx-muted">
            {records.length} matching companies from dashboard scoring data
          </p>
        </div>
        <BarChart3 className="h-5 w-5 text-arx-cyan" />
      </div>
      <div className="table-scroll max-h-[520px] overflow-auto">
        <table className="w-full min-w-[920px] border-collapse text-left text-sm">
          <thead className="sticky top-0 z-10 bg-arx-panel2 text-xs uppercase tracking-[0.12em] text-arx-muted">
            <tr>
              {headers.map((header) => (
                <th
                  key={header.key}
                  className={`border-b border-arx-line px-4 py-3 font-semibold ${
                    header.align === "right" ? "text-right" : ""
                  }`}
                >
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 text-inherit transition hover:text-white"
                    onClick={() => toggleSort(header.key)}
                  >
                    {header.label}
                    {sortKey === header.key ? (
                      <span aria-hidden="true">{sortDirection === "asc" ? "↑" : "↓"}</span>
                    ) : null}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {records.map((record) => (
              <tr
                key={record.companyId}
                className={`border-b border-arx-line/70 transition hover:bg-white/[0.04] ${
                  record.companyId === selectedCompanyId ? "bg-arx-blue/10" : ""
                }`}
              >
                <td className="px-4 py-3">
                  <button
                    type="button"
                    className="font-semibold text-white underline-offset-4 hover:underline"
                    onClick={() => onSelect(record.companyId)}
                  >
                    {record.companyId}
                  </button>
                  <p className="mt-1 max-w-[260px] truncate text-xs text-arx-muted">
                    {record.companyIdentityNote}
                  </p>
                </td>
                <td className="px-4 py-3 text-right font-bold text-white">
                  {formatScore(record.capitalReadyScore)}
                </td>
                <td className="px-4 py-3 text-right">{record.tier}</td>
                <td className="px-4 py-3">
                  <Badge tone={ACTION_TONE[record.creditAction]}>
                    {record.creditAction}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-right">{currency(record.arr)}</td>
                <td className="px-4 py-3 text-right">{currency(record.mrr)}</td>
                <td className="px-4 py-3 text-right">
                  {percent(record.badOutcomeProbability8w)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ScoreCard({ company }: { company: ScoreRecord }) {
  const tone = getScoreTone(company.capitalReadyScore);
  const color =
    tone === "green" ? "#22c55e" : tone === "amber" ? "#f59e0b" : "#ef4444";
  const scorePct = Math.max(0, Math.min(100, company.capitalReadyScore));

  return (
    <section className="rounded-lg border border-arx-line bg-arx-panel p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.18em] text-arx-muted">
            Selected company
          </p>
          <h2 className="mt-2 truncate text-2xl font-bold text-white">{company.companyId}</h2>
          <p className="mt-1 text-xs text-arx-muted">Last updated {company.scoringDate}</p>
        </div>
        <Badge tone={ACTION_TONE[company.creditAction]}>{company.creditAction}</Badge>
      </div>

      <div className="mt-6 grid gap-5 sm:grid-cols-[150px_1fr] sm:items-center xl:grid-cols-1 2xl:grid-cols-[150px_1fr]">
        <div
          className="grid h-[150px] w-[150px] place-items-center rounded-full"
          style={{
            background: `conic-gradient(${color} ${scorePct * 3.6}deg, rgba(148,163,184,0.18) 0deg)`
          }}
          aria-label={`Capital-ready score ${formatScore(company.capitalReadyScore)}`}
        >
          <div className="grid h-[116px] w-[116px] place-items-center rounded-full bg-arx-panel">
            <div className="text-center">
              <p className="text-4xl font-bold text-white">
                {formatScore(company.capitalReadyScore)}
              </p>
              <p className="text-xs text-arx-muted">capital-ready</p>
            </div>
          </div>
        </div>

        <div className="min-w-0 space-y-3">
          <MetricLine label="Tier" value={TIER_LABELS[company.tier]} />
          <MetricLine label="Advance rate" value={percent(company.advanceRate)} />
          <MetricLine label="ARR" value={currency(company.arr)} />
          <MetricLine label="MRR" value={currency(company.mrr)} />
          <MetricLine
            label="8-week bad-outcome probability"
            value={percent(company.badOutcomeProbability8w)}
          />
          <MetricLine label="Legacy risk score" value={formatScore(company.legacyRiskScore)} />
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {company.dataSources.map((source) => (
          <Badge key={source} tone="blue">
            {source}
          </Badge>
        ))}
      </div>
    </section>
  );
}

function SignalBreakdown({ company }: { company: ScoreRecord }) {
  const signals = getSignals(company);
  const weakest = getWeakestSignals(company);
  const recommendation =
    weakest.length > 0
      ? `Improve ${weakest.map((signal) => signal.label.toLowerCase()).join(" and ")} to move closer to Tier 1 terms.`
      : "No signal guidance is available for this record.";

  return (
    <section className="rounded-lg border border-arx-line bg-arx-panel p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-white">Five-signal breakdown</h2>
          <p className="mt-1 text-xs text-arx-muted">Higher sub-scores are healthier.</p>
        </div>
        <Activity className="h-5 w-5 text-arx-cyan" />
      </div>

      <div className="mt-5 space-y-4">
        {signals.map((signal) => (
          <div key={signal.key}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-white">{signal.label}</p>
                <p className="mt-1 text-xs leading-5 text-arx-muted">{signal.description}</p>
              </div>
              <p className="shrink-0 text-sm font-bold text-white">
                {signal.value === null ? "Coming soon" : formatScore(signal.value)}
              </p>
            </div>
            <div className="mt-2 h-2 rounded-full bg-white/10">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-arx-blue to-arx-cyan"
                style={{ width: `${signal.value === null ? 8 : Math.max(0, Math.min(100, signal.value))}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-lg border border-arx-amber/30 bg-arx-amber/10 p-4">
        <p className="text-sm font-semibold text-amber-100">Recommended focus</p>
        <p className="mt-1 text-sm leading-6 text-amber-50/80">{recommendation}</p>
      </div>
    </section>
  );
}

function AdvanceSimulator({ company }: { company: ScoreRecord }) {
  const [arrInput, setArrInput] = useState(String(Math.round(company.arr)));
  useEffect(() => {
    setArrInput(String(Math.round(company.arr)));
  }, [company.arr, company.companyId]);

  const parsedArr = Number(arrInput.replace(/,/g, ""));
  const currentAdvance = calculateAdvanceAmount(parsedArr, company.advanceRate);
  const lift = calculateBehavioralLift(parsedArr);

  return (
    <section className="rounded-lg border border-arx-blue/35 bg-arx-panel p-5 shadow-arx-blue">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-white">Advance Amount Simulator</h2>
          <p className="mt-1 text-xs text-arx-muted">Updates instantly as ARR changes.</p>
        </div>
        <TrendingUp className="h-5 w-5 text-arx-cyan" />
      </div>

      <label className="mt-5 block">
        <span className="text-xs uppercase tracking-[0.16em] text-arx-muted">
          Annual recurring revenue
        </span>
        <input
          className="mt-2 h-12 w-full rounded-lg border border-arx-line bg-arx-ink px-3 text-xl font-bold text-white outline-none transition focus:border-arx-blue"
          inputMode="numeric"
          value={arrInput}
          onChange={(event) => setArrInput(event.target.value)}
        />
      </label>

      <div className="mt-5 rounded-lg border border-arx-line bg-arx-ink p-4">
        <p className="text-xs uppercase tracking-[0.16em] text-arx-muted">
          Current estimated advance
        </p>
        <p className="mt-2 text-4xl font-bold text-white">{currency(currentAdvance)}</p>
        <p className="mt-2 text-xs leading-5 text-arx-muted">
          Based on {TIER_LABELS[company.tier]} at {percent(company.advanceRate)} of six
          months of ARR.
        </p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-arx-line bg-white/[0.03] p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-arx-muted">
            Without behavioral signals
          </p>
          <p className="mt-2 text-2xl font-bold text-white">
            {currency(lift.withoutBehavioral)}
          </p>
          <p className="mt-1 text-xs text-arx-muted">57.5% baseline midpoint</p>
        </div>
        <div className="rounded-lg border border-arx-blue/45 bg-arx-blue/10 p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-blue-100">
            With behavioral signals
          </p>
          <p className="mt-2 text-2xl font-bold text-white">{currency(lift.withBehavioral)}</p>
          <p className="mt-1 text-xs text-blue-100/80">87.5% Tier 1 midpoint</p>
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-arx-green/30 bg-arx-green/10 p-4">
        <p className="text-sm font-semibold text-green-100">
          Behavioral-data lift: {currency(lift.lift)}
        </p>
        <p className="mt-1 text-xs leading-5 text-green-50/80">
          The business-plan conversion moment is showing founders how much more their
          contracts can unlock when ARX can read product-health signals.
        </p>
      </div>
    </section>
  );
}

function TrendPanel({
  company,
  trend
}: {
  company: ScoreRecord;
  trend: TrendRecord[];
}) {
  const chartData = trend.map((record) => ({
    week: record.weekStart.slice(5),
    score: record.capitalReadyScore,
    risk: Math.round(record.badOutcomeProbability8w * 100)
  }));

  return (
    <section className="rounded-lg border border-arx-line bg-arx-panel p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-white">8-week capital-ready trend</h2>
          <p className="mt-1 text-xs text-arx-muted">
            {company.companyId} historical records from dashboard trend data.
          </p>
        </div>
        <LineChartIcon className="h-5 w-5 text-arx-cyan" />
      </div>

      {chartData.length > 0 ? (
        <div className="mt-5 h-[310px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 14, left: -12, bottom: 0 }}>
              <CartesianGrid stroke="rgba(148,163,184,0.14)" vertical={false} />
              <XAxis
                dataKey="week"
                minTickGap={16}
                tick={{ fill: "#94a3b8", fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: "rgba(148,163,184,0.18)" }}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fill: "#94a3b8", fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: "#0d1626",
                  border: "1px solid #22314d",
                  borderRadius: 8,
                  color: "#f8fafc"
                }}
              />
              <Line
                type="monotone"
                dataKey="score"
                name="Capital-ready score"
                stroke="#38bdf8"
                strokeWidth={3}
                dot={{ r: 4, strokeWidth: 2, fill: "#05070d" }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="risk"
                name="Bad-outcome risk %"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="mt-5 rounded-lg border border-arx-line bg-arx-ink p-6 text-sm text-arx-muted">
          Trend rows are not available for this company yet. The latest score still renders.
        </div>
      )}
    </section>
  );
}

function MetricLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-2 last:border-b-0">
      <span className="min-w-0 text-sm text-arx-muted">{label}</span>
      <span className="shrink-0 text-right text-sm font-semibold text-white">{value}</span>
    </div>
  );
}

function Badge({
  children,
  tone
}: {
  children: React.ReactNode;
  tone: "green" | "amber" | "red" | "blue";
}) {
  const classes = {
    green: "border-arx-green/35 bg-arx-green/10 text-green-100",
    amber: "border-arx-amber/35 bg-arx-amber/10 text-amber-100",
    red: "border-arx-red/35 bg-arx-red/10 text-red-100",
    blue: "border-arx-blue/35 bg-arx-blue/10 text-blue-100"
  };

  return (
    <span
      className={`inline-flex max-w-full items-center rounded-full border px-2.5 py-1 text-xs font-medium ${classes[tone]}`}
    >
      <span className="truncate">{children}</span>
    </span>
  );
}
