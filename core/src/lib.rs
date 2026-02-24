//! SnapCall Core - Texas Hold'em Equity Calculator
//! 
//! Built on top of rs-poker for high-performance poker calculations.

// Re-export rs-poker core types
pub use rs_poker::core::{Card, Deck, Rank, Rankable, Suit, Value};
pub use rs_poker::core::FlatHand;

// Re-export holdem module
pub use rs_poker::holdem;

// FFI module for UniFFI
#[cfg(feature = "ffi")]
pub mod ffi;

/// Errors that can occur in the core engine
#[derive(Debug, Clone, PartialEq)]
pub enum SnapError {
    InvalidCard(String),
    InvalidHand(String),
    InvalidRange(String),
}

impl std::fmt::Display for SnapError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            SnapError::InvalidCard(s) => write!(f, "Invalid card string: {}", s),
            SnapError::InvalidHand(s) => write!(f, "Invalid hand: {}", s),
            SnapError::InvalidRange(s) => write!(f, "Invalid range: {}", s),
        }
    }
}

impl std::error::Error for SnapError {}

/// Parse a card from string (e.g., "Ah", "Tc")
pub fn parse_card(s: &str) -> Result<Card, SnapError> {
    if s.len() < 2 {
        return Err(SnapError::InvalidCard(s.to_string()));
    }

    let value_char = s.chars().next().unwrap();
    let suit_char = s.chars().nth(1).unwrap();

    let value =
        Value::from_char(value_char).ok_or_else(|| SnapError::InvalidCard(s.to_string()))?;
    let suit = Suit::from_char(suit_char).ok_or_else(|| SnapError::InvalidCard(s.to_string()))?;

    Ok(Card::new(value, suit))
}

/// Parse multiple cards from space or comma-separated string
pub fn parse_cards(s: &str) -> Result<Vec<Card>, SnapError> {
    let cleaned = s.replace(',', " ");
    cleaned.split_whitespace().map(parse_card).collect()
}

/// Evaluate a hand and return its rank
/// Works with 5, 6, or 7 cards
pub fn evaluate_hand(cards: &[Card]) -> Result<Rank, SnapError> {
    if cards.len() < 5 || cards.len() > 7 {
        return Err(SnapError::InvalidHand(format!(
            "Hand must have 5-7 cards, got {}",
            cards.len()
        )));
    }

    let hand = FlatHand::new_with_cards(cards.to_vec());
    Ok(hand.rank())
}

/// Calculate equity for multiple players using Monte Carlo simulation
///
/// # Arguments
/// * `player_hands` - Each player's hole cards (2 cards each)
/// * `_board` - Community cards (0-5 cards) - currently unused by rs_poker MonteCarloGame
/// * `iterations` - Number of Monte Carlo iterations
///
/// # Returns
/// Equity percentages for each player (sum = 100.0)
pub fn calculate_equity(
    player_hands: &[Vec<Card>],
    _board: &[Card],
    iterations: u32,
) -> Result<Vec<f64>, SnapError> {
    if player_hands.len() < 2 {
        return Err(SnapError::InvalidHand(
            "Need at least 2 players".to_string(),
        ));
    }

    for (i, hand) in player_hands.iter().enumerate() {
        if hand.len() != 2 {
            return Err(SnapError::InvalidHand(format!(
                "Player {} must have exactly 2 hole cards",
                i + 1
            )));
        }
    }

    // Create player hands for simulation
    let hands: Vec<rs_poker::core::Hand> = player_hands
        .iter()
        .map(|cards| rs_poker::core::Hand::new_with_cards(cards.clone()))
        .collect();

    // Create Monte Carlo game
    let mut game =
        holdem::MonteCarloGame::new(hands).map_err(|e| SnapError::InvalidHand(e.to_string()))?;

    // Run simulation
    let mut wins: Vec<u64> = vec![0; player_hands.len()];
    let iters = if iterations == 0 {
        10000
    } else {
        iterations as usize
    };

    for _ in 0..iters {
        let (winners, _) = game.simulate();
        game.reset();

        // Count wins
        for (i, win) in wins.iter_mut().enumerate() {
            if winners.ones().any(|w| w == i) {
                *win += 1;
            }
        }
    }

    // Convert to percentages
    let total: u64 = wins.iter().sum();
    if total == 0 {
        let n = player_hands.len();
        return Ok(vec![100.0 / n as f64; n]);
    }

    Ok(wins
        .iter()
        .map(|&w| (w as f64 / total as f64) * 100.0)
        .collect())
}

/// Parse a simple range string (e.g., "AKs", "AKo")
/// Returns list of (value1, value2, suited) tuples
pub fn parse_range(range_str: &str) -> Result<Vec<(Value, Value, bool)>, SnapError> {
    if range_str.len() < 2 {
        return Err(SnapError::InvalidRange(range_str.to_string()));
    }

    let chars: Vec<char> = range_str.chars().collect();
    let v1 =
        Value::from_char(chars[0]).ok_or_else(|| SnapError::InvalidRange(range_str.to_string()))?;
    let v2 =
        Value::from_char(chars[1]).ok_or_else(|| SnapError::InvalidRange(range_str.to_string()))?;

    let suited = if range_str.len() > 2 {
        match chars[2] {
            's' | 'S' => true,
            'o' | 'O' => false,
            _ => return Err(SnapError::InvalidRange(range_str.to_string())),
        }
    } else {
        false // offsuit by default if not specified
    };

    Ok(vec![(v1, v2, suited)])
}

/// Get hand type name as string
pub fn hand_type_name(rank: &Rank) -> &'static str {
    match rank {
        Rank::HighCard(_) => "High Card",
        Rank::OnePair(_) => "One Pair",
        Rank::TwoPair(_) => "Two Pair",
        Rank::ThreeOfAKind(_) => "Three of a Kind",
        Rank::Straight(_) => "Straight",
        Rank::Flush(_) => "Flush",
        Rank::FullHouse(_) => "Full House",
        Rank::FourOfAKind(_) => "Four of a Kind",
        Rank::StraightFlush(_) => "Straight Flush",
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_card() {
        let card = parse_card("Ah").unwrap();
        assert_eq!(card.value, Value::Ace);
        assert_eq!(card.suit, Suit::Heart);
    }

    #[test]
    fn test_parse_cards() {
        let cards = parse_cards("Ah Kd Qc").unwrap();
        assert_eq!(cards.len(), 3);
        assert_eq!(cards[0].value, Value::Ace);
    }

    #[test]
    fn test_evaluate_royal_flush() {
        let cards = parse_cards("As Ks Qs Js Ts").unwrap();
        let rank = evaluate_hand(&cards).unwrap();
        assert!(matches!(rank, Rank::StraightFlush(_)));
    }

    #[test]
    fn test_evaluate_pair() {
        let cards = parse_cards("Ah Ad Kc Qd Js").unwrap();
        let rank = evaluate_hand(&cards).unwrap();
        assert!(matches!(rank, Rank::OnePair(_)));
    }

    #[test]
    fn test_parse_range() {
        let hands = parse_range("AKs").unwrap();
        assert!(!hands.is_empty());

        // Should include suited AK
        let has_aks = hands
            .iter()
            .any(|(v1, v2, suited)| *v1 == Value::Ace && *v2 == Value::King && *suited);
        assert!(has_aks, "Range should include AKs");
    }
}


// UniFFI scaffolding
#[cfg(feature = "ffi")]
uniffi::setup_scaffolding!();