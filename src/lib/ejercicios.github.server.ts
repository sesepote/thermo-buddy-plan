/**
 * Guardado de carpetas JSON en GitHub (solo servidor). Se usa cuando existen
 * GITHUB_TOKEN y GITHUB_REPO (p. ej. en Cloudflare Pages, sin disco escribible).
 * Cada cambio es un único commit en la carpeta indicada (`ejercicios/`, `perfiles/`).
 */

/** Repositorio fijo donde se guardan ejercicios y perfiles. */
const GITHUB_REPO = "sesepote/thermo-buddy-plan";

/** Solo online (build de producción); en local con Vite se escribe en disco. */
export function githubConfig() {
  if (import.meta.env.DEV) return null;
  const token = process.env["GITHUB_TOKEN"]?.trim();
  if (!token) return null;
  return { token, repo: GITHUB_REPO, branch: process.env["GITHUB_BRANCH"]?.trim() || "main" };
}
export type GithubCfg = NonNullable<ReturnType<typeof githubConfig>>;

async function gh<T>(cfg: GithubCfg, path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`https://api.github.com/repos/${cfg.repo}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${cfg.token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "termociclador-sim",
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    console.error("GitHub", res.status, await res.text());
    throw new Error(`No se pudo acceder a GitHub (error ${res.status}). Revisa GITHUB_TOKEN y GITHUB_REPO.`);
  }
  return res.json() as Promise<T>;
}

/**
 * Copia en memoria tras guardar: en producción se lee de aquí o de la copia
 * incluida en la compilación (Cloudflare recompila con cada commit), sin
 * esperar a la API de GitHub al abrir una pantalla.
 */
const memory = new Map<string, unknown[]>();

/* ---- Carpetas con archivos nombrados (p. ej. perfiles/<nombre>.json) ---- */

/** Convierte un nombre en un nombre de archivo seguro: "qPCR SYBR" → "qPCR-SYBR". */
export function fileSlug(name: string) {
  return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "perfil";
}

/** Asigna a cada elemento `nombre.json`, añadiendo -2, -3… si se repite. */
function namedPaths(folder: string, names: string[]) {
  const used = new Set<string>();
  return names.map(n => {
    const base = fileSlug(n);
    let f = base, k = 2;
    while (used.has(f.toLowerCase())) f = `${base}-${k++}`;
    used.add(f.toLowerCase());
    return `${folder}/${f}.json`;
  });
}

const jsonRe = /\.json$/i;

export async function readNamedFolder(folder: string, bundled: Record<string, unknown>): Promise<unknown[]> {
  if (githubConfig()) return memory.get(folder) ?? Object.entries(bundled).sort(([x], [y]) => x.localeCompare(y)).map(([, c]) => c);
  try {
    const fs = await import("node:fs/promises");
    const p = await import("node:path");
    const d = p.join(process.cwd(), folder);
    await fs.mkdir(d, { recursive: true });
    const names = (await fs.readdir(d)).filter(n => jsonRe.test(n)).sort((a, b) => a.localeCompare(b));
    return await Promise.all(names.map(async n => JSON.parse(await fs.readFile(p.join(d, n), "utf8")) as unknown));
  } catch {
    return Object.entries(bundled).sort(([x], [y]) => x.localeCompare(y)).map(([, c]) => c);
  }
}

export async function writeNamedFolder(folder: string, items: { name: string }[], message: string) {
  const paths = namedPaths(folder, items.map(i => i.name));
  const cfg = githubConfig();
  if (cfg) {
    const ref = await gh<{ object: { sha: string } }>(cfg, `/git/ref/heads/${cfg.branch}`);
    const commit = await gh<{ tree: { sha: string } }>(cfg, `/git/commits/${ref.object.sha}`);
    const tree = await gh<{ tree: { path: string; type: string }[] }>(cfg, `/git/trees/${commit.tree.sha}?recursive=1`);
    const keep = new Set(paths);
    const entries: Record<string, unknown>[] = tree.tree
      .filter(t => t.type === "blob" && t.path.startsWith(`${folder}/`) && jsonRe.test(t.path) && !keep.has(t.path))
      .map(t => ({ path: t.path, mode: "100644", type: "blob", sha: null }));
    items.forEach((c, i) => entries.push({ path: paths[i], mode: "100644", type: "blob", content: JSON.stringify(c, null, 2) + "\n" }));
    const newTree = await gh<{ sha: string }>(cfg, `/git/trees`, { method: "POST", body: JSON.stringify({ base_tree: commit.tree.sha, tree: entries }) });
    const newCommit = await gh<{ sha: string }>(cfg, `/git/commits`, { method: "POST", body: JSON.stringify({ message, tree: newTree.sha, parents: [ref.object.sha] }) });
    await gh(cfg, `/git/refs/heads/${cfg.branch}`, { method: "PATCH", body: JSON.stringify({ sha: newCommit.sha }) });
    memory.set(folder, items);
    return;
  }
  const err = "Este servidor no permite guardar archivos y faltan GITHUB_TOKEN / GITHUB_REPO.";
  let fs, p;
  try { fs = await import("node:fs/promises"); p = await import("node:path"); } catch { throw new Error(err); }
  const d = p.join(process.cwd(), folder);
  try { await fs.mkdir(d, { recursive: true }); } catch { throw new Error(err); }
  for (const n of await fs.readdir(d)) if (jsonRe.test(n)) await fs.unlink(p.join(d, n));
  for (const [i, c] of items.entries()) await fs.writeFile(p.join(process.cwd(), paths[i]!), JSON.stringify(c, null, 2) + "\n");
}

/* ---- Archivos independientes: cada cambio toca solo un archivo ---- */

/** Copia en memoria por carpeta (nombre de archivo → contenido) tras guardar en GitHub. */
const fileMemory = new Map<string, Map<string, unknown>>();
const bundledFiles = (bundled: Record<string, unknown>) => new Map(Object.entries(bundled).map(([k, v]) => [k.split("/").pop() ?? k, v]));

/** Lee `folder/*.json` como pares { file, item }. */
export async function readFileEntries(folder: string, bundled: Record<string, unknown>): Promise<{ file: string; item: unknown }[]> {
  const toList = (m: Map<string, unknown>) => [...m].map(([file, item]) => ({ file, item }));
  if (githubConfig()) return toList(fileMemory.get(folder) ?? bundledFiles(bundled));
  try {
    const fs = await import("node:fs/promises");
    const p = await import("node:path");
    const d = p.join(process.cwd(), folder);
    await fs.mkdir(d, { recursive: true });
    const names = (await fs.readdir(d)).filter(n => jsonRe.test(n));
    return await Promise.all(names.map(async file => ({ file, item: JSON.parse(await fs.readFile(p.join(d, file), "utf8")) as unknown })));
  } catch {
    return toList(bundledFiles(bundled));
  }
}

/** Crea, reemplaza (item) o elimina (null) un único archivo `folder/file`, en un commit. */
export async function writeOneFile(folder: string, file: string, item: unknown, message: string, bundled: Record<string, unknown>) {
  if (!/^[A-Za-z0-9._-]+\.json$/.test(file)) throw new Error("Nombre de archivo no válido");
  const path = `${folder}/${file}`;
  const content = item === null ? null : JSON.stringify(item, null, 2) + "\n";
  const cfg = githubConfig();
  if (cfg) {
    const ref = await gh<{ object: { sha: string } }>(cfg, `/git/ref/heads/${cfg.branch}`);
    const commit = await gh<{ tree: { sha: string } }>(cfg, `/git/commits/${ref.object.sha}`);
    const entry = content === null ? { path, mode: "100644", type: "blob", sha: null } : { path, mode: "100644", type: "blob", content };
    const newTree = await gh<{ sha: string }>(cfg, `/git/trees`, { method: "POST", body: JSON.stringify({ base_tree: commit.tree.sha, tree: [entry] }) });
    const newCommit = await gh<{ sha: string }>(cfg, `/git/commits`, { method: "POST", body: JSON.stringify({ message, tree: newTree.sha, parents: [ref.object.sha] }) });
    await gh(cfg, `/git/refs/heads/${cfg.branch}`, { method: "PATCH", body: JSON.stringify({ sha: newCommit.sha }) });
    const mem = fileMemory.get(folder) ?? bundledFiles(bundled);
    if (item === null) mem.delete(file); else mem.set(file, item);
    fileMemory.set(folder, mem);
    return;
  }
  const err = "Este servidor no permite guardar archivos y faltan GITHUB_TOKEN / GITHUB_REPO.";
  let fs, p;
  try { fs = await import("node:fs/promises"); p = await import("node:path"); } catch { throw new Error(err); }
  const d = p.join(process.cwd(), folder);
  try { await fs.mkdir(d, { recursive: true }); } catch { throw new Error(err); }
  if (content === null) await fs.rm(p.join(d, file), { force: true });
  else await fs.writeFile(p.join(d, file), content);
}
