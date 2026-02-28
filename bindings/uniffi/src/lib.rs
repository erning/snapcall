use snapcall_core::{
    calculate_equity, calculate_equity_with_ranges, evaluate_hand, parse_card, parse_cards, Card,
    Rank, Suit, Value,
};

#[derive(uniffi::Record)]
pub struct FfiCard {
    pub value: u8,
    pub suit: u8,
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

#[uniffi::export]
pub fn ffi_parse_card(card_str: String) -> Result<FfiCard, String> {
    parse_card(&card_str)
        .map(|c: Card| c.into())
        .map_err(|e: snapcall_core::SnapError| e.to_string())
}

#[uniffi::export]
pub fn ffi_parse_cards(cards_str: String) -> Result<Vec<FfiCard>, String> {
    parse_cards(&cards_str)
        .map(|cards: Vec<Card>| cards.into_iter().map(|c| c.into()).collect())
        .map_err(|e: snapcall_core::SnapError| e.to_string())
}

#[uniffi::export]
pub fn ffi_evaluate_hand(cards: Vec<FfiCard>) -> Result<String, String> {
    let cards: Vec<Card> = cards
        .into_iter()
        .map(|c| c.try_into())
        .collect::<Result<Vec<_>, _>>()?;

    evaluate_hand(&cards)
        .map(|rank: Rank| format!("{:?}", rank))
        .map_err(|e: snapcall_core::SnapError| e.to_string())
}

#[uniffi::export]
pub fn ffi_calculate_equity(
    player_hands: Vec<String>,
    board: String,
    iterations: u32,
) -> Result<Vec<f64>, String> {
    calculate_equity(&player_hands, &board, iterations)
        .map_err(|e: snapcall_core::SnapError| e.to_string())
}

#[uniffi::export]
pub fn ffi_calculate_equity_with_ranges(
    player_ranges: Vec<String>,
    board: String,
    iterations: u32,
) -> Result<Vec<f64>, String> {
    calculate_equity_with_ranges(&player_ranges, &board, iterations)
        .map_err(|e: snapcall_core::SnapError| e.to_string())
}

#[uniffi::export]
pub fn ffi_describe_hand(cards: Vec<FfiCard>) -> Result<String, String> {
    let cards: Vec<Card> = cards
        .into_iter()
        .map(|c| c.try_into())
        .collect::<Result<Vec<_>, _>>()?;

    evaluate_hand(&cards)
        .map(|rank: Rank| format!("{:?}", rank))
        .map_err(|e: snapcall_core::SnapError| e.to_string())
}

uniffi::setup_scaffolding!();
