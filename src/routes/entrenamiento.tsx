import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { CheckCircle2, XCircle, ChevronLeft, ChevronRight, FlaskConical, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScreenHeader } from "@/components/sim/ScreenHeader";
import { StatusBars } from "@/components/sim/StatusBars";
import { ThermalProfile, type StepPosition } from "@/components/sim/ThermalProfile";
import { MasterMixCalculator } from "@/components/sim/MasterMixCalculator";
import { NumPad, type NumPadRequest } from "@/components/sim/NumPad";
import { useApp } from "@/lib/store";
import { describeExercise } from "@/lib/pcr/exercises";
import { PRACTICE_CASES, verifyPractice, type PracticeCase, type MasterMixSettings } from "@/lib/pcr/practice";
import { type Program } from "@/lib/pcr/types";
import { generateProtocol } from "@/lib/pcr/protocol";
import { setLoopRange } from "@/lib/pcr/loops";
import { StepNameDialog } from "@/components/sim/StepNameDialog";
import { suggestionFor } from "@/lib/pcr/step-names";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/entrenamiento")({
  head: () => ({ meta: [
    { title: "Ejercicios de PCR y master mix — Simulador" },
    { name: "description", content: "Resuelve dos casos prácticos de PCR: programa el perfil térmico, prepara el master mix y verifica tus respuestas." },
    { property: "og:title", content: "Ejercicios de PCR y master mix" },
    { property: "og:description", content: "Practica con Taq y Hot-start: temperaturas, tiempos, ciclos y volúmenes de reacción con corrección por parámetro." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: Exercises,
});

function Exercises() {
  const [current, setCurrent] = useState<PracticeCase | null>(null);
  const attempts = useApp(s => s.attempts);
  return <StatusBars section="EJERCICIOS">
    <ScreenHeader title="Ejercicios" subtitle={current ? current.title : "PCR y preparación de master mix"} />
    {current ? <ExerciseWorkspace key={current.id} exercise={current} onBack={() => setCurrent(null)} /> :
      <div className="mx-auto w-full max-w-6xl p-6 sm:p-8">
        <div className="grid gap-5 md:grid-cols-2">
          {PRACTICE_CASES.map((exercise, index) => {
            const best = Math.max(-1, ...attempts.filter(a => a.exerciseId === exercise.id).map(a => a.score));
            return <Button key={exercise.id} variant="outline" onClick={() => setCurrent(exercise)} className="h-auto min-h-60 flex-col items-start gap-5 whitespace-normal rounded-lg bg-panel p-6 text-left">
              <div className="flex w-full items-center justify-between text-ice"><FlaskConical className="size-7" /><span className="font-mono text-xs">CASO {index + 1}</span></div>
              <h2 className="text-xl font-display font-semibold">{exercise.title}</h2>
              <p className="text-sm font-normal text-muted-foreground">{exercise.input.ampliconBp} pb · {exercise.mix.samples} muestras · {exercise.mix.volume} µL / reacción</p>
              <div className="flex w-full items-center justify-between border-t pt-4"><span className={cn("text-sm", best === 100 ? "text-run" : "text-muted-foreground")}>{best < 0 ? "Sin resolver" : `Mejor resultado: ${best} / 100`}</span><ChevronRight className="size-5" /></div>
            </Button>;
          })}
        </div>
      </div>}
  </StatusBars>;
}

/** El alumno edita una copia local: nunca altera una ejecución del instrumento. */
function ExerciseWorkspace({ exercise, onBack }: { exercise: PracticeCase; onBack: () => void }) {
  const [program, setProgram] = useState<Program>(() => {
    const reference = generateProtocol(exercise.input, `draft-${exercise.id}`).program;
    return { ...reference, stages: reference.stages.map(stage => ({ ...stage, repeats: stage.repeats > 1 ? 10 : 1, steps: stage.steps.map(step => ({ ...step, temp: step.time === 0 ? 20 : 50, time: step.time === 0 ? 0 : 10 })) })) };
  });
  const [mix, setMix] = useState<MasterMixSettings | null>(null);
  const [selected, setSelected] = useState<StepPosition>({ si: 0, pi: 0 });
  const [pad, setPad] = useState<NumPadRequest | null>(null);
  const [renaming, setRenaming] = useState<StepPosition | null>(null);
  const [result, setResult] = useState<ReturnType<typeof verifyPractice> | null>(null);
  const addAttempt = useApp(s => s.addAttempt);
  const updateProgram = (next: Program) => { setProgram(next); setResult(null); };
  // La referencia estable evita volver a notificar cambios en cada render.
  const reportMix = useCallback((next: MasterMixSettings) => { setMix(next); setResult(null); }, []);
  const edit = (pos: StepPosition, kind: "temp" | "time") => {
    const step = program.stages[pos.si]?.steps[pos.pi];
    if (!step) return;
    setPad({ title: `${step.label} · ${kind === "temp" ? "temperatura" : "duración"}`, value: kind === "temp" ? step.temp : step.time, unit: kind === "temp" ? "°C" : "s", time: kind === "time", allowDecimal: kind === "temp", min: kind === "temp" ? 4 : 0, max: kind === "temp" ? 105 : 36000,
      onConfirm: value => updateProgram({ ...program, stages: program.stages.map((s, si) => si !== pos.si ? s : { ...s, steps: s.steps.map((p, pi) => pi !== pos.pi ? p : { ...p, [kind]: value }) }) }) });
  };
  /** Cambia el nombre del paso elegido sin tocar temperatura ni duración. */
  const renameTo = (label: string) => { if (!renaming) return; updateProgram({ ...program, stages: program.stages.map((s, si) => si !== renaming.si ? s : { ...s, steps: s.steps.map((p, pi) => pi !== renaming.pi ? p : { ...p, label }) }) }); setRenaming(null); };
  const verify = () => {
    if (!mix) return;
    const next = verifyPractice(program, mix, exercise);
    setResult(next);
    addAttempt({ exerciseId: exercise.id, score: next.score, date: Date.now(), hintsUsed: 0 });
  };
  const target = exercise.mix;
  return <div className="space-y-5 p-4 sm:p-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><Button variant="outline" className="h-12" onClick={onBack}><ChevronLeft /> Todos los ejercicios</Button><span className="font-mono text-xs text-muted-foreground">{exercise.mix.samples} MUESTRAS · +10 % EXTRA</span></div>
    <section aria-label="Gráfico del termociclador">
      <ThermalProfile showHeader={false} program={{ ...program, sampleVolume: mix?.volume ?? program.sampleVolume }} selected={selected} onSelect={setSelected} locked={false} onTemperature={pos => edit(pos, "temp")} onTime={pos => edit(pos, "time")} onRename={setRenaming} onCycles={si => {
        const stage = program.stages[si]; if (!stage) return;
        setPad({ title: "Número de ciclos", value: stage.repeats, unit: "×", min: 2, max: 99, onConfirm: value => updateProgram({ ...program, stages: program.stages.map((s, i) => i === si ? { ...s, repeats: Math.round(value) } : s) }) });
      }} onLoopRange={(si, start, end) => { const stage = program.stages[si]; if (stage) updateProgram(setLoopRange(program, stage.id, start, end, stage.repeats)); }} />
    </section>
    <section aria-label="Calculadora de master mix" className="border-t pt-5"><MasterMixCalculator onChange={reportMix} /></section>
    <section aria-labelledby="exercise-statement" className="space-y-5 border-y py-5">
      <h2 id="exercise-statement" className="font-display text-xl text-ice">Enunciado</h2>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="grid content-start gap-2 text-sm sm:grid-cols-2">{describeExercise(exercise).map(line => <p key={line}>{line}</p>)}</div>
        <div className="grid content-start gap-2 text-sm sm:grid-cols-2">
          <p>{target.volume} µL por reacción · {target.samples} muestras</p><p>Molde: {target.options.templateUL} µL / tubo</p>
          <p>Enzima: {target.options.enzymeStockU} U/µL → {target.options.enzymeUnits} U / tubo</p><p>Cebadores: {target.options.primerStockUM} µM → {target.options.primerFinalUM} µM</p>
          <p>dNTPs: 10 mM cada uno → 0,2 mM</p><p>Tampón: 1,5 mM Mg²⁺ · extra: {target.input.additives.extraMg} mM</p><p>Stock MgCl₂: 25 mM · sin DMSO</p>
        </div>
      </div>
    </section>
    <Button className="h-14 w-full bg-run text-lg text-run-foreground" disabled={!mix} onClick={verify}><CheckCircle2 /> Verificar</Button>
    {result && <section className="space-y-4 border-t pt-5" aria-label="Resultado de la verificación" aria-live="polite">
      <div className="flex flex-wrap items-center gap-4"><Trophy className={cn("size-9", result.correct ? "text-run" : "text-amber")} /><h2 className="font-display text-2xl">{result.score} / 100</h2><p className="text-sm text-muted-foreground">{result.correct ? "¡Correcto! Programa y master mix resueltos." : "Revisa los parámetros marcados y vuelve a verificar."}</p></div>
      <ul className="grid gap-x-8 sm:grid-cols-2">{result.checks.map(check => <li key={check.label} className="flex gap-3 border-b py-3">{check.correct ? <CheckCircle2 className="size-5 shrink-0 text-run" /> : <XCircle className="size-5 shrink-0 text-destructive" />}<div><p className="text-sm font-medium">{check.label}</p><p className="text-xs text-muted-foreground">{check.detail}</p></div></li>)}</ul>
    </section>}
    {renaming && <StepNameDialog current={program.stages[renaming.si]?.steps[renaming.pi]?.label ?? ""} suggestion={suggestionFor(program, renaming.si, renaming.pi)} onPick={renameTo} onClose={() => setRenaming(null)} />}
    <NumPad req={pad} onClose={() => setPad(null)} />
  </div>;
}
