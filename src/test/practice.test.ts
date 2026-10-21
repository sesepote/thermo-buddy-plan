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

describe("volúmenes escritos por el alumno", () => {
  it("acepta los volúmenes correctos y rechaza uno erróneo", async () => {
    const { masterMix } = await import("@/lib/pcr/protocol");
    const base = CASES[0]!;
    const rows = masterMix(base.mix.input, base.mix.volume, base.mix.samples, base.mix.options).rows;
    const answers = Object.fromEntries(rows.map(r => [r.key, { per: Math.round(r.per * 100) / 100, total: Math.round(r.total * 100) / 100 }]));
    expect(verifyPractice(base.program, { ...base.mix, answers }, base).score).toBe(100);
    const wrong = { ...answers, buffer: { per: 9, total: 9 } };
    expect(verifyPractice(base.program, { ...base.mix, answers: wrong }, base).correct).toBe(false);
  });
});
