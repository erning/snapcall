//! SnapCall Core - Texas Hold'em Equity Calculator
//!
//! Built on top of rs-poker for high-performance poker calculations.

// Re-export rs-poker core types
use rand::prelude::IndexedRandom;
pub use rs_poker::core::FlatHand;
pub use rs_poker::core::{Card, Deck, Rank, Rankable, Suit, Value};
use std::collections::HashSet;

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

/// Parse multiple cards from space, comma-separated, or concatenated string (e.g., "Ah Ks", "Ah,Ks", or "AhKs")
pub fn parse_cards(s: &str) -> Result<Vec<Card>, SnapError> {
    // Remove all whitespace and commas
    let cleaned: String = s
        .chars()
        .filter(|c| !c.is_whitespace() && *c != ',')
        .collect();

    // If empty after cleaning, return error
    if cleaned.is_empty() {
        return Err(SnapError::InvalidCard("Empty card string".to_string()));
    }

    // Check if we can parse as concatenated cards (every 2 chars = 1 card)
    // Valid card format: value char (A, K, Q, J, T, 9-2) + suit char (s, h, d, c)
    if cleaned.len().is_multiple_of(2) && cleaned.len() >= 2 {
        // Try to parse as concatenated cards first
        let mut cards = Vec::new();
        let mut valid = true;

        for chunk in cleaned.as_bytes().chunks(2) {
            let card_str = std::str::from_utf8(chunk).unwrap();
            match parse_card(card_str) {
                Ok(card) => cards.push(card),
                Err(_) => {
                    valid = false;
                    break;
                }
            }
        }

        if valid && !cards.is_empty() {
            return Ok(cards);
        }
    }

    // Fall back to space/comma separated parsing
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

fn all_cards() -> Vec<Card> {
    const SUITS: [Suit; 4] = [Suit::Spade, Suit::Heart, Suit::Diamond, Suit::Club];
    const VALUES: [Value; 13] = [
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

    let mut cards = Vec::with_capacity(52);
    for value in VALUES {
        for suit in SUITS {
            cards.push(Card::new(value, suit));
        }
    }
    cards
}

fn combination_count(n: usize, k: usize) -> usize {
    if k > n {
        return 0;
    }
    if k == 0 || k == n {
        return 1;
    }

    let k = k.min(n - k);
    let mut result: u128 = 1;
    for i in 0..k {
        result = result * (n - i) as u128 / (i + 1) as u128;
        if result > usize::MAX as u128 {
            return usize::MAX;
        }
    }

    result as usize
}

fn default_iterations(iterations: u32) -> usize {
    if iterations == 0 {
        10000
    } else {
        iterations as usize
    }
}

fn for_each_combination<F>(cards: &[Card], k: usize, mut callback: F)
where
    F: FnMut(&[Card]),
{
    if k > cards.len() {
        return;
    }

    if k == 0 {
        callback(&[]);
        return;
    }

    let mut selected = Vec::with_capacity(k);

    fn recurse<F>(
        cards: &[Card],
        k: usize,
        start: usize,
        selected: &mut Vec<Card>,
        callback: &mut F,
    ) where
        F: FnMut(&[Card]),
    {
        if selected.len() == k {
            callback(selected);
            return;
        }

        let remaining_needed = k - selected.len();
        let end = cards.len() - remaining_needed;
        for idx in start..=end {
            selected.push(cards[idx]);
            recurse(cards, k, idx + 1, selected, callback);
            selected.pop();
        }
    }

    recurse(cards, k, 0, &mut selected, &mut callback);
}

fn calculate_exact_equity(
    player_hands: &[Vec<Card>],
    board: &[Card],
    remaining_deck: &[Card],
    missing_board_cards: usize,
) -> Vec<f64> {
    let mut wins: Vec<u64> = vec![0; player_hands.len()];

    for_each_combination(remaining_deck, missing_board_cards, |runout| {
        let ranks: Vec<Rank> = player_hands
            .iter()
            .map(|hand| {
                let mut cards = Vec::with_capacity(7);
                cards.extend_from_slice(hand);
                cards.extend_from_slice(board);
                cards.extend_from_slice(runout);
                FlatHand::new_with_cards(cards).rank()
            })
            .collect();

        if let Some(best_rank) = ranks.iter().max() {
            for (i, rank) in ranks.iter().enumerate() {
                if rank == best_rank {
                    wins[i] += 1;
                }
            }
        }
    });

    let total: u64 = wins.iter().sum();
    if total == 0 {
        let n = player_hands.len();
        return vec![100.0 / n as f64; n];
    }

    wins.iter()
        .map(|&w| (w as f64 / total as f64) * 100.0)
        .collect()
}

/// Calculate equity for multiple players.
///
/// # Arguments
/// * `player_hands` - Each player's hole cards (2 cards each)
/// * `board` - Community cards (0-5 cards)
/// * `iterations` - Enumeration threshold and Monte Carlo iterations fallback
///
/// # Returns
/// Equity percentages for each player (sum = 100.0)
pub fn calculate_equity(
    player_hands: &[Vec<Card>],
    board: &[Card],
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
    // Validate board size
    if board.len() > 5 {
        return Err(SnapError::InvalidHand(
            "Board cannot have more than 5 cards".to_string(),
        ));
    }

    let mut used_cards: HashSet<Card> = HashSet::new();
    for hand in player_hands {
        for card in hand {
            if !used_cards.insert(*card) {
                return Err(SnapError::InvalidHand(format!(
                    "Duplicate card detected: {:?}",
                    card
                )));
            }
        }
    }
    for card in board {
        if !used_cards.insert(*card) {
            return Err(SnapError::InvalidHand(format!(
                "Duplicate card detected: {:?}",
                card
            )));
        }
    }

    let remaining_deck: Vec<Card> = all_cards()
        .into_iter()
        .filter(|card| !used_cards.contains(card))
        .collect();
    let missing_board_cards = 5 - board.len();
    let runout_combinations = combination_count(remaining_deck.len(), missing_board_cards);
    let simulation_iterations = default_iterations(iterations);

    if runout_combinations <= simulation_iterations {
        return Ok(calculate_exact_equity(
            player_hands,
            board,
            &remaining_deck,
            missing_board_cards,
        ));
    }

    // Create player hands for simulation, adding board cards to each hand
    let hands: Vec<rs_poker::core::Hand> = player_hands
        .iter()
        .map(|cards| {
            let mut hand = rs_poker::core::Hand::new_with_cards(cards.clone());
            // Add board cards to each player's hand
            for card in board {
                hand.insert(*card);
            }
            hand
        })
        .collect();
    // Create Monte Carlo game

    // Create Monte Carlo game
    let mut game =
        holdem::MonteCarloGame::new(hands).map_err(|e| SnapError::InvalidHand(e.to_string()))?;

    // Run simulation
    let mut wins: Vec<u64> = vec![0; player_hands.len()];
    let iters = simulation_iterations;

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

fn validate_range_inputs(
    player_ranges: &[Vec<Vec<Card>>],
    board: &[Card],
) -> Result<(), SnapError> {
    if player_ranges.len() < 2 {
        return Err(SnapError::InvalidHand(
            "Need at least 2 players".to_string(),
        ));
    }

    if board.len() > 5 {
        return Err(SnapError::InvalidHand(
            "Board cannot have more than 5 cards".to_string(),
        ));
    }

    let mut used_board_cards: HashSet<Card> = HashSet::new();
    for card in board {
        if !used_board_cards.insert(*card) {
            return Err(SnapError::InvalidHand(format!(
                "Duplicate card detected: {:?}",
                card
            )));
        }
    }

    for (player_idx, range) in player_ranges.iter().enumerate() {
        if range.is_empty() {
            return Err(SnapError::InvalidRange(format!(
                "Player {} range cannot be empty",
                player_idx + 1
            )));
        }

        for (hand_idx, hand) in range.iter().enumerate() {
            if hand.len() != 2 {
                return Err(SnapError::InvalidRange(format!(
                    "Player {} range hand {} must have exactly 2 cards",
                    player_idx + 1,
                    hand_idx + 1
                )));
            }

            if hand[0] == hand[1] {
                return Err(SnapError::InvalidRange(format!(
                    "Player {} range hand {} contains duplicate cards",
                    player_idx + 1,
                    hand_idx + 1
                )));
            }
        }
    }

    if board.len() + (2 * player_ranges.len()) > 52 {
        return Err(SnapError::InvalidHand(
            "Too many players/cards for a standard 52-card deck".to_string(),
        ));
    }

    Ok(())
}

fn count_valid_range_assignments(
    player_ranges: &[Vec<Vec<Card>>],
    board: &[Card],
    max_exclusive: Option<u128>,
) -> u128 {
    let mut count: u128 = 0;
    let mut used_cards: HashSet<Card> = board.iter().copied().collect();

    fn recurse(
        idx: usize,
        player_ranges: &[Vec<Vec<Card>>],
        used_cards: &mut HashSet<Card>,
        count: &mut u128,
        max_exclusive: Option<u128>,
    ) -> bool {
        if idx == player_ranges.len() {
            *count += 1;
            return max_exclusive.is_some_and(|max| *count >= max);
        }

        for hand in &player_ranges[idx] {
            let c1 = hand[0];
            let c2 = hand[1];

            if used_cards.contains(&c1) || used_cards.contains(&c2) {
                continue;
            }

            used_cards.insert(c1);
            used_cards.insert(c2);

            if recurse(idx + 1, player_ranges, used_cards, count, max_exclusive) {
                used_cards.remove(&c1);
                used_cards.remove(&c2);
                return true;
            }

            used_cards.remove(&c1);
            used_cards.remove(&c2);
        }

        false
    }

    recurse(0, player_ranges, &mut used_cards, &mut count, max_exclusive);
    count
}

fn for_each_valid_range_assignment<F>(
    player_ranges: &[Vec<Vec<Card>>],
    board: &[Card],
    mut callback: F,
) where
    F: FnMut(&[Vec<Card>]),
{
    let mut used_cards: HashSet<Card> = board.iter().copied().collect();
    let mut selected_hands: Vec<Vec<Card>> = Vec::with_capacity(player_ranges.len());

    fn recurse<F>(
        idx: usize,
        player_ranges: &[Vec<Vec<Card>>],
        used_cards: &mut HashSet<Card>,
        selected_hands: &mut Vec<Vec<Card>>,
        callback: &mut F,
    ) where
        F: FnMut(&[Vec<Card>]),
    {
        if idx == player_ranges.len() {
            callback(selected_hands);
            return;
        }

        for hand in &player_ranges[idx] {
            let c1 = hand[0];
            let c2 = hand[1];

            if used_cards.contains(&c1) || used_cards.contains(&c2) {
                continue;
            }

            used_cards.insert(c1);
            used_cards.insert(c2);
            selected_hands.push(hand.clone());

            recurse(idx + 1, player_ranges, used_cards, selected_hands, callback);

            selected_hands.pop();
            used_cards.remove(&c1);
            used_cards.remove(&c2);
        }
    }

    recurse(
        0,
        player_ranges,
        &mut used_cards,
        &mut selected_hands,
        &mut callback,
    );
}

pub fn calculate_equity_with_ranges(
    player_ranges: &[Vec<Vec<Card>>],
    board: &[Card],
    iterations: u32,
) -> Result<Vec<f64>, SnapError> {
    validate_range_inputs(player_ranges, board)?;

    let num_players = player_ranges.len();
    let missing_board_cards = 5 - board.len();
    let remaining_after_holes = 52 - board.len() - (2 * num_players);
    let runout_combinations = combination_count(remaining_after_holes, missing_board_cards);

    if runout_combinations == 0 {
        return Err(SnapError::InvalidHand(
            "No possible board runouts for current inputs".to_string(),
        ));
    }

    let iteration_budget = default_iterations(iterations) as u128;
    let runout_combinations_u128 = runout_combinations as u128;
    let exact_assignment_limit = iteration_budget / runout_combinations_u128;
    let max_exclusive = Some(exact_assignment_limit.saturating_add(1));

    let valid_assignment_count = count_valid_range_assignments(player_ranges, board, max_exclusive);

    if valid_assignment_count == 0 {
        return Err(SnapError::InvalidRange(
            "No valid range combinations available after card collision checks".to_string(),
        ));
    }

    if valid_assignment_count <= exact_assignment_limit {
        let all = all_cards();
        let mut totals = vec![0.0_f64; num_players];

        for_each_valid_range_assignment(player_ranges, board, |selected_hands| {
            let mut used_cards: HashSet<Card> = board.iter().copied().collect();
            for hand in selected_hands {
                used_cards.insert(hand[0]);
                used_cards.insert(hand[1]);
            }

            let remaining_deck: Vec<Card> = all
                .iter()
                .copied()
                .filter(|card| !used_cards.contains(card))
                .collect();

            let equities =
                calculate_exact_equity(selected_hands, board, &remaining_deck, missing_board_cards);

            for (i, value) in equities.into_iter().enumerate() {
                totals[i] += value;
            }
        });

        return Ok(totals
            .into_iter()
            .map(|sum| sum / valid_assignment_count as f64)
            .collect());
    }

    let mut rng = rand::rng();
    let mut totals = vec![0.0_f64; num_players];
    let mut samples = 0usize;
    let sample_iterations = iteration_budget as usize;

    for _ in 0..sample_iterations {
        let mut sampled_hands = Vec::with_capacity(num_players);
        let mut found_valid_sample = false;

        for _ in 0..100 {
            sampled_hands.clear();
            let mut used_cards: HashSet<Card> = board.iter().copied().collect();
            let mut valid = true;

            for range in player_ranges {
                let hand = range
                    .choose(&mut rng)
                    .expect("range is validated as non-empty");

                if used_cards.contains(&hand[0]) || used_cards.contains(&hand[1]) {
                    valid = false;
                    break;
                }

                used_cards.insert(hand[0]);
                used_cards.insert(hand[1]);
                sampled_hands.push(hand.clone());
            }

            if valid {
                found_valid_sample = true;
                break;
            }
        }

        if !found_valid_sample {
            continue;
        }

        let equities = calculate_equity(&sampled_hands, board, 1)?;
        for (i, value) in equities.into_iter().enumerate() {
            totals[i] += value;
        }
        samples += 1;
    }

    if samples == 0 {
        return Err(SnapError::InvalidRange(
            "No valid samples generated from provided ranges".to_string(),
        ));
    }

    Ok(totals.into_iter().map(|sum| sum / samples as f64).collect())
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

    #[test]
    fn test_combination_count() {
        assert_eq!(combination_count(45, 2), 990);
        assert_eq!(combination_count(44, 1), 44);
        assert_eq!(combination_count(44, 0), 1);
        assert_eq!(combination_count(5, 6), 0);
    }

    #[test]
    fn test_calculate_equity_uses_exact_enumeration_within_budget() {
        let p1 = parse_cards("Ah Ad").unwrap();
        let p2 = parse_cards("Kh Kd").unwrap();
        let board = parse_cards("2c 7d 9h").unwrap();
        let player_hands = vec![p1, p2];

        let mut used_cards: HashSet<Card> = HashSet::new();
        for hand in &player_hands {
            for card in hand {
                used_cards.insert(*card);
            }
        }
        for card in &board {
            used_cards.insert(*card);
        }

        let remaining_deck: Vec<Card> = all_cards()
            .into_iter()
            .filter(|card| !used_cards.contains(card))
            .collect();
        let exact = calculate_exact_equity(&player_hands, &board, &remaining_deck, 2);
        let actual = calculate_equity(&player_hands, &board, 990).unwrap();

        for (expected, result) in exact.iter().zip(actual.iter()) {
            assert!((expected - result).abs() < 1e-9);
        }
    }

    #[test]
    fn test_calculate_equity_rejects_duplicate_cards() {
        let p1 = parse_cards("Ah Ad").unwrap();
        let p2 = parse_cards("Ah Kd").unwrap();

        let err = calculate_equity(&[p1, p2], &[], 100).unwrap_err();
        assert!(matches!(err, SnapError::InvalidHand(_)));
        assert!(err.to_string().contains("Duplicate card"));
    }

    #[test]
    fn test_calculate_equity_with_ranges_exact_matches_single_combo_equity() {
        let p1 = parse_cards("Ah Ad").unwrap();
        let p2 = parse_cards("Kh Kd").unwrap();
        let board = parse_cards("2c 7d 9h").unwrap();

        let exact_from_hands = calculate_equity(&[p1.clone(), p2.clone()], &board, 990).unwrap();
        let exact_from_ranges =
            calculate_equity_with_ranges(&[vec![p1], vec![p2]], &board, 990).unwrap();

        for (lhs, rhs) in exact_from_hands.iter().zip(exact_from_ranges.iter()) {
            assert!((lhs - rhs).abs() < 1e-9);
        }
    }

    #[test]
    fn test_calculate_equity_with_ranges_falls_back_to_monte_carlo() {
        let p1 = parse_cards("Ah Ad").unwrap();
        let p2 = parse_cards("Kh Kd").unwrap();
        let board = parse_cards("2c 7d 9h").unwrap();

        let eq = calculate_equity_with_ranges(&[vec![p1], vec![p2]], &board, 1).unwrap();
        assert!(eq[0] == 0.0 || eq[0] == 50.0 || eq[0] == 100.0);
        assert!((eq.iter().sum::<f64>() - 100.0).abs() < 1e-9);
    }

    #[test]
    fn test_calculate_equity_with_ranges_rejects_fully_colliding_ranges() {
        let p1 = parse_cards("Ah Ad").unwrap();
        let p2 = parse_cards("Ah Kd").unwrap();

        let err = calculate_equity_with_ranges(&[vec![p1], vec![p2]], &[], 100).unwrap_err();
        assert!(matches!(err, SnapError::InvalidRange(_)));
        assert!(err
            .to_string()
            .contains("No valid range combinations available"));
    }
}

// UniFFI scaffolding
#[cfg(feature = "ffi")]
uniffi::setup_scaffolding!();
