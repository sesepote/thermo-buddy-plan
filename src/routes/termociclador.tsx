import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Play, Pause, Square, Pencil, FolderOpen, Copy, Trash2, Plus, Save, X, Thermometer, Clock3, Repeat2, Columns3, Activity, Grid3X3, Settings2, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScreenHeader } from "@/components/sim/ScreenHeader";
import { StatusBars } from "@/components/sim/StatusBars";
import { ProgramEditor } from "@/components/sim/ProgramEditor";
import { TempChart } from "@/components/sim/TempChart";
import { Plate96 } from "@/components/sim/Plate96";
import { NumPad, type NumPadRequest } from "@/components/sim/NumPad";
import { useApp } from "@/lib/store";
import { useThermocyclerSession } from "@/lib/thermocycler-session";
import { buildSegments, stateAt, totalDuration, AMBIENT, stepTempAt } from "@/lib/pcr/simulation";
import { cloneProgram, formatTime, uid, type Program, type Step } from "@/lib/pcr/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/termociclador")({
  head: () => ({ meta: [
    { title: "Termociclador — Simulador PCR" },
    { name: "description", content: "Programa y ejecuta ciclos de PCR con perfil térmico, placa de 96 pocillos, gradiente y monitor en vivo." },
    { property: "og:title", content: "Termociclador — Simulador PCR" },
    { property: "og:description", content: "Simula y edita programas PCR en un termociclador táctil." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: Thermocycler,
});

const SPEEDS = [1, 10, 60, 300];
const newProgram = (): Program => ({
  id: uid(), name: "Programa nuevo", lidTemp: 105, rampRate: 3, stages: [
    { id: uid(), repeats: 1, steps: [{ id: uid(), label: "Desnaturalización inicial", temp: 95, time: 180 }] },
    { id: uid(), repeats: 30, steps: [
      { id: uid(), label: "Desnaturalización", temp: 95, time: 30 },
      { id: uid(), label: "Anillamiento", temp: 55, time: 30 },
      { id: uid(), label: "Extensión", temp: 72, time: 60 },
    ] },
    { id: uid(), repeats: 1, steps: [{ id: uid(), label: "Extensión final", temp: 72, time: 300 }] },
    { id: uid(), repeats: 1, steps: [{ id: uid(), label: "Conservación", temp: 4, time: 0 }] },
  ],
});

function Thermocycler() {
  const { programs, activeId, setActive, saveProgram, deleteProgram } = useApp();
  const program = programs.find((p) => p.id === activeId) ?? programs[0];
  const [view, setView] = useState<"profile" | "plate" | "edit" | "library">("profile");
  const [draft, setDraft] = useState<Program | null>(null);
  const [selected, setSelected] = useState<{ si: number; pi: number }>({ si: 0, pi: 0 });
  const [pad, setPad] = useState<NumPadRequest | null>(null);
  const [confirmStop, setConfirmStop] = useState(false);
  const { status, simTime, speed, lid, run, pause, stop, setSpeed } = useThermocyclerSession();
  const segments = useMemo(() => program ? buildSegments(program) : [], [program]);
  const total = useMemo(() => totalDuration(segments), [segments]);
  const state = stateAt(segments, simTime);
  if (!program) return null;

  const active = status !== "idle";
  const seg = state.segment;
  const selectedStep = program.stages[selected.si]?.steps[selected.pi] ?? program.stages[0]?.steps[0];
  const displayStep = active ? seg?.step ?? selectedStep : selectedStep;
  const locked = status === "running" || status === "paused";
  const temp = active ? state.temp : AMBIENT;
  const progress = Math.min(100, Math.max(0, simTime / (total || 1) * 100));
  const phase = { idle: "LISTO PARA PROGRAMAR", running: seg?.kind === "ramp" ? "RAMPA TÉRMICA" : "INCUBACIÓN", paused: "EN PAUSA", done: "CONSERVACIÓN / FINALIZADO" }[status];

  // La selección táctil permite editar valores sin salir del perfil; todas las pantallas comparten el mismo programa.
  const updateStep = (patch: Partial<Step>) => {
    if (locked) return;
    const stages = program.stages.map((stage, si) => si === selected.si ? {
      ...stage, steps: stage.steps.map((step, pi) => pi === selected.pi ? { ...step, ...patch } : step),
    } : stage);
    saveProgram({ ...program, stages });
  };
  const editValue = (kind: "temp" | "time") => {
    if (!selectedStep || locked) return;
    setPad(kind === "temp"
      ? { title: `${selectedStep.label}: temperatura`, value: selectedStep.temp, unit: "°C", allowDecimal: true, min: 4, max: 100, onConfirm: (v) => updateStep({ temp: v }) }
      : { title: `${selectedStep.label}: tiempo`, value: selectedStep.time, unit: "s", time: true, min: 0, max: 36000, onConfirm: (v) => updateStep({ time: Math.round(v) }) });
  };
  const addStep = () => {
    if (locked) return;
    const stages = program.stages.map((stage, si) => si === selected.si ? {
      ...stage, steps: [...stage.steps.slice(0, selected.pi + 1), { id: uid(), label: "Paso nuevo", temp: 72, time: 30 }, ...stage.steps.slice(selected.pi + 1)],
    } : stage);
    saveProgram({ ...program, stages });
    setSelected({ si: selected.si, pi: selected.pi + 1 });
  };
  const removeStep = () => {
    const stage = program.stages[selected.si];
    if (!stage || locked || (program.stages.length === 1 && stage.steps.length === 1)) return;
    const stages = stage.steps.length > 1
      ? program.stages.map((st, si) => si === selected.si ? { ...st, steps: st.steps.filter((_, pi) => pi !== selected.pi) } : st)
      : program.stages.filter((_, si) => si !== selected.si);
    saveProgram({ ...program, stages });
    setSelected(stage.steps.length > 1 ? { si: selected.si, pi: Math.max(0, selected.pi - 1) } : { si: Math.max(0, selected.si - 1), pi: 0 });
  };

  return (
    <StatusBars section="TERMOCICLADOR">
      <ScreenHeader title="Termociclador" subtitle={program.name} />
      <div className="flex w-full flex-1 flex-col gap-4 px-4 py-4 sm:px-6">
        {/* Monitor compacto, con los mismos datos que muestran las barras compartidas. */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className={cn("size-2.5 shrink-0 rounded-full", status === "running" ? "bg-run" : status === "paused" ? "bg-amber" : "bg-ice")} />
            <div className="min-w-0"><p className="truncate font-display text-base font-semibold text-foreground">{program.name}</p><p className="font-mono text-[11px] text-muted-foreground">{phase} · {program.stages.length} ETAPAS</p></div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" className="h-11" onClick={() => setView(view === "library" ? "profile" : "library")} disabled={locked}><FolderOpen /> Programas</Button>
            <Button variant="outline" className="h-11" onClick={() => { setDraft(structuredClone(program)); setView("edit"); }} disabled={locked}><Pencil /> Editar programa</Button>
          </div>
        </div>

        {view === "library" ? (
          <section className="mx-auto w-full max-w-4xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-display text-xl font-semibold">Biblioteca de programas</h2><Button className="h-12 bg-ice text-menu-bg" onClick={() => { setDraft(newProgram()); setView("edit"); }}><Plus /> Nuevo programa</Button></div>
            <div className="grid gap-2">
              {programs.map((p) => <div key={p.id} className={cn("flex items-center gap-2 border-b border-border py-2", p.id === program.id && "border-ice")}>
                <Button variant="ghost" className="h-auto min-h-14 min-w-0 flex-1 flex-col items-start gap-0 whitespace-normal text-left" onClick={() => { setActive(p.id); stop(); setSelected({ si: 0, pi: 0 }); setView("profile"); }}><span className="font-semibold">{p.name}</span><span className="font-mono text-xs text-muted-foreground">{p.stages.length} etapas · {formatTime(totalDuration(buildSegments(p)))}</span></Button>
                <Button variant="outline" size="icon" className="size-12" title="Duplicar" aria-label={`Duplicar ${p.name}`} onClick={() => saveProgram(cloneProgram(p, `${p.name} (copia)`))}><Copy /></Button>
                <Button variant="outline" size="icon" className="size-12 text-destructive" title="Eliminar" aria-label={`Eliminar ${p.name}`} disabled={programs.length <= 1} onClick={() => deleteProgram(p.id)}><Trash2 /></Button>
              </div>)}
            </div>
          </section>
        ) : view === "edit" && draft ? (
          <section className="min-w-0 space-y-4">
            <ProgramEditor program={draft} onChange={setDraft} />
            <div className="flex flex-wrap justify-end gap-2"><Button variant="outline" className="h-14 px-6" onClick={() => { setDraft(null); setView("profile"); }}><X /> Descartar</Button><Button className="h-14 bg-run px-6 text-run-foreground" onClick={() => { saveProgram(draft); setActive(draft.id); setSelected({ si: 0, pi: 0 }); setDraft(null); setView("profile"); }}><Save /> Guardar programa</Button></div>
          </section>
        ) : (
          <>
            <section className="grid min-w-0 gap-4 border-b border-border pb-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.7fr)]" aria-label="Monitor térmico">
              <div className="grid grid-cols-2 items-end gap-x-6 gap-y-3 sm:grid-cols-4">
                <div><p className="font-mono text-[11px] uppercase text-muted-foreground">Bloque · actual</p><p className="font-mono text-4xl font-bold tabular-nums text-lcd-foreground sm:text-5xl">{temp.toFixed(1)}<span className="text-xl">°</span></p></div>
                <div><p className="font-mono text-[11px] uppercase text-muted-foreground">Objetivo</p><p className="font-mono text-3xl tabular-nums text-ice sm:text-4xl">{displayStep ? stepTempAt(displayStep, active ? seg?.cycle ?? 1 : 1).toFixed(1) : "—"}<span className="text-lg">°</span></p></div>
                <div><p className="font-mono text-[11px] uppercase text-muted-foreground">Tapa calefactada</p><p className="font-mono text-2xl tabular-nums">{lid.toFixed(0)}<span className="text-sm text-muted-foreground"> / {program.lidTemp} °C</span></p></div>
                <div><p className="font-mono text-[11px] uppercase text-muted-foreground">Resta · paso</p><p className="font-mono text-2xl tabular-nums">{active ? formatTime(state.stepRemaining) : "--:--"}</p></div>
              </div>
              <div className="flex flex-col justify-between gap-3 border-l-0 lg:border-l lg:border-border lg:pl-5">
                <div><p className="font-mono text-[11px] uppercase text-muted-foreground">Paso actual</p><p className="truncate font-display text-lg font-medium">{active ? seg?.step.label ?? "—" : selectedStep?.label ?? "—"}</p><p className="font-mono text-xs text-muted-foreground">{active && seg ? `ETAPA ${seg.stageIndex + 1} · CICLO ${seg.cycle}/${seg.repeats} · ${seg.kind === "ramp" ? "RAMPA" : "MESETA"}` : `${program.rampRate} °C/s · ${formatTime(total)} TOTAL`}</p></div>
                <div className="h-1.5 overflow-hidden bg-muted" role="progressbar" aria-label="Avance de ejecución" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100}><div className="h-full bg-ice transition-[width]" style={{ width: `${progress}%` }} /></div>
              </div>
            </section>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex gap-1 border-b border-border">
                <Button variant="ghost" className={cn("h-12 rounded-none border-b-2 px-4", view === "profile" ? "border-ice text-ice" : "border-transparent text-muted-foreground")} onClick={() => setView("profile")}><Activity /> Perfil térmico</Button>
                <Button variant="ghost" className={cn("h-12 rounded-none border-b-2 px-4", view === "plate" ? "border-ice text-ice" : "border-transparent text-muted-foreground")} onClick={() => setView("plate")}><Grid3X3 /> Placa 96</Button>
              </div>
              <span className="font-mono text-[11px] text-muted-foreground">{view === "plate" ? "A–H · 1–12" : "TEMPERATURA / TIEMPO"}</span>
            </div>

            {view === "profile" ? (
              <section className="min-w-0 space-y-4" aria-label="Perfil térmico">
                <div className="lcd h-[240px] min-w-0 border border-lcd-dim/30 p-2 sm:h-[310px]"><TempChart segments={segments} currentMin={active ? simTime / 60 : undefined} /></div>
                {/* La secuencia se puede tocar para inspeccionar y ajustar el paso seleccionado. */}
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {program.stages.map((stage, si) => <div key={stage.id} className="shrink-0 border-r border-border pr-2 last:border-0">
                    <p className="mb-2 font-mono text-[10px] uppercase text-muted-foreground">Etapa {si + 1} · {stage.repeats}×</p>
                    <div className="flex gap-2">{stage.steps.map((step, pi) => {
                      const isSelected = selected.si === si && selected.pi === pi;
                      const isCurrent = active && seg?.stageIndex === si && seg?.stepIndex === pi;
                      return <Button key={step.id} variant="outline" onClick={() => setSelected({ si, pi })} aria-pressed={isSelected} className={cn("h-20 min-w-28 flex-col items-start gap-1 rounded-sm px-3 font-mono", isSelected && "border-ice bg-ice/10 text-ice", isCurrent && "border-run")}> <span className="max-w-32 truncate text-[10px] uppercase text-muted-foreground">{step.label}</span><strong className="text-lg leading-none">{step.temp} °C</strong><span className="text-xs">{formatTime(step.time)}{step.gradient ? " · GRAD" : ""}</span></Button>;
                    })}</div>
                  </div>)}
                </div>
              </section>
            ) : displayStep ? <section className="min-w-0 py-2" aria-label="Placa de 96 pocillos"><Plate96 step={displayStep} temperature={temp} /></section> : null}

            <section className="flex flex-wrap items-center justify-between gap-4 border-t border-border pt-4" aria-label="Controles del termociclador">
              <div className="flex flex-wrap gap-2">
                <Button onClick={run} disabled={status === "running"} className="h-14 min-w-24 bg-run text-run-foreground"><Play /> {status === "paused" ? "REANUDAR" : "RUN"}</Button>
                <Button onClick={pause} disabled={status !== "running"} className="h-14 min-w-24 bg-amber text-amber-foreground"><Pause /> PAUSA</Button>
                <Button onClick={() => setConfirmStop(true)} disabled={status === "idle"} variant="destructive" className="h-14 min-w-24"><Square /> STOP</Button>
              </div>
              <div className="flex flex-wrap items-center gap-2"><span className="mr-1 font-mono text-[11px] uppercase text-muted-foreground">Velocidad</span>{SPEEDS.map((s) => <Button key={s} variant="outline" className={cn("h-12 min-w-12 font-mono", speed === s && "border-ice bg-ice/10 text-ice")} onClick={() => setSpeed(s)} aria-pressed={speed === s}>×{s}</Button>)}</div>
            </section>

            {!locked && <section className="flex flex-wrap items-center gap-2 border-t border-border pt-3" aria-label="Edición rápida">
              <span className="mr-2 min-w-0 truncate font-mono text-xs text-muted-foreground">{selectedStep?.label ?? "PASO"}</span>
              <Button variant="outline" className="h-12" onClick={() => editValue("temp")}><Thermometer /> Temperatura</Button>
              <Button variant="outline" className="h-12" onClick={() => editValue("time")}><Clock3 /> Tiempo</Button>
              <Button variant="outline" className="h-12" onClick={() => { setDraft(structuredClone(program)); setView("edit"); }}><Repeat2 /> Ciclos</Button>
              <Button variant="outline" className="h-12" onClick={() => { setDraft(structuredClone(program)); setView("edit"); }}><Columns3 /> Gradiente</Button>
              <Button variant="outline" className="h-12" onClick={() => { setDraft(structuredClone(program)); setView("edit"); }}><Settings2 /> Ajustes</Button>
              <div className="flex gap-2 sm:ml-auto"><Button variant="outline" size="icon" className="size-12" onClick={addStep} title="Insertar paso" aria-label="Insertar paso"><Plus /></Button><Button variant="outline" size="icon" className="size-12 text-destructive" onClick={removeStep} title="Eliminar paso" aria-label="Eliminar paso"><Trash2 /></Button></div>
            </section>}
          </>
        )}
      </div>
      <NumPad req={pad} onClose={() => setPad(null)} />
      {confirmStop && <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 p-4" role="dialog" aria-modal="true" aria-label="Detener ejecución"><div className="w-full max-w-sm border border-border bg-panel p-6 shadow-xl"><p className="font-display text-xl font-semibold">¿Detener la ejecución?</p><p className="mt-2 text-sm text-muted-foreground">El tiempo simulado se reiniciará.</p><div className="mt-6 flex gap-2"><Button variant="outline" className="h-12 flex-1" onClick={() => setConfirmStop(false)}>Cancelar</Button><Button variant="destructive" className="h-12 flex-1" onClick={() => { stop(); setConfirmStop(false); }}>Detener</Button></div></div></div>}
    </StatusBars>
  );
}
