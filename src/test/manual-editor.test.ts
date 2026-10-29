import { describe, expect, it } from "vitest";
import case1 from "../../ejercicios/caso-1.json";
import { applyTeacherAnswer, editableMix, teacherAnswer } from "@/lib/pcr/manual-editor";
import { expectedRows, isCase, isManualSolution, toPublic, verifyPractice, type PracticeCase } from "@/lib/pcr/practice";

const legacy = case1 as PracticeCase;
describe("creador y editor con respuestas de tubos", () => {
  it("conserva los volúmenes anteriores al abrir el editor", () => {
    const mix = editableMix(legacy.mix);
    expect(expectedRows(mix)).toEqual(expectedRows(legacy.mix));
    expect(teacherAnswer(mix).single.water).toBe(16.8);
    expect(teacherAnswer(mix).mix.water).toBe(252);
    expect(teacherAnswer(mix).tubes).toBe(15);
  });
  it("guarda y corrige el volumen manual de un tubo sin recalcularlo", () => {
    const mix = editableMix(legacy.mix);
    const a = teacherAnswer(mix);
    a.single.water = 1;
    const edited = { ...legacy, mode: "mix" as const, mix: applyTeacherAnswer(mix, a) };
    expect(expectedRows(edited.mix).find(r => r.key === "water")?.per).toBe(1);
    expect(verifyPractice(edited.program, { single: a.single, mix: {} }, edited).score).toBe(100);
    expect(verifyPractice(edited.program, { single: teacherAnswer(mix).single, mix: {} }, edited).score).toBeLessThan(100);
  });
  it("guarda y corrige las respuestas independientes de Master mix", () => {
    const mix = editableMix(legacy.mix);
    const a = teacherAnswer(mix);
    a.tubes = 12;
    a.mix.water = 1;
    const edited = { ...legacy, mode: "mix" as const, mix: applyTeacherAnswer(mix, a) };
    expect(edited.mix.samples).toBe(12);
    expect(verifyPractice(edited.program, { single: {}, mix: a.mix, tubes: 12 }, edited).score).toBe(100);
    expect(verifyPractice(edited.program, { single: {}, mix: { ...a.mix, water: 252 }, tubes: 12 }, edited).score).toBeLessThan(100);
  });
  it("no publica volúmenes de solución ni totales docentes", () => {
    const edited = { ...legacy, mix: editableMix(legacy.mix) };
    expect(toPublic(edited).reagents.every(r => Object.keys(r).sort().join(",") === "key,label")).toBe(true);
    expect(toPublic(edited)).not.toHaveProperty("mix");
  });
  it("rechaza respuestas corruptas y ADN dentro del Master mix", () => {
    const mix = editableMix(legacy.mix);
    expect(isCase({ ...legacy, mix })).toBe(true);
    expect(isManualSolution({ rows: [{ key: "water", label: "Agua", per: -1 }] })).toBe(false);
    expect(isManualSolution({ rows: [{ key: "unknown", label: "Agua", per: 1 }] })).toBe(false);
    expect(isManualSolution({ rows: [{ key: "water", label: "Agua", per: NaN }] })).toBe(false);
    expect(isManualSolution({ rows: [{ key: "template", label: "ADN", per: 1 }], totals: { template: 1 } })).toBe(false);
  });
});