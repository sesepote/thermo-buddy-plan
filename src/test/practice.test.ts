import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { expectedRows, isCase, mixVolume, toPublic, verifyPractice, type ManualAnswer, type PracticeCase } from "@/lib/pcr/practice";

const CASES: PracticeCase[] = readdirSync("ejercicios").filter(n => n.endsWith(".json")).map(n => JSON.parse(readFileSync(`ejercicios/${n}`, "utf8")) as PracticeCase);

/** Respuesta perfecta escrita a mano para un caso. */
const solve = (c: PracticeCase): ManualAnswer => {
  const rows = expectedRows(c.mix);
  return { single: Object.fromEntries(rows.map(r => [r.key, r.per])), tubes: c.mix.samples, mix: Object.fromEntries(rows.map(r => [r.key, mixVolume(r, c.mix.samples)])) };
};

describe("ejercicios de termociclador y master mix", () => {
  it("la carpeta contiene casos válidos", () => {
    expect(CASES.length).toBeGreaterThan(0);
    expect(CASES.every(isCase)).toBe(true);
  });
  for (const exercise of CASES) {
    it(`acepta la solución completa de ${exercise.title}`, () => {
      expect(verifyPractice(structuredClone(exercise.program), solve(exercise), exercise).score).toBe(100);
    });
    it.skipIf(exercise.mode === "mix")(`la versión pública de ${exercise.title} no revela la solución`, () => {
      expect(verifyPractice(toPublic(exercise).skeleton, solve(exercise), exercise).correct).toBe(false);
    });
    it(`detecta errores en la mezcla de ${exercise.title}`, () => {
      const wrong = solve(exercise);
      wrong.tubes = exercise.mix.samples - 3; // olvida controles y pipeteo
      wrong.single.water = (wrong.single.water ?? 0) + 1;
      const r = verifyPractice(exercise.program, wrong, exercise);
      expect(r.checks.find(c => c.label === "Master mix · nº de reacciones")?.correct).toBe(false);
      expect(r.checks.find(c => c.label === "1 reacción · Agua libre de nucleasas")?.correct).toBe(false);
    });
  }
});

describe("modos de ejercicio", () => {
  it("acepta ADN sin introducir o en 0 en Master Mix y detecta ADN añadido", () => {
    const c = CASES.find(x => x.title === "Ejercicio 1");
    if (!c) throw new Error("Falta Ejercicio 1");
    const answer = solve(c);
    const dnaCheck = () => verifyPractice(c.program, answer, c).checks.find(check => check.label === "Master mix · ADN molde");
    answer.mix.template = 0;
    expect(dnaCheck()?.correct).toBe(true);
    delete answer.mix.template;
    expect(dnaCheck()?.correct).toBe(true);
    answer.mix.template = 1;
    expect(dnaCheck()?.correct).toBe(false);
  });
  const base = CASES[0]!;
  it("solo termociclador ignora la mezcla", () => {
    const r = verifyPractice(base.program, null, { ...base, mode: "cycler" });
    expect(r.score).toBe(100);
    expect(r.checks.some(c => c.label.startsWith("Master mix"))).toBe(false);
  });
  it("solo master mix ignora el programa", () => {
    const r = verifyPractice(toPublic(base).skeleton, solve(base), { ...base, mode: "mix" });
    expect(r.score).toBe(100);
    expect(r.checks.every(c => c.label.startsWith("Master mix") || c.label.startsWith("1 reacción"))).toBe(true);
  });
  it("Ejercicio 1: 1 reacción de 25 µL lleva 16.8 µL de agua y la mezcla 15 tubos sin molde", () => {
    const c = CASES.find(x => x.title === "Ejercicio 1")!;
    const rows = expectedRows(c.mix);
    const water = rows.find(r => r.key === "water")!;
    expect(water.per).toBe(16.8);
    expect(mixVolume(water, 15)).toBe(252);
    expect(mixVolume(rows.find(r => r.key === "template")!, 15)).toBe(0);
  });
});

import { verifyPractice as vp11 } from "@/lib/pcr/practice";
import caso11 from "../../ejercicios/caso-11.json";
describe("Ejercicio 11 (solo tubo)", () => {
  it("puntúa 100 con 1 µL en cada reactivo de 1 reacción, sin Master Mix", () => {
    const c = caso11 as never as Parameters<typeof vp11>[2];
    const single = Object.fromEntries(["buffer","mg","dntp","fwd","rev","enzyme","template","water"].map(k => [k, 1]));
    expect(vp11(c.program, { single, mix: {} }, c).score).toBe(100);
  });
});
