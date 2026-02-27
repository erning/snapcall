//! SnapCall Core - Texas Hold'em Equity Calculator
//!
//! Built on top of rs-poker for high-performance poker calculations.

pub use rs_poker::core::FlatHand;
pub use rs_poker::core::{Card, Deck, Rank, Rankable, Suit, Value};
pub use rs_poker::holdem;

mod combinatorics;
mod equity;
mod parsing;
mod types;

#[cfg(feature = "ffi")]
pub mod ffi;

pub use equity::{
    calculate_equity, calculate_equity_with_math, calculate_equity_with_ranges, evaluate_hand,
    hand_type_name,
};
pub use parsing::{parse_card, parse_cards, parse_range};
pub use types::{EquityMath, EquityResult, EquitySolveMode, SnapError};

#[cfg(test)]
mod tests;

#[cfg(feature = "ffi")]
uniffi::setup_scaffolding!();
