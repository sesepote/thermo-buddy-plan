import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, XCircle, ChevronLeft, ChevronRight, FlaskConical, Trophy, Lock, Trash2, Save, Pencil, Copy, Plus, LogOut, KeyRound } from "lucide-react";
import { OptionPopup } from "@/components/sim/OptionPopup";
import { listExercises, verifyExercise, saveExercise, deleteExercise, getExerciseForEdit } from "@/lib/ejercicios.functions";
import { PasswordDialog, ChangePasswordDialog } from "@/components/sim/PasswordDialog";
import { useTeacher, useHoldTeacherSession } from "@/lib/teacher-session";
import { Button } from "@/components/ui/button";
import { ScreenHeader } from "@/components/sim/ScreenHeader";
import { useT } from "@/lib/i18n";
import { StatusBars } from "@/components/sim/StatusBars";
import { ThermalProfile, type StepPosition } from "@/components/sim/ThermalProfile";
import { ManualMixEditor } from "@/components/sim/ManualMixEditor";
import { ManualMix } from "@/components/sim/ManualMix";
import { ScientistReaction, preloadReactionVideos } from "@/components/sim/ScientistReaction";
import { NumPad, type NumPadRequest } from "@/components/sim/NumPad";
import { useApp } from "@/lib/store";
import { MODE_LABEL, isManualSolution, type PracticeCase, type PracticeMode, type PublicCase, type MasterMixSettings, type ManualAnswer } from "@/lib/pcr/practice";
import { editableMix } from "@/lib/pcr/manual-editor";
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
  staleTime: 5 * 60_000,
  component: Exercises,
});

type View = { kind: "list" } | { kind: "solve"; exercise: PublicCase } | { kind: "create"; initial?: PracticeCase | undefined };

