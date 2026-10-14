import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useRef, useState } from "react";
import { CheckCircle2, XCircle, ChevronLeft, ChevronRight, FlaskConical, Trophy, Plus, Upload, Download, Trash2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScreenHeader } from "@/components/sim/ScreenHeader";
import { StatusBars } from "@/components/sim/StatusBars";
import { ThermalProfile, type StepPosition } from "@/components/sim/ThermalProfile";
import { MasterMixCalculator } from "@/components/sim/MasterMixCalculator";
import { NumPad, type NumPadRequest } from "@/components/sim/NumPad";
import { useApp } from "@/lib/store";
import { PRACTICE_CASES, verifyPractice, exportExercises, importExercises, type PracticeCase, type MasterMixSettings } from "@/lib/pcr/practice";
import { cloneProgram, type Program } from "@/lib/pcr/types";
import { setLoopRange } from "@/lib/pcr/loops";
import { StepNameDialog } from "@/components/sim/StepNameDialog";
import { suggestionFor } from "@/lib/pcr/step-names";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/entrenamiento")({
  head: () => ({ meta: [
    { title: "Ejercicios de PCR y master mix — Simulador" },
    { name: "description", content: "Resuelve y crea casos prácticos de PCR: programa el perfil térmico, prepara el master mix y verifica tus respuestas." },
    { property: "og:title", content: "Ejercicios de PCR y master mix" },
    { property: "og:description", content: "Practica temperaturas, tiempos, ciclos y volúmenes de reacción, o crea tus propios ejercicios e intercámbialos en archivos." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: Exercises,
});

type View = { kind: "list" } | { kind: "solve"; exercise: PracticeCase } | { kind: "create" };

/** Descarga un texto como archivo en el propio equipo (sin servidor). */
function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}

function Exercises() {
  const [view, setView] = useState<View>({ kind: "list" });
  const attempts = useApp(s => s.attempts);
  const custom = useApp(s => s.customExercises);
  const saveExercise = useApp(s => s.saveExercise);
  const deleteExercise = useApp(s => s.deleteExercise);
  const fileRef = useRef<HTMLInputElement>(null);
  /** Aviso breve tras importar/guardar (sin librerías externas). */
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const toast = { success: (text: string) => setNotice({ ok: true, text }), error: (text: string) => setNotice({ ok: false, text }) };
  const all = [...PRACTICE_CASES, ...custom];

  const onImport = async (file: File) => {
    try {
      const list = importExercises(await file.text(), `imp-${Date.now()}`);
      list.forEach(saveExercise);
      toast.success(`${list.length} ejercicio(s) importado(s)`);
    } catch {
      toast.error("El archivo no es un archivo de ejercicios válido.");
    }
  };

  const actions = view.kind === "list" && <>
    <Button variant="outline" className="h-12" onClick={() => setView({ kind: "create" })}><Plus /> Crear</Button>
    <Button variant="outline" className="h-12" onClick={() => fileRef.current?.click()}><Upload /> Importar</Button>
    <Button variant="outline" className="h-12" disabled={!custom.length} onClick={() => download("ejercicios-pcr.json", exportExercises(custom))}><Download /> Exportar</Button>
    <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) void onImport(f); e.target.value = ""; }} />
  </>;

  const subtitle = view.kind === "solve" ? view.exercise.title : view.kind === "create" ? "Nuevo ejercicio" : "PCR y preparación de master mix";
  return <StatusBars section="EJERCICIOS">
    <ScreenHeader title="Ejercicios" subtitle={subtitle} actions={actions} />
    {view.kind === "solve" && <ExerciseWorkspace key={view.exercise.id} exercise={view.exercise} onBack={() => setView({ kind: "list" })} />}
    {view.kind === "create" && <ExerciseCreator onBack={() => setView({ kind: "list" })} onSave={c => { saveExercise(c); setView({ kind: "list" }); toast.success("Ejercicio guardado"); }} />}
    {view.kind === "list" &&
      <div className="mx-auto w-full max-w-6xl p-6 sm:p-8">
        {notice && <p role="status" className={cn("mb-4 text-sm", notice.ok ? "text-run" : "text-destructive")}>{notice.text}</p>}
        <div className="grid gap-5 md:grid-cols-2">
          {all.map((exercise, index) => {
            const best = Math.max(-1, ...attempts.filter(a => a.exerciseId === exercise.id).map(a => a.score));
            return <div key={exercise.id} className="relative">
              <Button variant="outline" onClick={() => setView({ kind: "solve", exercise })} className="h-auto min-h-60 w-full flex-col items-start gap-5 whitespace-normal rounded-lg bg-panel p-6 text-left">
                <div className="flex w-full items-center justify-between text-ice"><FlaskConical className="size-7" /><span className="mr-14 font-mono text-xs">{exercise.custom ? "PROPIO" : "CASO"} {index + 1}</span></div>
                <h2 className="text-xl font-display font-semibold">{exercise.title}</h2>
                <p className="text-sm font-normal text-muted-foreground">{exercise.program.stages.flatMap(s => s.steps).length} pasos · {exercise.mix.samples} muestras · {exercise.mix.volume} µL / reacción</p>
                <div className="flex w-full items-center justify-between border-t pt-4"><span className={cn("text-sm", best === 100 ? "text-run" : "text-muted-foreground")}>{best < 0 ? "Sin resolver" : `Mejor resultado: ${best} / 100`}</span><ChevronRight className="size-5" /></div>
              </Button>
              {exercise.custom && <Button variant="outline" size="icon" aria-label="Eliminar ejercicio" className="absolute right-4 top-4 size-12 text-destructive"
                onClick={() => { if (confirm(`¿Eliminar «${exercise.title}»?`)) deleteExercise(exercise.id); }}><Trash2 /></Button>}
            </div>;
          })}
        </div>
      </div>}
  </StatusBars>;
}

