import { describe, expect, it } from "vitest";
import teachers from "../../docentes/docentes.json";

describe("cuenta docente de Mariña", () => {
  it("usa inicialmente la misma contraseña que Mario", () => {
    const mario = teachers.find(t => t.usuario === "mario");
    const marina = teachers.find(t => t.usuario === "marina");
    expect(mario).toBeDefined();
    expect(marina).toBeDefined();
    expect(marina?.nombre).toBe("Mariña");
    expect(marina?.salt).toBe(mario?.salt);
    expect(marina?.iter).toBe(mario?.iter);
    expect(marina?.hash).toBe(mario?.hash);
  });
});