# core/

**Overview:** Rust domain engine (parsing + equity estimation) used by CLI and bindings.

## WHERE TO LOOK

| Topic | File | Notes |
|------|------|-------|
| Entry point | `core/src/estimate.rs` | `estimate_equity()` validates inputs + chooses exact vs MC |
| Parsing | `core/src/input.rs` | `HoleCardsInput` and `BoardCardsInput` implement `FromStr` |
| Exact enumeration | `core/src/enumeration.rs` | enumerates range cartesian product; then enumerates remaining k-combinations |
| Monte Carlo | `core/src/monte_carlo.rs` | deals ranges first (rejection sampling), then shuffles/deals the rest |
| Types/errors | `core/src/types.rs` | `SnapError`, `EquityResult`, `EquityEstimateMode` |

## INVARIANTS

- `hero` must be `Exact` or `Partial` (range/unknown is rejected) (`core/src/estimate.rs`).
- Known cards must be globally unique across board + all players.
- Board length must be 0/3/4/5 cards (preflop/flop/turn/river).

## CONVENTIONS

- Range inputs expand via `rs_poker::holdem::RangeParser`; ranges are pre-filtered against fixed known cards.
- Exact vs MC: exact runs only when estimated combo count is non-zero and <= `iterations`.
- Ties: winners are counted equally (each tied best hand increments), so equity splits naturally.

## ANTI-PATTERNS

- Avoid adding allocations in Monte Carlo per-iteration paths (hot loop guideline from `docs/INITIAL_AGENTS.md`).
- Do not introduce `panic!` on paths reachable from bindings (keep errors as `SnapError`).