/** Gráfico editable compartido por el alumno y el creador de ejercicios. */
function EditableProfile({ program, onChange, volume }: { program: Program; onChange: (p: Program) => void; volume?: number | undefined }) {
  const [selected, setSelected] = useState<StepPosition>({ si: 0, pi: 0 });
  const [pad, setPad] = useState<NumPadRequest | null>(null);
  const [renaming, setRenaming] = useState<StepPosition | null>(null);
  const mapStep = (pos: StepPosition, patch: object) => onChange({ ...program, stages: program.stages.map((s, si) => si !== pos.si ? s : { ...s, steps: s.steps.map((p, pi) => pi !== pos.pi ? p : { ...p, ...patch }) }) });
  const edit = (pos: StepPosition, kind: "temp" | "time") => {
    const step = program.stages[pos.si]?.steps[pos.pi];
    if (!step) return;
    setPad({ title: `${step.label} · ${kind === "temp" ? "temperatura" : "duración"}`, value: kind === "temp" ? step.temp : step.time, unit: kind === "temp" ? "°C" : "s", time: kind === "time", allowDecimal: kind === "temp", min: kind === "temp" ? 4 : 0, max: kind === "temp" ? 105 : 36000,
      onConfirm: value => mapStep(pos, { [kind]: value }) });
  };
  return <section aria-label="Gráfico del termociclador">
    <ThermalProfile showHeader={false} program={{ ...program, sampleVolume: volume ?? program.sampleVolume }} selected={selected} onSelect={setSelected} locked={false} onTemperature={pos => edit(pos, "temp")} onTime={pos => edit(pos, "time")} onRename={setRenaming} onCycles={si => {
      const stage = program.stages[si]; if (!stage) return;
      setPad({ title: "Número de ciclos", value: stage.repeats, unit: "×", min: 2, max: 99, onConfirm: value => onChange({ ...program, stages: program.stages.map((s, i) => i === si ? { ...s, repeats: Math.round(value) } : s) }) });
    }} onLoopRange={(si, start, end) => { const stage = program.stages[si]; if (stage) onChange(setLoopRange(program, stage.id, start, end, stage.repeats)); }} />
    {renaming && <StepNameDialog current={program.stages[renaming.si]?.steps[renaming.pi]?.label ?? ""} suggestion={suggestionFor(program, renaming.si, renaming.pi)} onPick={label => { mapStep(renaming, { label }); setRenaming(null); }} onClose={() => setRenaming(null)} />}
    <NumPad req={pad} onClose={() => setPad(null)} />
  </section>;
}

