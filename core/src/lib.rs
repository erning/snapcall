//! SnapCall Core - Texas Hold'em Equity Calculator
//!
//! Built on top of rs-poker for high-performance poker calculations.

pub use rs_poker::core::{Card, Deck, Rank, Rankable, Suit, Value};
pub use rs_poker::core::{FlatHand, Hand};
pub use rs_poker::holdem;

mod equity;
mod parsing;
mod types;

pub use equity::calculate_equity;
pub use types::{EquityResult, EquitySolveMode, SnapError};

#[cfg(test)]
mod tests;

/// Evaluates a poker hand and returns its rank.
///
/// Supports 5, 6, or 7 cards and uses best-5 evaluation.
pub fn evaluate_hand(input: &str) -> Result<Rank, SnapError> {
    let cleaned: String = input
        .chars()
        .filter(|c| !c.is_whitespace() && *c != ',')
        .collect();

    if cleaned.is_empty() {
        return Err(SnapError::InvalidHand("Hand string is empty".to_string()));
    }

    let hand = FlatHand::new_from_str(&cleaned).map_err(|e| {
        SnapError::InvalidHand(format!("Failed to parse hand '{}': {:?}", input, e))
    })?;

    if hand.len() < 5 || hand.len() > 7 {
        return Err(SnapError::InvalidHand(format!(
            "Hand must have 5-7 cards, got {}",
            hand.len()
        )));
    }

    Ok(hand.rank())
}

pub fn parse_cards(s: &str) -> Result<Vec<Card>, SnapError> {
    let cleaned: String = s
        .chars()
        .filter(|c| !c.is_whitespace() && *c != ',')
        .collect();

    if cleaned.is_empty() {
        return Err(SnapError::InvalidCard("Empty card string".to_string()));
    }

    let hand =
        FlatHand::new_from_str(&cleaned).map_err(|_| SnapError::InvalidCard(s.to_string()))?;
    Ok(hand.iter().copied().collect())
}
