import { describe, expect, it } from "vitest";
import { PRACTICE_CASES, verifyPractice, exportExercises, importExercises } from "@/lib/pcr/practice";

describe("ejercicios de termociclador y master mix", () => {
  for (const exercise of PRACTICE_CASES) {
    it(`acepta la solución completa de ${exercise.title}`, () => {
      const program = structuredClone(exercise.program);
      const result = verifyPractice(program, exercise.mix, exercise);
      expect(result.correct).toBe(true);
      expect(result.score).toBe(100);
    });
    it(`detecta errores en el programa y la mezcla de ${exercise.title}`, () => {
      const program = structuredClone(exercise.program);
      const wrong = { ...program, stages: program.stages.map(s => ({ ...s, steps: s.steps.map(p => ({ ...p, time: 0 })) })) };
      const mix = { ...exercise.mix, options: { ...exercise.mix.options, primerFinalUM: 1 }, input: { ...exercise.mix.input, additives: { ...exercise.mix.input.additives, extraMg: 4 } } };
      const result = verifyPractice(wrong, mix, exercise);
      expect(result.correct).toBe(false);
      expect(result.checks.find(c => c.label === "Master mix · MgCl₂ extra")?.correct).toBe(false);
      expect(result.checks.find(c => c.label === "Master mix · Cebadores finales")?.correct).toBe(false);
      expect(result.checks.some(c => c.label.includes("duración") && !c.correct)).toBe(true);
    });
  }
  it("exporta e importa ejercicios en JSON sin perder la solución", () => {
    const back = importExercises(exportExercises(PRACTICE_CASES), "t");
    expect(back).toHaveLength(PRACTICE_CASES.length);
    expect(verifyPractice(back[0]!.program, back[0]!.mix, back[0]!).score).toBe(100);
    expect(() => importExercises('{"foo":1}', "t")).toThrow();
  });
});
