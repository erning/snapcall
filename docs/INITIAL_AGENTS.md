# Project: SnapCall - Texas Hold'em Equity Calculator

## 1. Project Overview
Build a high-performance, cross-platform Texas Hold'em Equity Calculator. The app calculates win/tie probabilities (equity) for given poker hands and board cards. It must support both specific hands and 13x13 hand ranges.

**Core Philosophy:** - Extreme performance for calculations (Monte Carlo & Exact Enumeration).
- Zero UI lag. 
- Fast, two-tap input UX designed for mobile poker players.

## 2. Architecture & Tech Stack
We are using a shared core architecture with native UI layers:
- **Core Engine & Algorithms:** Rust (Focus on bitwise operations for speed).
- **CLI Interface:** Rust (For rapid local testing of the math engine).
- **Cross-Language Bridge:** UniFFI (Auto-generating Swift and Kotlin bindings).
- **iOS App:** Swift + SwiftUI.
- **Android App:** Kotlin + Jetpack Compose.

## 3. Directory Structure
Ensure the workspace is initialized with the following structure:
```text
snapcall_workspace/
├── core/                 # Rust library (Algorithms, UniFFI bridge)
│   ├── src/
│   │   ├── card.rs       # Bitwise card representation
│   │   ├── deck.rs       # Deck management & shuffling
│   │   ├── evaluator.rs  # Hand rank evaluation (7-card hand strength)
│   │   ├── equity.rs     # Monte Carlo & Exhaustive calculation logic
│   │   └── lib.rs        # UniFFI exposed interfaces
│   ├── build.rs          # UniFFI build script
│   └── Cargo.toml
├── cli/                  # Rust binary for testing `core_engine`
├── ios/                  # Xcode project (SwiftUI)
└── android/              # Android Studio project (Compose)

```

## 4. Implementation Phases & Agent Tasks

### Phase 1: Rust Core Engine (The Math)

**Goal:** Build the fastest possible hand evaluator and equity calculator.

* **Task 1.1: Card Representation:** Implement `Card` in `core/src/card.rs` using a `u8` (Bitwise: 4 bits for rank, 2 bits for suit). Implement fast parsing from strings (e.g., "Ah", "Tc").
* **Task 1.2: Hand Evaluator:** Implement a 7-card evaluator in `evaluator.rs`. It must assign an absolute integer score to any 7-card combination (e.g., High Card to Royal Flush) so hands can be compared using simple `>` or `<` operators. *Hint: Consider using a lookup table or a highly optimized bitwise algorithm like Two-Plus-Two or Cactus Kev's.*
* **Task 1.3: Calculation Logic:** Implement `equity.rs`.
* If unknown cards <= 2 (Turn/River): Use Complete Enumeration.
* If unknown cards > 2 (Pre-flop/Flop): Use Monte Carlo Simulation (default to 100,000 iterations).


* **Task 1.4: Range Support:** Create a data structure to parse and store the 169 starting hand categories (e.g., parsing "AKs", "22+", "JTs-87s").

### Phase 2: The UniFFI Bridge

**Goal:** Expose Rust functions to Swift and Kotlin cleanly.

* **Task 2.1:** Set up UniFFI in `Cargo.toml` and `build.rs`.
* **Task 2.2:** Expose a primary function: `calculate_equity(player_hands: Vec<String>, board: String, iterations: u32) -> Vec<f64>`. (Note: use strings or simplified structs across the FFI boundary for ease of integration initially).
* **Task 2.3:** Generate `SnapCall.swift` and `SnapCall.kt` files.

### Phase 3: Native UI (iOS & Android)

**Goal:** Build the specific UI/UX components for mobile.

* **Task 3.1: The Two-Tap Poker Keyboard:** - Build a custom input component fixed at the bottom of the screen.
* Top row: Ranks (A, K, Q, J, T, 9, 8, 7, 6, 5, 4, 3, 2).
* Bottom row: Suits (♠️, ♥️, ♣️, ♦️). Use 4-color deck logic (Black, Red, Green, Blue).
* Implement "Ghosting": Cards already on the board or in hands must be disabled on the keyboard.
* Implement "Auto-Advance": Focus must automatically jump to the next empty card slot after a rank+suit is selected.


* **Task 3.2: The 13x13 Range Matrix:**
* Build a grid (Pairs on diagonal, Suited top-right, Offsuit bottom-left).
* Support drag-to-paint gesture for multi-selection.


* **Task 3.3: Integration:** Connect the UI state to the UniFFI generated Rust functions. Execute the calculation asynchronously so the UI thread is never blocked.

## 5. Coding Guidelines for the Agent

* **Rust:** Prioritize zero-allocation paths in the Monte Carlo hot loop. Use `#[derive(Debug, Clone, Copy, PartialEq, Eq)]` extensively for core structs.
* **Swift/Kotlin:** Strictly adhere to declarative UI patterns (SwiftUI state management via `@State`/`@Binding`, Compose via `remember`/`MutableState`).
* **Error Handling:** Rust must pass errors gracefully across the FFI boundary (e.g., invalid card strings, impossible board combinations). Do not `panic!` in FFI exposed functions.
