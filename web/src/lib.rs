use snapcall_core::{
    calculate_equity as core_calculate_equity, evaluate_hand as core_evaluate_hand, hand_type_name,
    holdem::RangeParser, parse_card as core_parse_card, parse_cards as core_parse_cards, Card,
    Suit,
};
use wasm_bindgen::prelude::*;

fn throw<T>(msg: impl ToString) -> T {
    wasm_bindgen::throw_str(&msg.to_string())
}

fn suit_to_char(suit: Suit) -> char {
    match suit {
        Suit::Spade => 's',
        Suit::Heart => 'h',
        Suit::Diamond => 'd',
        Suit::Club => 'c',
    }
}

fn suit_to_symbol(suit: Suit) -> char {
    match suit {
        Suit::Spade => '♠',
        Suit::Heart => '♥',
        Suit::Diamond => '♦',
        Suit::Club => '♣',
    }
}

fn card_to_compact(card: &Card) -> String {
    let v = card.value.to_char().to_ascii_uppercase();
    let s = suit_to_char(card.suit);
    format!("{}{}", v, s)
}

#[wasm_bindgen]
pub fn evaluate_hand(cards: &str) -> String {
    let cards = match core_parse_cards(cards) {
        Ok(c) => c,
        Err(e) => return throw(e),
    };

    let rank = match core_evaluate_hand(&cards) {
        Ok(r) => r,
        Err(e) => return throw(e),
    };

    format!("{} ({:?})", hand_type_name(&rank), rank)
}

#[wasm_bindgen]
pub fn format_card(card: &str) -> String {
    let card = match core_parse_card(card.trim()) {
        Ok(c) => c,
        Err(e) => return throw(e),
    };

    let v = card.value.to_char().to_ascii_uppercase();
    let s = suit_to_symbol(card.suit);
    format!("{}{}", v, s)
}

#[wasm_bindgen]
pub fn parse_range(range: &str) -> Vec<String> {
    let flat_hands = match RangeParser::parse_many(range.trim()) {
        Ok(v) => v,
        Err(e) => return throw(format!("Invalid range '{}': {:?}", range, e)),
    };

    flat_hands
        .into_iter()
        .map(|fh| {
            let cards: Vec<Card> = fh.iter().copied().collect();
            if cards.len() != 2 {
                return throw("Range expansion produced non-2-card hand");
            }
            format!(
                "{}{}",
                card_to_compact(&cards[0]),
                card_to_compact(&cards[1])
            )
        })
        .collect()
}

#[wasm_bindgen]
pub fn calculate_equity(players: Vec<String>, board: String, iterations: u32) -> Vec<f64> {
    if players.len() < 2 {
        return throw("Need at least 2 players");
    }

    core_calculate_equity(&players, &board, iterations).unwrap_or_else(|e| throw(e))
}
