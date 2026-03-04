# SnapCall Knowledge Base

**Generated:** 2026-03-04
**Branch:** master
**Commit:** 012ecbf

Texas Hold'em equity calculator: Rust workspace (`core/`, `cli/`, `bindings/`) + Vite/React web app (`apps/web`).

## STRUCTURE

```
snapcall/
├── Cargo.toml
├── core/               # domain logic + equity engine
├── cli/                # `snapcall` binary (local smoke tests)
├── bindings/           # wasm-bindgen + UniFFI crates
├── apps/               # app frontends
│   └── web/            # Vite + React UI, consumes wasm pkg
└── docs/               # design + algorithm docs
```

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Equity entry point | `core/src/estimate.rs` | `estimate_equity()` parses/validates and dispatches exact vs MC |
| Exact enumeration | `core/src/enumeration.rs` | Range cartesian product + k-combination enumeration |
| Monte Carlo | `core/src/monte_carlo.rs` | Range rejection sampling first, then shuffle + deal |
| Input parsing | `core/src/input.rs` | `HoleCardsInput` + `BoardCardsInput` (`Exact/Partial/Unknown/Range`) |
| CLI interface | `cli/src/main.rs` | clap commands: `eval`, `equity`, `pot-odds` |
| WASM exports | `bindings/wasm/src/lib.rs` | wraps core, returns `JsError` on failure |
| Web WASM glue | `apps/web/src/lib/wasm.ts` | Worker-based: sends requests to `equity.worker.ts` with 30s timeout |
| Web Worker | `apps/web/src/lib/equity.worker.ts` | loads WASM and runs `estimate_equity()` off main thread |
| Web hooks | `apps/web/src/hooks/` | `useEquity`, `useTheme`, `useSettings`, `usePersistedReducer` |
| Web pages | `apps/web/src/components/` | `SettingsPage`, `HelpPage`, `HeaderMenu`, `NumberEditor` |
| Algorithm write-up | `docs/equity-algorithm.md` | invariants + why range players are dealt first |

## COMMANDS

```bash
# Rust
cargo build --workspace
cargo test --workspace
cargo build -p snapcall-core -p snapcall-cli

# CLI
cargo run --bin snapcall -- eval "AsKsQsJsTs"
cargo run --bin snapcall -- equity -H "AhAd" -V "KhKd" -i 10000
cargo run --bin snapcall -- equity -H "Ah" -V "" -i 5000
cargo run --bin snapcall -- equity -H "AcKs" -V "KQs" -V "99" -V "22+" -b "5c6c7c8h" -i 100000
cargo run --bin snapcall -- pot-odds --pot-size 150 --call-amount 50

# Web (Vite + WASM)
cd apps/web
pnpm install
pnpm run wasm
pnpm run dev -- --host
pnpm run typecheck
pnpm run build
pnpm run preview
```

## CONVENTIONS

- Inputs: card strings accept whitespace/commas; parsing normalizes (see `core/src/input.rs`).
- Equity `iterations`: treated as an exact-enumeration budget; if estimated combos <= iterations, exact enumeration runs; otherwise Monte Carlo runs.
- Monte Carlo ranges: range players are dealt first via rejection sampling; failed deals are skipped (see `docs/equity-algorithm.md`).
- Repo config: no custom `rustfmt.toml` / `clippy.toml`; web uses pnpm (no eslint/prettier configured).

## ANTI-PATTERNS (THIS PROJECT)

- Do not `panic!` in FFI-exposed code paths; return an error instead (`docs/INITIAL_AGENTS.md`).
- Do not open `apps/web/index.html` directly; use the Vite dev server (`README.md`).
- Avoid adding allocations in the Monte Carlo hot loop; buffers (`used`, `available`, `full_board`, `ranks`) are pre-allocated outside the loop — maintain this pattern.

## NOTES

- No CI workflows in-repo yet (no `.github/workflows/`, `Makefile`, `justfile`).
- `apps/web/src/wasm-pkg/` is generated output from `wasm-pack`.
- CLI `pot-odds` command validates that `pot_size` and `call_amount` are positive values.
