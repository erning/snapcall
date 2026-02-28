use crate::{
    holdem, parse_cards, Card, EquityResult, EquitySolveMode, FlatHand, Rank, Rankable, SnapError,
    Suit, Value,
};
use rand::prelude::{IndexedRandom, SliceRandom};
use std::collections::HashSet;

/// Normalized per-player input form used by the equity engine.
#[derive(Clone)]
enum PlayerSpec {
    TwoKnown([Card; 2]),
    OneKnown(Card),
    Unknown,
    Range(Vec<[Card; 2]>),
}

/// Returns a full 52-card deck in deterministic order.
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

/// Parses and validates a Hold'em board string.
fn parse_board_input(board: &str) -> Result<Vec<Card>, SnapError> {
    let cards = if board.trim().is_empty() {
        vec![]
    } else {
        parse_cards(board)?
    };

    if !matches!(cards.len(), 0 | 3 | 4 | 5) {
        return Err(SnapError::InvalidHand(format!(
            "Board must have 0, 3, 4, or 5 cards, got {}",
            cards.len()
        )));
    }

    let mut seen = HashSet::new();
    for card in &cards {
        if !seen.insert(*card) {
            return Err(SnapError::InvalidHand(format!(
                "Duplicate board card detected: {:?}",
                card
            )));
        }
    }

    Ok(cards)
}

/// Parses one player input into a PlayerSpec.
fn parse_player_input(input: &str, board_cards: &HashSet<Card>) -> Result<PlayerSpec, SnapError> {
    let trimmed = input.trim();

    if trimmed.is_empty() {
        return Ok(PlayerSpec::Unknown);
    }

    if let Ok(cards) = parse_cards(trimmed) {
        if cards.len() == 1 {
            if board_cards.contains(&cards[0]) {
                return Err(SnapError::InvalidHand(format!(
                    "Known card conflicts with board: {:?}",
                    cards[0]
                )));
            }
            return Ok(PlayerSpec::OneKnown(cards[0]));
        }
        if cards.len() == 2 {
            if cards[0] == cards[1] {
                return Err(SnapError::InvalidHand(
                    "Player hand contains duplicate cards".to_string(),
                ));
            }
            if board_cards.contains(&cards[0]) || board_cards.contains(&cards[1]) {
                return Err(SnapError::InvalidHand(format!(
                    "Player hand conflicts with board: {:?} {:?}",
                    cards[0], cards[1]
                )));
            }
            return Ok(PlayerSpec::TwoKnown([cards[0], cards[1]]));
        }

        return Err(SnapError::InvalidHand(format!(
            "Player input '{}' must be empty, 1 card, 2 cards, or a valid range",
            trimmed
        )));
    }

    let flat_hands = holdem::RangeParser::parse_many(trimmed).map_err(|e| {
        SnapError::InvalidRange(format!("Failed to parse range '{}': {:?}", trimmed, e))
    })?;

    let hands: Vec<[Card; 2]> = flat_hands
        .into_iter()
        .filter_map(|fh| {
            let mut iter = fh.iter().copied();
            let c1 = iter.next()?;
            let c2 = iter.next()?;
            if c1 == c2 || board_cards.contains(&c1) || board_cards.contains(&c2) {
                None
            } else {
                Some([c1, c2])
            }
        })
        .collect();

    if hands.is_empty() {
        return Err(SnapError::InvalidRange(format!(
            "Range '{}' produced no valid hands",
            trimmed
        )));
    }

    Ok(PlayerSpec::Range(hands))
}

