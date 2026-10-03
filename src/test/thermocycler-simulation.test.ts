import { describe, expect, it } from "vitest";
import { buildSegments, stateAt, totalDuration } from "@/lib/pcr/simulation";
import type { Program } from "@/lib/pcr/types";

const program: Program = {
  id: "test", name: "PCR", lidTemp: 105, rampRate: 2,
  stages: [{ id: "cycles", repeats: 3, steps: [
    { id: "anneal", label: "Anillamiento", temp: 60, time: 30, deltaPerCycle: -1, timeIncrement: 5, rampRate: 5 },
  ] }],
};

describe("motor térmico compartido", () => {
  it("aplica rampa, temperatura y tiempo por ciclo sin duplicar motores", () => {
    const segments = buildSegments(program);
    const holds = segments.filter(s => s.kind === "hold");
    expect(holds.map(s => s.duration)).toEqual([30, 35, 40]);
    expect(holds.map(s => s.toTemp)).toEqual([60, 59, 58]);
    expect(segments[0]?.duration).toBe(7);
    expect(stateAt(segments, totalDuration(segments)).finished).toBe(true);
  });

  it("concluye al entrar en la conservación infinita", () => {
    const withHold: Program = { ...program, stages: [...program.stages, { id: "end", repeats: 1, steps: [{ id: "hold", label: "Conservación", temp: 4, time: 0 }] }] };
    const segments = buildSegments(withHold);
    expect(stateAt(segments, totalDuration(segments) - 1).finished).toBe(false);
    expect(stateAt(segments, totalDuration(segments)).finished).toBe(true);
  });
});