"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

/* ──────────────────────────────────────────────────────────────────────────────
   Segment config (Council vs Enterprise) with weighting & tooltip
────────────────────────────────────────────────────────────────────────────── */
type SegmentKey = "Council" | "Enterprise";

const SEGMENTS: Record<
  SegmentKey,
  {
    label: string;
    manualFactor: number; // impacts manual processing savings
    complianceFactor: number; // impacts compliance efficiency & risk avoidance
    recordFactor: number; // impacts record-keeping savings
    tooltip: string;
  }
> = {
  Council: {
    label: "Council",
    manualFactor: 1.05,
    complianceFactor: 1.25,
    recordFactor: 1.15,
    tooltip:
      "Councils typically have heavier statutory reporting & audit obligations. We weight compliance and record-keeping savings higher.",
  },
  Enterprise: {
    label: "Enterprise",
    manualFactor: 1.15,
    complianceFactor: 1.15,
    recordFactor: 1.05,
    tooltip:
      "Enterprises usually have larger volume & complex workforce patterns. We weight manual processing and compliance moderately.",
  },
};

/* ──────────────────────────────────────────────────────────────────────────────
   Small UI helpers
────────────────────────────────────────────────────────────────────────────── */
function Label({ children }: { children: React.ReactNode }) {
  return <div className="label">{children}</div>;
}

function Value({ children }: { children: React.ReactNode }) {
  return <div className="value">{children}</div>;
}

function InfoDot({ title }: { title: string }) {
  return (
    <span
      title={title}
      className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-300 text-slate-500 text-xs"
      aria-label="More info"
      role="img"
    >
      i
    </span>
  );
}

