import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useState } from "react";
import { CheckCircle2, XCircle, ChevronLeft, ChevronRight, FlaskConical, Trophy, Lock, Trash2, Save } from "lucide-react";
import { OptionPopup } from "@/components/sim/OptionPopup";
import { listExercises, verifyExercise, checkExercisePassword, createExercise, deleteExercise } from "@/lib/ejercicios.functions";
import { Button } from "@/components/ui/button";
import { ScreenHeader } from "@/components/sim/ScreenHeader";
import { StatusBars } from "@/components/sim/StatusBars";
import { ThermalProfile, type StepPosition } from "@/components/sim/ThermalProfile";
import { MasterMixCalculator } from "@/components/sim/MasterMixCalculator";
import { NumPad, type NumPadRequest } from "@/components/sim/NumPad";
import { useApp } from "@/lib/store";
import { MODE_LABEL, type PracticeCase, type PracticeMode, type PublicCase, type MasterMixSettings } from "@/lib/pcr/practice";
import { cloneProgram, uid, type Program } from "@/lib/pcr/types";
import { setLoopRange } from "@/lib/pcr/loops";
import { StepNameDialog } from "@/components/sim/StepNameDialog";
import { suggestionFor } from "@/lib/pcr/step-names";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/entrenamiento")({
  head: () => ({ meta: [
    { title: "Ejercicios de PCR y master mix — Simulador" },
    { name: "description", content: "Resuelve y crea casos prácticos de PCR: programa el perfil térmico, prepara el master mix y verifica tus respuestas." },
    { property: "og:title", content: "Ejercicios de PCR y master mix" },
    { property: "og:description", content: "Practica temperaturas, tiempos, ciclos y volúmenes de reacción, con casos preparados por el docente." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  loader: () => listExercises(),
  component: Exercises,
});

type View = { kind: "list" } | { kind: "solve"; exercise: PublicCase } | { kind: "create" };

function Exercises() {
  const router = useRouter();
  const exercises = Route.useLoaderData();
  const [view, setView] = useState<View>({ kind: "list" });
  const attempts = useApp(s => s.attempts);
  const create = useServerFn(createExercise);
  const remove = useServerFn(deleteExercise);
  /** Contraseña validada en esta visita (solo en memoria, nunca guardada). */
  const [password, setPassword] = useState<string | null>(null);
  const [asking, setAsking] = useState<null | ((pw: string) => void)>(null);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const withPassword = (then: (pw: string) => void) => (password ? then(password) : setAsking(() => (pw: string) => { setPassword(pw); then(pw); }));

  const actions = view.kind === "list" && <Button variant="outline" className="h-12" onClick={() => withPassword(() => setView({ kind: "create" }))}><Lock /> Crear</Button>;

  const save = async (c: PracticeCase) => {
    const r = await create({ data: { password: password ?? "", exercise: c } });
    if (!r.ok) return setNotice({ ok: false, text: r.error });
    await router.invalidate(); setView({ kind: "list" }); setNotice({ ok: true, text: "Ejercicio guardado" });
  };
  const del = (id: string, n: number) => withPassword(async pw => {
    if (!confirm(`¿Eliminar el caso ${n}? Los siguientes se renumerarán.`)) return;
    const r = await remove({ data: { password: pw, id } });
    setNotice(r.ok ? { ok: true, text: "Ejercicio eliminado" } : { ok: false, text: r.error });
    await router.invalidate();
  });

  const subtitle = view.kind === "solve" ? view.exercise.title : view.kind === "create" ? "Nuevo ejercicio" : "PCR y preparación de master mix";
  return <StatusBars section="EJERCICIOS">
    <ScreenHeader title="Ejercicios" subtitle={subtitle} actions={actions} />
    {asking && <PasswordDialog onClose={() => setAsking(null)} onOk={pw => { const cb = asking; setAsking(null); cb(pw); }} />}
    {view.kind === "solve" && <ExerciseWorkspace key={view.exercise.id} exercise={view.exercise} onBack={() => setView({ kind: "list" })} />}
    {view.kind === "create" && <>
      {notice && !notice.ok && <p role="alert" className="px-6 pt-4 text-sm text-destructive">{notice.text}</p>}
      <ExerciseCreator onBack={() => setView({ kind: "list" })} onSave={c => void save(c)} />
    </>}
    {view.kind === "list" &&
      <div className="mx-auto w-full max-w-6xl p-6 sm:p-8">
        {notice && <p role="status" className={cn("mb-4 text-sm", notice.ok ? "text-run" : "text-destructive")}>{notice.text}</p>}
        <div className="grid gap-5 md:grid-cols-2">
          {exercises.map((exercise, index) => {
            const best = Math.max(-1, ...attempts.filter(a => a.exerciseId === exercise.id).map(a => a.score));
            return <div key={exercise.id} className="relative">
              <Button variant="outline" onClick={() => setView({ kind: "solve", exercise })} className="h-auto min-h-60 w-full flex-col items-start gap-5 whitespace-normal rounded-lg bg-panel p-6 text-left">
                <div className="flex w-full items-center justify-between text-ice"><FlaskConical className="size-7" /><span className="mr-14 font-mono text-xs">CASO {index + 1}</span></div>
                <h2 className="text-xl font-display font-semibold">{exercise.title}</h2>
                <p className="text-sm font-normal text-muted-foreground">{MODE_LABEL[exercise.mode]} · {exercise.mode !== "mix" && `${exercise.skeleton.stages.flatMap(s => s.steps).length} pasos · `}{exercise.samples} muestras · {exercise.volume} µL / reacción</p>
                <div className="flex w-full items-center justify-between border-t pt-4"><span className={cn("text-sm", best === 100 ? "text-run" : "text-muted-foreground")}>{best < 0 ? "Sin resolver" : `Mejor resultado: ${best} / 100`}</span><ChevronRight className="size-5" /></div>
              </Button>
              <Button variant="outline" size="icon" aria-label="Eliminar ejercicio" className="absolute right-4 top-4 size-12 text-destructive" onClick={() => del(exercise.id, index + 1)}><Trash2 /></Button>
            </div>;
          })}
        </div>
      </div>}
  </StatusBars>;
}

/** Pide la contraseña del docente; se comprueba en el servidor. */
function PasswordDialog({ onOk, onClose }: { onOk: (pw: string) => void; onClose: () => void }) {
  const check = useServerFn(checkExercisePassword);
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await check({ data: { password: value } });
    if (r.ok) onOk(value); else setError(true);
  };
  return <OptionPopup onClose={onClose} content={{ title: "Acceso de docente", subtitle: "Introduce la contraseña para crear o eliminar ejercicios.", body:
    <form onSubmit={e => void submit(e)} className="grid gap-3">
      <input autoFocus type="password" autoComplete="off" value={value} onChange={e => { setValue(e.target.value); setError(false); }} aria-label="Contraseña" className="h-12 rounded-md border bg-background px-3 text-base" />
      {error && <p className="text-sm text-destructive">Contraseña incorrecta</p>}
      <Button type="submit" className="h-12 bg-run text-run-foreground">Entrar</Button>
    </form> }} />;
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
function ExerciseWorkspace({ exercise, onBack }: { exercise: PublicCase; onBack: () => void }) {
  const verifyFn = useServerFn(verifyExercise);
  const [program, setProgram] = useState<Program>(() => cloneProgram(exercise.skeleton));
  const [mix, setMix] = useState<MasterMixSettings | null>(null);
  const [result, setResult] = useState<Awaited<ReturnType<typeof verifyExercise>> | null>(null);
  const addAttempt = useApp(s => s.addAttempt);
  const updateProgram = (next: Program) => { setProgram(next); setResult(null); };
  // La referencia estable evita volver a notificar cambios en cada render.
  const reportMix = useCallback((next: MasterMixSettings) => { setMix(next); setResult(null); }, []);
  const showCycler = exercise.mode !== "mix", showMix = exercise.mode !== "cycler";
  const verify = async () => {
    if (showMix && !mix) return;
    // La solución nunca llega al navegador: se compara en el servidor.
    const next = await verifyFn({ data: { id: exercise.id, program, mix } });
    setResult(next);
    addAttempt({ exerciseId: exercise.id, score: next.score, date: Date.now(), hintsUsed: 0 });
  };
  return <div className="space-y-5 p-4 sm:p-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><Button variant="outline" className="h-12" onClick={onBack}><ChevronLeft /> Todos los ejercicios</Button><span className="font-mono text-xs text-muted-foreground">{exercise.samples} MUESTRAS · +10 % EXTRA</span></div>
    {showCycler && <EditableProfile program={program} onChange={updateProgram} volume={mix?.volume ?? exercise.volume} />}
    {showMix && <section aria-label="Calculadora de master mix" className={cn(showCycler && "border-t pt-5")}><MasterMixCalculator onChange={reportMix} /></section>}
    <section aria-labelledby="exercise-statement" className="space-y-5 border-y py-5">
      <h2 id="exercise-statement" className="font-display text-xl text-ice">Enunciado</h2>
      <div className="grid content-start gap-2 text-sm sm:grid-cols-2">{exercise.statement.map((line, i) => <p key={i}>{line}</p>)}</div>
    </section>
    <Button className="h-14 w-full bg-run text-lg text-run-foreground" disabled={showMix && !mix} onClick={() => void verify()}><CheckCircle2 /> Verificar</Button>
    {result && <section className="space-y-4 border-t pt-5" aria-label="Resultado de la verificación" aria-live="polite">
      <div className="flex flex-wrap items-center gap-4"><Trophy className={cn("size-9", result.correct ? "text-run" : "text-amber")} /><h2 className="font-display text-2xl">{result.score} / 100</h2><p className="text-sm text-muted-foreground">{result.correct ? "¡Correcto! Ejercicio resuelto." : "Revisa los parámetros marcados y vuelve a verificar."}</p></div>
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
  const [program, setProgram] = useState<Program>(() => cloneProgram(programs[0]!));
  const [mix, setMix] = useState<MasterMixSettings | null>(null);
  const [title, setTitle] = useState("");
  const [statement, setStatement] = useState("");
  const [mode, setMode] = useState<PracticeMode>("both");
  const reportMix = useCallback((next: MasterMixSettings) => setMix(next), []);
  const showCycler = mode !== "mix", showMix = mode !== "cycler";
  const save = () => {
    if (!mix || !title.trim()) return;
    onSave({ id: `caso-${uid()}`, title: title.trim(), mode, statement: statement.split("\n").map(l => l.trim()).filter(Boolean), program: { ...program, name: title.trim() }, mix });
  };
  return <div className="space-y-5 p-4 sm:p-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Button variant="outline" className="h-12" onClick={onBack}><ChevronLeft /> Cancelar</Button>
      <div role="radiogroup" aria-label="Tipo de ejercicio" className="flex flex-wrap gap-2">
        {(Object.keys(MODE_LABEL) as PracticeMode[]).map(m => <Button key={m} role="radio" aria-checked={mode === m} variant={mode === m ? "default" : "outline"} className="h-12" onClick={() => setMode(m)}>{MODE_LABEL[m]}</Button>)}
      </div>
      {showCycler && <label className="flex items-center gap-2 text-sm text-muted-foreground">Partir del programa
        <select className="h-12 rounded-md border bg-panel px-3 text-foreground" onChange={e => { const p = programs.find(x => x.id === e.target.value); if (p) setProgram(cloneProgram(p)); }}>
          {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </label>}
    </div>
    {showCycler && <EditableProfile program={program} onChange={setProgram} volume={mix?.volume} />}
    {/* La mezcla se monta siempre: aporta volumen y muestras incluso en casos de solo termociclador. */}
    <section aria-label="Master mix correcto" className={cn(showCycler && "border-t pt-5", !showMix && "hidden")}><MasterMixCalculator onChange={reportMix} /></section>
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
