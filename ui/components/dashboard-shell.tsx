"use client";

import {
  Activity,
  ArrowRight,
  ArrowDownUp,
  BarChart3,
  CheckCircle2,
  CircleDollarSign,
  ClipboardList,
  Database,
  Gauge,
  LineChart as LineChartIcon,
  LockKeyhole,
  Network,
  Rocket,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  WalletCards,
  Zap
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
import type {
  ApplicationRecord,
  CreditAction,
  DashboardData,
  ScoreRecord,
  TrendRecord
} from "@/types/dashboard";

type SortKey =
  | "companyName"
  | "capitalReadyScore"
  | "tier"
  | "creditAction"
  | "arr"
  | "mrr"
  | "badOutcomeProbability8w";

const SORT_LABELS: Record<SortKey, string> = {
  companyName: "Company",
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
          record.companyName.toLowerCase().includes(loweredQuery) ||
          record.companyCategory.toLowerCase().includes(loweredQuery) ||
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
      <ProductHero data={data} selectedCompany={selectedCompany} />
      <JudgeProof data={data} />
      <MarketAndBusinessModel data={data} />
      <DataFlowShowcase />
      <ScoringIntelligence />

      <section id="dashboard" className="scroll-mt-24 border-t border-white/10 bg-arx-ink/35">
        <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-6 px-4 py-10 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Live product"
            title="Founder dashboard and advance simulator"
            description="The proof is not a slide. Judges can inspect scored companies, sort the portfolio, select a borrower bucket, review signal breakdowns, and change ARR in the simulator."
          />
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
      </section>

      <ApplicationWorkflow applications={data.applicationRecords} />
      <PresentationReadiness data={data} />
    </main>
  );
}

function TopBar() {
  const navItems = [
    { href: "#product", label: "Product" },
    { href: "#market", label: "Model" },
    { href: "#pipeline", label: "Pipeline" },
    { href: "#dashboard", label: "Dashboard" },
    { href: "#apply", label: "Apply" }
  ];

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
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Presentation sections">
          {navItems.map((item) => (
            <a
              key={item.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-arx-muted transition hover:bg-white/5 hover:text-white"
              href={item.href}
            >
              {item.label}
            </a>
          ))}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          <Badge tone="green">Live demo</Badge>
          <Badge tone="amber">Proxy data</Badge>
        </div>
      </div>
    </header>
  );
}

