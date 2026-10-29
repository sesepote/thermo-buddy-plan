import { describe, expect, it, vi } from "vitest";
import { webcrypto } from "node:crypto";

vi.stubGlobal("crypto", webcrypto);
vi.mock("@/lib/ejercicios.github.server", () => ({ readFileEntries: async () => [{ file: "docentes.json", item: [] }] }));
import { authenticate } from "@/lib/docentes.server";
import * as functions from "@/lib/docentes.functions";

describe("acceso docente sin enumeración pública", () => {
  it("no ofrece una función pública para listar docentes", () => {
    expect(functions).not.toHaveProperty("listTeachers");
  });
  it("no distingue usuarios desconocidos mediante resultados de autenticación", async () => {
    expect(await authenticate({ user: "desconocido", password: "incorrecta" })).toBeNull();
    expect(await authenticate({ user: "otro", password: "incorrecta" })).toBeNull();
  });
});