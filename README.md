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

# Evaluate a hand
cargo run --bin snapcall -- eval "As Ks Qs Js Ts"
# → Straight Flush

# Calculate equity (AA vs KK)
cargo run --bin snapcall -- equity -p "Ah Ad,Kh Kd" -i 10000
# → Player 1: 81.83%
# → Player 2: 18.17%
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

let aa = parse_cards("Ah Ad")?;
let kk = parse_cards("Kh Kd")?;
let equities = calculate_equity(&[aa, kk], &[], 10000)?;
// equities[0] = 81.5% (AA)
// equities[1] = 18.5% (KK)
```

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
