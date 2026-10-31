/**
 * Diálogo táctil para poner nombre a un paso: propone uno según el paso
 * anterior, permite elegir un nombre habitual o escribir uno propio.
 */
import { useTr } from "@/lib/i18n/tr";
import { Check } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { STEP_NAME_GROUPS } from "@/lib/pcr/step-names";
import { cn } from "@/lib/utils";
import { OptionPopup } from "./OptionPopup";

export function StepNameDialog({ current, suggestion, onPick, onClose }: {
  /** Nombre que tiene ahora el paso. */
  current: string;
  /** Nombre que propone el programa según el paso anterior. */
  suggestion?: string | undefined;
  onPick: (label: string) => void;
  onClose: () => void;
}) {
  const [custom, setCustom] = useState("");
  const tr = useTr();
  const proposed = (suggestion ?? "").trim() || current;
  const apply = (label: string) => { const clean = label.trim(); if (clean) onPick(clean); };
  return <OptionPopup onClose={onClose} content={{
    title: tr("Nombre del paso"),
    subtitle: tr("Toca un nombre o escribe uno propio"),
    body: <div className="space-y-4">
      <div>
        <p className="mb-2 font-mono text-xs text-muted-foreground">{tr("SUGERIDO SEGÚN EL PASO ANTERIOR")}</p>
        <Button className="h-12 w-full border-ice/50 bg-ice/10 text-ice" onClick={() => apply(proposed)}><Check /> {tr(proposed)}</Button>
      </div>
      {STEP_NAME_GROUPS.map(group => <div key={group.group}>
        <p className="mb-2 font-mono text-xs text-muted-foreground">{tr(group.group).toUpperCase()}</p>
        <div className="flex flex-wrap gap-1.5">{group.names.map(name => <Button key={name} variant="outline" className={cn("h-12", name === current && "border-ice bg-ice/10 text-ice")} onClick={() => apply(name)}>{tr(name)}</Button>)}</div>
      </div>)}
      <label className="block text-sm text-muted-foreground">{tr("Nombre personalizado")}
        <input className="mt-1 w-full rounded-sm border border-input bg-background p-3 text-base text-foreground" value={custom} onChange={e => setCustom(e.target.value)} placeholder={tr(proposed)} />
      </label>
      <div className="flex justify-end gap-2">
        <Button variant="outline" className="h-12" onClick={onClose}>{tr("Cancelar")}</Button>
        <Button className="h-12 bg-run text-run-foreground" disabled={!custom.trim()} onClick={() => apply(custom)}><Check /> {tr("Aplicar")}</Button>
      </div>
    </div>,
  }} />;
}
