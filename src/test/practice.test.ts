import { describe, expect, it } from "vitest";
import { PRACTICE_CASES, verifyPractice } from "@/lib/pcr/practice";
import { generateProtocol } from "@/lib/pcr/protocol";

describe("ejercicios de termociclador y master mix", () => {
  for (const exercise of PRACTICE_CASES) {
    it(`acepta la solución completa de ${exercise.title}`, () => {
      const program = generateProtocol(exercise.input, "test").program;
      const result = verifyPractice(program, exercise.mix, exercise);
      expect(result.correct).toBe(true);
      expect(result.score).toBe(100);
    });
    it(`detecta errores en el programa y la mezcla de ${exercise.title}`, () => {
      const program = generateProtocol(exercise.input, "test").program;
      const wrong = { ...program, stages: program.stages.map(s => ({ ...s, steps: s.steps.map(p => ({ ...p, time: 0 })) })) };
      const mix = { ...exercise.mix, options: { ...exercise.mix.options, primerFinalUM: 1 }, input: { ...exercise.mix.input, additives: { ...exercise.mix.input.additives, extraMg: 4 } } };
      const result = verifyPractice(wrong, mix, exercise);
      expect(result.correct).toBe(false);
      expect(result.checks.find(c => c.label === "Master mix · MgCl₂ extra")?.correct).toBe(false);
      expect(result.checks.find(c => c.label === "Master mix · Cebadores finales")?.correct).toBe(false);
      expect(result.checks.some(c => c.label.includes("duración") && !c.correct)).toBe(true);
    });
  }
});