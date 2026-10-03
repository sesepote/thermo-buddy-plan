import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CheckCircle2, AlertTriangle, XCircle, Lightbulb, RotateCcw, ChevronRight, Trophy } from "lucide-react";
import { ScreenHeader } from "@/components/sim/ScreenHeader";
import { ProgramEditor } from "@/components/sim/ProgramEditor";
import { useApp } from "@/lib/store";
import { EXERCISES, describeExercise, evaluate, type Exercise, type Level } from "@/lib/pcr/exercises";
import { formatTime, uid, type Program } from "@/lib/pcr/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/entrenamiento")({
  head: () => ({
    meta: [
      { title: "Zona de entrenamiento PCR — Simulador" },
      { name: "description", content: "Ejercicios prácticos: configura el termociclador para cada caso y recibe corrección paso a paso." },
      { property: "og:title", content: "Zona de entrenamiento PCR" },
      { property: "og:description", content: "Practica la programación de termocicladores con casos reales y puntuación." },
    ],
  }),
  component: Training,
});

const LEVELS: { id: Level; name: string }[] = [
  { id: "basico", name: "Básico" },
  { id: "intermedio", name: "Intermedio" },
  { id: "avanzado", name: "Avanzado" },
];

/** Programa de partida genérico que el alumno debe ajustar. */
function starterProgram(): Program {
  return {
    id: uid(), name: "Mi programa", lidTemp: 105, rampRate: 3,
    stages: [
      { id: uid(), repeats: 1, steps: [{ id: uid(), label: "Desnaturalización inicial", temp: 94, time: 60 }] },
      { id: uid(), repeats: 30, steps: [
        { id: uid(), label: "Desnaturalización", temp: 94, time: 30 },
        { id: uid(), label: "Anillamiento", temp: 50, time: 30 },
        { id: uid(), label: "Extensión", temp: 72, time: 60 },
      ] },
      { id: uid(), repeats: 1, steps: [{ id: uid(), label: "Extensión final", temp: 72, time: 300 }] },
      { id: uid(), repeats: 1, steps: [{ id: uid(), label: "Conservación", temp: 4, time: 0 }] },
    ],
  };
}

const HINT_COST = 5;

