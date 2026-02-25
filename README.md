# SnapCall 🃏

A high-performance Texas Hold'em equity calculator for mobile.

[![Rust](https://img.shields.io/badge/Rust-1.75%2B-orange.svg)](https://www.rust-lang.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## What is SnapCall?

SnapCall calculates the probability of winning (equity) in Texas Hold'em poker. Whether you're analyzing a hand you just played or studying game theory optimal (GTO) ranges, SnapCall gives you fast, accurate results.

**Key Features:**
- ⚡ **Fast**: ~25 nanoseconds per hand evaluation (50M+ hands/sec)
- 🎲 **Monte Carlo**: Simulate thousands of runouts in milliseconds
- 📱 **Cross-platform**: iOS and Android (coming soon)
- 🎹 **Two-tap input**: Poker-optimized keyboard for quick entry
- 📊 **Range support**: Enter entire hand ranges, not just specific hands

## Quick Start

```bash
# Clone the repo
git clone https://github.com/yourusername/snapcall
cd snapcall

# Build
cargo build --workspace

# Evaluate a hand (5-7 cards)
cargo run --bin snapcall -- eval "AsKsQsJsTs"
# → Hand: A♠ K♠ Q♠ J♠ T♠
# → Type: Straight Flush

# Calculate equity (AA vs KK)
cargo run --bin snapcall -- equity -p "AhAd" -p "KhKd" -i 10000
# → Player 1: 81.83%
# → Player 2: 18.17%

# With community cards (flop)
cargo run --bin snapcall -- equity -p "AhAd" -p "KhKd" -b "AsKdQh" -i 10000
# → Parsed Cards:
# →   Player 1: A♥ A♦
# →   Player 2: K♥ K♦
# →   Board: A♠ K♦ Q♥
# → Equity Results (10000 iterations):
# →   Player 1: 95.12%
# →   Player 2: 4.88%

# Range vs Range (AKs vs pocket pairs TT+)
cargo run --bin snapcall -- equity -p "AKs" -p "TT+" -i 10000
# → Player Ranges:
# →   Player 1: 4 combos (AKs range)
# →   Player 2: 30 combos (TT+ range)
# → Equity Results (10000 iterations):
# →   Player 1: 40.5%
# →   Player 2: 59.5%

# Input formats supported:
# - No space: "AhAd" or "AsKsQsJsTs"
# - Space separated: "Ah Ad" or "As Ks Qs Js Ts"
```

## Range Syntax

SnapCall supports powerful poker hand range syntax via [rs-poker](https://github.com/elliottneilclark/rs-poker):

| Syntax | Description | Example | Combos |
|--------|-------------|---------|--------|
| `AKs` | Suited hands | AK same suit | 4 |
| `AKo` | Offsuit hands | AK different suits | 12 |
| `TT+` | Pairs and above | TT, JJ, QQ, KK, AA | 30 |
| `T9o+` | Offsuit connectors+ | T9o, JTo, QJo, KQo, AKo | 48 |
| `AKs-AQs` | Suited range | AKs, AQs | 8 |
| `KK+,A2s+` | Multiple ranges | KK+ OR A2s+ | 60 |
| `''` (empty) | Any two cards | All 1326 combos | 1326 |

### Range Examples

```bash
# Suited connectors vs pocket pairs
cargo run --bin snapcall -- equity -p "JTs-87s" -p "88-22"

# AK+ and suited aces
cargo run --bin snapcall -- equity -p "AKo+,A2s+" -p "JJ+"

# Specific hand vs range on flop
cargo run --bin snapcall -- equity -p "AhKh" -p "AKs-AQs" -b "JcTc9d"

# Hand vs random (any two cards)
cargo run --bin snapcall -- equity -p "AhAd" -p "" -i 5000
# → AA has ~85% equity against random hand

# Multi-player equity with --player-count (-n)
# AA vs 2 random opponents (3 players total)
cargo run --bin snapcall -- equity -p "AhAd" -n 3 -i 5000
# → AA has ~75% equity

# AA vs KK vs 3 random opponents (5 players total)
cargo run --bin snapcall -- equity -p "AhAd" -p "KhKd" -n 5 -i 5000
# → AA has ~55% equity in 5-handed
### Pot Odds

Calculate pot odds to make better calling decisions:

```bash
# Basic pot odds (calling a half-pot bet)
cargo run --bin snapcall -- pot-odds --pot 100 --bet 50
# → Pot Odds: 25.00%
# → You need at least 25.00% equity to break even

# Custom call amount (e.g., you have less chips than opponent's bet)
cargo run --bin snapcall -- pot-odds --pot 100 --bet 100 --call 25
# → Pot Odds: 14.29%
# → You need at least 14.29% equity to break even
```

**Formula:** `Pot Odds = Call Amount / (Current Pot + Opponent Bet + Your Call)`

## How It Works

### Hand Evaluation

```rust
use snapcall_core::{parse_cards, evaluate_hand, hand_type_name};

let cards = parse_cards("As Ks Qs Js Ts")?;
let rank = evaluate_hand(&cards)?;
println!("{}", hand_type_name(&rank)); // "Straight Flush"
```

### Equity Calculation

```rust
use snapcall_core::{parse_cards, calculate_equity};

let aa = parse_cards("AhAd")?;  // or "Ah Ad"
let kk = parse_cards("KhKd")?;
let board = parse_cards("AsKdQh")?;  // optional board cards
let equities = calculate_equity(&[aa, kk], &board, 10000)?;
// equities[0] = 95.1% (AA with board)
// equities[1] = 4.9% (KK with board)
```

## Web App (WASM)

A minimal browser UI lives in `web/` and calls into the Rust core via WebAssembly.

```bash
cd web
# Install wasm-pack if you don't have it
cargo install wasm-pack

# Build the WASM package into web/pkg
make build

# Serve the web/ directory
make dev
# Open http://localhost:8000
```

Notes:
- Use an HTTP server (ES modules + WASM fetch); opening `web/index.html` directly usually fails.
- Start by entering two hands like `AhAd` and `KhKd`, then click Calculate.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Mobile UI (Swift/Kotlin)               │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐   │
│  │ Two-Tap      │  │ Range        │  │ Equity Display  │   │
│  │ Keyboard     │  │ Matrix       │  │                 │   │
│  └──────────────┘  └──────────────┘  └─────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                    UniFFI FFI Bridge
                              │
┌─────────────────────────────────────────────────────────────┐
│                    Rust Core (rs-poker)                     │
│                                                             │
│  • Card parsing: "Ah" → Card { Ace, Heart }                 │
│  • Hand eval: 7 cards → rank (< 25ns)                       │
│  • Monte Carlo: 10k simulations → equity %                  │
│  • Range parsing: "AKs" → [(A,K,suited), ...]               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Project Status

| Component | Status | Notes |
|-----------|--------|-------|
| Rust Core | ✅ Done | Using rs-poker 4.1 |
| CLI Tool | ✅ Done | `snapcall` binary |
| FFI Layer | ✅ Ready | UniFFI bindings |
| iOS App | ⏳ Planned | SwiftUI |
| Android App | ⏳ Planned | Jetpack Compose |

See [docs/ROADMAP.md](docs/ROADMAP.md) for details.

## Tech Stack

- **Core**: Rust + [rs-poker](https://github.com/elliottneilclark/rs-poker)
- **FFI**: UniFFI (generates Swift/Kotlin bindings)
- **iOS**: Swift + SwiftUI
- **Android**: Kotlin + Jetpack Compose
- **CLI**: clap

## Why rs-poker?

We evaluated three approaches for hand evaluation:

| Approach | Speed | Memory | Complexity | Verdict |
|----------|-------|--------|------------|---------|
| Lookup Table | ⚡ | 10MB | High | ❌ Too complex |
| Custom Bitwise | ⚡ | Minimal | Very High | ❌ Time sink |
| **rs-poker** | ⚡ | Minimal | Low | ✅ **Winner** |

rs-poker evaluates hands in ~25ns with clean, battle-tested code. Why reinvent the wheel?

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see [LICENSE](LICENSE) for details.

## Acknowledgments

- [rs-poker](https://github.com/elliottneilclark/rs-poker) - The excellent Rust poker library that powers this project
- [UniFFI](https://github.com/mozilla/uniffi-rs) - Mozilla's FFI binding generator

---

**Built with ❤️ for poker players who love clean code.**
