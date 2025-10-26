"use client";
import { useMemo, useState } from "react";

type PayCycle = { label: string; value: number };
const PAY_CYCLES: PayCycle[] = [
  { label: "52 (Weekly)", value: 52 },
  { label: "26 (Fortnightly)", value: 26 },
  { label: "24 (Semi-monthly)", value: 24 },
  { label: "12 (Monthly)", value: 12 },
];

export default function Page() {
  const [employees, setEmployees] = useState(250);
  const [payCycles, setPayCycles] = useState(26);
  const [avgHoursPerCycle, setAvgHoursPerCycle] = useState(8);
  const [errorRatePct, setErrorRatePct] = useState(3);
  const [hourlyRate, setHourlyRate] = useState(55);

  const { currentAdminHours, currentAdminCost, hoursBackToTeam, totalAnnualSavings, efficiencyPct } =
    useMemo(() => {
      const currentAdminHours = payCycles * avgHoursPerCycle;
      const currentAdminCost = currentAdminHours * hourlyRate;
      const hoursBackToTeam = currentAdminHours * (errorRatePct / 100);
      const totalAnnualSavings = hoursBackToTeam * hourlyRate;
      const efficiencyPct = Math.min(100, Math.round(errorRatePct * 25));
      return { currentAdminHours, currentAdminCost, hoursBackToTeam, totalAnnualSavings, efficiencyPct };
    }, [payCycles, avgHoursPerCycle, errorRatePct, hourlyRate]);

  const nzMoney = (n: number) =>
    n.toLocaleString("en-NZ", { style: "currency", currency: "NZD", maximumFractionDigits: 0 });

  return (
    <main className="min-h-screen px-6 py-8 bg-slate-50">
      {/* HEADER */}
      <header className="max-w-7xl mx-auto flex justify-between items-center mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-slate-800">
          Datapay ROI / Efficiency Calculator
        </h1>
        <div className="flex gap-3 flex-wrap">
          {["Council", "Enterprise", "Share", "Export PDF"].map((t) => (
            <span key={t} className="badge bg-white">
              {t}
            </span>
          ))}
        </div>
      </header>

      {/* GRID */}
      <div className="max-w-7xl mx-auto grid lg:grid-cols-3 gap-6">
        {/* INPUTS */}
        <section className="card card-pad">
          <h2 className="text-xl font-semibold mb-6">Inputs</h2>

          <div className="space-y-5">
            <div>
              <label className="label">Employees</label>
              <input
                className="input"
                type="number"
                value={employees}
                onChange={(e) => setEmployees(+e.target.value)}
              />
            </div>

            <div>
              <label className="label">Pay cycles per year</label>
              <select
                className="select"
                value={payCycles}
                onChange={(e) => setPayCycles(+e.target.value)}
              >
                {PAY_CYCLES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Avg payroll hours / cycle</label>
              <input
                className="slider"
                type="range"
                min={1}
                max={20}
                step={0.5}
                value={avgHoursPerCycle}
                onChange={(e) => setAvgHoursPerCycle(+e.target.value)}
              />
              <p className="text-sm text-slate-600 mt-1">{avgHoursPerCycle} hours</p>
            </div>

            <div>
              <label className="label">Error correction rate (%)</label>
              <input
                className="slider"
                type="range"
                min={0}
                max={10}
                step={0.5}
                value={errorRatePct}
                onChange={(e) => setErrorRatePct(+e.target.value)}
              />
              <p className="text-sm text-slate-600 mt-1">{errorRatePct}%</p>
            </div>

            <div>
              <label className="label">Hourly rate ($)</label>
              <input
                className="input"
                type="number"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(+e.target.value)}
              />
            </div>
          </div>
        </section>

        {/* DIAL */}
        <section className="card card-pad flex flex-col items-center">
          <div className="mb-4 flex items-center justify-between w-full">
            <h3 className="text-lg font-semibold">Efficiency potential</h3>
            <span className="badge">Estimated ROI band</span>
          </div>

          <div className="relative w-full max-w-md h-48 flex items-center justify-center">
            <svg viewBox="0 0 100 60" className="w-full">
              <path
                d="M10,60 A40,40 0 0,1 90,60"
                fill="none"
                stroke="#e2e8f0"
                strokeWidth="12"
                strokeLinecap="round"
              />
              <path
                d="M10,60 A40,40 0 0,1 90,60"
                fill="none"
                stroke="#0f766e"
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={`${(efficiencyPct / 100) * 126} 126`}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative top-4 text-4xl font-bold text-slate-700">
                {efficiencyPct}%
              </div>
            </div>
          </div>
        </section>

        {/* KPIs */}
        <section className="card card-pad flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-semibold mb-4">Your headline impact</h3>

            <div className="space-y-2">
              <div className="kpi">
                <span>Total annual savings</span>
                <span className="value">{nzMoney(totalAnnualSavings)}</span>
              </div>
              <div className="kpi">
                <span>Admin time cost (current)</span>
                <span className="value">{nzMoney(currentAdminCost)}</span>
              </div>
              <div className="kpi">
                <span>Hours back to team</span>
                <span className="value">
                  {Math.round(hoursBackToTeam).toLocaleString()} hrs / yr
                </span>
              </div>
            </div>
          </div>

          <a
            href="https://cal.com"
            target="_blank"
            rel="noreferrer"
            className="btn mt-6 self-start"
          >
            Book a 20-min discovery
          </a>
        </section>
      </div>
    </main>
  );
}
