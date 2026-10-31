<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- PCR logic (Tm, protocol generator, simulation, exercise evaluation) lives as pure functions in `src/lib/pcr/`; UI only calls them, so calculator and training share one rule set.
- Exercises are independent JSON files in root `ejercicios/` (list order from an `order` field), accessed only by `src/lib/ejercicios.server.ts` via server functions; each create/edit/delete touches exactly one file so changes never rewrite the folder. In production builds with GITHUB_TOKEN set (repo fixed in code; local Vite dev writes to disk), writes are single-file commits via the GitHub API (`ejercicios.github.server.ts`) because Cloudflare Pages has no writable disk.
- Teacher accounts live in `docentes/docentes.json` with PBKDF2 hashes (Web Crypto, works on Workers) and every protected server function re-checks credentials; the client teacher session is memory-only (`teacher-session.ts`), closes manually or after inactivity, and editor screens hold it open, so kiosk students never see edit/delete controls.
- Saved thermocycler profiles live as `perfiles/<profile name>.json` via `src/lib/perfiles.server.ts` (same GitHub/disk/bundled storage helpers in `ejercicios.github.server.ts`, teacher credentials for writes); the Zustand store only holds the working copy so step edits never trigger commits.
- Apart from exercises, no backend: state is a Zustand store persisted to localStorage with `skipHydration`, rehydrated in `__root.tsx` to avoid SSR mismatches.
- Must work offline on a touch kiosk: fonts via @fontsource, no CDN assets, service worker via vite-plugin-pwa registered only through `src/lib/pwa.ts`.
- Numeric input goes through the on-screen `NumPad` (touch-first, no hover dependence).
- Thermocycler execution is a temporary shared Zustand session clocked from the root layout and displayed by shared status bars on every screen, so live state remains consistent across navigation without persisting an interrupted run.
- The thermocycler profile is a presentation view of the existing Program/Segment model, so all screens use one PCR simulation rather than parallel engines.
- Loop ranges use global column indices and a shared pure regrouping function in src/lib/pcr/ so graphical resizing and the dialog preserve identical step order and stage semantics.
- Master mix controls are shared by the calculator and exercises, reporting settings to pure practice evaluation so both screens use identical chemistry and volume calculations.
- Exercise drafts stay local to their workspace and do not modify the active instrument program, so practice cannot interrupt a thermocycler run.
- Exercise authoring uses the shared ManualMix tube UI and optional teacher-authored rows/totals; legacy calculator-derived solutions are converted only in the editor, so old JSON remains compatible and public exercise data never includes solution volumes.
- Teacher login accepts typed credentials without a public account-list server function, so signed-out visitors cannot enumerate teacher names through the app.
- UI text goes through `useTr()` (`src/lib/i18n/tr.ts`) with Spanish phrases as keys and `{x}` templates in `phrases.ts` ([en, gl]); dynamic strings from `src/lib/pcr/` are translated at render by template matching, so the PCR engine stays language-free. A test fails if a literal `tr("…")` lacks a translation.
