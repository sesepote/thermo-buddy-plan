import { describe, it, expect } from "vitest";
import { shouldAutoLogout, IDLE_LOGOUT_MS } from "@/lib/teacher-session";

const auth = { user: "mario", password: "x" };
describe("cierre automático de la sesión docente", () => {
  it("cierra tras 3 minutos sin toques", () => {
    expect(IDLE_LOGOUT_MS).toBe(180_000);
    expect(shouldAutoLogout({ auth, holds: 0, lastActivity: 0 }, 180_000)).toBe(true);
    expect(shouldAutoLogout({ auth, holds: 0, lastActivity: 0 }, 179_000)).toBe(false);
  });
  it("no cierra mientras el editor de ejercicios está abierto", () => {
    expect(shouldAutoLogout({ auth, holds: 1, lastActivity: 0 }, 10 * 60_000)).toBe(false);
  });
});
