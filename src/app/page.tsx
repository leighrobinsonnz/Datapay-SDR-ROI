"use client";

import { useMemo, useState } from "react";

/* ------------------------------ Types & data ------------------------------- */

type PayCycle = { label: string; value: number };
const PAY_CYCLES: PayCycle[] = [
  { label: "52 (Weekly)", value: 52 },
  { label: "26 (Fortnightly)", value: 26 },
  { label: "24 (Semi-monthly)", value: 24 },
  { label: "12 (Monthly)", value: 12 },
];

type RiskBandKey = "low" | "medium" | "high";
const RISK_BANDS: Record<
  RiskBandKey,
  { label: string; min: number; max: number; mid: number }
> = {
  low: { label: "Low ($0–$10,000)", min: 0, max: 10_000, mid: 5_000 },
  medium: { label: "Medium ($10,000–$30,000)", min: 10_000, max: 30_000, mid: 20_000 },
  high: { label: "High ($30,000–$100,000)", min: 30_000, max: 100_000, mid: 65_000 },
};

/* ------------------------------ Small helpers ------------------------------ */

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function nzMoney(n: number) {
  return n.toLocaleString("en-NZ", {
    style: "currency",
    currency: "NZD",
    maximumFractionDigits: 0,
  });
}

/* ------------------------------ UI subcomponents --------------------------- */

