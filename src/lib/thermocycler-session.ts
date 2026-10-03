/** Sesión de simulación compartida entre el instrumento y el menú.
 * Es temporal: los programas se guardan, pero una ejecución no se reanuda al reiniciar el kiosco.
 */
import { create } from "zustand";
import { useApp } from "./store";
import { AMBIENT, buildSegments, stateAt } from "./pcr/simulation";

type Status = "idle" | "running" | "paused" | "done";

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
}

export const useThermocyclerSession = create<Session>((set) => ({
  status: "idle",
  simTime: 0,
  speed: 10,
  lid: AMBIENT,
  run: () => set((s) => ({ status: "running", simTime: s.status === "done" ? 0 : s.simTime, lid: s.status === "done" ? AMBIENT : s.lid })),
  pause: () => set((s) => s.status === "running" ? { status: "paused" } : s),
  stop: () => set({ status: "idle", simTime: 0, lid: AMBIENT }),
  setSpeed: (speed) => set({ speed }),
  tick: (seconds) => set((s) => {
    if (s.status !== "running") return s;
    const app = useApp.getState();
    const program = app.programs.find((p) => p.id === app.activeId) ?? app.programs[0];
    if (!program) return { status: "idle", simTime: 0, lid: AMBIENT };
    const simTime = s.simTime + seconds * s.speed;
    const finished = stateAt(buildSegments(program), simTime).finished;
    return {
      simTime,
      lid: Math.min(program.lidTemp, s.lid + seconds * s.speed),
      status: finished ? "done" : "running",
    };
  }),
}));