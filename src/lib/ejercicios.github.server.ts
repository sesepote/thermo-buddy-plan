/**
 * Guardado de carpetas JSON en GitHub (solo servidor). Se usa cuando existen
 * GITHUB_TOKEN y GITHUB_REPO (p. ej. en Cloudflare Pages, sin disco escribible).
 * Cada cambio es un único commit en la carpeta indicada (`ejercicios/`, `perfiles/`).
 */

export function githubConfig() {
  const token = process.env["GITHUB_TOKEN"];
  const repo = process.env["sesepote/thermo-buddy-plan"];
  if (!token || !repo) return null;
  return { token, repo: repo.trim().replace(/^https?:\/\/github\.com\//, "").replace(/\.git$/, ""), branch: process.env["GITHUB_BRANCH"] || "main" };
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

const fileRe = (prefix: string) => new RegExp(`^${prefix}-(\\d+)\\.json$`);
const num = (prefix: string, n: string) => Number(fileRe(prefix).exec(n)?.[1] ?? 0);

/** Decodifica base64 a UTF-8 (compatible con Workers). */
function b64(s: string) {
  const bin = atob(s.replace(/\n/g, ""));
  return new TextDecoder().decode(Uint8Array.from(bin, c => c.charCodeAt(0)));
}

/** Lee `folder/prefix-N.json` ordenados por N. */
export async function readJsonGithub(cfg: GithubCfg, folder: string, prefix: string): Promise<unknown[]> {
  const ref = `?ref=${encodeURIComponent(cfg.branch)}`;
  let items: { name: string; path: string }[];
  try { items = await gh(cfg, `/contents/${folder}${ref}`); } catch { return []; }
  const files = items.filter(i => fileRe(prefix).test(i.name)).sort((a, b) => num(prefix, a.name) - num(prefix, b.name));
  return Promise.all(files.map(async f => {
    const r = await gh<{ content: string }>(cfg, `/contents/${f.path}${ref}`);
    return JSON.parse(b64(r.content)) as unknown;
  }));
}

/** Reescribe la carpeta como prefix-1.json … prefix-N.json en un solo commit. */
export async function writeJsonGithub(cfg: GithubCfg, folder: string, prefix: string, items: unknown[], message: string) {
  const ref = await gh<{ object: { sha: string } }>(cfg, `/git/ref/heads/${cfg.branch}`);
  const commit = await gh<{ tree: { sha: string } }>(cfg, `/git/commits/${ref.object.sha}`);
  const tree = await gh<{ tree: { path: string; type: string }[] }>(cfg, `/git/trees/${commit.tree.sha}?recursive=1`);
  const path = (i: number) => `${folder}/${prefix}-${i + 1}.json`;
  const keep = new Set(items.map((_, i) => path(i)));
  const inFolder = new RegExp(`^${folder}/${prefix}-\\d+\\.json$`);
  const entries: Record<string, unknown>[] = tree.tree
    .filter(t => t.type === "blob" && inFolder.test(t.path) && !keep.has(t.path))
    .map(t => ({ path: t.path, mode: "100644", type: "blob", sha: null }));
  items.forEach((c, i) => entries.push({ path: path(i), mode: "100644", type: "blob", content: JSON.stringify(c, null, 2) + "\n" }));
  const newTree = await gh<{ sha: string }>(cfg, `/git/trees`, { method: "POST", body: JSON.stringify({ base_tree: commit.tree.sha, tree: entries }) });
  const newCommit = await gh<{ sha: string }>(cfg, `/git/commits`, { method: "POST", body: JSON.stringify({ message, tree: newTree.sha, parents: [ref.object.sha] }) });
  await gh(cfg, `/git/refs/heads/${cfg.branch}`, { method: "PATCH", body: JSON.stringify({ sha: newCommit.sha }) });
}

/**
 * Lectura/escritura de una carpeta JSON: GitHub si está configurado, si no el
 * disco local y, como último recurso, la copia incluida en la compilación.
 */
export async function readJsonFolder(folder: string, prefix: string, bundled: Record<string, unknown>): Promise<unknown[]> {
  const cfg = githubConfig();
  if (cfg) {
    try { return await readJsonGithub(cfg, folder, prefix); } catch { /* usa la copia incluida */ }
  }
  try {
    const fs = await import("node:fs/promises");
    const p = await import("node:path");
    const d = p.join(process.cwd(), folder);
    await fs.mkdir(d, { recursive: true });
    const names = (await fs.readdir(d)).filter(n => fileRe(prefix).test(n)).sort((x, y) => num(prefix, x) - num(prefix, y));
    return await Promise.all(names.map(async n => JSON.parse(await fs.readFile(p.join(d, n), "utf8")) as unknown));
  } catch {
    const base = (k: string) => k.split("/").pop() ?? k;
    return Object.entries(bundled).sort(([x], [y]) => num(prefix, base(x)) - num(prefix, base(y))).map(([, c]) => c);
  }
}

export async function writeJsonFolder(folder: string, prefix: string, items: unknown[], message: string) {
  const cfg = githubConfig();
  if (cfg) return writeJsonGithub(cfg, folder, prefix, items, message);
  let fs, p;
  try { fs = await import("node:fs/promises"); p = await import("node:path"); } catch { throw new Error("Este servidor no permite guardar archivos y faltan GITHUB_TOKEN / GITHUB_REPO."); }
  const d = p.join(process.cwd(), folder);
  try { await fs.mkdir(d, { recursive: true }); } catch { throw new Error("Este servidor no permite guardar archivos y faltan GITHUB_TOKEN / GITHUB_REPO."); }
  for (const n of await fs.readdir(d)) if (fileRe(prefix).test(n)) await fs.unlink(p.join(d, n));
  for (const [i, c] of items.entries()) await fs.writeFile(p.join(d, `${prefix}-${i + 1}.json`), JSON.stringify(c, null, 2) + "\n");
}

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
  const cfg = githubConfig();
  if (cfg) {
    try {
      const ref = `?ref=${encodeURIComponent(cfg.branch)}`;
      const items = await gh<{ name: string; path: string }[]>(cfg, `/contents/${folder}${ref}`);
      const files = items.filter(i => jsonRe.test(i.name)).sort((a, b) => a.name.localeCompare(b.name));
      return await Promise.all(files.map(async f => JSON.parse(b64((await gh<{ content: string }>(cfg, `/contents/${f.path}${ref}`)).content)) as unknown));
    } catch { /* usa la copia incluida */ }
  }
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