function InfoTip({
  title,
  content,
}: {
  title: string;
  content: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-block align-middle ml-2">
      <button
        type="button"
        aria-label={`More info: ${title}`}
        className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-300 text-slate-500 hover:bg-slate-50"
        onClick={() => setOpen((v) => !v)}
      >
        i
      </button>
      {open && (
        <div
          role="dialog"
          aria-label={title}
          className="absolute z-20 mt-2 w-72 rounded-lg border border-slate-200 bg-white p-3 text-sm shadow-md"
        >
          <div className="mb-1 font-medium text-slate-800">{title}</div>
          <div className="text-slate-600">{content}</div>
          <div className="text-right mt-2">
            <button
              className="text-xs text-slate-500 hover:text-slate-700"
              onClick={() => setOpen(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </span>
  );
}

function MiniGauge({
  label,
  dollars,
  total,
  tip,
}: {
  label: string;
  dollars: number;
  total: number;
  tip?: React.ReactNode;
}) {
  const pct = total > 0 ? clamp((dollars / total) * 100, 0, 100) : 0;
  return (
    <div className="w-full">
      <div className="flex items-center justify-between gap-2">
        <div className="label flex items-center">
          {label}
          {tip ? <InfoTip title={label} content={tip} /> : null}
        </div>
        <div className="value">{nzMoney(dollars)}</div>
      </div>
      <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-2 bg-teal-700"
          style={{ width: `${pct}%` }}
          aria-hidden
        />
      </div>
    </div>
  );
}

function MainGauge({ valuePct }: { valuePct: number }) {
  const clamped = clamp(valuePct, 0, 100);
  const total = 126;
  const dash = (clamped / 100) * total;

  return (
    <div className="flex items-center justify-center">
      <svg viewBox="0 0 100 60" className="w-full max-w-md">
        {/* Centered percentage label INSIDE the SVG (never overlaps the arc) */}
        <text
          x="50"
          y="18"
          textAnchor="middle"
          className="fill-slate-700 font-bold"
          fontSize="14"
        >
          {Math.round(clamped)}%
        </text>

        {/* Background arc */}
        <path
          d="M10,60 A40,40 0 0,1 90,60"
          fill="none"
          stroke="#e2e8f0"
          strokeWidth="12"
          strokeLinecap="round"
        />
        {/* Value arc */}
        <path
          d="M10,60 A40,40 0 0,1 90,60"
          fill="none"
          stroke="#0f766e"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${total}`}
        />
      </svg>
    </div>
  );
}

/* --------------------------------- Page ------------------------------------ */

export default function Page() {
  /* --------------------------- Inputs (left column) ------------------------ */
  const [employees, setEmployees] = useState<number>(250);
  const [payCycles, setPayCycles] = useState<number>(26);
  const [avgHoursPerCycle, setAvgHoursPerCycle] = useState<number>(8);
  const [errorRatePct, setErrorRatePct] = useState<number>(3); // % of cycle hours you can claw back
  const [hourlyRate, setHourlyRate] = useState<number>(55);

  // NEW inputs
  const [recordKeepingEffPct, setRecordKeepingEffPct] = useState<number>(5.5); // % extra efficiency for records/reporting
  const [riskBand, setRiskBand] = useState<RiskBandKey>("medium");
  const [incidentProbPct, setIncidentProbPct] = useState<number>(8); // annualised probability

  /* ------------------------------ Calculations ----------------------------- */
  const {
    currentAdminHours,
    currentAdminCost,
    hoursBackToTeam,
    efficiencyDollars,
    byCategory,
    complianceRiskDollars,
    recordKeepingDollars,
    totalAnnualSavings,
    efficiencyPct,
  } = useMemo(() => {
    // base hours/cost
    const currentAdminHours = payCycles * avgHoursPerCycle;
    const currentAdminCost = currentAdminHours * hourlyRate;

    // efficiency from error reduction (% of hours)
    const hoursBackToTeam = currentAdminHours * (errorRatePct / 100);
    const efficiencyDollars = hoursBackToTeam * hourlyRate;

    // split efficiency into three “where it happens” buckets
    // (you can tune these weights; they just drive the sub-KPI rows)
    const effSplit = {
      manual: 0.70, // manual processing reduction
      compliance: 0.20, // reporting/admin efficiency (not penalties)
      errors: 0.10, // rework avoided
    };

    const byCategory = {
      manual: {
        hours: hoursBackToTeam * effSplit.manual,
        dollars: hoursBackToTeam * effSplit.manual * hourlyRate,
      },
      compliance: {
        hours: hoursBackToTeam * effSplit.compliance,
        dollars: hoursBackToTeam * effSplit.compliance * hourlyRate,
      },
      errors: {
        hours: hoursBackToTeam * effSplit.errors,
        dollars: hoursBackToTeam * effSplit.errors * hourlyRate,
      },
    };

    // compliance risk avoidance (expected value)
    const band = RISK_BANDS[riskBand];
    const complianceRiskDollars = (band.mid * incidentProbPct) / 100;

    // record-keeping/reporting savings (extra efficiency),
    // damped so we don’t double-count the original efficiency gains.
    const RECORD_DAMP = 0.6;
    const recordKeepingHours =
      currentAdminHours * (recordKeepingEffPct / 100) * RECORD_DAMP;
    const recordKeepingDollars = recordKeepingHours * hourlyRate;

    const totalAnnualSavings =
      efficiencyDollars + complianceRiskDollars + recordKeepingDollars;

    // simple band for the big dial (kept from earlier)
    const efficiencyPct = Math.min(100, Math.round(errorRatePct * 25));

    return {
      currentAdminHours,
      currentAdminCost,
      hoursBackToTeam,
      efficiencyDollars,
      byCategory,
      complianceRiskDollars,
      recordKeepingDollars,
      totalAnnualSavings,
      efficiencyPct,
    };
  }, [
    payCycles,
    avgHoursPerCycle,
    errorRatePct,
    hourlyRate,
    recordKeepingEffPct,
    riskBand,
    incidentProbPct,
  ]);

  /* -------------------------------- Render -------------------------------- */

  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      <header className="mb-6">
        <h1 className="text-3xl md:text-4xl font-bold">
          Datapay ROI / Efficiency Calculator
        </h1>
      </header>

      <div className="grid md:grid-cols-3 gap-6 md:items-start print:gap-3">
        {/* LEFT: Inputs */}
        <section className="card">
          <div className="card-pad space-y-6">
            <h2 className="text-xl font-semibold">Inputs</h2>

            <div className="space-y-1">
              <label className="label">Employees</label>
              <input
                className="input"
                type="number"
                min={1}
                step={1}
                value={employees}
                onChange={(e) => setEmployees(Number(e.target.value))}
              />
            </div>

            <div className="space-y-1">
              <label className="label">Pay cycles per year</label>
              <select
                className="select"
                value={payCycles}
                onChange={(e) => setPayCycles(Number(e.target.value))}
              >
                {PAY_CYCLES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="label mb-2">Avg payroll hours / cycle</div>
              <input
                className="slider"
                type="range"
                min={1}
                max={20}
                step={0.5}
                value={avgHoursPerCycle}
                onChange={(e) => setAvgHoursPerCycle(Number(e.target.value))}
              />
              <div className="mt-2 text-sm">{avgHoursPerCycle} hours</div>
            </div>

            <div>
              <div className="label mb-2">Error correction rate (%)</div>
              <input
                className="slider"
                type="range"
                min={0}
                max={15}
                step={0.5}
                value={errorRatePct}
                onChange={(e) => setErrorRatePct(Number(e.target.value))}
              />
              <div className="mt-2 text-sm">{errorRatePct}%</div>
            </div>

            <div className="space-y-1">
              <label className="label">Hourly rate ($)</label>
              <input
                className="input"
                type="number"
                min={0}
                step={1}
                value={hourlyRate}
                onChange={(e) => setHourlyRate(Number(e.target.value))}
              />
            </div>

            <div>
              <div className="label mb-2">
                Record-keeping efficiency (%){" "}
                <InfoTip
                  title="Record-keeping efficiency"
                  content={
                    <>
                      Additional hours saved from digitised records & reporting
                      (7-year retention). Damped to avoid double-counting the
                      base efficiency.
                    </>
                  }
                />
              </div>
              <input
                className="slider"
                type="range"
                min={0}
                max={15}
                step={0.5}
                value={recordKeepingEffPct}
                onChange={(e) =>
                  setRecordKeepingEffPct(Number(e.target.value))
                }
              />
              <div className="mt-2 text-sm">{recordKeepingEffPct}%</div>
            </div>

            <div className="space-y-1">
              <label className="label">
                Compliance penalty band{" "}
                <InfoTip
                  title="Compliance penalty band"
                  content={
                    <>
                      Midpoint of typical remediation/penalty ranges used for
                      expected value calculations.
                    </>
                  }
                />
              </label>
              <select
                className="select"
                value={riskBand}
                onChange={(e) => setRiskBand(e.target.value as RiskBandKey)}
              >
                {Object.entries(RISK_BANDS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="label mb-2">
                Incident probability (annual %){" "}
                <InfoTip
                  title="Incident probability"
                  content={
                    <>
                      Annual chance of a compliance incident that triggers
                      remediation/penalties.
                    </>
                  }
                />
              </div>
              <input
                className="slider"
                type="range"
                min={0}
                max={25}
                step={1}
                value={incidentProbPct}
                onChange={(e) => setIncidentProbPct(Number(e.target.value))}
              />
              <div className="mt-2 text-sm">{incidentProbPct}%</div>
            </div>
          </div>
        </section>

        {/* MIDDLE: Gauge + ROI breakdown (fills the space) */}
        <section className="card">
          <div className="card-pad space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Efficiency potential</h3>
            </div>

            <MainGauge valuePct={efficiencyPct} />

            <div className="pt-3 border-t border-slate-200 space-y-3">
              <h4 className="text-base font-semibold">
                Your total annual ROI breakdown
              </h4>

              <MiniGauge
                label="Efficiency (time saved)"
                dollars={efficiencyDollars}
                total={totalAnnualSavings}
                tip={
                  <>
                    Automation reduces manual handling and rework. Split across
                    manual processing, reporting and error reduction for
                    clarity.
                  </>
                }
              />
              <MiniGauge
                label="Compliance & risk avoidance"
                dollars={complianceRiskDollars}
                total={totalAnnualSavings}
                tip={
                  <>
                    Expected value of avoided remediation/penalties (band ×
                    annual probability).
                  </>
                }
              />
              <MiniGauge
                label="Record-keeping & reporting"
                dollars={recordKeepingDollars}
                total={totalAnnualSavings}
                tip={
                  <>
                    Savings from digitised records & reporting (7-year
                    retention). Damped to avoid double counting.
                  </>
                }
              />

              {/* Optional finer split for payroll pros */}
              <div className="mt-2 grid gap-2">
                <div className="kpi">
                  <div className="label">
                    Manual processing
                    <InfoTip
                      title="Manual processing"
                      content="Reduction in repetitive input/approval handling, imports, reconciliations."
                    />
                  </div>
                  <div className="value">
                    {nzMoney(byCategory.manual.dollars)}
                    <span className="text-slate-400 text-sm ml-2">
                      ({Math.round(byCategory.manual.hours)} hrs)
                    </span>
                  </div>
                </div>

                <div className="kpi">
                  <div className="label">
                    Compliance & reporting (efficiency)
                    <InfoTip
                      title="Compliance & reporting (efficiency)"
                      content="Faster statutory reporting/audit trails (PAYE, ESCT, Holidays Act artefacts, GL posting)."
                    />
                  </div>
                  <div className="value">
                    {nzMoney(byCategory.compliance.dollars)}
                    <span className="text-slate-400 text-sm ml-2">
                      ({Math.round(byCategory.compliance.hours)} hrs)
                    </span>
                  </div>
                </div>

                <div className="kpi">
                  <div className="label">
                    Error reduction (rework avoided)
                    <InfoTip
                      title="Error reduction"
                      content="Fewer corrections & reruns via validation and workflow controls."
                    />
                  </div>
                  <div className="value">
                    {nzMoney(byCategory.errors.dollars)}
                    <span className="text-slate-400 text-sm ml-2">
                      ({Math.round(byCategory.errors.hours)} hrs)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* RIGHT: Headline KPIs + CTA */}
        <section className="card">
          <div className="card-pad space-y-4">
            <h3 className="text-lg font-semibold">Your headline impact</h3>

            <div className="kpi">
              <div className="label">Total annual savings</div>
              <div className="value">{nzMoney(totalAnnualSavings)}</div>
            </div>

            <div className="kpi">
              <div className="label">Admin time cost (current)</div>
              <div className="value">{nzMoney(currentAdminCost)}</div>
            </div>

            <div className="kpi">
              <div className="label">Hours back to team</div>
              <div className="value">
                {`${Math.round(hoursBackToTeam).toLocaleString()} hrs / yr`}
              </div>
            </div>

            <div className="pt-2">
              <a
                className="btn"
                href="https://cal.com/"
                target="_blank"
                rel="noreferrer"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M8 7h8M4 9h16M6 5v4m12-4v4M5 9h14v10H5z"
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

      {/* Top badges */}
      <div className="mt-6 flex flex-wrap gap-3 print:hidden">
        <span className="badge bg-white">Council</span>
        <span className="badge bg-white">Enterprise</span>
        <span className="badge bg-white">Share</span>
        <span className="badge bg-white">Export PDF</span>
      </div>
    </main>
  );
}

