/**
 * Gráfica temperatura–tiempo del programa (Recharts, open source).
 * Dibuja el perfil completo previsto y una línea vertical con la posición
 * actual de la simulación.
 */
import { useMemo } from "react";
import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { profilePoints, type Segment } from "@/lib/pcr/simulation";

export function TempChart({ segments, currentMin }: { segments: Segment[]; currentMin?: number }) {
  const data = useMemo(() => profilePoints(segments), [segments]);
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
        <defs>
          <linearGradient id="tempFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="var(--lcd-dim)" strokeOpacity={0.2} />
        <XAxis dataKey="min" type="number" domain={[0, "dataMax"]} tickFormatter={(v) => `${Math.round(v)}′`} stroke="var(--lcd-dim)" fontSize={12} />
        <YAxis domain={[0, 100]} ticks={[4, 25, 50, 72, 95]} stroke="var(--lcd-dim)" fontSize={12} />
        <Area type="linear" dataKey="temp" stroke="var(--chart-1)" strokeWidth={2} fill="url(#tempFill)" isAnimationActive={false} />
        {currentMin !== undefined && <ReferenceLine x={currentMin} stroke="var(--amber)" strokeWidth={2} />}
      </AreaChart>
    </ResponsiveContainer>
  );
}