function Training() {
  const { attempts, addAttempt, resetProgress } = useApp();
  const [level, setLevel] = useState<Level>("basico");
  const [current, setCurrent] = useState<Exercise | null>(null);
  const [program, setProgram] = useState<Program | null>(null);
  const [hints, setHints] = useState(0);
  const [result, setResult] = useState<ReturnType<typeof evaluate> | null>(null);

  const best = (id: string) => Math.max(-1, ...attempts.filter((a) => a.exerciseId === id).map((a) => a.score));
  const open = (e: Exercise) => { setCurrent(e); setProgram(starterProgram()); setHints(0); setResult(null); };

  // Verifica el programa y guarda el intento (descontando pistas usadas).
  const check = () => {
    if (!current || !program) return;
    const r = evaluate(program, current);
    const score = Math.max(0, r.score - hints * HINT_COST);
    setResult({ ...r, score });
    addAttempt({ exerciseId: current.id, score, date: Date.now(), hintsUsed: hints });
  };

  // ---------------- Lista de ejercicios ----------------
  if (!current || !program) {
    const done = EXERCISES.filter((e) => best(e.id) >= 70).length;
    return (
      <div className="flex min-h-screen flex-col">
        <ScreenHeader title="Zona de entrenamiento" subtitle={`${done}/${EXERCISES.length} ejercicios superados (≥ 70 puntos)`} />
        <div className="space-y-4 p-4">
          <div className="flex flex-wrap items-center gap-2">
            {LEVELS.map((l) => (
              <button key={l.id} onClick={() => setLevel(l.id)} className={cn("hw-key h-12 rounded-md px-5", level === l.id && "bg-none bg-amber text-amber-foreground")}>{l.name}</button>
            ))}
            <button onClick={resetProgress} className="hw-key ml-auto flex h-12 items-center gap-2 rounded-md px-4 text-sm"><RotateCcw className="size-4" /> Reiniciar progreso</button>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {EXERCISES.filter((e) => e.level === level).map((e) => {
              const b = best(e.id);
              return (
                <button key={e.id} onClick={() => open(e)} className="flex min-h-28 flex-col gap-2 rounded-xl border bg-panel p-4 text-left active:bg-panel-raised">
                  <div className="flex w-full items-center justify-between">
                    <span className="text-lg font-semibold">{e.title}</span>
                    <ChevronRight className="size-5 text-muted-foreground" />
                  </div>
                  <span className="text-sm text-muted-foreground">{describeExercise(e).slice(1, 4).join(" · ")}</span>
                  <span className={cn("font-mono text-sm", b >= 70 ? "text-lcd-foreground" : b >= 0 ? "text-amber" : "text-muted-foreground")}>
                    {b >= 0 ? `Mejor: ${b} pts` : "Sin intentar"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ---------------- Ejercicio activo ----------------
  const icon = { ok: <CheckCircle2 className="size-5 text-run" />, warn: <AlertTriangle className="size-5 text-amber" />, bad: <XCircle className="size-5 text-destructive" /> };

  return (
    <div className="flex min-h-screen flex-col">
      <ScreenHeader title={current.title} subtitle="Configura el programa y pulsa Verificar" />
      <div className="grid flex-1 gap-4 p-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <div className="lcd space-y-1 rounded-xl p-4 text-sm">
            <p className="lcd-glow mb-2 text-base">CASO PRÁCTICO</p>
            {describeExercise(current).map((l) => <p key={l}>{l}</p>)}
          </div>
          <div className="space-y-2 rounded-xl border bg-panel p-4">
            <button disabled={hints >= current.hints.length} onClick={() => setHints((h) => h + 1)} className="hw-key flex h-12 w-full items-center justify-center gap-2 rounded-md disabled:opacity-40">
              <Lightbulb className="size-5 text-amber" /> Pista (−{HINT_COST} pts)
            </button>
            {current.hints.slice(0, hints).map((h) => <p key={h} className="text-sm text-muted-foreground">• {h}</p>)}
          </div>
          <button onClick={() => setCurrent(null)} className="hw-key h-12 w-full rounded-md">Volver a ejercicios</button>
        </aside>

        <section className="min-w-0 space-y-4 rounded-xl border bg-panel p-4">
          <ProgramEditor program={program} onChange={(p) => { setProgram(p); setResult(null); }} allowGradient={false} />
          <button onClick={check} className="flex h-16 w-full items-center justify-center gap-2 rounded-md bg-run text-xl font-semibold text-run-foreground">
            <CheckCircle2 className="size-6" /> Verificar
          </button>

          {result && (
            <div className="space-y-3">
              <div className="lcd flex items-center gap-4 rounded-lg p-4">
                <Trophy className="size-10" />
                <div>
                  <p className="lcd-glow text-4xl font-bold">{result.score}<span className="text-lg"> / 100</span></p>
                  <p className="text-sm text-lcd-dim">{result.score >= 90 ? "Excelente, protocolo listo para usar." : result.score >= 70 ? "Superado. Revisa los puntos mejorables." : "No superado. Corrige los errores y vuelve a verificar."}{hints ? ` (−${hints * HINT_COST} por pistas)` : ""}</p>
                </div>
              </div>
              <ul className="space-y-2">
                {result.checks.map((c) => (
                  <li key={c.label} className="flex gap-3 rounded-md border p-3">
                    {icon[c.verdict]}
                    <div><p className="font-medium">{c.label}</p><p className="text-sm text-muted-foreground">{c.detail}</p></div>
                  </li>
                ))}
              </ul>
              <details className="rounded-md border p-3">
                <summary className="min-h-10 cursor-pointer py-2 font-medium">Ver solución de referencia</summary>
                <div className="mt-2 space-y-1 font-mono text-sm">
                  {result.reference.program.stages.map((st, si) => (
                    <p key={st.id}>Etapa {si + 1} ({st.repeats}×): {st.steps.map((s) => `${s.temp}°C ${formatTime(s.time)}${s.deltaPerCycle ? ` Δ${s.deltaPerCycle}` : ""}`).join(" → ")}</p>
                  ))}
                </div>
              </details>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