/** El alumno edita una copia local: nunca altera una ejecución del instrumento. */
function ExerciseWorkspace({ exercise, onBack }: { exercise: PracticeCase; onBack: () => void }) {
  const [program, setProgram] = useState<Program>(() => {
    const reference = cloneProgram(exercise.program);
    return { ...reference, stages: reference.stages.map(stage => ({ ...stage, repeats: stage.repeats > 1 ? 10 : 1, steps: stage.steps.map(step => ({ ...step, temp: step.time === 0 ? 20 : 50, time: step.time === 0 ? 0 : 10 })) })) };
  });
  const [mix, setMix] = useState<MasterMixSettings | null>(null);
  const [result, setResult] = useState<ReturnType<typeof verifyPractice> | null>(null);
  const addAttempt = useApp(s => s.addAttempt);
  const updateProgram = (next: Program) => { setProgram(next); setResult(null); };
  // La referencia estable evita volver a notificar cambios en cada render.
  const reportMix = useCallback((next: MasterMixSettings) => { setMix(next); setResult(null); }, []);
  const verify = () => {
    if (!mix) return;
    const next = verifyPractice(program, mix, exercise);
    setResult(next);
    addAttempt({ exerciseId: exercise.id, score: next.score, date: Date.now(), hintsUsed: 0 });
  };
  return <div className="space-y-5 p-4 sm:p-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><Button variant="outline" className="h-12" onClick={onBack}><ChevronLeft /> Todos los ejercicios</Button><span className="font-mono text-xs text-muted-foreground">{exercise.mix.samples} MUESTRAS · +10 % EXTRA</span></div>
    <EditableProfile program={program} onChange={updateProgram} volume={mix?.volume} />
    <section aria-label="Calculadora de master mix" className="border-t pt-5"><MasterMixCalculator onChange={reportMix} /></section>
    <section aria-labelledby="exercise-statement" className="space-y-5 border-y py-5">
      <h2 id="exercise-statement" className="font-display text-xl text-ice">Enunciado</h2>
      <div className="grid content-start gap-2 text-sm sm:grid-cols-2">{exercise.statement.map((line, i) => <p key={i}>{line}</p>)}</div>
    </section>
    <Button className="h-14 w-full bg-run text-lg text-run-foreground" disabled={!mix} onClick={verify}><CheckCircle2 /> Verificar</Button>
    {result && <section className="space-y-4 border-t pt-5" aria-label="Resultado de la verificación" aria-live="polite">
      <div className="flex flex-wrap items-center gap-4"><Trophy className={cn("size-9", result.correct ? "text-run" : "text-amber")} /><h2 className="font-display text-2xl">{result.score} / 100</h2><p className="text-sm text-muted-foreground">{result.correct ? "¡Correcto! Programa y master mix resueltos." : "Revisa los parámetros marcados y vuelve a verificar."}</p></div>
      <ul className="grid gap-x-8 sm:grid-cols-2">{result.checks.map(check => <li key={check.label} className="flex gap-3 border-b py-3">{check.correct ? <CheckCircle2 className="size-5 shrink-0 text-run" /> : <XCircle className="size-5 shrink-0 text-destructive" />}<div><p className="text-sm font-medium">{check.label}</p><p className="text-xs text-muted-foreground">{check.detail}</p></div></li>)}</ul>
    </section>}
  </div>;
}

/**
 * Creador de ejercicios: el docente parte de un programa de la biblioteca,
 * lo ajusta en el gráfico, prepara la mezcla correcta y escribe el enunciado.
 */
function ExerciseCreator({ onBack, onSave }: { onBack: () => void; onSave: (c: PracticeCase) => void }) {
  const programs = useApp(s => s.programs);
  const [program, setProgram] = useState<Program>(() => cloneProgram(programs[0] ?? PRACTICE_CASES[0]!.program));
  const [mix, setMix] = useState<MasterMixSettings | null>(null);
  const [title, setTitle] = useState("");
  const [statement, setStatement] = useState("");
  const reportMix = useCallback((next: MasterMixSettings) => setMix(next), []);
  const save = () => {
    if (!mix || !title.trim()) return;
    onSave({ id: `own-${Date.now()}`, title: title.trim(), statement: statement.split("\n").map(l => l.trim()).filter(Boolean), program: { ...program, name: title.trim() }, mix, custom: true });
  };
  return <div className="space-y-5 p-4 sm:p-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Button variant="outline" className="h-12" onClick={onBack}><ChevronLeft /> Cancelar</Button>
      <label className="flex items-center gap-2 text-sm text-muted-foreground">Partir del programa
        <select className="h-12 rounded-md border bg-panel px-3 text-foreground" onChange={e => { const p = programs.find(x => x.id === e.target.value); if (p) setProgram(cloneProgram(p)); }}>
          {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </label>
    </div>
    <p className="text-sm text-muted-foreground">Ajusta el gráfico y la mezcla con los valores <strong>correctos</strong>: el alumno deberá reproducirlos.</p>
    <EditableProfile program={program} onChange={setProgram} volume={mix?.volume} />
    <section aria-label="Master mix correcto" className="border-t pt-5"><MasterMixCalculator onChange={reportMix} /></section>
    <section className="grid gap-4 border-y py-5">
      <label className="grid gap-2 text-sm">Título
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="p. ej. PCR de colonia con Taq" className="h-12 rounded-md border bg-panel px-3 text-base" />
      </label>
      <label className="grid gap-2 text-sm">Enunciado (una línea por dato)
        <textarea value={statement} onChange={e => setStatement(e.target.value)} rows={6} placeholder={"Polimerasa: Taq\nAmplicón: 700 pb\n25 µL por reacción · 6 muestras"} className="rounded-md border bg-panel p-3 text-base" />
      </label>
    </section>
    <Button className="h-14 w-full bg-run text-lg text-run-foreground" disabled={!mix || !title.trim()} onClick={save}><Save /> Guardar ejercicio</Button>
  </div>;
}
