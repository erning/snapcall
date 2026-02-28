//! SnapCall Core — Texas Hold'em Equity Calculator
//!
//! Provides equity estimation for Texas Hold'em poker hands via exact
//! enumeration (when feasible) or Monte Carlo simulation.
//!
//! # Quick Start
//!
//! ```no_run
//! use snapcall_core::estimate_equity;
//!
//! let result = estimate_equity("AhKdQc", "AsKs", &["JdJc"], 10_000).unwrap();
//! println!("Hero equity: {:.1}%", result.equities[0]);
//! ```

pub use rs_poker::core::{Card, Deck, Rank, Rankable, Suit, Value};
pub use rs_poker::core::{FlatHand, Hand};
pub use rs_poker::holdem;

mod enumeration;
mod estimate;
mod input;
mod monte_carlo;
mod types;

pub use estimate::estimate_equity;
pub use input::*;
pub use types::*;
