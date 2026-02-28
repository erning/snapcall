# SnapCall Knowledge Base

**Project:** Texas Hold'em Equity Calculator  
**Status:** Core Complete (rs-poker integration), bindings split complete, UI rewrite in progress  
**Architecture:** Rust Core (domain) + Bindings (UniFFI/WASM) + App UIs

---

## OVERVIEW

High-performance cross-platform poker equity calculator. Built on [rs-poker](https://github.com/elliottneilclark/rs-poker) for the heavy lifting, using UniFFI for cross-platform bindings.

**Current State:**
- ✅ Rust core with rs-poker integration (complete)
- ✅ CLI tool working
- ✅ Separate bindings crates (`bindings/uniffi`, `bindings/wasm`)
- 🔄 Web app rewrite started (`apps/web` Hello World + static equity call)
- ⏳ iOS UI (pending)
- ⏳ Android UI (pending)

---

## PROJECT STRUCTURE

```
snapcall/
├── Cargo.toml          # Workspace configuration
├── core/               # Rust library (pure domain logic)
│   ├── src/
│   │   ├── lib.rs      # Core API
│   └── Cargo.toml
├── cli/                # Command-line tool
│   └── src/main.rs
├── bindings/
│   ├── uniffi/         # UniFFI exports for Swift/Kotlin
│   └── wasm/           # wasm-bindgen exports for Web
├── apps/
│   └── web/            # React frontend
├── docs/
│   ├── ROADMAP.md      # What's done / what's next
│   └── INITIAL_AGENTS.md # Original spec
└── target/             # Build output
```

---

## TECH STACK

| Layer | Technology | Purpose |
|-------|------------|---------|
| Core Engine | rs-poker 4.1 | Hand evaluation, exact enumeration + Monte Carlo fallback |
| Wrapper | Rust | FFI-friendly API layer |
| FFI Bridge | UniFFI | Auto-generate Swift/Kotlin bindings |
| CLI | Rust + clap | Testing & debugging |
| Web | Rust WASM + React | Browser UI and interaction validation |
| iOS UI | Swift + SwiftUI | Native iOS interface (planned) |
| Android UI | Kotlin + Compose | Native Android interface (planned) |

---

## CORE API

```rust
// Card parsing
parse_card("Ah") -> Card           // Ace of hearts
parse_cards("As Ks Qs") -> Vec<Card>

// Hand evaluation (5-7 cards)
evaluate_hand(&cards) -> Rank      // Returns hand rank

// Equity calculation (exact enumeration when feasible, Monte Carlo fallback)
calculate_equity(
    &["AhAd".to_string(), "AKs".to_string()],  // Player inputs
    "AsKdQh",                                    // Board string (0/3/4/5 cards)
    10000                                         // Iterations / exact budget
) -> Vec<f64>                                   // Equity % per player

// Player input formats per seat:
// ""      -> two unknown cards (all starting hands)
// "Ah"    -> one known card + one unknown card
// "AhAd"  -> exact two-card hand
// "AKs"   -> range expression (also supports TT+, A5s-A2s, etc.)

// Range parsing (simplified)
parse_range("AKs") -> Vec<(Value, Value, bool)>
```

---

## BUILD & RUN

```bash
# Build everything
cargo build --workspace

# Run tests
cargo test --workspace

# CLI usage
$ cargo run --bin snapcall -- eval "As Ks Qs Js Ts"
Hand: Card(As) Card(Ks) Card(Qs) Card(Js) Card(Ts)
Type: Straight Flush

$ cargo run --bin snapcall -- equity -p "Ah Ad,Kh Kd" -i 10000
Player 1: 81.5%
Player 2: 18.5%

# Build UniFFI bindings crate (for iOS/Android)
cargo build -p snapcall-uniffi

# Build WASM bindings crate
cargo build -p snapcall-wasm --target wasm32-unknown-unknown

# Run new web app
cd apps/web
pnpm install
pnpm run wasm
pnpm run dev -- --host
```

---

## FFI FUNCTIONS

Available for Swift/Kotlin via UniFFI:

```rust
ffi_parse_card(card_str: String) -> Result<FfiCard, String>
ffi_parse_cards(cards_str: String) -> Result<Vec<FfiCard>, String>
ffi_evaluate_hand(cards: Vec<FfiCard>) -> Result<String, String>
ffi_calculate_equity(
    player_hands: Vec<String>,
    board: String,
    iterations: u32
) -> Result<Vec<f64>, String>
ffi_calculate_equity_with_ranges(
    player_hands: Vec<String>,
    board: String,
    iterations: u32
) -> Result<Vec<f64>, String>  // Alias of ffi_calculate_equity
```

---

## DESIGN DECISIONS

### Why rs-poker instead of custom evaluator?

| Approach | Pros | Cons |
|----------|------|------|
| **Custom Lookup Table** | Full control | Complex, ~10MB memory, slow startup |
| **Custom Bitwise** | Educational | Time sink, easy to get wrong |
| **rs-poker** ✅ | Battle-tested, <25ns, 0 setup | External dependency |

Decision: Use rs-poker for reliability and speed to market.

### Card Representation

rs-poker uses:
- `Card { value: Value (0-12), suit: Suit (0-3) }`
- Not the u8 bitwise encoding we originally planned
- Still efficient, just different

---

## UI PATTERNS (Planned)

**Two-Tap Poker Keyboard:**
- Top row: Ranks (A, K, Q, J, T, 9-2)
- Bottom row: Suits (♠️ ♥️ ♣️ ♦️) - 4-color deck
- Ghosting: Disable already-used cards
- Auto-advance: Jump to next slot after selection

**13x13 Range Matrix:**
- Pairs on diagonal
- Suited hands top-right
- Offsuit hands bottom-left
- Drag-to-paint for multi-selection

---

## NEXT STEPS

1. Generate Swift/Kotlin bindings (`uniffi-bindgen`)
2. Create iOS Xcode project with SwiftUI
3. Create Android Studio project with Compose
4. Implement Two-Tap Keyboard UI
5. Implement Range Matrix

See `docs/ROADMAP.md` for full details.

---

## REFERENCE

- `docs/ROADMAP.md` - Current status and todos
- `docs/INITIAL_AGENTS.md` - Original project specification
- [rs-poker docs](https://docs.rs/rs_poker/latest/rs_poker/)
