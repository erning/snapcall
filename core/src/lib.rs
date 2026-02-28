//! SnapCall Core - Texas Hold'em Equity Calculator
//!
//! Built on top of rs-poker for high-performance poker calculations.

pub use rs_poker::core::{Card, Deck, Rank, Rankable, Suit, Value};
pub use rs_poker::core::{FlatHand, Hand};
pub use rs_poker::holdem;

mod estimate;
mod input;
mod types;

pub use estimate::estimate_equity;
pub use input::{BoardCardsInput, HoleCardsInput};
pub use types::{EquityResult, EquitySolveMode, SnapError};

#[cfg(test)]
mod tests;
