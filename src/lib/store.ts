/**
 * Estado global de la app con Zustand, persistido en localStorage del equipo
 * (sin servidor: funciona sin internet).
 *
 * `skipHydration` evita diferencias entre el HTML del servidor y el cliente:
 * los datos guardados se cargan en __root.tsx tras montar la app.
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Program } from "./pcr/types";
import { DEFAULT_INPUT, generateProtocol } from "./pcr/protocol";

/** Programas de ejemplo con ids fijos (nada aleatorio a nivel de módulo). */
function defaultPrograms(): Program[] {
  const a = generateProtocol(DEFAULT_INPUT, "demo-taq").program;
  a.name = "PCR estándar Taq 1 kb";
  const b = generateProtocol({ ...DEFAULT_INPUT, reaction: "qpcr-sybr", polymeraseId: "hs-taq", ampliconBp: 150, template: "cdna" }, "demo-qpcr").program;
  b.name = "qPCR SYBR";
  const c = generateProtocol({ ...DEFAULT_INPUT, reaction: "touchdown", ampliconBp: 800, template: "genomic" }, "demo-td").program;
  c.name = "Touchdown genómico";
  return [a, b, c];
}

export interface Attempt { exerciseId: string; score: number; date: number; hintsUsed: number }

interface AppState {
  programs: Program[];
  activeId: string;
  attempts: Attempt[];
  setActive: (id: string) => void;
  saveProgram: (p: Program) => void;
  deleteProgram: (id: string) => void;
  addAttempt: (a: Attempt) => void;
  resetProgress: () => void;
}

export const useApp = create<AppState>()(
  persist(
    (set) => ({
      programs: defaultPrograms(),
      activeId: "demo-taq",
      attempts: [],
      setActive: (id) => set({ activeId: id }),
      // Inserta o reemplaza por id.
      saveProgram: (p) =>
        set((s) => ({
          programs: s.programs.some((x) => x.id === p.id)
            ? s.programs.map((x) => (x.id === p.id ? p : x))
            : [...s.programs, p],
        })),
      deleteProgram: (id) =>
        set((s) => {
          const programs = s.programs.filter((x) => x.id !== id);
          return { programs, activeId: s.activeId === id ? (programs[0]?.id ?? "") : s.activeId };
        }),
      addAttempt: (a) => set((s) => ({ attempts: [...s.attempts, a] })),
      resetProgress: () => set({ attempts: [] }),
    }),
    {
      name: "termociclador-sim",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
    },
  ),
);
