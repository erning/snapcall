# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SnapCall is a high-performance Texas Hold'em equity calculator. The Rust core evaluates hands (~25ns) and calculates equity via exact enumeration or Monte Carlo simulation, with bindings for web (WASM), iOS (Swift/UniFFI), and Android (Kotlin/UniFFI).

## Build & Test Commands

```bash
# Build everything (Rust workspace)
cargo build --workspace

# Faster: build only core + CLI (skips bindings)
cargo build -p snapcall-core -p snapcall-cli

# Run all tests
cargo test --workspace

# Run tests for a single crate
cargo test -p snapcall-core

# Run a single test by name
cargo test -p snapcall-core -- test_name

# CLI usage
cargo run --bin snapcall -- eval "AsKsQsJsTs"
cargo run --bin snapcall -- equity -H "AcKs" -V "KQs" -V "99" -b "5c6c7c8h" -i 100000
cargo run --bin snapcall -- pot-odds --pot-size 150 --call-amount 50

# Web app (Vite + WASM)
cd apps/web
pnpm install
pnpm run wasm          # builds WASM bindings into src/wasm-pkg/
pnpm run dev -- --host # start dev server
pnpm run typecheck
pnpm run build         # wasm + typecheck + vite build
```

## Workspace Structure

```
Cargo.toml              # workspace root: core, cli, bindings/uniffi, bindings/wasm
core/                   # domain logic: parsing, equity engine (snapcall-core)
cli/                    # CLI binary (snapcall-cli), uses clap
bindings/wasm/          # wasm-bindgen crate (snapcall-wasm)
bindings/uniffi/        # UniFFI crate for Swift/Kotlin (snapcall-uniffi)
apps/web/               # Vite + React frontend, consumes wasm-pkg
docs/                   # algorithm docs (equity-algorithm.md), roadmap
```

## Core Architecture

The equity engine entry point is `estimate_equity()` in `core/src/estimate.rs`:

```rust
pub fn estimate_equity(board: &str, hero: &str, villains: &[&str], iterations: usize) -> Result<EquityResult, SnapError>
```

- **hero** is always the first player (must be `Exact` or `Partial`, not a range/unknown)
- **villains** can each be exact cards, partial, unknown (`""`), or range syntax (`"AKs"`, `"TT+"`)
- **iterations** serves as the exact-enumeration budget: if estimated combos <= iterations, exact enumeration runs; otherwise Monte Carlo

Key modules in `core/src/`:
| File | Purpose |
|------|---------|
| `input.rs` | Parses player/board strings into `HoleCardsInput` (Exact/Partial/Unknown/Range) and `BoardCardsInput` |
| `estimate.rs` | Validates inputs, checks card uniqueness, selects exact vs Monte Carlo |
| `enumeration.rs` | Exact enumeration: range cartesian product + k-combination iteration |
| `monte_carlo.rs` | Monte Carlo: range players dealt first via rejection sampling, then shuffle remaining |
| `types.rs` | `SnapError`, `EquityResult`, `EquityEstimateMode` |

The core re-exports `rs_poker` types (`Card`, `FlatHand`, `Rank`, etc.) from `lib.rs`.

## CLI Flags

The CLI uses `-H/--hero` and `-V/--villain` (not `-p/--player`):
- `-H "AhAd"` — hero hand (required for equity)
- `-V "KQs"` — villain (repeatable)
- `-n/--villain-count` — total player count; missing villains become unknown
- `-b/--board` — community cards
- `-i/--iterations` — sample budget

## Conventions

- No custom `rustfmt.toml` or `clippy.toml`; use default Rust formatting
- Web app uses pnpm (no eslint/prettier configured)
- `apps/web/src/wasm-pkg/` is generated output from wasm-pack; do not hand-edit
- Board must have 0, 3, 4, or 5 cards (no partial boards like 1-2 cards)
- Known cards must be globally unique across board + all players
- Documentation in `docs/` is written in Chinese

## Anti-Patterns

- Do not `panic!` on paths reachable from bindings (FFI/WASM); return `SnapError` instead
- Do not add allocations in Monte Carlo per-iteration hot loop
- Do not open `apps/web/index.html` directly; use Vite dev server
- No CI workflows exist yet (no `.github/workflows/`)