function Exercises() {
  useEffect(() => { const t = setTimeout(preloadReactionVideos, 800); return () => clearTimeout(t); }, []);
  const router = useRouter();
  const exercises = Route.useLoaderData();
  const [view, setView] = useState<View>({ kind: "list" });
  const attempts = useApp(s => s.attempts);
  const save_ = useServerFn(saveExercise);
  const remove = useServerFn(deleteExercise);
  const loadFull = useServerFn(getExerciseForEdit);
  const { auth, nombre, logout } = useTeacher();
  const [asking, setAsking] = useState(false);
  const [changing, setChanging] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  const actions = view.kind === "list" && (auth
    ? <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-xs text-ice">{nombre}</span>
        <Button className="h-12" onClick={() => setView({ kind: "create" })}><Plus /> Crear</Button>
        <Button variant="outline" className="h-12" onClick={() => setChanging(true)}><KeyRound /> Clave</Button>
        <Button variant="outline" className="h-12" onClick={logout}><LogOut /> Cerrar sesión</Button>
      </div>
    : <Button variant="outline" className="h-12" onClick={() => setAsking(true)}><Lock /> Acceso docente</Button>);

  const save = async (c: PracticeCase) => {
    if (!auth) return setNotice({ ok: false, text: "La sesión docente se ha cerrado" });
    const r = await save_({ data: { auth, exercise: c } });
    if (!r.ok) return setNotice({ ok: false, text: r.error });
    await router.invalidate(); setView({ kind: "list" }); setNotice({ ok: true, text: "Ejercicio guardado" });
  };
  const del = async (id: string, title: string) => {
    if (!auth || !confirm(`¿Eliminar «${title}»?`)) return;
    const r = await remove({ data: { auth, id } });
    setNotice(r.ok ? { ok: true, text: "Ejercicio eliminado" } : { ok: false, text: r.error });
    await router.invalidate();
  };
  const openEditor = async (id: string, clone: boolean) => {
    if (!auth) return;
    const r = await loadFull({ data: { auth, id } });
    if (!r.ok) return setNotice({ ok: false, text: r.error });
    const { order: _o, author: _a, ...rest } = r.exercise;
    setView({ kind: "create", initial: clone ? { ...rest, id: `caso-${uid()}`, title: `${rest.title} (copia)` } : r.exercise });
  };

  const subtitle = view.kind === "solve" ? view.exercise.title : view.kind === "create" ? (view.initial?.order ? "Editar ejercicio" : "Nuevo ejercicio") : "PCR y preparación de master mix";
  return <StatusBars section={useT().sections.exercises}>
    <ScreenHeader title={useT().titles.exercises} subtitle={subtitle} actions={actions} sound />
    {asking && <PasswordDialog onClose={() => setAsking(false)} onOk={() => setAsking(false)} />}
    {changing && <ChangePasswordDialog onClose={() => setChanging(false)} />}
    {view.kind === "solve" && <ExerciseWorkspace key={view.exercise.id} exercise={view.exercise} onBack={() => setView({ kind: "list" })} />}
    {view.kind === "create" && <>
      {notice && !notice.ok && <p role="alert" className="px-6 pt-4 text-sm text-destructive">{notice.text}</p>}
      <ExerciseCreator key={view.initial?.id ?? "new"} initial={view.initial} onBack={() => setView({ kind: "list" })} onSave={c => void save(c)} />
    </>}
    {view.kind === "list" &&
      <div className="mx-auto w-full max-w-6xl p-6 sm:p-8">
        {notice && <p role="status" className={cn("mb-4 text-sm", notice.ok ? "text-run" : "text-destructive")}>{notice.text}</p>}
        <div className="grid gap-5 md:grid-cols-2">
          {exercises.map((exercise, index) => {
            const best = Math.max(-1, ...attempts.filter(a => a.exerciseId === exercise.id).map(a => a.score));
            return <div key={exercise.id} className="relative">
              <Button variant="outline" onClick={() => setView({ kind: "solve", exercise })} className="h-auto min-h-60 w-full flex-col items-start gap-5 whitespace-normal rounded-lg bg-panel p-6 text-left">
                <div className="flex w-full items-center justify-between text-ice"><FlaskConical className="size-7" /><span className={cn("font-mono text-xs uppercase", auth && "mr-44")}>{exercise.topic ?? `Caso ${index + 1}`}</span></div>
                <h2 className="text-xl font-display font-semibold">{exercise.title}</h2>
                <p className="text-sm font-normal text-muted-foreground">{MODE_LABEL[exercise.mode]} · {exercise.mode !== "mix" && `${exercise.skeleton.stages.flatMap(s => s.steps).length} pasos · `}{exercise.samples} muestras · {exercise.volume} µL / reacción</p>
                <div className="flex w-full items-center justify-between border-t pt-4"><span className={cn("text-sm", best === 100 ? "text-run" : "text-muted-foreground")}>{best < 0 ? "Sin resolver" : `Mejor resultado: ${best} / 100`}</span><ChevronRight className="size-5" /></div>
              </Button>
              {auth && <div className="absolute right-4 top-4 flex gap-2">
                <Button variant="outline" size="icon" aria-label="Editar ejercicio" title="Editar" className="size-12" onClick={() => void openEditor(exercise.id, false)}><Pencil /></Button>
                <Button variant="outline" size="icon" aria-label="Clonar ejercicio" title="Clonar" className="size-12" onClick={() => void openEditor(exercise.id, true)}><Copy /></Button>
                <Button variant="outline" size="icon" aria-label="Eliminar ejercicio" title="Eliminar" className="size-12 text-destructive" onClick={() => void del(exercise.id, exercise.title)}><Trash2 /></Button>
              </div>}
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
function ExerciseWorkspace({ exercise, onBack }: { exercise: PublicCase; onBack: () => void }) {
  const verifyFn = useServerFn(verifyExercise);
  const [program, setProgram] = useState<Program>(() => cloneProgram(exercise.skeleton));
  const [answer, setAnswer] = useState<ManualAnswer>({ single: {}, mix: {} });
  const [celebrate, setCelebrate] = useState(0);
  const [result, setResult] = useState<Awaited<ReturnType<typeof verifyExercise>> | null>(null);
  const addAttempt = useApp(s => s.addAttempt);
  const updateProgram = (next: Program) => { setProgram(next); setResult(null); };
  const updateAnswer = (next: ManualAnswer) => { setAnswer(next); setResult(null); };
  const showCycler = exercise.mode !== "mix", showMix = exercise.mode !== "cycler";
  const [animating, setAnimating] = useState(false);
  const endAnimation = useCallback(() => setAnimating(false), []);
  const verify = async () => {
    // La solución nunca llega al navegador: se compara en el servidor.
    const next = await verifyFn({ data: { id: exercise.id, program, answer: showMix ? answer : null } });
    setResult(next);
    setAnimating(true);
    if (showMix && next.checks.filter(c => c.label.startsWith("1 reacción") || c.label.startsWith("Master mix")).every(c => c.correct)) setCelebrate(n => n + 1);
    addAttempt({ exerciseId: exercise.id, score: next.score, date: Date.now(), hintsUsed: 0 });
  };
  return <div className="space-y-5 p-4 sm:p-6">
    {animating && result && <ScientistReaction score={result.score} onClose={endAnimation} />}
    <div className="flex flex-wrap items-center justify-between gap-3"><Button variant="outline" className="h-12" onClick={onBack}><ChevronLeft /> Todos los ejercicios</Button></div>
    {showCycler && <EditableProfile program={program} onChange={updateProgram} volume={exercise.volume} />}
    {showMix && <section aria-label="Mezcla de reacción y master mix" className={cn("space-y-3", showCycler && "border-t pt-5")}><h2 className="font-display text-xl text-ice">Mezcla de reacción y master mix</h2><ManualMix reagents={exercise.reagents} volume={exercise.volume} answer={answer} onChange={updateAnswer} celebrate={celebrate} /></section>}
    <section aria-labelledby="exercise-statement" className="space-y-5 border-y py-5">
      <h2 id="exercise-statement" className="font-display text-xl text-ice">Enunciado</h2>
      <StatementBody lines={exercise.statement} />
    </section>
    <Button className="h-14 w-full bg-run text-lg text-run-foreground" onClick={() => void verify()}><CheckCircle2 /> Verificar</Button>
    {result && !animating && <section className="space-y-4 border-t pt-5" aria-label="Resultado de la verificación" aria-live="polite">
      <div className="flex flex-wrap items-center gap-4"><Trophy className={cn("size-9", result.correct ? "text-run" : "text-amber")} /><h2 className="font-display text-2xl">{result.score} / 100</h2><p className="text-sm text-muted-foreground">{result.correct ? "¡Correcto! Ejercicio resuelto." : "Revisa los parámetros marcados y vuelve a verificar."}</p></div>
      <ul className="grid gap-x-8 sm:grid-cols-2">{result.checks.map(check => <li key={check.label} className="flex gap-3 border-b py-3">{check.correct ? <CheckCircle2 className="size-5 shrink-0 text-run" /> : <XCircle className="size-5 shrink-0 text-destructive" />}<div><p className="text-sm font-medium">{check.label}</p><p className="text-xs text-muted-foreground">{check.detail}</p></div></li>)}</ul>
    </section>}
  </div>;
}

/**
 * Creador de ejercicios: el docente parte de un programa de la biblioteca,
 * lo ajusta en el gráfico, prepara la mezcla correcta y escribe el enunciado.
 */
function ExerciseCreator({ onBack, onSave, initial }: { onBack: () => void; onSave: (c: PracticeCase) => void; initial?: PracticeCase | undefined }) {
  useHoldTeacherSession();
  const programs = useApp(s => s.programs);
  const [program, setProgram] = useState<Program>(() => {
    if (initial) return structuredClone(initial.program);
    const first = programs[0];
    return first ? cloneProgram(first) : { id: uid(), name: "Nuevo programa", lidTemp: 105, rampRate: 3, stages: [] };
  });
  const [mix, setMix] = useState<MasterMixSettings>(() => editableMix(initial?.mix));
  const [title, setTitle] = useState(initial?.title ?? "");
  const [topic, setTopic] = useState(initial?.topic ?? "");
  const [statement, setStatement] = useState((initial?.statement ?? []).join("\n"));
  const [mode, setMode] = useState<PracticeMode>(initial?.mode ?? "both");
  const showCycler = mode !== "mix", showMix = mode !== "cycler";
  const valid = !!title.trim() && (!showMix || isManualSolution(mix.manual)) && (!showCycler || program.stages.length > 0);
  const save = () => {
    if (!valid) return;
    onSave({ id: initial?.id ?? `caso-${uid()}`, title: title.trim(), ...(topic.trim() ? { topic: topic.trim() } : {}), mode, statement: statement.split("\n").map(l => l.trim()).filter(Boolean), program: { ...program, name: title.trim() }, mix, order: initial?.order, author: initial?.author });
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
    {showCycler && <EditableProfile program={program} onChange={setProgram} volume={mix.volume} />}
    <ManualMixEditor mix={mix} onChange={setMix} showMix={showMix} />
    <section className="grid gap-4 border-y py-5">
      <label className="grid gap-2 text-sm">Título
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="p. ej. PCR de colonia con Taq" className="h-12 rounded-md border bg-panel px-3 text-base" />
      </label>
      <label className="grid gap-2 text-sm">Tema (etiqueta de la tarjeta)
        <input value={topic} onChange={e => setTopic(e.target.value)} placeholder="p. ej. Tema 3" className="h-12 rounded-md border bg-panel px-3 text-base" />
      </label>
      <label className="grid gap-2 text-sm">Enunciado (una línea por dato)
        <textarea value={statement} onChange={e => setStatement(e.target.value)} rows={6} placeholder={"Polimerasa: Taq\nAmplicón: 700 pb\n25 µL por reacción · 6 muestras"} className="rounded-md border bg-panel p-3 text-base" />
      </label>
    </section>
    <Button className="h-14 w-full bg-run text-lg text-run-foreground" disabled={!valid} onClick={save}><Save /> Guardar ejercicio</Button>
  </div>;
}

/**
 * Enunciado: las líneas consecutivas con « · » forman una tabla
 * (la primera es la cabecera); el resto se muestra como párrafos.
 */
function StatementBody({ lines }: { lines: string[] }) {
  const blocks: ({ kind: "p"; text: string } | { kind: "table"; rows: string[][] })[] = [];
  for (const line of lines) {
    const cells = line.split(" · ");
    const last = blocks[blocks.length - 1];
    if (cells.length > 1) {
      if (last?.kind === "table") last.rows.push(cells);
      else blocks.push({ kind: "table", rows: [cells] });
    } else blocks.push({ kind: "p", text: line });
  }
  return <div className="space-y-3 text-sm">{blocks.map((b, i) => b.kind === "p"
    ? <p key={i}>{b.text}</p>
    : <div key={i} className="overflow-x-auto rounded-md border">
        <table className="w-full border-collapse text-left">
          <thead className="bg-panel"><tr>{b.rows[0]!.map((c, j) => <th key={j} className="border-b px-3 py-2 font-display font-medium text-ice">{c}</th>)}</tr></thead>
          <tbody>{b.rows.slice(1).map((r, k) => <tr key={k} className="border-b last:border-b-0">{r.map((c, j) => <td key={j} className={cn("px-3 py-2", j > 0 && "font-mono")}>{c}</td>)}</tr>)}</tbody>
        </table>
      </div>)}</div>;
}
