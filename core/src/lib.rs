//! SnapCall Core - Texas Hold'em Equity Calculator
//!
//! Built on top of rs-poker for high-performance poker calculations.

pub use rs_poker::core::FlatHand;
pub use rs_poker::core::{Card, Deck, Rank, Rankable, Suit, Value};
pub use rs_poker::holdem;

mod equity;
mod parsing;
mod types;

pub use equity::{calculate_equity, evaluate_hand};
pub use parsing::{parse_card, parse_cards, parse_range};
pub use types::{EquityResult, EquitySolveMode, SnapError};

#[cfg(test)]
mod tests;