function SegmentToggle({
  value,
  onChange,
}: {
  value: SegmentKey;
  onChange: (s: SegmentKey) => void;
}) {
  return (
    <div className="flex gap-2 print:hidden">
      {(Object.keys(SEGMENTS) as SegmentKey[]).map((key) => {
        const active = value === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            className={[
              "inline-flex items-center gap-2 rounded-full px-4 py-2 border transition",
              active
                ? "bg-teal-700 text-white border-teal-700"
                : "bg-white text-slate-700 border-slate-300 hover:border-slate-400",
            ].join(" ")}
            aria-pressed={active}
            title={SEGMENTS[key].tooltip}
          >
            {SEGMENTS[key].label}
            <InfoDot title={SEGMENTS[key].tooltip} />
          </button>
        );
      })}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────────
   Gauge (semi-circle) — % text above; arc stays inside card
   - Uses a single path with pathLength=100 so we can strokeDasharray `${pct} 100`
────────────────────────────────────────────────────────────────────────────── */
function SemiGauge({
  percent,
  className,
}: {
  percent: number;
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, percent));

  // SVG viewBox is 200x120; arc runs left→right along y=110 with radius=90
  // This keeps generous padding so it never overflows its card.
  return (
    <div className={className}>
      <div className="text-center">
        <div className="text-5xl font-extrabold tracking-tight text-slate-800">
          {pct}%
        </div>
      </div>
      <div className="mt-4 flex w-full justify-center">
        <svg
          viewBox="0 0 200 120"
          width="100%"
          height="auto"
          className="max-w-[520px]"
          aria-label={`Efficiency ${pct}%`}
        >
          {/* background arc */}
          <path
            d="M10 110 A90 90 0 0 1 190 110"
            fill="none"
            stroke="#E5ECF2"
            strokeWidth="16"
            pathLength={100}
            strokeLinecap="round"
          />
          {/* foreground arc */}
          <path
            d="M10 110 A90 90 0 0 1 190 110"
            fill="none"
            stroke="#11655D"
            strokeWidth="16"
            pathLength={100}
            strokeDasharray={`${pct} 100`}
            strokeLinecap="round"
          />
        </svg>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────────
   Main page
────────────────────────────────────────────────────────────────────────────── */
export default function Page() {
  // top buttons
  const [segment, setSegment] = useState<SegmentKey>("Council");

  // Inputs
  const [employees, setEmployees] = useState(250);
  const [payCycles, setPayCycles] = useState(26); // fortnightly
  const [avgHoursPerCycle, setAvgHoursPerCycle] = useState(8);
  const [errorRatePct, setErrorRatePct] = useState(3);
  const [hourlyRate, setHourlyRate] = useState(55);

  // New inputs for extended ROI
  const [recordEffPct, setRecordEffPct] = useState(5.5);
  const [penaltyBand, setPenaltyBand] = useState<
    "Low ($0–$10,000)" | "Medium ($10,000–$30,000)" | "High ($30,000–$100,000)"
  >("Medium ($10,000–$30,000)");
  const [incidentProbPct, setIncidentProbPct] = useState(8);

  const {
    // breakdown
    efficiencyTimeSaved,
    manualProcessingSavings,
    complianceEfficiencySavings,
    errorReductionSavings,
    recordKeepingSavings,
    complianceRiskAvoidance,
    // headline
    totalAnnualSavings,
    currentAdminHours,
    currentAdminCost,
    hoursBackToTeam,
    efficiencyPct,
  } = useMemo(() => {
    // current baseline admin effort/cost
    const currentAdminHours = payCycles * avgHoursPerCycle;
    const currentAdminCost = currentAdminHours * hourlyRate;

    // efficiency band = simple mapping from errorRate (still bounded)
    const efficiencyPct = Math.min(100, Math.round(errorRatePct * 25));

    // hours won back from fewer reworks/mistakes
    const hoursBackToTeam = currentAdminHours * (errorRatePct / 100);

    // base buckets (before segment weighting) -----------------------
    const baseManualProcessingSavings = hoursBackToTeam * hourlyRate * 0.5; // half of gained time is manual processing
    const baseComplianceEfficiency = hoursBackToTeam * hourlyRate * 0.25; // part due to compliance/reporting automations
    const baseErrorReductionSavings = hoursBackToTeam * hourlyRate * 0.25; // rest attributed to fewer corrections

    // record-keeping efficiency: a % of current admin cost
    const baseRecordKeepingSavings = currentAdminCost * (recordEffPct / 100);

    // compliance risk avoidance from band x probability
    const bandAvg =
      penaltyBand === "Low ($0–$10,000)"
        ? 5000
        : penaltyBand === "Medium ($10,000–$30,000)"
        ? 20000
        : 65000;
    const baseComplianceRiskAvoid =
      (bandAvg * Math.max(0, Math.min(100, incidentProbPct))) / 100;

    // segment weighting ---------------------------------------------
    const seg = SEGMENTS[segment];
    const manualProcessingSavings =
      baseManualProcessingSavings * seg.manualFactor;
    const complianceEfficiencySavings =
      baseComplianceEfficiency * seg.complianceFactor;
    const errorReductionSavings = baseErrorReductionSavings; // neutral weight
    const recordKeepingSavings = baseRecordKeepingSavings * seg.recordFactor;
    const complianceRiskAvoidance =
      baseComplianceRiskAvoid * seg.complianceFactor;

    const efficiencyTimeSaved =
      manualProcessingSavings +
      complianceEfficiencySavings +
      errorReductionSavings;

    const totalAnnualSavings =
      efficiencyTimeSaved + recordKeepingSavings + complianceRiskAvoidance;

    return {
      // breakdown
      efficiencyTimeSaved,
      manualProcessingSavings,
      complianceEfficiencySavings,
      errorReductionSavings,
      recordKeepingSavings,
      complianceRiskAvoidance,
      // headline
      totalAnnualSavings,
      currentAdminHours,
      currentAdminCost,
      hoursBackToTeam,
      efficiencyPct,
    };
  }, [
    payCycles,
    avgHoursPerCycle,
    errorRatePct,
    hourlyRate,
    recordEffPct,
    penaltyBand,
    incidentProbPct,
    segment,
  ]);

  // simple share handler (copies URL)
  const doShare = () => {
    try {
      navigator.clipboard.writeText(window.location.href);
      alert("Link copied to clipboard.");
    } catch {
      alert(window.location.href);
    }
  };

  // print (uses your global print stylesheet if present)
  const doPrint = () => window.print();

  // pay cycle options
  const payCycleOpts = [
    { label: "52 (Weekly)", value: 52 },
    { label: "26 (Fortnightly)", value: 26 },
    { label: "24 (Semi-monthly)", value: 24 },
    { label: "12 (Monthly)", value: 12 },
  ];

  const nzMoney = (n: number) =>
    n.toLocaleString("en-NZ", {
      style: "currency",
      currency: "NZD",
      maximumFractionDigits: 0,
    });

  const nzHours = (n: number) =>
    `${Math.round(n).toLocaleString("en-NZ")} hrs`;

  /* ────────────────────────────────────────────────────────────────────────── */

  return (
    <main className="mx-auto max-w-6xl px-4 pb-16 pt-8">
      {/* Header row */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
          Datapay ROI / Efficiency Calculator
        </h1>

        <div className="flex items-center gap-2">
          <SegmentToggle value={segment} onChange={setSegment} />

          {/* Share & Export */}
          <button
            onClick={doShare}
            className="badge bg-white"
            title="Copy a link to this calculator"
          >
            Share
          </button>
          <button
            onClick={doPrint}
            className="badge bg-white"
            title="Export a clean PDF"
          >
            Export PDF
          </button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Inputs */}
        <section className="card">
          <div className="card-pad">
            <h2 className="text-xl font-bold mb-4">Inputs</h2>

            {/* Employees */}
            <div className="mb-5">
              <Label>
                Employees <InfoDot title="Headcount used to set context; main driver is admin time & error rate." />
              </Label>
              <input
                className="input mt-2"
                type="number"
                value={employees}
                onChange={(e) => setEmployees(Number(e.target.value || 0))}
                min={1}
              />
            </div>

            {/* Pay cycles */}
            <div className="mb-5">
              <Label>
                Pay cycles per year <InfoDot title="Weekly=52, Fortnightly=26, Semi-monthly=24, Monthly=12." />
              </Label>
              <select
                className="select mt-2"
                value={payCycles}
                onChange={(e) => setPayCycles(Number(e.target.value))}
              >
                {payCycleOpts.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Avg payroll hours / cycle */}
            <div className="mb-5">
              <Label>
                Avg payroll hours / cycle{" "}
                <InfoDot title="Typical time your team spends running payroll each pay cycle." />
              </Label>
              <input
                className="w-full mt-3"
                type="range"
                min={1}
                max={40}
                step={0.5}
                value={avgHoursPerCycle}
                onChange={(e) => setAvgHoursPerCycle(Number(e.target.value))}
              />
              <Value className="mt-1">{avgHoursPerCycle} hours</Value>
            </div>

            {/* Error correction rate */}
            <div className="mb-5">
              <Label>
                Error correction rate (%){" "}
                <InfoDot title="Share of each cycle spent on fixing errors (rework, reversals, re-runs)." />
              </Label>
              <input
                className="w-full mt-3"
                type="range"
                min={0}
                max={20}
                step={0.5}
                value={errorRatePct}
                onChange={(e) => setErrorRatePct(Number(e.target.value))}
              />
              <Value className="mt-1">{errorRatePct}%</Value>
            </div>

            {/* Hourly rate */}
            <div className="mb-5">
              <Label>
                Hourly rate ($){" "}
                <InfoDot title="Loaded hourly cost of payroll admin time." />
              </Label>
              <input
                className="input mt-2"
                type="number"
                min={15}
                value={hourlyRate}
                onChange={(e) => setHourlyRate(Number(e.target.value || 0))}
              />
            </div>

            {/* Record-keeping efficiency */}
            <div className="mb-5">
              <Label>
                Record-keeping efficiency (%){" "}
                <InfoDot title="Efficiency from digital storage & retrieval (NZ requires payroll records ≥7 years)." />
              </Label>
              <input
                className="w-full mt-3"
                type="range"
                min={0}
                max={15}
                step={0.5}
                value={recordEffPct}
                onChange={(e) => setRecordEffPct(Number(e.target.value))}
              />
              <Value className="mt-1">{recordEffPct}%</Value>
            </div>

            {/* Compliance band */}
            <div className="mb-5">
              <Label>
                Compliance penalty band{" "}
                <InfoDot title="Average remediation/penalty used for risk-avoidance modelling." />
              </Label>
              <select
                className="select mt-2"
                value={penaltyBand}
                onChange={(e) =>
                  setPenaltyBand(
                    e.target.value as
                      | "Low ($0–$10,000)"
                      | "Medium ($10,000–$30,000)"
                      | "High ($30,000–$100,000)"
                  )
                }
              >
                <option>Low ($0–$10,000)</option>
                <option>Medium ($10,000–$30,000)</option>
                <option>High ($30,000–$100,000)</option>
              </select>
            </div>

            {/* Incident probability */}
            <div className="mb-3">
              <Label>
                Incident probability (annual %){" "}
                <InfoDot title="Likelihood of a compliance incident in a given year." />
              </Label>
              <input
                className="w-full mt-3"
                type="range"
                min={0}
                max={30}
                step={1}
                value={incidentProbPct}
                onChange={(e) => setIncidentProbPct(Number(e.target.value))}
              />
              <Value className="mt-1">{incidentProbPct}%</Value>
            </div>
          </div>
        </section>

        {/* Middle: Gauge + breakdown */}
        <section className="card">
          <div className="card-pad">
            <h2 className="text-xl font-bold">Efficiency potential</h2>

            <SemiGauge percent={efficiencyPct} className="mt-4" />

            <h3 className="mt-6 text-sm font-semibold text-slate-700">
              Your total annual ROI breakdown
            </h3>

            <div className="mt-3 space-y-2">
              <div className="kpi">
                <span className="text-slate-700">
                  Efficiency (time saved) <InfoDot title="Sum of manual processing, compliance efficiencies and error rework avoided." />
                </span>
                <strong>{nzMoney(efficiencyTimeSaved)}</strong>
              </div>

              <div className="kpi">
                <span className="text-slate-700">
                  Compliance & risk avoidance{" "}
                  <InfoDot title="Expected value of avoided penalties & remediation from better compliance." />
                </span>
                <strong>{nzMoney(complianceRiskAvoidance)}</strong>
              </div>

              <div className="kpi">
                <span className="text-slate-700">
                  Record-keeping & reporting{" "}
                  <InfoDot title="Efficiency from digital records/retrieval, reporting and audits." />
                </span>
                <strong>{nzMoney(recordKeepingSavings)}</strong>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <div className="kpi">
                <span className="text-slate-700">
                  Manual processing <InfoDot title="Reduced keying, imports/exports, and handoffs." />
                </span>
                <span className="text-slate-500 mr-2">
                  {nzHours(hoursBackToTeam * 0.5)}
                </span>
                <strong>{nzMoney(manualProcessingSavings)}</strong>
              </div>

              <div className="kpi">
                <span className="text-slate-700">
                  Compliance & reporting (efficiency){" "}
                  <InfoDot title="Less admin preparing filings and reconciliations." />
                </span>
                <span className="text-slate-500 mr-2">
                  {nzHours(hoursBackToTeam * 0.25)}
                </span>
                <strong>{nzMoney(complianceEfficiencySavings)}</strong>
              </div>

              <div className="kpi">
                <span className="text-slate-700">
                  Error reduction (rework avoided){" "}
                  <InfoDot title="Fewer reruns, reversals and off-cycle fixes." />
                </span>
                <span className="text-slate-500 mr-2">
                  {nzHours(hoursBackToTeam * 0.25)}
                </span>
                <strong>{nzMoney(errorReductionSavings)}</strong>
              </div>
            </div>
          </div>
        </section>

        {/* Headline card */}
        <section className="card">
          <div className="card-pad">
            <h2 className="text-xl font-bold">Your headline impact</h2>

            <div className="mt-4 space-y-3">
              <div className="kpi">
                <span className="text-slate-700">
                  Total annual savings{" "}
                  <InfoDot title="Combined efficiency, record-keeping, and risk avoidance." />
                </span>
                <strong>{nzMoney(totalAnnualSavings)}</strong>
              </div>

              <div className="kpi">
                <span className="text-slate-700">
                  Admin time cost (current){" "}
                  <InfoDot title="What your team time currently costs to run payroll." />
                </span>
                <strong>{nzMoney(currentAdminCost)}</strong>
              </div>

              <div className="kpi">
                <span className="text-slate-700">
                  Hours back to team{" "}
                  <InfoDot title="Annual hours freed by fewer reworks & smoother runs." />
                </span>
                <strong>{nzHours(hoursBackToTeam)}</strong>
              </div>
            </div>

            <div className="mt-6">
              <a
                href="https://cal.com/"
                target="_blank"
                rel="noreferrer"
                className="btn w-full justify-center"
              >
                {/* calendar icon */}
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="mr-2"
                >
                  <path
                    d="M8 7h8M3 10h18M4 21h16a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v13a1 1 0 0 0 1 1Z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
                Book a 20-min discovery
              </a>
            </div>
          </div>
        </section>
      </div>

      {/* Bottom badges for small screens (optional) */}
      <div className="mt-6 flex flex-wrap gap-3 print:hidden md:hidden">
        <button
          className={[
            "badge",
            segment === "Council"
              ? "bg-teal-700 text-white"
              : "bg-white text-slate-700",
          ].join(" ")}
          onClick={() => setSegment("Council")}
        >
          Council
        </button>
        <button
          className={[
            "badge",
            segment === "Enterprise"
              ? "bg-teal-700 text-white"
              : "bg-white text-slate-700",
          ].join(" ")}
          onClick={() => setSegment("Enterprise")}
        >
          Enterprise
        </button>
        <button className="badge bg-white" onClick={doShare}>
          Share
        </button>
        <button className="badge bg-white" onClick={doPrint}>
          Export PDF
        </button>
      </div>
    </main>
  );
}
