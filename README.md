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

# Input formats supported:
# - No space: "AhAd" or "AsKsQsJsTs"
# - Space separated: "Ah Ad" or "As Ks Qs Js Ts"
```

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
