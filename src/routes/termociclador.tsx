import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Play, Pause, Square, Pencil, FolderOpen, Copy, Trash2, Plus, Save, X } from "lucide-react";
import { ScreenHeader } from "@/components/sim/ScreenHeader";
import { StatusBars } from "@/components/sim/StatusBars";
import { ProgramEditor } from "@/components/sim/ProgramEditor";
import { TempChart } from "@/components/sim/TempChart";
import { useApp } from "@/lib/store";
import { useThermocyclerSession } from "@/lib/thermocycler-session";
import { buildSegments, gradientColumns, stateAt, totalDuration, AMBIENT } from "@/lib/pcr/simulation";
import { cloneProgram, formatTime, uid, type Program } from "@/lib/pcr/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/termociclador")({
  head: () => ({
    meta: [
      { title: "Termociclador — Simulador PCR" },
      { name: "description", content: "Pantalla de termociclador simulada: programas, ciclos, rampas, tapa calefactada y gradiente." },
      { property: "og:title", content: "Termociclador — Simulador PCR" },
      { property: "og:description", content: "Ejecuta y edita programas PCR en un termociclador virtual." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Thermocycler,
});

const SPEEDS = [1, 10, 60, 300];

function Thermocycler() {
  const { programs, activeId, setActive, saveProgram, deleteProgram } = useApp();
  const program = programs.find((p) => p.id === activeId) ?? programs[0];

  const [view, setView] = useState<"run" | "edit" | "library">("run");
  const [draft, setDraft] = useState<Program | null>(null);
  const { status, simTime, speed, lid, run, pause, stop, setSpeed } = useThermocyclerSession();

  // Segmentos del programa activo (se recalculan solo si cambia el programa).
  const segments = useMemo(() => (program ? buildSegments(program) : []), [program]);
  const total = useMemo(() => totalDuration(segments), [segments]);
  const state = stateAt(segments, simTime);

  if (!program) return null;
  const seg = state.segment;
  const showStatus = status !== "idle";

  return (
    <StatusBars section="TERMOCICLADOR">
      <ScreenHeader title="Termociclador" subtitle={program.name} />
      <div className="grid flex-1 gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* -------- Zona de pantalla -------- */}
        <section className="flex min-w-0 flex-col gap-4 rounded-xl border bg-panel p-4">
          {view === "run" && (
            <>
              {/* LCD principal */}
              <div className="lcd grid gap-4 rounded-lg p-5 sm:grid-cols-3">
                <div>
                  <p className="text-xs text-lcd-dim">BLOQUE</p>
                  <p className="lcd-glow text-6xl font-bold tabular-nums">{(showStatus ? state.temp : AMBIENT).toFixed(1)}<span className="text-2xl">°C</span></p>
                  <p className="mt-1 text-sm text-lcd-dim">TAPA {lid.toFixed(0)}°C / {program.lidTemp}°C</p>
                </div>
                <div className="space-y-1 text-lg">
                  <p className="text-xs text-lcd-dim">ESTADO</p>
                  <p className="lcd-glow">{{ idle: "LISTO", running: seg?.kind === "ramp" ? "RAMPA ▸" : "MESETA ■", paused: "PAUSA", done: "FIN · HOLD" }[status]}</p>
                  <p>{showStatus && seg ? seg.step.label.toUpperCase() : "—"}</p>
                  <p>ETAPA {showStatus && seg ? seg.stageIndex + 1 : "-"} · CICLO {showStatus && seg ? `${seg.cycle}/${seg.repeats}` : "-"}</p>
                </div>
                <div className="space-y-1 text-lg">
                  <p className="text-xs text-lcd-dim">TIEMPO</p>
                  <p>PASO {showStatus && seg ? formatTime(state.stepRemaining) : "--:--"}</p>
                  <p>RESTA {formatTime(Math.max(total - simTime, 0) || 0) === "∞" ? "00:00" : formatTime(Math.max(total - simTime, 0))}</p>
                  <p className="text-lcd-dim">TOTAL {formatTime(total)}</p>
                </div>
              </div>

              {/* Barra de progreso */}
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-amber transition-[width]" style={{ width: `${Math.min((simTime / (total || 1)) * 100, 100)}%` }} />
              </div>

              {/* Gráfica */}
              <div className="lcd h-64 rounded-lg p-2">
                <TempChart segments={segments} currentMin={showStatus ? simTime / 60 : undefined} />
              </div>

              {/* Columnas de gradiente si el paso actual lo usa */}
              {seg?.step.gradient && showStatus && (
                <div className="lcd rounded-lg p-3">
                  <p className="mb-2 text-xs text-lcd-dim">GRADIENTE · COLUMNAS 1–12</p>
                  <div className="grid grid-cols-12 gap-1 text-center text-sm">
                    {gradientColumns(seg.step).map((t, i) => (
                      <div key={i} className="rounded border border-lcd-dim/40 py-2"><div className="text-lcd-dim">{i + 1}</div>{t}</div>
                    ))}
                  </div>
                </div>
              )}

              {/* Lista de pasos del programa */}
              <div className="flex gap-2 overflow-x-auto">
                {program.stages.map((st, si) => (
                  <div key={st.id} className="shrink-0 rounded-md border p-2">
                    <p className="mb-1 text-xs text-muted-foreground">Etapa {si + 1} · {st.repeats}×</p>
                    <div className="flex gap-1">
                      {st.steps.map((s, pi) => {
                        const active = showStatus && seg?.stageIndex === si && seg?.stepIndex === pi;
                        return (
                          <div key={s.id} className={cn("rounded px-2 py-1 font-mono text-sm", active ? "bg-amber text-amber-foreground" : "bg-muted")}>
                            {s.temp}° · {formatTime(s.time)}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {view === "edit" && draft && (
            <>
              <ProgramEditor program={draft} onChange={setDraft} />
              <div className="flex gap-3">
                <button className="hw-key flex h-14 flex-1 items-center justify-center gap-2 rounded-md text-lg" onClick={() => { setDraft(null); setView("run"); }}>
                  <X className="size-5" /> Descartar
                </button>
                <button className="flex h-14 flex-1 items-center justify-center gap-2 rounded-md bg-run text-lg font-semibold text-run-foreground" onClick={() => { saveProgram(draft); setActive(draft.id); setDraft(null); setView("run"); }}>
                  <Save className="size-5" /> Guardar
                </button>
              </div>
            </>
          )}

          {view === "library" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Biblioteca de programas</h2>
                <button className="hw-key flex h-12 items-center gap-2 rounded-md px-4" onClick={() => {
                  const p: Program = { id: uid(), name: "Programa nuevo", lidTemp: 105, rampRate: 3, stages: [
                    { id: uid(), repeats: 1, steps: [{ id: uid(), label: "Desnaturalización inicial", temp: 95, time: 180 }] },
                    { id: uid(), repeats: 30, steps: [
                      { id: uid(), label: "Desnaturalización", temp: 95, time: 30 },
                      { id: uid(), label: "Anillamiento", temp: 55, time: 30 },
                      { id: uid(), label: "Extensión", temp: 72, time: 60 },
                    ] },
                    { id: uid(), repeats: 1, steps: [{ id: uid(), label: "Extensión final", temp: 72, time: 300 }] },
                    { id: uid(), repeats: 1, steps: [{ id: uid(), label: "Conservación", temp: 4, time: 0 }] },
                  ] };
                  setDraft(p); setView("edit");
                }}>
                  <Plus className="size-5" /> Nuevo
                </button>
              </div>
              {programs.map((p) => (
                <div key={p.id} className={cn("flex items-center gap-2 rounded-lg border p-2", p.id === program.id && "border-amber")}>
                  <button className="min-h-12 flex-1 px-2 text-left" onClick={() => { setActive(p.id); stop(); setView("run"); }}>
                    <p className="font-medium">{p.name}</p>
                    <p className="text-sm text-muted-foreground">{p.stages.length} etapas · {formatTime(totalDuration(buildSegments(p)))}</p>
                  </button>
                  <button className="hw-key flex size-12 items-center justify-center rounded-md" aria-label="Duplicar" onClick={() => saveProgram(cloneProgram(p, `${p.name} (copia)`))}><Copy className="size-5" /></button>
                  <button className="hw-key flex size-12 items-center justify-center rounded-md text-destructive" aria-label="Eliminar" disabled={programs.length <= 1} onClick={() => deleteProgram(p.id)}><Trash2 className="size-5" /></button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* -------- Panel de teclas físicas -------- */}
        <aside className="flex flex-col gap-3 rounded-xl border bg-panel p-4">
          <div className="grid grid-cols-3 gap-2">
            <button onClick={run} disabled={view !== "run" || status === "running"} className="flex h-20 flex-col items-center justify-center rounded-md bg-run font-semibold text-run-foreground disabled:opacity-40">
              <Play className="size-6" /> RUN
            </button>
            <button onClick={pause} disabled={status !== "running"} className="flex h-20 flex-col items-center justify-center rounded-md bg-amber font-semibold text-amber-foreground disabled:opacity-40">
              <Pause className="size-6" /> PAUSA
            </button>
            <button onClick={stop} disabled={status === "idle"} className="flex h-20 flex-col items-center justify-center rounded-md bg-destructive font-semibold text-destructive-foreground disabled:opacity-40">
              <Square className="size-6" /> STOP
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button disabled={status === "running" || status === "paused"} onClick={() => { setDraft(structuredClone(program)); setView("edit"); }} className={cn("hw-key flex h-16 items-center justify-center gap-2 rounded-md disabled:opacity-40", view === "edit" && "text-amber")}>
              <Pencil className="size-5" /> EDITAR
            </button>
            <button disabled={status === "running" || status === "paused"} onClick={() => setView(view === "library" ? "run" : "library")} className={cn("hw-key flex h-16 items-center justify-center gap-2 rounded-md disabled:opacity-40", view === "library" && "text-amber")}>
              <FolderOpen className="size-5" /> PROGRAMAS
            </button>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Velocidad de simulación</p>
            <div className="grid grid-cols-4 gap-2">
              {SPEEDS.map((s) => (
                <button key={s} onClick={() => setSpeed(s)} className={cn("hw-key h-12 rounded-md font-mono", speed === s && "bg-none bg-amber text-amber-foreground")}>×{s}</button>
              ))}
            </div>
          </div>
          <div className="mt-auto space-y-1 rounded-md border p-3 text-sm text-muted-foreground">
            <p><span className="text-foreground">Rampa:</span> {program.rampRate} °C/s</p>
            <p><span className="text-foreground">Tapa:</span> {program.lidTemp} °C</p>
            <p><span className="text-foreground">Tiempo simulado:</span> {formatTime(simTime) === "∞" ? "00:00" : formatTime(simTime)}</p>
          </div>
        </aside>
      </div>
    </StatusBars>
  );
}
