/**
 * Tabla de volúmenes escrita a mano por el alumno junto a un tubo virtual.
 * El selector alterna entre 1 reacción y master mix; el tubo muestra cada
 * reactivo como una capa de color proporcional a su volumen.
 */
import { useState } from "react";
import type { ManualAnswer, ReagentKey } from "@/lib/pcr/practice";
import { NumPad, type NumPadRequest } from "@/components/sim/NumPad";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type Kind = "single" | "mix";

/** Consumibles estandarizados de laboratorio. */
const TUBES = [
  { id: "pcr01", label: "Tubo qPCR perfil bajo 0.1 mL", capacity: 100, width: 40 },
  { id: "pcr02", label: "Tubo PCR 0.2 mL", capacity: 200, width: 46 },
  { id: "pcr05", label: "Tubo PCR 0.5 mL", capacity: 500, width: 56 },
  { id: "epp15", label: "Eppendorf 1.5 mL", capacity: 1500, width: 74 },
  { id: "epp20", label: "Eppendorf 2.0 mL", capacity: 2000, width: 80 },
  { id: "con50", label: "Tubo cónico 5 mL", capacity: 5000, width: 92 },
] as const;

const color = (key: ReagentKey) => `var(--reagent-${key})`;
const fmt = (v: number) => (Math.round(v * 1000) / 1000).toString();

