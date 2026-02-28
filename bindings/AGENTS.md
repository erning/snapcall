# bindings/

**Overview:** Platform-facing crates. Keep domain logic in `core/`.

## SUBCRATES

- `bindings/wasm/` (`snapcall-wasm`): browser bindings via wasm-bindgen.
- `bindings/uniffi/` (`snapcall-uniffi`): Swift/Kotlin bindings via UniFFI.

## WHERE TO LOOK

- WASM exports: `bindings/wasm/src/lib.rs`
- UniFFI scaffolding: `bindings/uniffi/src/lib.rs`

## COMMANDS

```bash
# WASM crate build (Rust)
rustup target add wasm32-unknown-unknown
cargo build -p snapcall-wasm --target wasm32-unknown-unknown

# WASM package for the web app (writes to apps/web/src/wasm-pkg)
cd apps/web
pnpm run wasm

# UniFFI crate build (does not currently generate Swift/Kotlin files)
cargo build -p snapcall-uniffi
```

## CONVENTIONS

- WASM: convert `SnapError` into `JsError` (see `bindings/wasm/src/lib.rs`).
- UniFFI: keep FFI surface area minimal; prefer strings/primitive-friendly structs across the boundary.

## ANTI-PATTERNS

- Do not `panic!` on paths reachable from FFI; return an error instead (`docs/INITIAL_AGENTS.md`).
