# apps/web/

**Overview:** Vite + React app that calls into `snapcall-wasm` output under `src/wasm-pkg/`.

## WHERE TO LOOK

- React entry: `apps/web/src/main.tsx`
- Demo UI: `apps/web/src/App.tsx`
- UI state reducer/types: `apps/web/src/reducer.ts`, `apps/web/src/types.ts`
- Card slot inputs: `apps/web/src/components/BoardSection.tsx`, `apps/web/src/components/HeroSection.tsx`, `apps/web/src/components/VillainRow.tsx`
- Shared mini picker: `apps/web/src/components/MiniCardPicker.tsx`
- WASM loader + API wrapper: `apps/web/src/lib/wasm.ts`
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

- Always call `ensureInit()` before invoking wasm exports (`apps/web/src/lib/wasm.ts`).
- Treat `src/wasm-pkg/` as generated output from `wasm-pack`.
- Use `(string | null)[]` slot arrays for board/hero/villains state; convert to compact strings only at the `useEquity` boundary.
- Card duplication prevention is global: board, hero, and villains all participate in disabled-card sets.

## ANTI-PATTERNS

- Do not open `apps/web/index.html` directly; use Vite (`README.md`).
- Do not bypass the reducer with ad-hoc local state for core poker inputs.
