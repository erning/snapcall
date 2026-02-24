//! FFI layer for UniFFI bindings
use crate::{
    calculate_equity, evaluate_hand, hand_type_name, parse_card, parse_cards, Card, Rank, Suit,
    Value,
};

/// FFI-friendly wrapper for Card
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

/// Parse a card from string via FFI
#[uniffi::export]
pub fn ffi_parse_card(card_str: String) -> Result<FfiCard, String> {
    parse_card(&card_str)
        .map(|c: Card| c.into())
        .map_err(|e: crate::SnapError| e.to_string())
}

/// Parse multiple cards from string via FFI
#[uniffi::export]
pub fn ffi_parse_cards(cards_str: String) -> Result<Vec<FfiCard>, String> {
    parse_cards(&cards_str)
        .map(|cards: Vec<Card>| cards.into_iter().map(|c| c.into()).collect())
        .map_err(|e: crate::SnapError| e.to_string())
}

/// Evaluate a hand via FFI
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

/// Calculate equity via FFI
///
/// # Arguments
/// * `player_hands` - Each player's hole cards as list of "Ah Kd" style strings
/// * `board` - Community cards as "5s 6h 7d" style string (can be empty)
/// * `iterations` - Number of Monte Carlo simulations
#[uniffi::export]
pub fn ffi_calculate_equity(
    player_hands: Vec<String>,
    board: String,
    iterations: u32,
) -> Result<Vec<f64>, String> {
    // Parse player hands
    let parsed_hands: Vec<Vec<Card>> = player_hands
        .into_iter()
        .map(|h| parse_cards(&h))
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e: crate::SnapError| e.to_string())?;

    // Parse board
    let parsed_board = if board.trim().is_empty() {
        vec![]
    } else {
        parse_cards(&board).map_err(|e: crate::SnapError| e.to_string())?
    };

    calculate_equity(&parsed_hands, &parsed_board, iterations)
        .map_err(|e: crate::SnapError| e.to_string())
}

/// Get a description of what hands each player has
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
