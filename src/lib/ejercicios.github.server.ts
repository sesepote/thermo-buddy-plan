/**
 * Guardado de ejercicios en GitHub (solo servidor). Se usa cuando existen
 * GITHUB_TOKEN y GITHUB_REPO (p. ej. en Cloudflare Pages, sin disco escribible).
 * Cada cambio es un único commit en la carpeta `ejercicios/`.
 */
import { isCase, type PracticeCase } from "./pcr/practice";

export function githubConfig() {
  const token = process.env["GITHUB_TOKEN"];
  const repo = process.env["GITHUB_REPO"];
  if (!token || !repo) return null;
  return { token, repo: repo.trim().replace(/^https?:\/\/github\.com\//, "").replace(/\.git$/, ""), branch: process.env["GITHUB_BRANCH"] || "main" };
}
type Cfg = NonNullable<ReturnType<typeof githubConfig>>;

async function gh<T>(cfg: Cfg, path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`https://api.github.com/repos/${cfg.repo}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${cfg.token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "termociclador-ejercicios",
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    console.error("GitHub", res.status, await res.text());
    throw new Error(`No se pudo acceder a GitHub (error ${res.status}). Revisa GITHUB_TOKEN y GITHUB_REPO.`);
  }
  return res.json() as Promise<T>;
}

const num = (n: string) => Number(/caso-(\d+)\.json$/.exec(n)?.[1] ?? 0);

/** Decodifica base64 a UTF-8 (compatible con Workers). */
function b64(s: string) {
  const bin = atob(s.replace(/\n/g, ""));
  return new TextDecoder().decode(Uint8Array.from(bin, c => c.charCodeAt(0)));
}

export async function readCasesGithub(cfg: Cfg): Promise<PracticeCase[]> {
  const ref = `?ref=${encodeURIComponent(cfg.branch)}`;
  let items: { name: string; path: string }[];
  try { items = await gh(cfg, `/contents/ejercicios${ref}`); } catch { return []; }
  const files = items.filter(i => /^caso-\d+\.json$/.test(i.name)).sort((a, b) => num(a.name) - num(b.name));
  const list = await Promise.all(files.map(async f => {
    const r = await gh<{ content: string }>(cfg, `/contents/${f.path}${ref}`);
    return JSON.parse(b64(r.content)) as unknown;
  }));
  return list.filter(isCase);
}

export async function writeCasesGithub(cfg: Cfg, cases: PracticeCase[], message: string) {
  const ref = await gh<{ object: { sha: string } }>(cfg, `/git/ref/heads/${cfg.branch}`);
  const commit = await gh<{ tree: { sha: string } }>(cfg, `/git/commits/${ref.object.sha}`);
  const tree = await gh<{ tree: { path: string; type: string }[] }>(cfg, `/git/trees/${commit.tree.sha}?recursive=1`);
  const keep = new Set(cases.map((_, i) => `ejercicios/caso-${i + 1}.json`));
  const entries: Record<string, unknown>[] = tree.tree
    .filter(t => t.type === "blob" && /^ejercicios\/caso-\d+\.json$/.test(t.path) && !keep.has(t.path))
    .map(t => ({ path: t.path, mode: "100644", type: "blob", sha: null }));
  cases.forEach((c, i) => entries.push({ path: `ejercicios/caso-${i + 1}.json`, mode: "100644", type: "blob", content: JSON.stringify(c, null, 2) + "\n" }));
  const newTree = await gh<{ sha: string }>(cfg, `/git/trees`, { method: "POST", body: JSON.stringify({ base_tree: commit.tree.sha, tree: entries }) });
  const newCommit = await gh<{ sha: string }>(cfg, `/git/commits`, { method: "POST", body: JSON.stringify({ message, tree: newTree.sha, parents: [ref.object.sha] }) });
  await gh(cfg, `/git/refs/heads/${cfg.branch}`, { method: "PATCH", body: JSON.stringify({ sha: newCommit.sha }) });
}
