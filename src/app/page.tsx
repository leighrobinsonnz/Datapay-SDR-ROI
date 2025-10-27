"use client";

import { useMemo, useState } from "react";

/* ---------- constants ---------- */

const PAY_CYCLES = [
  { label: "52 (Weekly)", value: 52 },
  { label: "26 (Fortnightly)", value: 26 },
  { label: "24 (Semi-monthly)", value: 24 },
  { label: "12 (Monthly)", value: 12 },
] as const;

type Segment = "Council" | "Enterprise";
const SEGMENTS: Segment[] = ["Council", "Enterprise"];

const SAVINGS_WEIGHTS: Record<
  Segment,
  { manual: number; compliance: number; errors: number }
> = {
  Council: { manual: 0.7, compliance: 0.2, errors: 0.1 },
  Enterprise: { manual: 0.6, compliance: 0.25, errors: 0.15 },
};

/* ---------- small UI helpers ---------- */

const Info = ({ text }: { text: string }) => (
  <span className="relative inline-flex items-center">
    <span className="ml-1 text-slate-400 select-none">ⓘ</span>
    <span className="pointer-events-none absolute left-1/2 z-50 hidden w-56 -translate-x-1/2 translate-y-2 rounded-md bg-slate-900 px-2 py-2 text-xs leading-snug text-white shadow-md group-hover:block">
      {text}
    </span>
  </span>
);

const Label = ({
  children,
  info,
}: {
  children: React.ReactNode;
  info?: string;
}) => (
  <div className="mb-1 flex items-center text-sm font-medium text-slate-700">
    {children}
    {info ? (
      <span className="group ml-1">
        <Info text={info} />
      </span>
    ) : null}
  </div>
);

/* ---------- gauge (fixed math) ---------- */

