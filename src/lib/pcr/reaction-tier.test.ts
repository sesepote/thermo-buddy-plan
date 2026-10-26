import { describe, it, expect } from "vitest";
import { reactionTier } from "@/components/sim/ScientistReaction";

describe("reacción del científico", () => {
  it("100 brilla", () => expect(reactionTier(100)).toBe("perfect"));
  it("80–99 extrañado", () => { expect(reactionTier(99)).toBe("odd"); expect(reactionTier(80)).toBe("odd"); });
  it("50–79 calavera", () => { expect(reactionTier(79)).toBe("toxic"); expect(reactionTier(50)).toBe("toxic"); });
  it("<50 explota", () => expect(reactionTier(49)).toBe("boom"));
});
