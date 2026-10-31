import { useState } from "react";
import { useTr } from "@/lib/i18n/tr";
import { Button } from "@/components/ui/button";
import { ManualMix } from "./ManualMix";
import { NumPad, type NumPadRequest } from "./NumPad";
import { expectedRows, REAGENT_KEYS, type MasterMixSettings, type ReagentKey } from "@/lib/pcr/practice";
import { applyTeacherAnswer, teacherAnswer } from "@/lib/pcr/manual-editor";

const LABELS: Record<ReagentKey, string> = {
  buffer: "Tampón de reacción (10×)", mg: "MgCl₂ (25 mM)", dntp: "dNTPs (10 mM c/u)",
  fwd: "Cebador F (10 µM)", rev: "Cebador R (10 µM)", dmso: "DMSO", enzyme: "Taq (5 U/µL)",
  template: "ADN molde", water: "Agua libre de nucleasas",
};

export function ManualMixEditor({ mix, onChange, showMix }: { mix: MasterMixSettings; onChange: (next: MasterMixSettings) => void; showMix: boolean }) {
  const [pad, setPad] = useState<NumPadRequest | null>(null);
  const rows = expectedRows(mix);
  const tr = useTr();
  const numeric = (key: "volume" | "samples") => setPad({
    title: tr(key === "volume" ? "Volumen por reacción" : "Nº total de reacciones"), value: mix[key],
    unit: key === "volume" ? "µL" : tr("tubos"), min: key === "volume" ? 0.1 : 1, max: key === "volume" ? 5000 : 200,
    allowDecimal: key === "volume", onConfirm: n => onChange({ ...mix, [key]: key === "samples" ? Math.round(n) : n }),
  });
  const toggle = (key: ReagentKey, enabled: boolean) => {
    const next = enabled ? [...rows, { key, label: LABELS[key], per: 0 }] : rows.filter(r => r.key !== key);
    const ordered = REAGENT_KEYS.flatMap(k => next.filter(r => r.key === k));
    onChange({ ...mix, manual: { rows: ordered, totals: Object.fromEntries(ordered.map(r => [r.key, mix.manual?.totals?.[r.key] ?? 0])) } });
  };
  return <section className="space-y-5" aria-label={tr("Solución de los pocillos")}>
    <div className="flex flex-wrap gap-4">
      <label className="flex items-center gap-3 text-sm">{tr("Volumen por reacción")}<Button variant="outline" className="h-12 min-w-28 font-mono" onClick={() => numeric("volume")}>{mix.volume} µL</Button></label>
      <label className="flex items-center gap-3 text-sm">{tr("Nº total de reacciones")}<Button variant="outline" className="h-12 min-w-28 font-mono" onClick={() => numeric("samples")}>{mix.samples} {tr("tubos")}</Button></label>
    </div>
    {showMix && <>
      <fieldset className="grid gap-3 border-y py-4 sm:grid-cols-2 lg:grid-cols-3">
        <legend className="px-1 font-display text-ice">{tr("Reactivos y concentraciones de stock")}</legend>
        {REAGENT_KEYS.map(key => {
          const row = rows.find(r => r.key === key);
          return <div key={key} className="flex min-w-0 items-center gap-2">
            <input type="checkbox" aria-label={`${tr("Incluir")} ${tr(LABELS[key])}`} checked={!!row} onChange={e => toggle(key, e.target.checked)} className="size-5 shrink-0 accent-primary" />
            <input aria-label={`${tr("Nombre y stock")}: ${key}`} value={row?.label ?? LABELS[key]} disabled={!row} onChange={e => onChange({ ...mix, manual: { rows: rows.map(r => r.key === key ? { ...r, label: e.target.value } : r), totals: mix.manual?.totals } })} className="h-12 w-full min-w-0 rounded-md border bg-panel px-3 text-sm disabled:opacity-40" />
          </div>;
        })}
      </fieldset>
      <h2 className="font-display text-xl text-ice">{tr("Volúmenes correctos")}</h2>
      <ManualMix reagents={rows} volume={mix.volume} answer={teacherAnswer(mix)} onChange={a => onChange(applyTeacherAnswer(mix, a))} celebrate={0} />
    </>}
    <NumPad req={pad} onClose={() => setPad(null)} />
  </section>;
}