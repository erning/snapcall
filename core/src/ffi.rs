//! FFI layer for UniFFI bindings
use crate::{
    calculate_equity, calculate_equity_with_ranges, evaluate_hand, hand_type_name, parse_card,
    parse_cards, Card, Rank, Suit, Value,
};

/// FFI-friendly card representation.
///
/// `value` and `suit` follow rs-poker numeric enums.
#[derive(uniffi::Record)]
pub struct FfiCard {
    pub value: u8, // 0-12 (2-Ace)
    pub suit: u8,  // 0-3 (Clubs, Diamonds, Hearts, Spades)
}

impl From<Card> for FfiCard {
    fn from(card: Card) -> Self {
        FfiCard {
            value: card.value as u8,
            suit: card.suit as u8,
        }
    }
}

impl TryFrom<FfiCard> for Card {
    type Error = String;

    fn try_from(ffi: FfiCard) -> Result<Self, Self::Error> {
        let value = Value::from_u8(ffi.value);
        let suit = Suit::from_u8(ffi.suit);
        Ok(Card::new(value, suit))
    }
}

/// Parses one card string and returns an FFI-safe card.
///
/// # Arguments
/// - `card_str`: Card string like `"Ah"`.
#[uniffi::export]
pub fn ffi_parse_card(card_str: String) -> Result<FfiCard, String> {
    parse_card(&card_str)
        .map(|c: Card| c.into())
        .map_err(|e: crate::SnapError| e.to_string())
}

/// Parses multiple cards into FFI-safe cards.
///
/// # Arguments
/// - `cards_str`: Card sequence like `"As Ks Qh"` or `"AsKsQh"`.
#[uniffi::export]
pub fn ffi_parse_cards(cards_str: String) -> Result<Vec<FfiCard>, String> {
    parse_cards(&cards_str)
        .map(|cards: Vec<Card>| cards.into_iter().map(|c| c.into()).collect())
        .map_err(|e: crate::SnapError| e.to_string())
}

/// Evaluates a hand and returns only the hand type name.
///
/// # Arguments
/// - `cards`: 5 to 7 cards.
#[uniffi::export]
pub fn ffi_evaluate_hand(cards: Vec<FfiCard>) -> Result<String, String> {
    let cards: Vec<Card> = cards
        .into_iter()
        .map(|c| c.try_into())
        .collect::<Result<Vec<_>, _>>()?;

    evaluate_hand(&cards)
        .map(|rank: Rank| hand_type_name(&rank).to_string())
        .map_err(|e: crate::SnapError| e.to_string())
}

/// Calculates equity using string-first player and board inputs.
///
/// # Arguments
/// - `player_hands`: One input string per player. Each item can be empty,
///   one card, exact two cards, or a range expression.
/// - `board`: Community card string with 0/3/4/5 cards.
/// - `iterations`: Enumeration budget and Monte Carlo fallback iterations.
#[uniffi::export]
pub fn ffi_calculate_equity(
    player_hands: Vec<String>,
    board: String,
    iterations: u32,
) -> Result<Vec<f64>, String> {
    calculate_equity(&player_hands, &board, iterations).map_err(|e: crate::SnapError| e.to_string())
}

/// Backward-compatible alias for [`ffi_calculate_equity`].
///
/// Uses identical string-first semantics.
#[uniffi::export]
pub fn ffi_calculate_equity_with_ranges(
    player_ranges: Vec<String>,
    board: String,
    iterations: u32,
) -> Result<Vec<f64>, String> {
    calculate_equity_with_ranges(&player_ranges, &board, iterations)
        .map_err(|e: crate::SnapError| e.to_string())
}

/// Evaluates a hand and returns debug-style rank description.
///
/// Useful when consumers need more detailed rank text than
/// `ffi_evaluate_hand`.
#[uniffi::export]
pub fn ffi_describe_hand(cards: Vec<FfiCard>) -> Result<String, String> {
    let cards: Vec<Card> = cards
        .into_iter()
        .map(|c| c.try_into())
        .collect::<Result<Vec<_>, _>>()?;

    evaluate_hand(&cards)
        .map(|rank: Rank| format!("{:?}", rank))
        .map_err(|e: crate::SnapError| e.to_string())
}
