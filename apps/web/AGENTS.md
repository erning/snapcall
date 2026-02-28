# apps/web/

**Overview:** Vite + React app that calls into `snapcall-wasm` output under `src/wasm-pkg/`.

## WHERE TO LOOK

- React entry: `apps/web/src/main.tsx`
- Demo UI: `apps/web/src/App.tsx`
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

## ANTI-PATTERNS

- Do not open `apps/web/index.html` directly; use Vite (`README.md`).