/// Calculates player equities via Monte Carlo simulation.
///
/// Player input supports four forms per player:
/// - `""` (empty): both hole cards unknown
/// - one card: e.g. `"Ah"` (second hole card unknown)
/// - exact two cards: e.g. `"AhAd"` or `"Ah Ad"`
/// - range expression: e.g. `"AKs"`, `"TT+"`, `"A5s-A2s"`
///
/// Board input must contain exactly `0`, `3`, `4`, or `5` cards.
pub fn calculate_equity(
    player_hands: &[String],
    board: &str,
    iterations: u32,
) -> Result<EquityResult, SnapError> {
    if player_hands.len() < 2 {
        return Err(SnapError::InvalidHand(
            "Need at least 2 players".to_string(),
        ));
    }

    let parsed_board = parse_board_input(board)?;
    let board_set: HashSet<Card> = parsed_board.iter().copied().collect();
    let mut fixed_known_cards: HashSet<Card> = board_set.clone();
    let mut player_specs = Vec::with_capacity(player_hands.len());

    for (idx, input) in player_hands.iter().enumerate() {
        let spec = parse_player_input(input, &board_set)?;

        match &spec {
            PlayerSpec::TwoKnown([c1, c2]) => {
                if !fixed_known_cards.insert(*c1) || !fixed_known_cards.insert(*c2) {
                    return Err(SnapError::InvalidHand(format!(
                        "Duplicate known card detected for player {}",
                        idx + 1
                    )));
                }
            }
            PlayerSpec::OneKnown(card) => {
                if !fixed_known_cards.insert(*card) {
                    return Err(SnapError::InvalidHand(format!(
                        "Duplicate known card detected for player {}",
                        idx + 1
                    )));
                }
            }
            PlayerSpec::Range(_) | PlayerSpec::Unknown => {}
        }

        player_specs.push(spec);
    }

    let num_players = player_specs.len();
    if parsed_board.len() + (2 * num_players) > 52 {
        return Err(SnapError::InvalidHand(
            "Too many players/cards for a standard 52-card deck".to_string(),
        ));
    }

    let iters = if iterations == 0 {
        10_000
    } else {
        iterations as usize
    };

    let mut rng = rand::rng();
    let deck_all = all_cards();
    let mut wins: Vec<u64> = vec![0; num_players];
    let mut samples = 0usize;
    let missing_board = 5 - parsed_board.len();

    for _ in 0..iters {
        // Track all used cards (board + dealt hole cards)
        let mut used: HashSet<Card> = board_set.clone();
        for spec in &player_specs {
            match spec {
                PlayerSpec::TwoKnown([c1, c2]) => {
                    used.insert(*c1);
                    used.insert(*c2);
                }
                PlayerSpec::OneKnown(c) => {
                    used.insert(*c);
                }
                _ => {}
            }
        }

        let mut player_hole_cards: Vec<[Card; 2]> = Vec::with_capacity(num_players);
        let mut valid = true;

        // First pass: deal Range players via rejection sampling
        for spec in &player_specs {
            match spec {
                PlayerSpec::Range(options) => {
                    let mut found = false;
                    for _ in 0..100 {
                        let hand = options
                            .choose(&mut rng)
                            .expect("range is validated as non-empty");
                        if !used.contains(&hand[0]) && !used.contains(&hand[1]) {
                            used.insert(hand[0]);
                            used.insert(hand[1]);
                            player_hole_cards.push(*hand);
                            found = true;
                            break;
                        }
                    }
                    if !found {
                        valid = false;
                        break;
                    }
                }
                _ => {
                    // Placeholder; will be filled in second pass
                    // Placeholder card; will be overwritten in second pass
                    let placeholder = Card::new(Value::Two, Suit::Spade);
                    player_hole_cards.push([placeholder, placeholder]);
                }
            }
        }

        if !valid {
            continue;
        }

        // Build available deck excluding all used cards, then shuffle
        let mut available: Vec<Card> = deck_all
            .iter()
            .copied()
            .filter(|c| !used.contains(c))
            .collect();
        available.shuffle(&mut rng);

        let mut cursor = 0;

        // Second pass: fill in OneKnown and Unknown players from shuffled deck
        for (idx, spec) in player_specs.iter().enumerate() {
            match spec {
                PlayerSpec::TwoKnown(cards) => {
                    player_hole_cards[idx] = *cards;
                }
                PlayerSpec::OneKnown(known) => {
                    if cursor >= available.len() {
                        valid = false;
                        break;
                    }
                    player_hole_cards[idx] = [*known, available[cursor]];
                    cursor += 1;
                }
                PlayerSpec::Unknown => {
                    if cursor + 1 >= available.len() {
                        valid = false;
                        break;
                    }
                    player_hole_cards[idx] = [available[cursor], available[cursor + 1]];
                    cursor += 2;
                }
                PlayerSpec::Range(_) => {
                    // Already dealt in first pass
                }
            }
        }

        if !valid {
            continue;
        }

        // Fill board to 5 cards from remaining available
        let mut full_board = parsed_board.clone();
        for _ in 0..missing_board {
            if cursor >= available.len() {
                valid = false;
                break;
            }
            full_board.push(available[cursor]);
            cursor += 1;
        }

        if !valid {
            continue;
        }

        // Evaluate each player's best 7-card hand
        let ranks: Vec<Rank> = player_hole_cards
            .iter()
            .map(|hole| {
                let mut cards = Vec::with_capacity(7);
                cards.push(hole[0]);
                cards.push(hole[1]);
                cards.extend_from_slice(&full_board);
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

        samples += 1;
    }

    if samples == 0 {
        return Err(SnapError::InvalidRange(
            "No valid samples generated from provided inputs".to_string(),
        ));
    }

    let total: u64 = wins.iter().sum();
    let equities = if total == 0 {
        vec![100.0 / num_players as f64; num_players]
    } else {
        wins.iter()
            .map(|&w| (w as f64 / total as f64) * 100.0)
            .collect()
    };

    Ok(EquityResult {
        equities,
        mode: EquitySolveMode::MonteCarlo,
        samples,
    })
}