export function ManualMix({ reagents, volume, answer, onChange, celebrate }: {
  reagents: { key: ReagentKey; label: string }[];
  volume: number;
  answer: ManualAnswer;
  onChange: (a: ManualAnswer) => void;
  /** Cambia de valor cada vez que la mezcla se verifica correcta: dispara las burbujas. */
  celebrate: number;
}) {
  const [kind, setKind] = useState<Kind>("single");
  const [tubeBy, setTubeBy] = useState<Record<Kind, string>>({ single: "pcr02", mix: "epp15" });
  const [pad, setPad] = useState<NumPadRequest | null>(null);
  const [focus, setFocus] = useState<ReagentKey | null>(null);

  const values = kind === "single" ? answer.single : answer.mix;
  const locked = (key: ReagentKey) => kind === "mix" && key === "template";
  const layers = reagents.map(r => ({ ...r, v: locked(r.key) ? 0 : (values[r.key] ?? 0) })).filter(l => l.v > 0);
  const total = layers.reduce((a, l) => a + l.v, 0);
  const tube = TUBES.find(t => t.id === tubeBy[kind]) ?? TUBES[0];
  const fill = Math.min(total / tube.capacity, 1);
  const overflow = total > tube.capacity;
  const focused = layers.find(l => l.key === focus);
  const target = kind === "single" ? volume : undefined;

  const setValue = (key: ReagentKey, v: number) => onChange({ ...answer, [kind]: { ...values, [key]: v } });
  const editRow = (key: ReagentKey, label: string) => setPad({ title: `${label} · ${kind === "single" ? "1 reacción" : "master mix"}`, value: values[key] ?? 0, unit: "µL", allowDecimal: true, min: 0, max: 5000, onConfirm: v => setValue(key, v) });
  const editTubes = () => setPad({ title: "Nº total de reacciones", value: answer.tubes ?? 0, unit: "tubos", min: 1, max: 200, onConfirm: v => onChange({ ...answer, tubes: Math.round(v) }) });

  return <div className="grid gap-6 md:grid-cols-[minmax(220px,280px)_1fr]">
    {/* Tubo virtual */}
    <div className="flex flex-col gap-3 rounded-lg border bg-panel p-4">
      <label className="text-xs font-mono uppercase text-muted-foreground" htmlFor="tube-size">Tamaño de tubo</label>
      <select id="tube-size" value={tube.id} onChange={e => setTubeBy({ ...tubeBy, [kind]: e.target.value })} className="h-11 rounded-md border bg-background px-3 text-sm">
        {TUBES.map(t => <option key={t.id} value={t.id}>{t.label} ({t.capacity} µL)</option>)}
      </select>
      <p className={cn("text-xs", overflow ? "text-destructive" : "text-muted-foreground")}>Llenado: {fmt(total)} / {tube.capacity} µL ({Math.round(total / tube.capacity * 100)} %)</p>

      <div className={cn("relative mx-auto mt-2 flex h-72 flex-col items-center", overflow && "tube-shake")} aria-hidden>
        {/* Gota que cae al añadir volumen */}
        {total > 0 && <span key={`drop-${total}`} className="tube-drop absolute top-0 left-1/2 z-10 size-2.5 -translate-x-1/2 rounded-full bg-ice" />}
        {/* Tapa */}
        <div className="h-3 rounded-t-sm border border-b-0 bg-muted/40 transition-all duration-500" style={{ width: tube.width + 10 }} />
        {/* Cuerpo con fondo cónico */}
        <div key={tube.id} className="tube-swap relative flex-1 transition-all duration-500" style={{ width: tube.width }}>
          <div className={cn("absolute inset-0 bg-foreground/10", overflow && "bg-destructive/30")} style={{ clipPath: "polygon(0 0,100% 0,100% 72%,62% 100%,38% 100%,0 72%)" }} />
          <div className="absolute inset-[2px]" style={{ clipPath: "polygon(0 0,100% 0,100% 72%,62% 100%,38% 100%,0 72%)" }}>
            <div className="absolute inset-0 bg-background/80" />
            {/* Capas de líquido: la primera fila queda al fondo, el agua arriba */}
            <div className="absolute inset-x-0 bottom-0 flex flex-col-reverse transition-[height] duration-700 ease-out" style={{ height: `${fill * 100}%` }}>
              {layers.map(l => <div key={l.key} onMouseEnter={() => setFocus(l.key)} onMouseLeave={() => setFocus(null)} onClick={() => setFocus(focus === l.key ? null : l.key)}
                className={cn("tube-layer w-full transition-[height,filter,opacity] duration-700 ease-out", focus && focus !== l.key && "opacity-50", focus === l.key && "brightness-125")}
                style={{ height: `${l.v / total * 100}%`, minHeight: 1, background: color(l.key) }} />)}
            </div>
            {/* Menisco cóncavo: más hondo cuanto más ancho el tubo y más líquido (como en la realidad) */}
            {total > 0 && !overflow && <div key={`m-${total}`} className="tube-wave absolute inset-x-0 rounded-b-[50%] border-b border-foreground/30 bg-background/80 transition-[top,height] duration-700"
              style={{ top: `${(1 - fill) * 100}%`, height: Math.min(2.1 * (2 + tube.width / 18) * (0.5 + 0.5 * fill), fill * 272 * 0.6) }} />}
            {/* Burbujas de mezcla correcta */}
            {celebrate > 0 && <div key={celebrate} className="absolute inset-0">{[10, 24, 38, 52, 66, 80, 90, 30, 60].map((x, i) => <span key={i} className="tube-bubble absolute bottom-2 size-2 rounded-full border border-foreground/40 bg-background/40" style={{ left: `${x}%`, animationDelay: `${i * 0.15}s` }} />)}</div>}
          </div>
          {/* Graduaciones */}
          {[0.25, 0.5, 0.75].map(f => <div key={f} className="absolute -right-12 flex items-center gap-1 text-[10px] font-mono text-muted-foreground" style={{ bottom: `${f * 100}%` }}><span className="h-px w-3 bg-muted-foreground" />{tube.capacity * f >= 1000 ? `${tube.capacity * f / 1000} mL` : `${tube.capacity * f} µL`}</div>)}
          {overflow && <div className="tube-spill absolute -top-4 left-1/2 h-4 w-[110%] -translate-x-1/2 rounded-t-full bg-destructive/70" />}
          {overflow && [20, 50, 80].map((x, i) => <span key={x} className="tube-overflow-drip absolute top-0 size-1.5 rounded-full bg-destructive" style={{ left: `${x}%`, animationDelay: `${i * 0.35}s` }} />)}
        </div>
      </div>

      <div className="min-h-12 rounded-md border bg-background p-2 text-xs" aria-live="polite">
        {overflow ? <p className="font-medium text-destructive">Desborde: +{fmt(total - tube.capacity)} µL sobre la capacidad del tubo.</p>
          : focused ? <p><span className="mr-2 inline-block size-3 rounded-sm align-middle" style={{ background: color(focused.key) }} /><b>{focused.label}</b>: {fmt(focused.v)} µL · {(focused.v / total * 100).toFixed(1)} % de la mezcla · {(focused.v / tube.capacity * 100).toFixed(2)} % del tubo</p>
          : <p className="text-muted-foreground">Toca o pasa el ratón por una capa para ver su proporción.</p>}
      </div>
    </div>

    {/* Tabla de volúmenes */}
    <div className="space-y-4">
      <div role="tablist" aria-label="Tipo de preparación" className="inline-flex rounded-full border bg-panel p-1">
        {(["single", "mix"] as const).map(k => <Button variant="ghost" key={k} role="tab" aria-selected={kind === k} onClick={() => { setKind(k); setFocus(null); }}
          className={cn("h-10 rounded-full px-4 text-sm transition-colors", kind === k ? "bg-ice text-background" : "text-muted-foreground")}>{k === "single" ? "1 reacción (1 tubo)" : "Master mix (N tubos)"}</Button>)}
      </div>
      {kind === "mix" && <div className="flex items-center justify-between gap-3 rounded-md border bg-panel px-4 py-2">
        <span className="text-sm">Nº total de reacciones</span>
        <Button variant="outline" onClick={editTubes} className="h-11 min-w-24 bg-background px-3 font-mono">{answer.tubes ?? "—"} tubos</Button>
      </div>}
      <table className="w-full text-sm">
        <thead><tr className="border-b text-left text-xs uppercase text-muted-foreground"><th className="py-2 font-normal">Reactivo</th><th className="py-2 text-right font-normal">VOLUMEN <span className="normal-case">(µL)</span></th></tr></thead>
        <tbody>{reagents.map(r => <tr key={r.key} className={cn("border-b", focus === r.key && "bg-panel")} onMouseEnter={() => setFocus(r.key)} onMouseLeave={() => setFocus(null)}>
          <td className="py-2"><span className="mr-3 inline-block size-3.5 rounded-sm align-middle" style={{ background: color(r.key) }} />{r.label}</td>
          <td className="py-1.5 text-right">{locked(r.key)
            ? <span className="inline-flex h-11 min-w-24 items-center justify-end px-3 font-mono text-muted-foreground">0 (aparte)</span>
            : <Button variant="outline" aria-label={`Volumen de ${r.label}`} onClick={() => editRow(r.key, r.label)} className="h-11 min-w-24 justify-end bg-background px-3 font-mono">{values[r.key] !== undefined ? fmt(values[r.key] ?? 0) : "—"}</Button>}</td>
        </tr>)}</tbody>
        <tfoot><tr><td className="pt-3 font-medium">Suma total</td><td className={cn("pt-3 text-right font-mono", target !== undefined && Math.abs(total - target) > 0.01 && total > 0 ? "text-amber" : "")}>{fmt(total)}{target !== undefined && ` / ${target}`} µL</td></tr></tfoot>
      </table>
    </div>
    <NumPad req={pad} onClose={() => setPad(null)} />
  </div>;
}
