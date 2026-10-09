import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { Play, Pause, Square, FolderOpen, Copy, Trash2, Plus, Save, X, Thermometer, Clock3, Repeat2, Settings2, Maximize2, Minimize2, SkipForward, Download, Upload, Check, Pencil, ChevronLeft } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { StatusBars } from "@/components/sim/StatusBars";
import { ThermalProfile, type StepPosition } from "@/components/sim/ThermalProfile";
import { NumPad, type NumPadRequest } from "@/components/sim/NumPad";
import { useApp } from "@/lib/store";
import { useThermocyclerSession } from "@/lib/thermocycler-session";
import { buildSegments, stateAt, totalDuration, AMBIENT, stepTempAt } from "@/lib/pcr/simulation";
import { cloneProgram, formatTime, uid, type Program, type Step } from "@/lib/pcr/types";
import { cn } from "@/lib/utils";
import { setLoopRange } from "@/lib/pcr/loops";

export const Route = createFileRoute("/termociclador")({
  head: () => ({ meta: [
    { title: "Termociclador — Simulador PCR" },
    { name: "description", content: "Simula el termociclador táctil con biblioteca, ciclos, gradiente y control de ejecución." },
    { property: "og:title", content: "Termociclador — Simulador PCR" },
    { property: "og:description", content: "Programa y ejecuta protocolos PCR en el termociclador táctil." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }), component: Thermocycler,
});

const FACTORY = [
  { name: "GRADIENT T5000-96", description: "35 ciclos, gradiente de 50 a 60 °C", cycles: 35, anneal: 55, gradient: true },
  { name: "STANDARD TAQ 30X", description: "PCR estándar de tres pasos", cycles: 30, anneal: 58 },
  { name: "TOUCHDOWN PCR", description: "Anillamiento descendente por ciclo", cycles: 28, anneal: 65, delta: -0.5 },
  { name: "FAST 2-STEP QPCR", description: "Amplificación rápida de dos pasos", cycles: 40, anneal: 60, twoStep: true },
  { name: "COLONY SCREEN", description: "Lisis celular y amplificación", cycles: 32, anneal: 53 },
  { name: "ONE-STEP RT-PCR", description: "Transcripción reversa y PCR", cycles: 35, anneal: 56, rt: true },
];
function factoryProgram(index: number): Program {
  const preset = FACTORY[index] ?? FACTORY[0];
  if (!preset) throw new Error("No hay programas de fábrica");
  const step = (label: string, temp: number, time: number, extra: Partial<Step> = {}): Step => ({ id: uid(), label, temp, time, ...extra });
  const initial = preset.rt ? [step("Síntesis cDNA (RT)", 50, 900), step("Inactivación RT", 95, 120)] : [step(preset.name.includes("COLONY") ? "Lisis bacteriana" : "Desnaturalización inicial", preset.name.includes("COLONY") ? 98 : 95, preset.name.includes("COLONY") ? 600 : 180)];
  const cycles = [step("Desnaturalización", 95, preset.twoStep ? 5 : 30), step("Anillamiento", preset.anneal, 30, { ...(preset.gradient ? { gradient: { low: 50, high: 60 } } : {}), ...(preset.delta ? { deltaPerCycle: preset.delta } : {}) }), ...(!preset.twoStep ? [step("Extensión", 72, 60)] : [])];
  return { id: uid(), name: preset.name, description: preset.description, lidTemp: 105, lidHeatingEnabled: true, sampleVolume: preset.twoStep ? 20 : 50, rampRate: 3.5, stages: [
    { id: uid(), repeats: 1, steps: initial }, { id: uid(), repeats: preset.cycles, steps: cycles },
    { id: uid(), repeats: 1, steps: [step("Extensión final", 72, 300)] }, { id: uid(), repeats: 1, steps: [step("Conservación", 4, 0)] },
  ] };
}
const importSchema: z.ZodType<Program> = z.object({
  id: z.string(), name: z.string(), lidTemp: z.number().min(25).max(115), rampRate: z.number().min(0.1).max(20),
  description: z.string().optional(), sampleVolume: z.number().min(1).max(200).optional(), lidHeatingEnabled: z.boolean().optional(),
  stages: z.array(z.object({ id: z.string(), repeats: z.number().int().min(1).max(99), steps: z.array(z.object({ id: z.string(), label: z.string(), temp: z.number().min(4).max(105), time: z.number().min(0).max(36000), deltaPerCycle: z.number().optional(), timeIncrement: z.number().optional(), rampRate: z.number().optional(), gradient: z.object({ low: z.number(), high: z.number() }).optional() })).min(1) })).min(1),
});
/** Traduce también los archivos exportados por el T5000 original al modelo compartido de esta app. */
const originalSchema = z.object({
  name: z.string(), description: z.string().optional(), lidTemperature: z.number(), lidHeatingEnabled: z.boolean().optional(), sampleVolume: z.number().optional(),
  steps: z.array(z.object({ id: z.string(), name: z.string(), temperature: z.number(), durationSeconds: z.number(), rampRate: z.number().optional(), gradient: z.object({ enabled: z.boolean(), lowTemp: z.number(), highTemp: z.number() }).optional(), tempIncrement: z.number().optional(), timeIncrement: z.number().optional() })).min(1),
  loops: z.array(z.object({ startStepIndex: z.number().int(), endStepIndex: z.number().int(), repeatCount: z.number().int() })),
});
function fromOriginal(raw: z.infer<typeof originalSchema>): Program {
  const steps: Step[] = raw.steps.map(s => ({ id: uid(), label: s.name, temp: s.temperature, time: s.durationSeconds, ...(s.rampRate ? { rampRate: s.rampRate } : {}), ...(s.gradient?.enabled ? { gradient: { low: s.gradient.lowTemp, high: s.gradient.highTemp } } : {}), ...(s.tempIncrement ? { deltaPerCycle: s.tempIncrement } : {}), ...(s.timeIncrement ? { timeIncrement: s.timeIncrement } : {}) }));
  const stages: Program["stages"] = [];
  for (let i = 0; i < steps.length;) {
    const loop = raw.loops.find(l => l.startStepIndex === i && l.endStepIndex >= i && l.endStepIndex < steps.length);
    if (loop) { stages.push({ id: uid(), repeats: Math.max(1,Math.min(99,loop.repeatCount)), steps: steps.slice(i,loop.endStepIndex + 1) }); i = loop.endStepIndex + 1; }
    else { const step = steps[i]; if (step) stages.push({ id: uid(), repeats: 1, steps: [step] }); i++; }
  }
  return { id: uid(), name: raw.name, description: raw.description, lidTemp: raw.lidTemperature, lidHeatingEnabled: raw.lidHeatingEnabled, sampleVolume: raw.sampleVolume, rampRate: 3.5, stages };
}
type Modal = "library" | "save" | "settings" | "cycles" | "stop" | null;
function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return <div className="fixed inset-0 z-40 flex items-center justify-center bg-background/90 p-3" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
    <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-md border border-border bg-panel shadow-2xl">
      <div className="flex items-center justify-between border-b border-border bg-panel-raised px-4 py-3"><h2 className="font-display text-lg font-semibold">{title}</h2><Button variant="ghost" size="icon" className="size-11" aria-label="Cerrar" onClick={onClose}><X /></Button></div>
      <div className="min-h-0 overflow-y-auto p-4 sm:p-5">{children}</div>
    </div>
  </div>;
}
function Thermocycler() {
  const { programs, activeId, setActive, saveProgram, deleteProgram } = useApp();
  const program = programs.find(p => p.id === activeId) ?? programs[0];
  const [selected, setSelected] = useState<StepPosition>({ si: 0, pi: 0 });
  const [modal, setModal] = useState<Modal>(null);
  const [libraryTab, setLibraryTab] = useState<"factory" | "saved">("factory");
  const [pad, setPad] = useState<NumPadRequest | null>(null);
  const [volume, setVolume] = useState(25);
  const [lidEnabled, setLidEnabled] = useState(true);
  const [lidTarget, setLidTarget] = useState(105);
  const [chassis, setChassis] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [cycleStage, setCycleStage] = useState(0);
  const [cycleCount, setCycleCount] = useState(30);
  const [cycleStart, setCycleStart] = useState(0);
  const [cycleEnd, setCycleEnd] = useState(0);
  const [confirmCycleDelete, setConfirmCycleDelete] = useState(false);
  const [importError, setImportError] = useState("");
  const { status, simTime, speed, lid, run, pause, stop, setSpeed, skipPreheat, advance } = useThermocyclerSession();
  const segments = useMemo(() => program ? buildSegments(program) : [], [program]);
  const total = useMemo(() => totalDuration(segments), [segments]);
  const state = stateAt(segments, simTime);
  const active = status !== "idle";
  const locked = status === "preheating" || status === "running" || status === "paused";
  const seg = state.segment;
  const current = active && seg ? { si: seg.stageIndex, pi: seg.stepIndex } : undefined;
  const chosen = program?.stages[selected.si]?.steps[selected.pi] ?? program?.stages[0]?.steps[0];
  const displayStep = active ? seg?.step ?? chosen : chosen;
  const temp = active && status !== "preheating" ? state.temp : AMBIENT;
  const remaining = Math.max(0, total - simTime);
  useEffect(() => { if (!program) return; setVolume(program.sampleVolume ?? 25); setLidEnabled(program.lidHeatingEnabled !== false); setLidTarget(program.lidTemp); }, [program?.id]);
  if (!program) return null;

  const updateStepAt = (position: StepPosition, patch: Partial<Step>) => {
    if (locked) return;
    saveProgram({ ...program, stages: program.stages.map((st, si) => si === position.si ? { ...st, steps: st.steps.map((step, pi) => pi === position.pi ? { ...step, ...patch } : step) } : st) });
  };
  const editValue = (kind: "temp" | "time", position = selected) => {
    const step = program.stages[position.si]?.steps[position.pi]; if (!step || locked) return;
    setSelected(position);
    setPad(kind === "temp" ? { title: `${step.label}: temperatura`, value: step.temp, unit: "°C", allowDecimal: true, min: 4, max: 105, onConfirm: v => updateStepAt(position, { temp: v }) }
      : { title: `${step.label}: duración`, value: step.time, unit: "s", time: true, min: 0, max: 36000, onConfirm: v => updateStepAt(position, { time: Math.round(v) }) });
  };
  const columnSteps = program.stages.flatMap(stage => stage.steps);
  const openCycles = (si = selected.si) => {
    const stage = program.stages[si]; if (!stage || locked) return;
    const start = program.stages.slice(0, si).reduce((n, s) => n + s.steps.length, 0);
    setCycleStage(si); setCycleCount(stage.repeats); setCycleStart(start); setCycleEnd(start + stage.steps.length - 1); setConfirmCycleDelete(false); setModal("cycles");
  };
  const changeLoopRange = (si: number, start: number, end: number, repeats?: number) => {
    const stage = program.stages[si]; if (!stage || locked) return;
    const next = setLoopRange(program, stage.id, start, end, repeats ?? stage.repeats);
    saveProgram(next);
    setSelected({ si: Math.max(0, next.stages.findIndex(s => s.id === stage.id)), pi: 0 });
  };
  const applyCycles = () => {
    changeLoopRange(cycleStage, cycleStart, cycleEnd, cycleCount); setModal(null);
  };
  /** Elimina la etapa (ciclo) entera del programa; siempre debe quedar al menos una. */
  const removeCycleStage = () => {
    if (locked || program.stages.length <= 1) return;
    const stages = program.stages.filter((_, i) => i !== cycleStage);
    saveProgram({ ...program, stages });
    setSelected({ si: Math.min(cycleStage, stages.length - 1), pi: 0 });
    setModal(null);
  };
  const insertStep = () => { if (locked) return; const st = program.stages[selected.si]; if (!st) return; saveProgram({ ...program, stages: program.stages.map((s, si) => si === selected.si ? { ...s, steps: [...s.steps.slice(0, selected.pi + 1), { id: uid(), label: "Paso nuevo", temp: 72, time: 30 }, ...s.steps.slice(selected.pi + 1)] } : s) }); setSelected({ si: selected.si, pi: selected.pi + 1 }); };
  const removeStep = () => { if (locked) return; const st = program.stages[selected.si]; if (!st || (program.stages.length === 1 && st.steps.length === 1)) return; const stages = st.steps.length > 1 ? program.stages.map((s, si) => si === selected.si ? { ...s, steps: s.steps.filter((_, pi) => pi !== selected.pi) } : s) : program.stages.filter((_, si) => si !== selected.si); saveProgram({ ...program, stages }); setSelected({ si: st.steps.length > 1 ? selected.si : Math.max(0, selected.si - 1), pi: 0 }); };
  const exportProgram = (p: Program) => { const blob = new Blob([JSON.stringify(p, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `${p.name.replace(/[^a-z0-9-]/gi, "_")}.json`; a.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000); };
  const importProgram = async (file?: File) => { if (!file) return; try { const json: unknown = JSON.parse(await file.text()); const ours = importSchema.safeParse(json); const imported = ours.success ? cloneProgram(ours.data, ours.data.name) : fromOriginal(originalSchema.parse(json)); const valid = importSchema.parse(imported); saveProgram(valid); setActive(valid.id); setSelected({ si: 0, pi: 0 }); setImportError(""); setModal(null); } catch { setImportError("El archivo no contiene un programa compatible."); } };
  const openSave = () => { setName(`${program.name} (copia)`); setDescription(program.description ?? ""); setModal("save"); };
  const metric = (label: string, value: string, sub: string, accent = false) => <div className="min-w-0 border-b border-border pb-2 sm:border-b-0"><p className="font-mono text-[10px] uppercase text-muted-foreground">{label}</p><strong className={cn("block font-mono text-2xl tabular-nums sm:text-3xl", accent ? "text-lcd-foreground" : "text-foreground")}>{value}</strong><p className="truncate font-mono text-[11px] text-muted-foreground">{sub}</p></div>;

  return <StatusBars section="TERMOCICLADOR">
    <div className={cn("mx-auto flex w-full flex-1 flex-col", chassis ? "max-w-6xl border-x-4 border-panel-raised bg-background shadow-2xl" : "max-w-7xl")}>
      {chassis && <div className="flex items-center justify-between border-b-4 border-panel-raised bg-secondary px-4 py-3 font-mono text-xs font-bold"><span>T5000-96 · GRADIENT THERMAL CYCLER</span><span className="text-run">● POWER <span className="ml-3 text-amber">● LID HEAT</span></span></div>}
      {/* La cabecera y las teclas replican las funciones del instrumento, sin duplicar las barras globales. */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-panel px-4 py-3 sm:px-6">
        <Button variant="outline" asChild className="h-12"><Link to="/"><ChevronLeft /> Menú</Link></Button>
        <div className="flex min-w-0 items-center gap-2"><Button variant="outline" className="h-12 min-w-0 max-w-[280px] border-ice/40 text-ice" disabled={locked} onClick={() => { setLibraryTab("factory"); setModal("library"); }} title="Biblioteca de protocolos"><FolderOpen /><span className="truncate">{program.name}</span></Button><span className="hidden font-mono text-[11px] text-muted-foreground sm:inline">{program.stages.reduce((n,s)=>n+s.steps.length,0)} pasos · {program.sampleVolume ?? 25} µL</span></div>
        <div className="flex flex-wrap gap-1"><Button variant="ghost" size="icon" className="size-11" title="Ajustes del equipo" aria-label="Ajustes del equipo" disabled={locked} onClick={() => setModal("settings")}><Settings2 /></Button><Button variant="ghost" size="icon" className="size-11" title={chassis ? "Modo pantalla" : "Modo chasis"} aria-label={chassis ? "Modo pantalla" : "Modo chasis"} onClick={() => setChassis(!chassis)}>{chassis ? <Maximize2 /> : <Minimize2 />}</Button></div>
      </div>
      <div className="flex flex-1 flex-col gap-4 p-3 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3 font-mono text-xs"><div className="flex items-center gap-2"><span className={cn("size-2.5 rounded-full", status === "running" ? "bg-run" : status === "paused" || status === "preheating" ? "bg-amber" : "bg-ice")} /><strong className="text-foreground">{status === "preheating" ? "CALENTANDO TAPA" : status === "running" ? seg?.kind === "ramp" ? "RAMPA TÉRMICA" : "INCUBACIÓN TÉRMICA" : status === "paused" ? "EN PAUSA" : status === "done" ? "CONSERVACIÓN / FINALIZADO" : "LISTO PARA PROGRAMAR"}</strong><span className="hidden text-muted-foreground sm:inline">· {active ? seg?.step.label : chosen?.label}</span></div><span className="text-muted-foreground">{active && seg ? `ETAPA ${seg.stageIndex+1} · CICLO ${seg.cycle}/${seg.repeats}` : `TAPA ${program.lidTemp}°C · ${program.rampRate}°C/s`}</span></div>
        {status === "preheating" && <div className="flex flex-wrap items-center justify-between gap-2 border-l-2 border-amber bg-amber/10 p-3 font-mono text-sm"><span>Tapa calefactada: {lid.toFixed(1)} / {program.lidTemp} °C</span><Button variant="outline" className="h-11" onClick={skipPreheat}>Saltar precalentamiento</Button></div>}
        <section className="grid grid-cols-2 gap-3 border-b border-border pb-4 sm:grid-cols-4" aria-label="Monitor de ejecución">
           {metric("Bloque · actual", `${temp.toFixed(1)}°C`, `Objetivo ${displayStep ? stepTempAt(displayStep, active ? seg?.cycle ?? 1 : 1).toFixed(1) : "—"} °C`, true)}
           {metric("Ciclo actual", active && status !== "preheating" && seg ? `${seg.cycle} / ${seg.repeats}` : "— / —", active && status !== "preheating" && seg ? `Etapa ${seg.stageIndex+1}` : "Sin ejecución")}
           {metric("Tiempo en paso", active && status !== "preheating" ? formatTime(state.stepRemaining) : "—:—", status === "preheating" ? "Calentando tapa" : active ? seg?.kind === "ramp" ? "Rampa" : "Meseta" : chosen?.label ?? "—")}
          {metric("Tiempo restante", active ? formatTime(Math.max(0.01, remaining)) : formatTime(total), `Transcurrido ${active ? formatTime(Math.max(0.01,simTime)) : "00:00"}`)}
        </section>
        <ThermalProfile program={program} selected={selected} current={current} cycle={active ? seg?.cycle : undefined} onSelect={setSelected} onCycles={openCycles} onLoopRange={changeLoopRange} onTemperature={p => editValue("temp",p)} onTime={p => editValue("time",p)} locked={locked} />
        {active ? <section className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4" aria-label="Controles de ejecución"><div className="flex flex-wrap gap-2"><Button variant="destructive" className="h-12" onClick={() => setModal("stop")}><Square /> DETENER</Button><Button className="h-12 bg-amber text-amber-foreground" disabled={status === "done"} onClick={status === "paused" ? run : pause}>{status === "paused" ? <Play /> : <Pause />}{status === "paused" ? "REANUDAR" : "PAUSA"}</Button><Button variant="outline" className="h-12" disabled={status !== "running"} onClick={advance}><SkipForward /> Siguiente paso</Button></div><div className="flex flex-wrap items-center gap-1 font-mono text-xs text-muted-foreground">VELOCIDAD {[1,5,20,60].map(s => <Button key={s} variant="outline" className={cn("h-11 min-w-11 px-2",speed===s && "border-ice bg-ice/10 text-ice")} aria-pressed={speed===s} onClick={() => setSpeed(s)}>×{s}</Button>)}</div></section>
        : <section className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4" aria-label="Editor de programa"><div className="flex flex-wrap gap-1.5"><Button variant="outline" size="icon" className="size-12" title="Insertar paso" aria-label="Insertar paso" onClick={insertStep}><Plus /></Button><Button variant="outline" size="icon" className="size-12 text-destructive" title="Eliminar paso" aria-label="Eliminar paso" disabled={program.stages.length===1 && program.stages[0]?.steps.length===1} onClick={removeStep}><Trash2 /></Button><Button variant="outline" className="h-12" onClick={() => editValue("temp")}><Thermometer /> Temp</Button><Button variant="outline" className="h-12" onClick={() => editValue("time")}><Clock3 /> Tiempo</Button><Button variant="outline" className="h-12" onClick={() => openCycles()}><Repeat2 /> Ciclos</Button><Button variant="outline" className="h-12" onClick={openSave}><Save /> Guardar / Abrir</Button></div><Button className="h-12 bg-run px-6 font-bold text-run-foreground" onClick={run}><Play /> EJECUTAR</Button></section>}
      </div>
      {chassis && <div className="flex justify-between border-t-4 border-panel-raised bg-secondary px-4 py-2 font-mono text-[10px] text-muted-foreground"><span>▥▥▥▥▥▥▥▥▥▥▥▥</span><span>USB 2.0 · 96-WELL PELTIER</span></div>}
    </div>
    {modal === "library" && <ModalShell title="Biblioteca de protocolos PCR" onClose={() => setModal(null)}><div className="mb-4 flex flex-wrap items-center gap-2"><Button variant={libraryTab === "factory" ? "default" : "outline"} className="h-11" onClick={() => setLibraryTab("factory")}>De fábrica ({FACTORY.length})</Button><Button variant={libraryTab === "saved" ? "default" : "outline"} className="h-11" onClick={() => setLibraryTab("saved")}>Guardados ({programs.length})</Button><Button variant="outline" className="h-11 sm:ml-auto" onClick={() => { const p = factoryProgram(0); saveProgram({ ...p, name: "Programa nuevo" }); setActive(p.id); setSelected({si:0,pi:0}); setModal(null); }}><Plus /> Nuevo</Button></div><div className="space-y-2">{libraryTab === "factory" ? FACTORY.map((preset, i) => <div key={preset.name} className="flex flex-wrap items-center justify-between gap-2 border-b border-border py-3"><div><strong className="font-mono text-sm">{preset.name}</strong><p className="text-xs text-muted-foreground">{preset.description}</p></div><Button variant="outline" className="h-11" onClick={() => { const p = factoryProgram(i); saveProgram(p); setActive(p.id); setSelected({si:0,pi:0}); setModal(null); }}><Check /> Cargar</Button></div>) : programs.map(p => <div key={p.id} className="flex flex-wrap items-center gap-2 border-b border-border py-2"><div className="min-w-0 flex-1"><strong className="block truncate font-mono text-sm">{p.name}</strong><span className="font-mono text-xs text-muted-foreground">{p.stages.length} etapas · {formatTime(totalDuration(buildSegments(p)))}</span></div><Button variant="outline" size="icon" className="size-11" aria-label={`Exportar ${p.name}`} title="Exportar JSON" onClick={() => exportProgram(p)}><Download /></Button><Button variant="outline" size="icon" className="size-11" aria-label={`Duplicar ${p.name}`} title="Duplicar" onClick={() => saveProgram(cloneProgram(p, `${p.name} (copia)`))}><Copy /></Button><Button variant="outline" size="icon" className="size-11 text-destructive" aria-label={`Eliminar ${p.name}`} title="Eliminar" disabled={programs.length <= 1} onClick={() => deleteProgram(p.id)}><Trash2 /></Button><Button className="h-11" onClick={() => { setActive(p.id); setSelected({si:0,pi:0}); setModal(null); }}>Cargar</Button></div>)}</div><label className="mt-5 flex h-12 cursor-pointer items-center justify-center gap-2 border border-dashed border-border text-sm text-ice"><Upload className="size-4" /> Importar programa JSON<input type="file" accept="application/json,.json" className="sr-only" onChange={e => void importProgram(e.target.files?.[0])} /></label>{importError && <p className="mt-2 text-sm text-destructive">{importError}</p>}</ModalShell>}
    {modal === "save" && <ModalShell title="Guardar programa" onClose={() => setModal(null)}><div className="space-y-4"><label className="block text-sm">Nombre<input className="mt-1 w-full rounded-sm border border-input bg-background p-3 text-foreground" value={name} onChange={e => setName(e.target.value)} /></label><label className="block text-sm">Descripción<textarea className="mt-1 w-full rounded-sm border border-input bg-background p-3 text-foreground" rows={3} value={description} onChange={e => setDescription(e.target.value)} /></label><p className="font-mono text-xs text-muted-foreground">{program.stages.length} etapas · {formatTime(total)} · {program.sampleVolume ?? 25} µL</p><div className="flex justify-end gap-2"><Button variant="outline" className="h-12" onClick={() => setModal(null)}>Cancelar</Button><Button className="h-12 bg-run text-run-foreground" disabled={!name.trim()} onClick={() => { const p = cloneProgram(program,name.trim()); p.description = description.trim(); saveProgram(p); setActive(p.id); setSelected({si:0,pi:0}); setModal(null); }}><Save /> Guardar copia</Button></div></div></ModalShell>}
    {modal === "settings" && <ModalShell title="Ajustes del termociclador" onClose={() => setModal(null)}><div className="space-y-5"><div className="flex items-center justify-between gap-3 border-b border-border pb-4"><span className="font-mono text-sm">Tapa calefactada</span><Button variant="outline" aria-pressed={lidEnabled} className={cn("h-12", lidEnabled && "border-amber text-amber")} onClick={() => setLidEnabled(!lidEnabled)}>{lidEnabled ? "ACTIVA" : "APAGADA"}</Button></div>{lidEnabled && <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-4"><span className="font-mono text-sm">Temperatura de tapa</span><Button variant="outline" className="h-12 font-mono" onClick={() => setPad({title:"Temperatura de tapa",value:lidTarget,unit:"°C",allowDecimal:true,min:30,max:115,onConfirm:setLidTarget})}>{lidTarget} °C <Pencil /></Button></div>}<div><p className="mb-2 font-mono text-sm">Volumen de muestra · {volume} µL</p><div className="flex flex-wrap gap-2">{[10,20,25,50,100].map(v => <Button key={v} variant="outline" className={cn("h-12",volume===v && "border-ice text-ice")} aria-pressed={volume===v} onClick={() => setVolume(v)}>{v}</Button>)}</div></div><div className="flex justify-end gap-2 border-t border-border pt-4"><Button variant="outline" className="h-12" onClick={() => setModal(null)}>Cancelar</Button><Button className="h-12" onClick={() => { saveProgram({...program,lidTemp:lidTarget,lidHeatingEnabled:lidEnabled,sampleVolume:volume}); setModal(null); }}><Check /> Aplicar ajustes</Button></div></div></ModalShell>}
    {modal === "cycles" && <ModalShell title="Configuración de ciclos PCR" onClose={() => setModal(null)}><div className="space-y-5"><div><p className="mb-2 font-mono text-xs text-muted-foreground">NÚMERO DE CICLOS</p><div className="flex items-center justify-center gap-4"><Button variant="outline" size="icon" className="size-12" aria-label="Reducir ciclos" onClick={() => setCycleCount(Math.max(1,cycleCount-1))}>−</Button><Button variant="outline" className="h-14 min-w-24 font-mono text-2xl" onClick={() => setPad({title:"Número de ciclos",value:cycleCount,unit:"×",min:1,max:99,onConfirm:v=>setCycleCount(Math.round(v))})}>{cycleCount}×</Button><Button variant="outline" size="icon" className="size-12" aria-label="Aumentar ciclos" onClick={() => setCycleCount(Math.min(99,cycleCount+1))}>+</Button></div><div className="mt-3 flex flex-wrap justify-center gap-1">{[25,30,32,35,40].map(v => <Button key={v} variant="outline" className={cn("h-10",cycleCount===v && "border-amber text-amber")} onClick={() => setCycleCount(v)}>{v}×</Button>)}</div></div><div className="grid grid-cols-2 gap-3">{(["Columna inicial","Columna final"] as const).map((label,i) => <label key={label} className="text-xs text-muted-foreground">{label}<select className="mt-1 h-12 w-full border border-input bg-background px-2 text-foreground" value={i ? cycleEnd : cycleStart} onChange={e => { const value = Number(e.target.value); if (i) { setCycleEnd(value); setCycleStart(Math.min(cycleStart, value)); } else { setCycleStart(value); setCycleEnd(Math.max(cycleEnd, value)); } }}>{columnSteps.map((s,index) => <option key={s.id} value={index}>Col. {index+1} · {s.temp.toFixed(1)}° · {formatTime(s.time)}</option>)}</select></label>)}</div><p className="font-mono text-xs text-muted-foreground">Se repetirá el rango elegido {cycleCount} veces.</p><div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">{confirmCycleDelete ? <div className="flex flex-wrap items-center gap-2"><span className="font-mono text-xs text-destructive">¿Eliminar esta etapa y sus pasos?</span><Button variant="destructive" className="h-12" onClick={removeCycleStage}><Trash2 /> Sí, eliminar</Button><Button variant="outline" className="h-12" onClick={() => setConfirmCycleDelete(false)}>Conservar</Button></div> : <><Button variant="outline" className="h-12 text-destructive" disabled={program.stages.length <= 1} title={program.stages.length <= 1 ? "El programa necesita al menos una etapa" : undefined} onClick={() => setConfirmCycleDelete(true)}><Trash2 /> Eliminar ciclo</Button><div className="flex gap-2"><Button variant="outline" className="h-12" onClick={() => setModal(null)}>Cancelar</Button><Button className="h-12" onClick={applyCycles}><Check /> Guardar ciclo</Button></div></>}</div></div></ModalShell>}
    {modal === "stop" && <ModalShell title="¿Detener la ejecución?" onClose={() => setModal(null)}><p className="mb-6 text-sm text-muted-foreground">Se perderá el progreso de esta corrida.</p><div className="flex justify-end gap-2"><Button variant="outline" className="h-12" onClick={() => setModal(null)}>Cancelar</Button><Button variant="destructive" className="h-12" onClick={() => {stop();setModal(null);}}><Square /> Detener</Button></div></ModalShell>}
    <NumPad req={pad} onClose={() => setPad(null)} />
  </StatusBars>;
}
