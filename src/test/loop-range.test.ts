import { describe, expect, it } from "vitest";
import { setLoopRange } from "../lib/pcr/loops";
import type { Program } from "../lib/pcr/types";
const program: Program = { id: "p", name: "PCR", lidTemp: 105, rampRate: 3, stages: [
  { id: "initial", repeats: 1, steps: [{ id: "a", label: "A", temp: 95, time: 120 }] },
  { id: "loop", repeats: 30, steps: ["b", "c", "d"].map(id => ({ id, label: id, temp: 60, time: 30 })) },
  { id: "final", repeats: 1, steps: [{ id: "e", label: "E", temp: 72, time: 120 }] },
  { id: "hold", repeats: 1, steps: [{ id: "f", label: "F", temp: 4, time: 0 }] },
] };
describe("Global loop columns", () => {
  it("expands across stages including every column", () => {
    const next = setLoopRange(program, "loop", 0, 5, 35);
    expect(next.stages).toHaveLength(1);
    expect(next.stages[0]?.repeats).toBe(35);
    expect(next.stages[0]?.steps.map(s => s.id)).toEqual(["a", "b", "c", "d", "e", "f"]);
    expect(program.stages).toHaveLength(4);
  });
  it("shrinks the loop and releases excluded steps without duplicating them", () => {
    const next = setLoopRange(program, "loop", 2, 2, 25);
    expect(next.stages.find(s => s.id === "loop")?.steps.map(s => s.id)).toEqual(["c"]);
    expect(next.stages.filter(s => s.repeats > 1)).toHaveLength(1);
    expect(next.stages.flatMap(s => s.steps).map(s => s.id)).toEqual(["a", "b", "c", "d", "e", "f"]);
  });
  it("preserves unrelated loops and supports reversed ranges", () => {
    const input = { ...program, stages: [...program.stages, { id: "other", repeats: 4, steps: [{ id: "g", label: "G", temp: 70, time: 10 }] }] };
    const next = setLoopRange(input, "loop", 4, 0, 12);
    expect(next.stages.find(s => s.id === "other")?.repeats).toBe(4);
    expect(next.stages.find(s => s.id === "loop")?.steps).toHaveLength(5);
  });
});
