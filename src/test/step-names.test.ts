/** La sugerencia de nombre depende del paso anterior y de la temperatura. */
import { describe, expect, it } from "vitest";
import { STEP_NAMES, globalStepIndex, suggestStepLabel, suggestionFor } from "@/lib/pcr/step-names";
import type { Program, Step } from "@/lib/pcr/types";

const step = (label: string, temp: number): Step => ({ id: label, label, temp, time: 30 });

describe("suggestStepLabel", () => {
  it("abre el programa con la primera desnaturalización", () => {
    expect(suggestStepLabel(undefined, 95)).toBe("Desnaturalización inicial");
    expect(suggestStepLabel(step("Desnaturalización inicial", 95), 95)).toBe("Desnaturalización");
    expect(suggestStepLabel(step("Lisis bacteriana", 98), 95)).toBe("Desnaturalización");
  });

  it("sigue la secuencia estándar según la temperatura", () => {
    expect(suggestStepLabel(step("Desnaturalización", 95), 58)).toBe("Anillamiento");
    expect(suggestStepLabel(step("Anillamiento", 58), 72)).toBe("Extensión");
    expect(suggestStepLabel(step("Extensión", 72), 72)).toBe("Extensión final");
    expect(suggestStepLabel(step("Extensión final", 72), 4)).toBe("Conservación");
    expect(suggestStepLabel(step("Desnaturalización", 95), 60)).toBe("Anillamiento");
    expect(suggestStepLabel(step("Curva de fusión", 95), 72)).toBe("Extensión");
    expect(suggestStepLabel(step("Conservación", 4), 95)).toBe("Desnaturalización");
  });
});

describe("suggestionFor", () => {
  const program: Program = {
    id: "p", name: "p", lidTemp: 105, rampRate: 3,
    stages: [
      { id: "a", repeats: 1, steps: [step("Desnaturalización inicial", 95)] },
      { id: "b", repeats: 30, steps: [step("Desnaturalización", 95), step("Anillamiento", 58), step("Extensión", 72)] },
    ],
  };

  it("usa el paso anterior aunque pertenezca a otra etapa", () => {
    expect(globalStepIndex(program, 1, 0)).toBe(1);
    expect(suggestionFor(program, 1, 0)).toBe("Desnaturalización");
    expect(suggestionFor(program, 1, 2)).toBe("Extensión");
  });

  it("los nombres sugeridos están entre los disponibles", () => {
    for (const [si, pi] of [[0, 0], [1, 0], [1, 1], [1, 2]] as const) {
      expect(STEP_NAMES).toContain(suggestionFor(program, si, pi));
    }
  });
});
