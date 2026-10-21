import { describe, expect, it } from "vitest";
import { DEFAULT_INPUT, masterMix } from "@/lib/pcr/protocol";

describe("stock del tampón", () => {
  it("un tampón 20× en 50 µL usa 2,5 µL por reacción", () => {
    const mix = masterMix(DEFAULT_INPUT, 50, 1, { bufferX: 20 });
    expect(mix.rows[0]!.per).toBeCloseTo(2.5);
  });
  it("sin indicarlo usa el de la polimerasa (Taq 10× → 5 µL)", () => {
    expect(masterMix(DEFAULT_INPUT, 50, 1).rows[0]!.per).toBeCloseTo(5);
  });
});
