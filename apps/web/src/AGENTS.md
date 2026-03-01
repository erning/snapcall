# apps/web/src/

**Overview:** React UI source for card-slot input, equity polling, and pot-odds display.

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| App layout + section composition | `apps/web/src/App.tsx` | Fixed top + scrollable bottom composition |
| Global state transitions | `apps/web/src/reducer.ts` | `SET_*` actions for board/hero/villains/pot odds |
| State shape | `apps/web/src/types.ts` | Slot-based arrays for poker inputs |
| Equity fetch lifecycle | `apps/web/src/hooks/useEquity.ts` | 300ms debounce + stale result guard via sequence id |
| WASM bridge | `apps/web/src/lib/wasm.ts` | `ensureInit()` init cache + `estimate_equity` call |
| Card utilities | `apps/web/src/lib/poker.ts` | rank/suit constants, card parsing, range helpers |
| Board and hero slot pickers | `apps/web/src/components/BoardSection.tsx`, `apps/web/src/components/HeroSection.tsx` | Shared slot interaction pattern |
| Villain slot picker | `apps/web/src/components/VillainRow.tsx` | Per-row disabled-card merge + popover picker |

## CONVENTIONS

- Keep poker input state as slots (`(string | null)[]`); serialize to strings only where core API requires it.
- Keep disabled-card logic symmetric across board, hero, and villains to prevent duplicate cards.
- Keep `useEquity` async-safe: newer requests must ignore older results.
- Treat `apps/web/src/wasm-pkg/` as generated output only.

## ANTI-PATTERNS

- Do not reintroduce direct text input flows for board/hero/villain without matching slot-state updates.
- Do not call WASM exports before `ensureInit()` resolves.
- Do not hand-edit files under `apps/web/src/wasm-pkg/`.
