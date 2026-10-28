"use client";
import {
  Bar, BarChart, CartesianGrid, Legend, Line, LineChart, PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart,
  ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

const axis = { stroke: "var(--ink-3)", fontSize: 11, tickLine: false, axisLine: false } as const;
const tooltipStyle = {
  contentStyle: { background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 12, fontSize: 12, color: "var(--ink)" },
  labelStyle: { color: "var(--ink-2)" },
  itemStyle: { color: "var(--ink)" },
};
const legendStyle = { fontSize: 12, color: "var(--ink-2)" };

/** Every chart also has a plain table for screen readers and exact numbers. */
export function TableView({ head, rows }: { head: string[]; rows: (string | number | null)[][] }) {
  return (
    <details className="mt-2 text-xs text-ink-2">
      <summary className="cursor-pointer">Show as table</summary>
      <div className="mt-2 max-h-60 overflow-auto">
        <table className="w-full">
          <thead><tr>{head.map((h) => <th key={h} className="py-1 text-left font-medium">{h}</th>)}</tr></thead>
          <tbody>{rows.map((r, i) => <tr key={i} className="border-t border-line">{r.map((c, j) => <td key={j} className="py-1 tabular-nums">{c ?? "–"}</td>)}</tr>)}</tbody>
        </table>
      </div>
    </details>
  );
}

export function AccuracyChart({ data }: { data: { label: string; accuracy: number | null; rolling7: number | null }[] }) {
  return (
    <>
      <div className="h-56" role="img" aria-label="Daily test accuracy over the last 30 days with a 7-day average">
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
            <CartesianGrid stroke="var(--grid)" vertical={false} />
            <XAxis dataKey="label" {...axis} interval="preserveStartEnd" minTickGap={24} />
            <YAxis domain={[0, 100]} {...axis} tickFormatter={(v) => `${v}%`} />
            <Tooltip {...tooltipStyle} formatter={(v) => (v === null || v === undefined ? "–" : `${v}%`)} />
            <Legend wrapperStyle={legendStyle} iconType="plainline" />
            <Line name="Daily" type="monotone" dataKey="accuracy" stroke="var(--series-2)" strokeWidth={2} dot={{ r: 4, strokeWidth: 2, stroke: "var(--surface)" }} connectNulls={false} isAnimationActive={false} />
            <Line name="7-day average" type="monotone" dataKey="rolling7" stroke="var(--series-1)" strokeWidth={2} dot={false} connectNulls isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <TableView head={["Day", "Daily %", "7-day %"]} rows={data.filter((d) => d.accuracy !== null).map((d) => [d.label, d.accuracy, d.rolling7])} />
    </>
  );
}

export function SpeedChart({ data }: { data: { label: string; avgSeconds: number | null }[] }) {
  return (
    <>
      <div className="h-44" role="img" aria-label="Average seconds per question by day">
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
            <CartesianGrid stroke="var(--grid)" vertical={false} />
            <XAxis dataKey="label" {...axis} interval="preserveStartEnd" minTickGap={24} />
            <YAxis {...axis} tickFormatter={(v) => `${v}s`} />
            <Tooltip {...tooltipStyle} formatter={(v) => (v === null || v === undefined ? "–" : `${v}s per item`)} />
            <Line name="Seconds per item" type="monotone" dataKey="avgSeconds" stroke="var(--series-1)" strokeWidth={2} dot={{ r: 4, strokeWidth: 2, stroke: "var(--surface)" }} connectNulls isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <TableView head={["Day", "Seconds/item"]} rows={data.filter((d) => d.avgSeconds !== null).map((d) => [d.label, d.avgSeconds])} />
    </>
  );
}

export function CategoryRadar({ data }: { data: { category: string; accuracy: number; n: number }[] }) {
  const short = data.map((d) => ({ ...d, short: d.category.split(/[ &,]/)[0] }));
  return (
    <>
      <div className="h-64" role="img" aria-label="Accuracy by category">
        <ResponsiveContainer>
          <RadarChart data={short} outerRadius="70%">
            <PolarGrid stroke="var(--grid)" />
            <PolarAngleAxis dataKey="short" tick={{ fill: "var(--ink-2)", fontSize: 11 }} />
            <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
            <Tooltip {...tooltipStyle} formatter={(v, _n, p) => [`${v}% (${(p.payload as { n: number }).n} questions)`, (p.payload as { category: string }).category]} />
            <Radar name="Accuracy" dataKey="accuracy" stroke="var(--series-1)" fill="var(--series-1)" fillOpacity={0.18} strokeWidth={2} isAnimationActive={false} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      <TableView head={["Category", "Accuracy %", "Questions"]} rows={data.map((d) => [d.category, d.accuracy, d.n])} />
    </>
  );
}

export function RubricBars({ data }: { data: { criterion: string; first: number | null; recent: number | null }[] }) {
  const hasRecent = data.some((d) => d.recent !== null);
  return (
    <>
      <div className="h-64" role="img" aria-label="Studio rubric scores: first five sheets compared with the latest five">
        <ResponsiveContainer>
          <BarChart data={data} layout="vertical" margin={{ top: 4, right: 12, bottom: 0, left: 8 }} barGap={2} barCategoryGap="28%">
            <CartesianGrid stroke="var(--grid)" horizontal={false} />
            <XAxis type="number" domain={[0, 100]} {...axis} tickFormatter={(v) => `${v}%`} />
            <YAxis type="category" dataKey="criterion" {...axis} width={96} />
            <Tooltip {...tooltipStyle} cursor={{ fill: "var(--surface-2)" }} formatter={(v) => (v === null || v === undefined ? "–" : `${v}%`)} />
            {hasRecent && <Legend wrapperStyle={legendStyle} />}
            <Bar name="First 5 sheets" dataKey="first" fill="var(--series-2)" radius={[0, 4, 4, 0]} isAnimationActive={false} />
            {hasRecent && <Bar name="Latest 5 sheets" dataKey="recent" fill="var(--series-1)" radius={[0, 4, 4, 0]} isAnimationActive={false} />}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <TableView head={["Criterion", "First 5", "Latest 5"]} rows={data.map((d) => [d.criterion, d.first, d.recent])} />
    </>
  );
}

export function ReadinessChart({ data, target }: { data: { label: string; readiness: number }[]; target: number }) {
  return (
    <>
      <div className="h-48" role="img" aria-label={`Readiness after each mock, target ${target}`}>
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 12, right: 12, bottom: 0, left: -18 }}>
            <CartesianGrid stroke="var(--grid)" vertical={false} />
            <XAxis dataKey="label" {...axis} />
            <YAxis domain={[0, 100]} {...axis} />
            <Tooltip {...tooltipStyle} />
            <ReferenceLine y={target} stroke="var(--ink-3)" strokeDasharray="4 4" label={{ value: `Target ${target}`, position: "insideTopRight", fill: "var(--ink-2)", fontSize: 11 }} />
            <Line name="Readiness" type="monotone" dataKey="readiness" stroke="var(--series-1)" strokeWidth={2} dot={{ r: 4, strokeWidth: 2, stroke: "var(--surface)" }} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <TableView head={["Mock", "Readiness"]} rows={data.map((d) => [d.label, d.readiness])} />
    </>
  );
}