function Gauge({ value }: { value: number }) {
  // Clamp just in case
  const v = Math.max(0, Math.min(100, value));

  // Geometry for semi-circle centered at (50,50), radius 40
  const R = 40;
  const cx = 50;
  const cy = 50;

  // Start angle = 180° (π rad). End angle = 180° - 180° * (v/100)
  const endAngle = Math.PI - Math.PI * (v / 100);

  const endX = cx + R * Math.cos(endAngle);
  const endY = cy + R * Math.sin(endAngle);

  const largeArcFlag = v > 50 ? 1 : 0; // >180° ?
  const sweepFlag = 1;

  return (
    <div className="relative mx-auto mt-2 w-[420px] max-w-full px-2">
      <div className="absolute inset-0 flex -translate-y-6 items-center justify-center">
        <div className="text-4xl font-extrabold tracking-tight text-slate-800">
          {v}%
        </div>
      </div>

      <svg viewBox="0 0 100 55" className="block h-auto w-full">
        {/* background */}
        <path
          d={`M ${cx - R} ${cy} A ${R} ${R} 0 1 1 ${cx + R} ${cy}`}
          fill="none"
          stroke="#E5E7EB"
          strokeWidth="10"
          strokeLinecap="round"
        />
        {/* progress */}
        <path
          d={`M ${cx - R} ${cy} A ${R} ${R} 0 ${largeArcFlag} ${sweepFlag} ${endX} ${endY}`}
          fill="none"
          stroke="#0F766E"
          strokeWidth="10"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

/* ---------- page ---------- */

export default function Page() {
  const [segment, setSegment] = useState<Segment>("Council");

  const [employees, setEmployees] = useState(250);
  const [payCycles, setPayCycles] = useState(26);
  const [avgHoursPerCycle, setAvgHoursPerCycle] = useState(8);
  const [errorRate, setErrorRate] = useState(3);
  const [hourlyRate, setHourlyRate] = useState(55);

  const [recordEff, setRecordEff] = useState(5.5);
  const [penaltyBand, setPenaltyBand] =
    useState<"Low" | "Medium" | "High">("Low");
  const [incidentProb, setIncidentProb] = useState(8);

  const {
    efficiencyPercent,
    currentAdminCost,
    totalAnnualSavings,
    totalAdminHours,
    breakdown,
  } = useMemo(() => {
    // baseline admin
    const currentAdminHours = payCycles * avgHoursPerCycle;
    const currentAdminCost = currentAdminHours * hourlyRate;

    // segment weighting
    const w = SAVINGS_WEIGHTS[segment];
    const efficiencyFactor = segment === "Enterprise" ? 0.8 : 0.4;
    const errorFactor = segment === "Enterprise" ? 0.8 : 1.0;

    const manualSavings =
      currentAdminCost * w.manual * (1 - efficiencyFactor);
    const complianceSavings =
      currentAdminCost * w.compliance * (1 - efficiencyFactor);
    const errorSavings =
      currentAdminCost * w.errors * (errorRate / 100) * errorFactor;

    const bandRange =
      penaltyBand === "High"
        ? [30000, 100000]
        : penaltyBand === "Medium"
        ? [10000, 30000]
        : [0, 5000];
    const avgPenalty = (bandRange[0] + bandRange[1]) / 2;
    const complianceRiskAvoidance = (avgPenalty * incidentProb) / 100;

    const recordSavings = (currentAdminCost * recordEff) / 100;

    const totalAnnualSavings =
      manualSavings +
      complianceSavings +
      errorSavings +
      complianceRiskAvoidance +
      recordSavings;

    const totalAdminHours =
      (manualSavings + complianceSavings + errorSavings) / hourlyRate;

    const efficiencyPercent = Math.min(
      100,
      Math.round(
        ((manualSavings + complianceSavings + errorSavings) / currentAdminCost) *
          100
      )
    );

    return {
      efficiencyPercent,
      currentAdminCost,
      totalAnnualSavings,
      totalAdminHours,
      breakdown: {
        manualSavings,
        complianceSavings,
        errorSavings,
        complianceRiskAvoidance,
        recordSavings,
      },
    };
  }, [
    segment,
    payCycles,
    avgHoursPerCycle,
    errorRate,
    hourlyRate,
    recordEff,
    penaltyBand,
    incidentProb,
  ]);

  return (
    <main className="mx-auto max-w-7xl p-6">
      <h1 className="mb-4 text-3xl font-bold tracking-tight text-slate-900">
        Datapay ROI / Efficiency Calculator
      </h1>

      <div className="grid gap-5 md:grid-cols-3">
        {/* Inputs */}
        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-slate-800">Inputs</h2>

          <div className="space-y-4">
            <div>
              <Label info="Total staff paid by this payroll.">Employees</Label>
              <input
                type="number"
                className="input"
                value={employees}
                onChange={(e) => setEmployees(Number(e.target.value))}
              />
            </div>

            <div>
              <Label info="How often you run payroll.">Pay cycles per year</Label>
              <select
                className="input"
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
              <Label info="Average time to prepare, validate and run each payroll.">
                Avg payroll hours / cycle
              </Label>
              <input
                type="range"
                min={1}
                max={40}
                value={avgHoursPerCycle}
                onChange={(e) => setAvgHoursPerCycle(Number(e.target.value))}
                className="w-full"
              />
              <div className="mt-1 text-sm text-slate-600">
                {avgHoursPerCycle} hours
              </div>
            </div>

            <div>
              <Label info="Percent of cycles requiring manual fixes or rework.">
                Error correction rate (%)
              </Label>
              <input
                type="range"
                min={0}
                max={10}
                value={errorRate}
                onChange={(e) => setErrorRate(Number(e.target.value))}
                className="w-full"
              />
              <div className="mt-1 text-sm text-slate-600">{errorRate}%</div>
            </div>

            <div>
              <Label info="Blended hourly cost for payroll/HR staff.">
                Hourly rate ($)
              </Label>
              <input
                type="number"
                className="input"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(Number(e.target.value))}
              />
            </div>

            <div>
              <Label info="Efficiency gain from digital record-keeping and audit readiness.">
                Record-keeping efficiency (%)
              </Label>
              <input
                type="range"
                min={0}
                max={20}
                value={recordEff}
                onChange={(e) => setRecordEff(Number(e.target.value))}
                className="w-full"
              />
              <div className="mt-1 text-sm text-slate-600">{recordEff}%</div>
            </div>

            <div>
              <Label info="Typical penalty band avoided through improved compliance accuracy.">
                Compliance penalty band
              </Label>
              <select
                className="input"
                value={penaltyBand}
                onChange={(e) =>
                  setPenaltyBand(e.target.value as "Low" | "Medium" | "High")
                }
              >
                <option value="Low">Low ($0–$5,000)</option>
                <option value="Medium">Medium ($10,000–$30,000)</option>
                <option value="High">High ($30,000–$100,000)</option>
              </select>
            </div>

            <div>
              <Label info="Estimated chance of a compliance incident per year.">
                Incident probability (annual %)
              </Label>
              <input
                type="range"
                min={0}
                max={20}
                value={incidentProb}
                onChange={(e) => setIncidentProb(Number(e.target.value))}
                className="w-full"
              />
              <div className="mt-1 text-sm text-slate-600">{incidentProb}%</div>
            </div>
          </div>
        </section>

        {/* Gauge + Breakdown */}
        <section className="rounded-2xl bg-white p-5 text-slate-800 shadow-sm">
          <h2 className="mb-1 text-base font-semibold">Efficiency potential</h2>

          <Gauge value={efficiencyPercent} />

          <h3 className="mt-4 text-sm font-semibold">
            Your total annual ROI breakdown
          </h3>
          <div className="mt-2 space-y-2 text-sm">
            <div className="kpi rounded-xl border border-slate-200 px-4 py-2">
              <span>Efficiency (time saved)</span>
              <span className="font-medium">
                ${Math.round(
                  breakdown.manualSavings +
                    breakdown.complianceSavings +
                    breakdown.errorSavings
                ).toLocaleString()}
              </span>
            </div>

            <div className="kpi rounded-xl border border-slate-200 px-4 py-2">
              <span>Compliance & risk avoidance</span>
              <span className="font-medium">
                ${Math.round(breakdown.complianceRiskAvoidance).toLocaleString()}
              </span>
            </div>

            <div className="kpi rounded-xl border border-slate-200 px-4 py-2">
              <span>Record-keeping & reporting</span>
              <span className="font-medium">
                ${Math.round(breakdown.recordSavings).toLocaleString()}
              </span>
            </div>
          </div>
        </section>

        {/* Headline impact */}
        <aside className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-slate-800">
            Your headline impact
          </h2>

          <div className="space-y-2 text-sm">
            <div className="kpi rounded-xl border border-slate-200 px-4 py-2">
              <span>Total annual savings</span>
              <span className="font-semibold">
                ${Math.round(totalAnnualSavings).toLocaleString()}
              </span>
            </div>

            <div className="kpi rounded-xl border border-slate-200 px-4 py-2">
              <span>Admin time cost (current)</span>
              <span className="font-semibold">
                ${Math.round(currentAdminCost).toLocaleString()}
              </span>
            </div>

            <div className="kpi rounded-xl border border-slate-200 px-4 py-2">
              <span>Hours back to team</span>
              <span className="font-semibold">
                {Math.round(totalAdminHours).toLocaleString()} hrs / yr
              </span>
            </div>
          </div>

          <button
            className="btn mt-4 w-full rounded-xl bg-teal-700 px-4 py-3 font-medium text-white hover:bg-teal-800"
            onClick={() => window.open("https://cal.com/", "_blank")}
          >
            📅 Book a 20-min discovery
          </button>
        </aside>
      </div>

      {/* Top/right action badges */}
      <div className="mt-6 flex flex-wrap gap-2">
        {SEGMENTS.map((s) => (
          <button
            key={s}
            onClick={() => setSegment(s)}
            className={[
              "badge rounded-full border px-4 py-1 text-sm",
              segment === s ? "bg-teal-700 text-white" : "bg-white",
            ].join(" ")}
            title={
              s === "Council"
                ? "Weighted to public-sector teams: more manual handling, moderate compliance risk."
                : "Weighted to mixed/complex teams: higher automation potential, higher compliance exposure."
            }
          >
            {s}
          </button>
        ))}
        <button className="badge rounded-full border bg-white px-4 py-1 text-sm">
          Share
        </button>
        <button
          className="badge rounded-full border bg-white px-4 py-1 text-sm"
          onClick={() => window.print()}
        >
          Export PDF
        </button>
      </div>
    </main>
  );
}

/* ---------- tiny Tailwindy inputs ---------- */
/* If you already have these in globals.css, keep yours. These are here
   just so this file works as-is with your existing styles. */

declare global {
  interface HTMLElementTagNameMap {
    // allow 'input' className usage w/out TS complaining in some setups
    input: HTMLInputElement;
  }
}
