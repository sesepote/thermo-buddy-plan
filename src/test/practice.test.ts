import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { isCase, toPublic, verifyPractice, type PracticeCase } from "@/lib/pcr/practice";

const CASES: PracticeCase[] = readdirSync("ejercicios").filter(n => n.endsWith(".json")).map(n => JSON.parse(readFileSync(`ejercicios/${n}`, "utf8")) as PracticeCase);

describe("ejercicios de termociclador y master mix", () => {
  it("la carpeta contiene casos válidos", () => {
    expect(CASES.length).toBeGreaterThan(0);
    expect(CASES.every(isCase)).toBe(true);
  });
  for (const exercise of CASES) {
    it(`acepta la solución completa de ${exercise.title}`, () => {
      expect(verifyPractice(structuredClone(exercise.program), exercise.mix, exercise).score).toBe(100);
    });
    it(`la versión pública de ${exercise.title} no revela la solución`, () => {
      expect(verifyPractice(toPublic(exercise).skeleton, exercise.mix, exercise).correct).toBe(false);
    });
    it(`detecta errores en la mezcla de ${exercise.title}`, () => {
      const mix = { ...exercise.mix, options: { ...exercise.mix.options, primerFinalUM: 1 } };
      expect(verifyPractice(exercise.program, mix, exercise).checks.find(c => c.label === "Master mix · Cebadores finales")?.correct).toBe(false);
    });
  }
});

describe("modos de ejercicio", () => {
  const base = CASES[0]!;
  it("solo termociclador ignora la mezcla", () => {
    const r = verifyPractice(base.program, null, { ...base, mode: "cycler" });
    expect(r.score).toBe(100);
    expect(r.checks.some(c => c.label.startsWith("Master mix"))).toBe(false);
  });
  it("solo master mix ignora el programa", () => {
    const r = verifyPractice(toPublic(base).skeleton, base.mix, { ...base, mode: "mix" });
    expect(r.score).toBe(100);
    expect(r.checks.every(c => c.label.startsWith("Master mix"))).toBe(true);
  });
});