function ProductHero({
  data,
  selectedCompany
}: {
  data: DashboardData;
  selectedCompany: ScoreRecord;
}) {
  const currentAdvance = calculateAdvanceAmount(selectedCompany.arr, selectedCompany.advanceRate);
  const consentedApplications = data.applicationRecords.filter(
    (record) => record.behavioralConsent
  ).length;
  const averageAcceptanceRate = average(
    data.behavioralRecords.map((record) => record.acceptanceRate)
  );

  return (
    <section
      id="product"
      className="relative isolate overflow-hidden border-b border-white/10"
    >
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(120deg,rgba(5,7,13,0.98)_0%,rgba(8,17,31,0.84)_50%,rgba(37,99,235,0.22)_100%)]" />
      <ProductScene data={data} selectedCompany={selectedCompany} />
      <div className="mx-auto grid min-h-[560px] max-w-[1500px] items-center gap-8 px-4 py-16 sm:px-6 lg:grid-cols-[minmax(0,1fr)_520px] lg:px-8">
        <div className="max-w-4xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-arx-blue/40 bg-arx-blue/15 px-3 py-1 text-xs font-medium text-blue-100">
            <Sparkles className="h-3.5 w-3.5" />
            AI Revenue Exchange
          </div>
          <h1 className="mt-5 text-4xl font-bold tracking-normal text-white sm:text-5xl lg:text-6xl">
            Capital for AI software companies, underwritten by product-health intelligence.
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-arx-muted sm:text-lg">
            ARX advances cash against subscription contracts and monitors aggregate
            product signals every week, so repayment risk is visible before it reaches
            stale financial statements.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <a
              className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-arx-blue px-5 text-sm font-semibold text-white transition hover:bg-blue-500"
              href="#dashboard"
            >
              View live dashboard
              <ArrowRight className="h-4 w-4" />
            </a>
            <a
              className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/5 px-5 text-sm font-semibold text-white transition hover:border-arx-cyan hover:bg-white/10"
              href="#pipeline"
            >
              See underwriting flow
              <Network className="h-4 w-4" />
            </a>
          </div>
        </div>

        <div className="grid gap-3 rounded-lg border border-white/12 bg-arx-ink/75 p-4 shadow-arx-card backdrop-blur">
          <div className="grid gap-3 sm:grid-cols-2">
            <HeroMetric label="Scored companies" value={data.summary.companyCount.toString()} />
            <HeroMetric label="Demo applications" value={data.applicationRecords.length.toString()} />
            <HeroMetric label="Current advance" value={currency(currentAdvance)} />
            <HeroMetric label="Consent rate" value={percent(consentedApplications / Math.max(1, data.applicationRecords.length), 0)} />
          </div>
          <div className="rounded-lg border border-arx-line bg-arx-panel p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-arx-muted">
                  Behavioral signal sample
                </p>
                <p className="mt-2 text-2xl font-bold text-white">
                  {percent(averageAcceptanceRate)}
                </p>
              </div>
              <Zap className="h-8 w-8 text-arx-cyan" />
            </div>
            <p className="mt-3 text-xs leading-5 text-arx-muted">
              Average output-acceptance proxy across the demo behavioral connector file.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function ProductScene({
  data,
  selectedCompany
}: {
  data: DashboardData;
  selectedCompany: ScoreRecord;
}) {
  const bars = getSignals(selectedCompany).slice(0, 4);

  return (
    <div
      className="pointer-events-none absolute bottom-8 right-4 hidden w-[560px] opacity-40 lg:block xl:right-14"
      aria-hidden="true"
    >
      <div className="grid gap-3 rounded-lg border border-white/12 bg-arx-panel/80 p-4 shadow-arx-blue">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-arx-muted">ARX score room</p>
            <p className="mt-1 text-xl font-bold text-white">{selectedCompany.companyName}</p>
            <p className="mt-1 text-xs text-arx-muted">Trace ID {selectedCompany.companyId}</p>
          </div>
          <div className="rounded-full border border-arx-green/40 bg-arx-green/10 px-3 py-1 text-xs font-semibold text-green-100">
            {formatScore(selectedCompany.capitalReadyScore)}
          </div>
        </div>
        <div className="grid gap-2">
          {bars.map((signal) => (
            <div key={signal.key} className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-medium text-white">{signal.label}</span>
                <span className="text-xs text-arx-muted">
                  {signal.value === null ? "Pending" : formatScore(signal.value)}
                </span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-white/10">
                <div
                  className="h-2 rounded-full bg-gradient-to-r from-arx-blue to-arx-cyan"
                  style={{
                    width: `${signal.value === null ? 8 : Math.max(0, Math.min(100, signal.value))}%`
                  }}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2">
          <SceneChip label="ARR" value={currency(selectedCompany.arr)} />
          <SceneChip label="Portfolio" value={currency(data.summary.totalArr)} />
          <SceneChip label="8w risk" value={percent(selectedCompany.badOutcomeProbability8w)} />
        </div>
      </div>
    </div>
  );
}

function JudgeProof({ data }: { data: DashboardData }) {
  const proofCards = [
    {
      icon: CheckCircle2,
      label: "Customer validation",
      value: "Problem-led",
      detail:
        "ARX is built around a clear founder pain: AI companies need non-dilutive capital before banks understand their product health."
    },
    {
      icon: Rocket,
      label: "Execution",
      value: `${data.summary.companyCount} records`,
      detail:
        "The live demo reads local scoring, trend, behavioral, financial, and application handoff files from the repo."
    },
    {
      icon: WalletCards,
      label: "Business potential",
      value: "3 revenue streams",
      detail:
        "Interest spread, origination fees, and ARX Intelligence SaaS create lender revenue plus software margin."
    }
  ];

  return (
    <section className="border-b border-white/10 bg-arx-navy/70">
      <div className="mx-auto grid max-w-[1500px] gap-4 px-4 py-8 sm:px-6 lg:grid-cols-3 lg:px-8">
        {proofCards.map((card) => {
          const Icon = card.icon;
          return (
            <article key={card.label} className="rounded-lg border border-arx-line bg-arx-panel p-5">
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm font-semibold text-white">{card.label}</p>
                <Icon className="h-5 w-5 text-arx-cyan" />
              </div>
              <p className="mt-3 text-2xl font-bold text-white">{card.value}</p>
              <p className="mt-2 text-sm leading-6 text-arx-muted">{card.detail}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function MarketAndBusinessModel({ data }: { data: DashboardData }) {
  const revenueStreams = [
    {
      label: "Interest spread",
      value: "14% to 18%",
      detail: "Borrow at institutional cost, advance to qualified AI SaaS companies, keep the spread."
    },
    {
      label: "Origination fees",
      value: "2.5%",
      detail: "Collected when advances close and used to support the reserve model."
    },
    {
      label: "ARX Intelligence SaaS",
      value: "$250 to $2.5K",
      detail: "Monthly software revenue for the behavioral intelligence dashboard."
    }
  ];

  return (
    <section id="market" className="scroll-mt-24 border-b border-white/10">
      <div className="mx-auto max-w-[1500px] px-4 py-12 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Why now"
          title="Two fast-growing markets, one underwritten blind spot"
          description="Traditional revenue-based financing looks backward. ARX turns aggregate product behavior into a weekly capital-readiness view for AI software companies."
        />

        <div className="mt-8 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <StatCard
              label="AI SaaS market"
              value="$142B"
              detail="2026 market cited in the business plan, growing 39% per year."
            />
            <StatCard
              label="Revenue-based financing"
              value="$17B"
              detail="2026 lending category cited in the business plan, growing 62% per year."
            />
            <StatCard
              label="Demo portfolio ARR"
              value={currency(data.summary.totalArr)}
              detail="Synthetic financial proxy currently driving the live dashboard."
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {revenueStreams.map((stream) => (
              <article key={stream.label} className="rounded-lg border border-arx-line bg-arx-panel p-5">
                <p className="text-xs uppercase tracking-[0.16em] text-arx-muted">{stream.label}</p>
                <p className="mt-3 text-3xl font-bold text-white">{stream.value}</p>
                <p className="mt-3 text-sm leading-6 text-arx-muted">{stream.detail}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function DataFlowShowcase() {
  const stages = [
    {
      icon: LockKeyhole,
      label: "Read-only connectors",
      detail: "Mixpanel, Amplitude, Stripe, and Segment supply aggregate product and revenue signals."
    },
    {
      icon: Activity,
      label: "CompanySignals object",
      detail: "Behavioral and financial features are merged into one underwriting payload."
    },
    {
      icon: Gauge,
      label: "Scoring engine",
      detail: "Five product-health signals produce score, tier, action, and advance rate."
    },
    {
      icon: Database,
      label: "Airtable boundary",
      detail: "The MVP stores score records in handoff CSVs now and keeps an Airtable adapter boundary ready."
    },
    {
      icon: BarChart3,
      label: "Founder dashboard",
      detail: "The founder sees capital readiness, signal gaps, trends, sources, and advance guidance."
    }
  ];

  return (
    <section id="pipeline" className="scroll-mt-24 border-b border-white/10 bg-arx-navy/50">
      <div className="mx-auto max-w-[1500px] px-4 py-12 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Data flow"
          title="From product behavior to capital decision"
          description="The demo shows the full operating loop: consented data access, scoring, dashboard display, and application review."
        />
        <div className="mt-8 grid gap-3 lg:grid-cols-5">
          {stages.map((stage, index) => {
            const Icon = stage.icon;
            return (
              <article key={stage.label} className="relative rounded-lg border border-arx-line bg-arx-panel p-5">
                {index < stages.length - 1 ? (
                  <ArrowRight className="absolute -right-5 top-8 hidden h-5 w-5 text-arx-muted lg:block" />
                ) : null}
                <Icon className="h-6 w-6 text-arx-cyan" />
                <p className="mt-4 text-sm font-semibold text-white">{stage.label}</p>
                <p className="mt-2 text-sm leading-6 text-arx-muted">{stage.detail}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function ScoringIntelligence() {
  const signals = [
    ["Output acceptance", "Do users keep the AI output, or regenerate and abandon it?"],
    ["Engagement", "Are sessions deepening and users returning with intent?"],
    ["Retention", "Is subscription revenue stable across the monitoring window?"],
    ["Concentration", "Does one customer create outsized repayment exposure?"],
    ["Sentiment", "Can aggregate frustration signals expose churn risk early?"]
  ];

  const tiers = [
    ["85+", "Tier 1", "Highest confidence, strongest advance guidance."],
    ["55 to 84", "Tier 2 or 3", "Monitor or review based on signal weakness."],
    ["Below 55", "Tier 4", "Declined until product-health signals recover."]
  ];

  return (
    <section className="border-b border-white/10">
      <div className="mx-auto max-w-[1500px] px-4 py-12 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Underwriting intelligence"
          title="The score explains what founders can improve"
          description="The UI treats capital_ready_score as higher-is-healthier, then exposes the weakest signals so the founder knows what would unlock better terms."
        />
        <div className="mt-8 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="grid gap-3 sm:grid-cols-2">
            {signals.map(([label, detail]) => (
              <article key={label} className="rounded-lg border border-arx-line bg-arx-panel p-5">
                <p className="text-sm font-semibold text-white">{label}</p>
                <p className="mt-2 text-sm leading-6 text-arx-muted">{detail}</p>
              </article>
            ))}
          </div>
          <div className="rounded-lg border border-arx-blue/35 bg-arx-panel p-5 shadow-arx-blue">
            <p className="text-xs uppercase tracking-[0.16em] text-arx-muted">Score policy</p>
            <div className="mt-5 space-y-3">
              {tiers.map(([range, tier, detail]) => (
                <div key={range} className="rounded-lg border border-arx-line bg-arx-ink p-4">
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-2xl font-bold text-white">{range}</p>
                    <Badge tone={tier === "Tier 1" ? "green" : tier === "Tier 4" ? "red" : "amber"}>
                      {tier}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-arx-muted">{detail}</p>
                </div>
              ))}
            </div>
            <p className="mt-5 text-xs leading-5 text-arx-muted">
              Legacy lower-is-healthier risk scores remain secondary. The presentation and
              dashboard use capital-ready score as the founder-facing metric.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function ApplicationWorkflow({ applications }: { applications: ApplicationRecord[] }) {
  const shownApplications = applications.slice(0, 5);
  const averageArr = average(applications.map((record) => record.arr));
  const consentRate =
    applications.filter((record) => record.behavioralConsent).length /
    Math.max(1, applications.length);

  return (
    <section id="apply" className="scroll-mt-24 border-t border-white/10 bg-arx-navy/60">
      <div className="mx-auto max-w-[1500px] px-4 py-12 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Application workflow"
          title="The capital request path is visible for the demo"
          description="The handoff includes fake application records so judges can see how a founder submission connects to scoring, review, and advance guidance."
        />
        <div className="mt-8 grid gap-6 xl:grid-cols-[420px_1fr]">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
            <StatCard label="Applications loaded" value={applications.length.toString()} detail="Demo records from the application handoff file." />
            <StatCard label="Behavioral consent" value={percent(consentRate, 0)} detail="Consent determines whether the richer signal model can run." />
            <StatCard label="Average applicant ARR" value={currency(averageArr)} detail="Used to show the advance amount conversation." />
          </div>
          <div className="overflow-hidden rounded-lg border border-arx-line bg-arx-panel">
            <div className="flex items-center justify-between gap-3 border-b border-arx-line px-4 py-4">
              <div>
                <h2 className="text-base font-semibold text-white">Demo application queue</h2>
                <p className="mt-1 text-xs text-arx-muted">
                  Fake records for workflow testing, not real applicant companies.
                </p>
              </div>
              <ClipboardList className="h-5 w-5 text-arx-cyan" />
            </div>
            <div className="table-scroll overflow-auto">
              <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                <thead className="bg-arx-panel2 text-xs uppercase tracking-[0.12em] text-arx-muted">
                  <tr>
                    <th className="border-b border-arx-line px-4 py-3 font-semibold">Applicant</th>
                    <th className="border-b border-arx-line px-4 py-3 font-semibold">ARR</th>
                    <th className="border-b border-arx-line px-4 py-3 font-semibold">Consent</th>
                    <th className="border-b border-arx-line px-4 py-3 font-semibold">Score</th>
                    <th className="border-b border-arx-line px-4 py-3 font-semibold">Advance rate</th>
                  </tr>
                </thead>
                <tbody>
                  {shownApplications.map((record) => (
                    <tr key={record.companyId} className="border-b border-arx-line/70">
                      <td className="px-4 py-3">
                    <p className="font-semibold text-white">{record.companyName}</p>
                    <p className="mt-1 text-xs text-arx-muted">
                      {record.companyCategory} - {record.companyId}
                    </p>
                      </td>
                      <td className="px-4 py-3 text-white">{currency(record.arr)}</td>
                      <td className="px-4 py-3">
                        <Badge tone={record.behavioralConsent ? "green" : "amber"}>
                          {record.behavioralConsent ? "Yes" : "No"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 font-bold text-white">
                        {formatScore(record.capitalReadyScore)}
                      </td>
                      <td className="px-4 py-3 text-white">{percent(record.advanceRate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function PresentationReadiness({ data }: { data: DashboardData }) {
  const items = [
    "Public copy is brand-led and role-neutral for judges and investors.",
    "Dashboard reads CSV handoff files and keeps future Airtable integration behind an adapter.",
    "Capital-ready score is higher-is-healthier across the product.",
    "Every demo-data surface is labeled as synthetic or proxy data.",
    "The application workflow, data flow, score explanation, and simulator are all visible on one URL."
  ];

  return (
    <section className="border-t border-white/10">
      <div className="mx-auto max-w-[1500px] px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-6 rounded-lg border border-arx-green/30 bg-arx-green/10 p-6 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-green-100">Presentation ready</p>
            <h2 className="mt-3 text-3xl font-bold text-white">
              One page for pitch, proof, and live product inspection.
            </h2>
            <p className="mt-4 text-sm leading-6 text-green-50/80">
              This build is designed for the Startup Wednesday judging flow: explain the
              business, show the data moat, then let the room inspect the working dashboard.
            </p>
          </div>
          <div className="grid gap-3">
            {items.map((item) => (
              <div key={item} className="flex gap-3 rounded-lg border border-green-300/20 bg-arx-ink/60 p-3">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-arx-green" />
                <p className="text-sm leading-6 text-green-50/85">{item}</p>
              </div>
            ))}
            <div className="rounded-lg border border-arx-line bg-arx-panel p-4 text-sm leading-6 text-arx-muted">
              Loaded for this demo: {data.latestScores.length} latest scores,{" "}
              {data.trendRecords.length} trend rows, {data.behavioralRecords.length} behavioral
              rows, {data.financialMetrics.length} financial rows, and{" "}
              {data.applicationRecords.length} application records.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="max-w-4xl">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-arx-cyan">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-bold tracking-normal text-white sm:text-4xl">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-arx-muted sm:text-base">{description}</p>
    </div>
  );
}

function HeroMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-arx-line bg-arx-panel p-4">
      <p className="text-xs uppercase tracking-[0.14em] text-arx-muted">{label}</p>
      <p className="mt-2 truncate text-2xl font-bold text-white">{value}</p>
    </div>
  );
}

function SceneChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
      <p className="text-[10px] uppercase tracking-[0.12em] text-arx-muted">{label}</p>
      <p className="mt-1 truncate text-xs font-bold text-white">{value}</p>
    </div>
  );
}

function StatCard({
  label,
  value,
  detail
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <article className="rounded-lg border border-arx-line bg-arx-panel p-5">
      <p className="text-xs uppercase tracking-[0.16em] text-arx-muted">{label}</p>
      <p className="mt-3 text-3xl font-bold text-white">{value}</p>
      <p className="mt-3 text-sm leading-6 text-arx-muted">{detail}</p>
    </article>
  );
}

function average(values: number[]): number {
  const finiteValues = values.filter((value) => Number.isFinite(value));
  if (finiteValues.length === 0) {
    return 0;
  }
  return finiteValues.reduce((sum, value) => sum + value, 0) / finiteValues.length;
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
    { key: "companyName", label: "Company" },
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
    setSortDirection(key === "companyName" || key === "creditAction" ? "asc" : "desc");
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
                    {record.companyName}
                  </button>
                  <p className="mt-1 max-w-[260px] truncate text-xs text-arx-muted">
                    {record.companyCategory} - {record.companyId}
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
          <h2 className="mt-2 truncate text-2xl font-bold text-white">{company.companyName}</h2>
          <p className="mt-1 text-xs text-arx-muted">
            {company.companyCategory} - trace ID {company.companyId}
          </p>
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
            {company.companyName} historical records from dashboard trend data.
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
