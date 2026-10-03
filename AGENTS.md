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
- No backend: state is a Zustand store persisted to localStorage with `skipHydration`, rehydrated in `__root.tsx` to avoid SSR mismatches.
- Must work offline on a touch kiosk: fonts via @fontsource, no CDN assets, service worker via vite-plugin-pwa registered only through `src/lib/pwa.ts`.
- Numeric input goes through the on-screen `NumPad` (touch-first, no hover dependence).
