use snapcall_core::{
    calculate_equity as core_calculate_equity,
    calculate_equity_with_ranges as core_calculate_equity_with_ranges,
    evaluate_hand as core_evaluate_hand, hand_type_name, parse_card as core_parse_card,
    parse_cards as core_parse_cards, Card, SnapError, Suit,
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

fn parse_board(board: &str) -> Result<Vec<Card>, SnapError> {
    if board.trim().is_empty() {
        Ok(vec![])
    } else {
        core_parse_cards(board)
    }
}

fn parse_hand_or_range(input: &str) -> Result<Vec<Vec<Card>>, String> {
    let trimmed = input.trim();
    if trimmed.is_empty() {
        // Empty string means "any two cards" - generate all 1326 possible starting hands
        return generate_all_starting_hands();
    }

    // Prefer explicit 2-card parsing when possible (e.g., "AsKs" or "Ah Ad").
    match core_parse_cards(trimmed) {
        Ok(cards) if cards.len() == 2 => return Ok(vec![cards]),
        Ok(cards) => {
            return Err(format!("Expected exactly 2 cards, got {}", cards.len()));
        }
        Err(_) => {}
    }

    use rs_poker::holdem::RangeParser;

    let flat_hands = RangeParser::parse_many(trimmed)
        .map_err(|e| format!("Invalid range '{}': {:?}", trimmed, e))?;

    let hands: Vec<Vec<Card>> = flat_hands
        .into_iter()
        .map(|fh: rs_poker::core::FlatHand| fh.iter().copied().collect())
        .collect();

    if hands.is_empty() {
        return Err(format!("Range '{}' produced no valid hands", trimmed));
    }

    Ok(hands)
}

/// Generate all 1326 possible starting hands (52 choose 2)
fn generate_all_starting_hands() -> Result<Vec<Vec<Card>>, String> {
    use rs_poker::core::{Card as PokerCard, Suit, Value};

    let mut hands = Vec::with_capacity(1326);

    // Generate all 52 cards
    let suits = [Suit::Spade, Suit::Heart, Suit::Diamond, Suit::Club];
    let values = [
        Value::Ace,
        Value::King,
        Value::Queen,
        Value::Jack,
        Value::Ten,
        Value::Nine,
        Value::Eight,
        Value::Seven,
        Value::Six,
        Value::Five,
        Value::Four,
        Value::Three,
        Value::Two,
    ];

    let mut all_cards: Vec<PokerCard> = Vec::with_capacity(52);
    for value in &values {
        for suit in &suits {
            all_cards.push(PokerCard::new(*value, *suit));
        }
    }

    // Generate all combinations of 2 cards
    for i in 0..all_cards.len() {
        for j in (i + 1)..all_cards.len() {
            hands.push(vec![all_cards[i], all_cards[j]]);
        }
    }

    Ok(hands)
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
    use rs_poker::holdem::RangeParser;

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

    let board_cards = match parse_board(&board) {
        Ok(b) => b,
        Err(e) => return throw(e),
    };

    // Parse players as either specific hands or ranges.
    let player_ranges: Vec<Vec<Vec<Card>>> = players
        .iter()
        .map(|p| parse_hand_or_range(p))
        .collect::<Result<Vec<_>, _>>()
        .unwrap_or_else(|e| throw(e));

    let any_range = player_ranges.iter().any(|r| r.len() != 1);

    if !any_range {
        let hands: Vec<Vec<Card>> = player_ranges
            .into_iter()
            .map(|r| r.into_iter().next().unwrap())
            .collect();

        return core_calculate_equity(&hands, &board_cards, iterations)
            .unwrap_or_else(|e| throw(e));
    }

    core_calculate_equity_with_ranges(&player_ranges, &board_cards, iterations)
        .unwrap_or_else(|e| throw(e))
}
