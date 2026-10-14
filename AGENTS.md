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
- Exercises live as individual JSON files in root `ejercicios/`, read/written only by `src/lib/ejercicios.server.ts` via server functions (solutions verified server-side, teacher password kept in that server-only file), so solutions never reach the browser.
- Apart from exercises, no backend: state is a Zustand store persisted to localStorage with `skipHydration`, rehydrated in `__root.tsx` to avoid SSR mismatches.
- Must work offline on a touch kiosk: fonts via @fontsource, no CDN assets, service worker via vite-plugin-pwa registered only through `src/lib/pwa.ts`.
- Numeric input goes through the on-screen `NumPad` (touch-first, no hover dependence).
- Thermocycler execution is a temporary shared Zustand session clocked from the root layout and displayed by shared status bars on every screen, so live state remains consistent across navigation without persisting an interrupted run.
- The thermocycler profile is a presentation view of the existing Program/Segment model, so all screens use one PCR simulation rather than parallel engines.
- Loop ranges use global column indices and a shared pure regrouping function in src/lib/pcr/ so graphical resizing and the dialog preserve identical step order and stage semantics.
- Master mix controls are shared by the calculator and exercises, reporting settings to pure practice evaluation so both screens use identical chemistry and volume calculations.
- Exercise drafts stay local to their workspace and do not modify the active instrument program, so practice cannot interrupt a thermocycler run.
