# SnapCall Knowledge Base

**Project:** Texas Hold'em Equity Calculator  
**Status:** Core Complete (rs-poker integration), UI Pending  
**Architecture:** Rust Core (rs-poker) + UniFFI + Native UI

---

## OVERVIEW

High-performance cross-platform poker equity calculator. Built on [rs-poker](https://github.com/elliottneilclark/rs-poker) for the heavy lifting, using UniFFI for cross-platform bindings.

**Current State:**
- ✅ Rust core with rs-poker integration (complete)
- ✅ CLI tool working
- ✅ UniFFI FFI layer ready
- ⏳ iOS UI (pending)
- ⏳ Android UI (pending)

---

## PROJECT STRUCTURE

```
snapcall/
├── Cargo.toml          # Workspace configuration
├── core/               # Rust library (rs-poker wrapper + FFI)
│   ├── src/
│   │   ├── lib.rs      # Core API
│   │   └── ffi.rs      # UniFFI bindings
│   └── Cargo.toml
├── cli/                # Command-line tool
│   └── src/main.rs
├── docs/
│   ├── ROADMAP.md      # What's done / what's next
│   └── INITIAL_AGENTS.md # Original spec
└── target/             # Build output
```

---

## TECH STACK

| Layer | Technology | Purpose |
|-------|------------|---------|
| Core Engine | rs-poker 4.1 | Hand evaluation, Monte Carlo simulation |
| Wrapper | Rust | FFI-friendly API layer |
| FFI Bridge | UniFFI | Auto-generate Swift/Kotlin bindings |
| CLI | Rust + clap | Testing & debugging |
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

// Equity calculation (Monte Carlo)
calculate_equity(
    &[vec![card1, card2], vec![card3, card4]],  // Player hands
    &[card5, card6, card7],                      // Board (optional)
    10000                                        // Iterations
) -> Vec<f64>                                   // Equity % per player

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

# Build FFI library (for iOS/Android)
cargo build --features ffi -p snapcall-core
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
