# apps/web/

**Overview:** Vite + React web app — the main SnapCall UI. Calls into `snapcall-wasm` via a Web Worker with 30s timeout.

## WHERE TO LOOK

- React entry: `apps/web/src/main.tsx`
- Main app: `apps/web/src/App.tsx`
- UI state reducer/types: `apps/web/src/reducer.ts`, `apps/web/src/types.ts`
- Card slot inputs: `apps/web/src/components/BoardSection.tsx`, `apps/web/src/components/HeroSection.tsx`, `apps/web/src/components/VillainRow.tsx`
- Shared mini picker: `apps/web/src/components/MiniCardPicker.tsx`
- Range picker: `apps/web/src/components/RangePicker.tsx`
- Settings page: `apps/web/src/components/SettingsPage.tsx`
- Help page: `apps/web/src/components/HelpPage.tsx`
- Header menu: `apps/web/src/components/HeaderMenu.tsx`
- Number editor: `apps/web/src/components/NumberEditor.tsx`
- Card picker: `apps/web/src/components/CardPicker.tsx`
- Villains section: `apps/web/src/components/VillainsSection.tsx`
- Hooks: `apps/web/src/hooks/useEquity.ts`, `useTheme.ts`, `useSettings.ts`, `usePersistedReducer.ts`
- WASM API wrapper: `apps/web/src/lib/wasm.ts` (sends requests to Worker, 30s timeout)
- WASM Worker: `apps/web/src/lib/equity.worker.ts` (loads WASM + runs `estimate_equity()` off main thread)
- Generated WASM pkg: `apps/web/src/wasm-pkg/` (do not hand-edit)

## COMMANDS

```bash
cd apps/web

pnpm install
pnpm run wasm
pnpm run dev -- --host

pnpm run typecheck
pnpm run build
pnpm run preview
```

## CONVENTIONS

- WASM runs in a Web Worker (`equity.worker.ts`); `wasm.ts` sends requests via `postMessage` with a 30s timeout.
- Treat `src/wasm-pkg/` as generated output from `wasm-pack`.
- Use `(string | null)[]` slot arrays for board/hero/villains state; convert to compact strings only at the `useEquity` boundary.
- Card duplication prevention is global: board, hero, and villains all participate in disabled-card sets.
- Dark mode: implemented via `useTheme` hook + CSS `dark:` variants (Tailwind). Theme preference persisted to localStorage.
- Villain fold state: stored in `VillainData.folded` (optional boolean). Folded villains are excluded from equity calculation.
- State persistence: `usePersistedReducer` hook auto-saves reducer state to localStorage with debouncing.

## ANTI-PATTERNS

- Do not open `apps/web/index.html` directly; use Vite (`README.md`).
- Do not bypass the reducer with ad-hoc local state for core poker inputs.
