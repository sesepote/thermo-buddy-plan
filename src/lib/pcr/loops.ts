import { uid, type Program, type Stage } from "./types";

/** Reagrupa columnas globales sin duplicar pasos ni cambiar los bucles ajenos al rango. */
export function setLoopRange(program: Program, stageId: string, start: number, end: number, repeats: number): Program {
  const steps = program.stages.flatMap(stage => stage.steps);
  const low = Math.max(0, Math.min(steps.length - 1, Math.min(start, end)));
  const high = Math.max(low, Math.min(steps.length - 1, Math.max(start, end)));
  if (!steps.length || !program.stages.some(stage => stage.id === stageId)) return program;
  const stages: Stage[] = [];
  let offset = 0;
  let inserted = false;
  for (const stage of program.stages) {
    const stageEnd = offset + stage.steps.length - 1;
    const addFragment = (from: number, to: number) => {
      if (from > to) return;
      stages.push({ id: uid(), repeats: stage.id === stageId ? 1 : stage.repeats, steps: stage.steps.slice(from - offset, to - offset + 1) });
    };
    if (stageEnd < low || offset > high) {
      stages.push(stage.id === stageId ? { ...stage, id: uid(), repeats: 1 } : stage);
    } else {
      addFragment(offset, low - 1);
      if (!inserted) {
        stages.push({ id: stageId, repeats: Math.max(1, Math.min(99, Math.round(repeats))), steps: steps.slice(low, high + 1) });
        inserted = true;
      }
      addFragment(high + 1, stageEnd);
    }
    offset = stageEnd + 1;
  }
  return { ...program, stages };
}