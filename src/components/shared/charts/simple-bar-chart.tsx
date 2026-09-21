"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

export function SimpleBarChart({
  data,
  xKey,
  yKey,
  color = "hsl(var(--primary))",
  colorKey,
  height = 260,
  horizontal = false,
}: {
  data: Record<string, string | number>[];
  xKey: string;
  yKey: string;
  color?: string;
  /** Name of a field on each row holding its own pre-computed color string (e.g. "hsl(var(--success))") —
   * a function prop can't cross the Server->Client boundary, so per-bar coloring is data-driven instead. */
  colorKey?: string;
  height?: number;
  horizontal?: boolean;
}) {
  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout={horizontal ? "vertical" : "horizontal"} margin={{ top: 8, right: 16, left: horizontal ? 8 : -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          {horizontal ? (
            <>
              <XAxis type="number" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis type="category" dataKey={xKey} width={110} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
            </>
          ) : (
            <>
              <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} interval={0} angle={-20} textAnchor="end" height={50} />
              <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
            </>
          )}
          <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
          <Bar dataKey={yKey} radius={[4, 4, 4, 4]}>
            {data.map((row, i) => (
              <Cell key={i} fill={colorKey ? String(row[colorKey] ?? color) : color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
