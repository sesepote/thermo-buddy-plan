import { beforeAll, describe, expect, it, vi } from "vitest";
import { webcrypto } from "node:crypto";

const fixture = vi.hoisted(() => ({ hash: "" }));
vi.stubGlobal("crypto", webcrypto);
vi.mock("@/lib/ejercicios.github.server", () => ({
  readFileEntries: async () => [{ file: "docentes.json", item: [
    { usuario: "Mario", nombre: "Mario", salt: "00", iter: 1000, hash: fixture.hash },
    { usuario: "Mariña", nombre: "Mariña", salt: "00", iter: 1000, hash: fixture.hash },
  ] }],
}));
import { authenticate } from "@/lib/docentes.server";

beforeAll(async () => {
  const key = await webcrypto.subtle.importKey("raw", new TextEncoder().encode("test-only-password"), "PBKDF2", false, ["deriveBits"]);
  const bits = await webcrypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: new Uint8Array([0]), iterations: 1000 }, key, 256);
  fixture.hash = Buffer.from(bits).toString("hex");
});

describe("usuarios docentes con mayúscula y ñ", () => {
  it("permite iniciar sesión como Mario", async () => {
    expect((await authenticate({ user: "Mario", password: "test-only-password" }))?.usuario).toBe("Mario");
  });
  it("permite iniciar sesión como Mariña", async () => {
    expect((await authenticate({ user: "Mariña", password: "test-only-password" }))?.usuario).toBe("Mariña");
  });
  it("conserva la comparación sin distinguir mayúsculas", async () => {
    expect((await authenticate({ user: "mario", password: "test-only-password" }))?.usuario).toBe("Mario");
  });
  it("no confunde ñ con n", async () => {
    expect(await authenticate({ user: "Marina", password: "test-only-password" })).toBeNull();
  });
});