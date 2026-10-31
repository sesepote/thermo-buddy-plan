import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { PHRASES } from "@/lib/i18n/phrases";
import { translate } from "@/lib/i18n/tr";

const files = (dir: string): string[] => readdirSync(dir).flatMap(f => { const p = join(dir, f); return statSync(p).isDirectory() ? files(p) : /\.tsx?$/.test(p) ? [p] : []; });

describe("traducciones", () => {
  it("toda frase literal pasada a tr() tiene inglés y gallego", () => {
    const missing = new Set<string>();
    for (const f of files("src")) for (const m of readFileSync(f, "utf8").matchAll(/\btr\("((?:[^"\\]|\\.)*)"/g)) if (!PHRASES[m[1]!]) missing.add(m[1]!);
    expect([...missing]).toEqual([]);
  });
  it("traduce frases exactas y plantillas del motor PCR", () => {
    expect(translate("en", "Cerrar")).toBe("Close");
    expect(translate("gl", "Cerrar")).toBe("Pechar");
    expect(translate("en", "1 reacción · Agua libre de nucleasas")).toBe("1 reaction · Nuclease-free water");
    expect(translate("gl", "Caso {n}", { n: 3 })).toBe("Caso 3");
    expect(translate("es", "Cerrar")).toBe("Cerrar");
    expect(translate("en", "Frase sin traducir")).toBe("Frase sin traducir");
  });
});
