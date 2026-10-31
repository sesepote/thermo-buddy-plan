/** Sesión de simulación compartida entre el instrumento y el menú.
 * Es temporal: los programas se guardan, pero una ejecución no se reanuda al reiniciar el kiosco.
 */
import { create } from "zustand";
import { useApp } from "./store";
import { AMBIENT, buildSegments, stateAt } from "./pcr/simulation";

type Status = "idle" | "preheating" | "running" | "paused" | "done";

/** Segmentos memorizados por programa: el store es inmutable, así que la referencia cambia solo al editar. */
const segmentCache = new WeakMap<object, ReturnType<typeof buildSegments>>();
export function segmentsFor(program: Parameters<typeof buildSegments>[0]) {
  let segments = segmentCache.get(program);
  if (!segments) {
    segments = buildSegments(program);
    segmentCache.set(program, segments);
  }
  return segments;
}

interface Session {
  status: Status;
  simTime: number;
  speed: number;
  lid: number;
  run: () => void;
  pause: () => void;
  stop: () => void;
  setSpeed: (speed: number) => void;
  tick: (seconds: number) => void;
  skipPreheat: () => void;
  advance: () => void;
}

export const useThermocyclerSession = create<Session>((set) => ({
  status: "idle",
  simTime: 0,
  speed: 5,
  lid: AMBIENT,
  run: () => set((s) => {
    const program = useApp.getState().programs.find(p => p.id === useApp.getState().activeId);
    if (s.status === "paused") return { status: program?.lidHeatingEnabled !== false && s.lid < (program?.lidTemp ?? 105) - 0.5 ? "preheating" : "running" };
    return { status: program?.lidHeatingEnabled === false ? "running" : "preheating", simTime: 0, lid: AMBIENT };
  }),
  pause: () => set((s) => s.status === "running" || s.status === "preheating" ? { status: "paused" } : s),
  stop: () => set({ status: "idle", simTime: 0, lid: AMBIENT }),
  setSpeed: (speed) => set({ speed }),
  skipPreheat: () => set((s) => {
    const program = useApp.getState().programs.find(p => p.id === useApp.getState().activeId);
    return s.status === "preheating" ? { status: "running", lid: program?.lidTemp ?? AMBIENT } : s;
  }),
  advance: () => set((s) => {
    const app = useApp.getState();
    const program = app.programs.find(p => p.id === app.activeId);
    if (!program || s.status !== "running") return s;
    const segments = segmentsFor(program);
    const current = stateAt(segments, s.simTime).segment;
    const next = segments.find(seg => seg.start > s.simTime + 0.001 && (seg.stageIndex !== current?.stageIndex || seg.stepIndex !== current?.stepIndex || seg.cycle !== current?.cycle));
    const last = segments.at(-1);
    return next ? { simTime: next.start } : { status: "done", simTime: Math.max(s.simTime, last ? last.start + (Number.isFinite(last.duration) ? last.duration : 0) : s.simTime) };
  }),
  tick: (seconds) => set((s) => {
    if (s.status !== "running" && s.status !== "preheating") return s;
    const app = useApp.getState();
    const program = app.programs.find((p) => p.id === app.activeId) ?? app.programs[0];
    if (!program) return { status: "idle", simTime: 0, lid: AMBIENT };
    if (s.status === "preheating") {
      const lid = Math.min(program.lidTemp, s.lid + seconds * s.speed * 2.5);
      return { lid, status: lid >= program.lidTemp - 0.5 ? "running" : "preheating" };
    }
    const simTime = s.simTime + seconds * s.speed;
    const finished = stateAt(segmentsFor(program), simTime).finished;
    return {
      simTime,
      lid: program.lidHeatingEnabled === false ? AMBIENT : program.lidTemp,
      status: finished ? "done" : "running",
    };
  }),
}));