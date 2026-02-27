use crate::combinatorics::{
    all_cards, combination_count, default_iterations, for_each_combination,
};
use crate::parsing::parse_cards;
use crate::{
    holdem, Card, EquityMath, EquityResult, EquitySolveMode, FlatHand, Rank, Rankable, SnapError,
};
use rand::prelude::IndexedRandom;
use std::collections::HashSet;

/// Evaluates a poker hand and returns its rank.
///
/// Supports 5, 6, or 7 cards and uses best-5 evaluation.
///
/// # Arguments
/// - `cards`: Hand cards (length must be 5..=7).
///
/// # Returns
/// - `Ok(Rank)` with hand rank.
/// - `Err(SnapError::InvalidHand)` if card count is outside 5..=7.
///
/// # Example
/// ```rust
/// use snapcall_core::{evaluate_hand, parse_cards};
///
/// let cards = parse_cards("As Ks Qs Js Ts").unwrap();
/// let rank = evaluate_hand(&cards).unwrap();
/// assert!(matches!(rank, snapcall_core::Rank::StraightFlush(_)));
/// ```
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

/// Evaluates equity exactly by enumerating all missing board runouts.
pub(crate) fn calculate_exact_equity(
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

/// Normalized per-player input form used by the equity engine.
#[derive(Clone)]
enum PlayerInputSpec {
    Exact([Card; 2]),
    Range(Vec<[Card; 2]>),
    OneKnown(Card),
    RandomTwo,
}

/// Parses one player input into an internal player spec.
///
/// `board_cards` is used to reject known-card conflicts early.
fn parse_player_hand_input(
    input: &str,
    board_cards: &HashSet<Card>,
) -> Result<PlayerInputSpec, SnapError> {
    let trimmed = input.trim();

    if trimmed.is_empty() {
        return Ok(PlayerInputSpec::RandomTwo);
    }

    if let Ok(cards) = parse_cards(trimmed) {
        if cards.len() == 1 {
            if board_cards.contains(&cards[0]) {
                return Err(SnapError::InvalidHand(format!(
                    "Known card conflicts with board: {:?}",
                    cards[0]
                )));
            }
            return Ok(PlayerInputSpec::OneKnown(cards[0]));
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
            return Ok(PlayerInputSpec::Exact([cards[0], cards[1]]));
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

    Ok(PlayerInputSpec::Range(hands))
}

/// Parses and validates a Hold'em board string.
///
/// Accepts only 0/3/4/5 cards and rejects duplicate cards.
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

/// Calculates player equities from string inputs.
///
/// Player input supports four forms per player:
/// - `""` (empty): both hole cards unknown
/// - one card: e.g. `"Ah"` (second hole card unknown)
/// - exact two cards: e.g. `"AhAd"` or `"Ah Ad"`
/// - range expression: e.g. `"AKs"`, `"TT+"`, `"A5s-A2s"`
///
/// Board input must contain exactly `0`, `3`, `4`, or `5` cards.
///
/// The solver uses exact enumeration when the total state space is within
/// `iterations` budget, otherwise Monte Carlo approximation.
/// In Monte Carlo mode, unknown hole cards are dealt directly from deck state.
///
/// # Arguments
/// - `player_hands`: One string per player.
/// - `board`: Community card string (`""`, flop, turn, or river).
/// - `iterations`: Enumeration budget and MC sample count fallback.
///
/// # Returns
/// - `Ok(Vec<f64>)`: Equity percentages per player, summing to `100.0`.
/// - `Err(SnapError)`: Invalid card/range/board or impossible configuration.
///
/// # Example
/// ```rust
/// use snapcall_core::calculate_equity;
///
/// let players = vec!["AhAd".to_string(), "KhKd".to_string()];
/// let equities = calculate_equity(&players, "2c 7d 9h", 10_000).unwrap();
/// assert_eq!(equities.len(), 2);
/// ```
pub fn calculate_equity(
    player_hands: &[String],
    board: &str,
    iterations: u32,
) -> Result<Vec<f64>, SnapError> {
    Ok(calculate_equity_with_math(player_hands, board, iterations)?.equities)
}

/// Calculates player equities and returns computation metadata.
///
/// This is the same solver as [`calculate_equity`], but includes mode and
/// state-space information useful for CLI/debug output.
pub fn calculate_equity_with_math(
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
        let spec = parse_player_hand_input(input, &board_set)?;

        match &spec {
            PlayerInputSpec::Exact([c1, c2]) => {
                if !fixed_known_cards.insert(*c1) || !fixed_known_cards.insert(*c2) {
                    return Err(SnapError::InvalidHand(format!(
                        "Duplicate known card detected for player {}",
                        idx + 1
                    )));
                }
            }
            PlayerInputSpec::OneKnown(card) => {
                if !fixed_known_cards.insert(*card) {
                    return Err(SnapError::InvalidHand(format!(
                        "Duplicate known card detected for player {}",
                        idx + 1
                    )));
                }
            }
            PlayerInputSpec::Range(_) | PlayerInputSpec::RandomTwo => {}
        }

        player_specs.push(spec);
    }

    if player_specs
        .iter()
        .all(|spec| matches!(spec, PlayerInputSpec::Exact(_) | PlayerInputSpec::Range(_)))
    {
        let player_ranges: Vec<Vec<Vec<Card>>> = player_specs
            .iter()
            .map(|spec| match spec {
                PlayerInputSpec::Exact([c1, c2]) => vec![vec![*c1, *c2]],
                PlayerInputSpec::Range(hands) => hands.iter().map(|h| vec![h[0], h[1]]).collect(),
                PlayerInputSpec::OneKnown(_) | PlayerInputSpec::RandomTwo => unreachable!(),
            })
            .collect();

        return calculate_equity_from_ranges_with_math(&player_ranges, &parsed_board, iterations);
    }

    calculate_equity_with_dynamic_players_with_math(&player_specs, &parsed_board, iterations)
}

/// Counts valid full hand assignments for mixed player specs.
///
/// Stops early if `max_exclusive` is reached.
fn count_valid_assignments_for_specs(
    player_specs: &[PlayerInputSpec],
    board: &[Card],
    max_exclusive: Option<u128>,
) -> u128 {
    let deck = all_cards();
    let mut count: u128 = 0;
    let mut used_cards: HashSet<Card> = board.iter().copied().collect();

    fn recurse(
        idx: usize,
        player_specs: &[PlayerInputSpec],
        deck: &[Card],
        used_cards: &mut HashSet<Card>,
        count: &mut u128,
        max_exclusive: Option<u128>,
    ) -> bool {
        if idx == player_specs.len() {
            *count += 1;
            return max_exclusive.is_some_and(|max| *count >= max);
        }

        match &player_specs[idx] {
            PlayerInputSpec::Exact([c1, c2]) => {
                if used_cards.contains(c1) || used_cards.contains(c2) {
                    return false;
                }

                used_cards.insert(*c1);
                used_cards.insert(*c2);
                let reached = recurse(
                    idx + 1,
                    player_specs,
                    deck,
                    used_cards,
                    count,
                    max_exclusive,
                );
                used_cards.remove(c1);
                used_cards.remove(c2);
                reached
            }
            PlayerInputSpec::Range(hands) => {
                for hand in hands {
                    let c1 = hand[0];
                    let c2 = hand[1];

                    if used_cards.contains(&c1) || used_cards.contains(&c2) {
                        continue;
                    }

                    used_cards.insert(c1);
                    used_cards.insert(c2);
                    if recurse(
                        idx + 1,
                        player_specs,
                        deck,
                        used_cards,
                        count,
                        max_exclusive,
                    ) {
                        used_cards.remove(&c1);
                        used_cards.remove(&c2);
                        return true;
                    }
                    used_cards.remove(&c1);
                    used_cards.remove(&c2);
                }
                false
            }
            PlayerInputSpec::OneKnown(known) => {
                if used_cards.contains(known) {
                    return false;
                }

                used_cards.insert(*known);
                for second in deck {
                    if *second == *known || used_cards.contains(second) {
                        continue;
                    }

                    used_cards.insert(*second);
                    if recurse(
                        idx + 1,
                        player_specs,
                        deck,
                        used_cards,
                        count,
                        max_exclusive,
                    ) {
                        used_cards.remove(second);
                        used_cards.remove(known);
                        return true;
                    }
                    used_cards.remove(second);
                }
                used_cards.remove(known);
                false
            }
            PlayerInputSpec::RandomTwo => {
                for i in 0..deck.len() {
                    let c1 = deck[i];
                    if used_cards.contains(&c1) {
                        continue;
                    }

                    used_cards.insert(c1);
                    for c2 in deck.iter().skip(i + 1) {
                        if used_cards.contains(c2) {
                            continue;
                        }

                        used_cards.insert(*c2);
                        if recurse(
                            idx + 1,
                            player_specs,
                            deck,
                            used_cards,
                            count,
                            max_exclusive,
                        ) {
                            used_cards.remove(c2);
                            used_cards.remove(&c1);
                            return true;
                        }
                        used_cards.remove(c2);
                    }
                    used_cards.remove(&c1);
                }
                false
            }
        }
    }

    recurse(
        0,
        player_specs,
        &deck,
        &mut used_cards,
        &mut count,
        max_exclusive,
    );
    count
}

/// Enumerates every valid full hand assignment for mixed player specs.
fn for_each_valid_assignment_for_specs<F>(
    player_specs: &[PlayerInputSpec],
    board: &[Card],
    mut callback: F,
) where
    F: FnMut(&[[Card; 2]]),
{
    let deck = all_cards();
    let mut used_cards: HashSet<Card> = board.iter().copied().collect();
    let mut selected_hands: Vec<[Card; 2]> = Vec::with_capacity(player_specs.len());

    fn recurse<F>(
        idx: usize,
        player_specs: &[PlayerInputSpec],
        deck: &[Card],
        used_cards: &mut HashSet<Card>,
        selected_hands: &mut Vec<[Card; 2]>,
        callback: &mut F,
    ) where
        F: FnMut(&[[Card; 2]]),
    {
        if idx == player_specs.len() {
            callback(selected_hands);
            return;
        }

        match &player_specs[idx] {
            PlayerInputSpec::Exact([c1, c2]) => {
                if used_cards.contains(c1) || used_cards.contains(c2) {
                    return;
                }

                used_cards.insert(*c1);
                used_cards.insert(*c2);
                selected_hands.push([*c1, *c2]);
                recurse(
                    idx + 1,
                    player_specs,
                    deck,
                    used_cards,
                    selected_hands,
                    callback,
                );
                selected_hands.pop();
                used_cards.remove(c1);
                used_cards.remove(c2);
            }
            PlayerInputSpec::Range(hands) => {
                for hand in hands {
                    let c1 = hand[0];
                    let c2 = hand[1];
                    if used_cards.contains(&c1) || used_cards.contains(&c2) {
                        continue;
                    }

                    used_cards.insert(c1);
                    used_cards.insert(c2);
                    selected_hands.push([c1, c2]);
                    recurse(
                        idx + 1,
                        player_specs,
                        deck,
                        used_cards,
                        selected_hands,
                        callback,
                    );
                    selected_hands.pop();
                    used_cards.remove(&c1);
                    used_cards.remove(&c2);
                }
            }
            PlayerInputSpec::OneKnown(known) => {
                if used_cards.contains(known) {
                    return;
                }

                used_cards.insert(*known);
                for second in deck {
                    if *second == *known || used_cards.contains(second) {
                        continue;
                    }

                    used_cards.insert(*second);
                    selected_hands.push([*known, *second]);
                    recurse(
                        idx + 1,
                        player_specs,
                        deck,
                        used_cards,
                        selected_hands,
                        callback,
                    );
                    selected_hands.pop();
                    used_cards.remove(second);
                }
                used_cards.remove(known);
            }
            PlayerInputSpec::RandomTwo => {
                for i in 0..deck.len() {
                    let c1 = deck[i];
                    if used_cards.contains(&c1) {
                        continue;
                    }

                    used_cards.insert(c1);
                    for c2 in deck.iter().skip(i + 1) {
                        if used_cards.contains(c2) {
                            continue;
                        }

                        used_cards.insert(*c2);
                        selected_hands.push([c1, *c2]);
                        recurse(
                            idx + 1,
                            player_specs,
                            deck,
                            used_cards,
                            selected_hands,
                            callback,
                        );
                        selected_hands.pop();
                        used_cards.remove(c2);
                    }
                    used_cards.remove(&c1);
                }
            }
        }
    }

    recurse(
        0,
        player_specs,
        &deck,
        &mut used_cards,
        &mut selected_hands,
        &mut callback,
    );
}

/// Computes exact equity for mixed player specs.
fn calculate_exact_equity_for_specs(
    player_specs: &[PlayerInputSpec],
    board: &[Card],
    assignment_count: u128,
) -> Vec<f64> {
    let all = all_cards();
    let num_players = player_specs.len();
    let missing_board_cards = 5 - board.len();
    let mut totals = vec![0.0_f64; num_players];

    for_each_valid_assignment_for_specs(player_specs, board, |selected_hands| {
        let mut used_cards: HashSet<Card> = board.iter().copied().collect();
        let mut player_hands = Vec::with_capacity(selected_hands.len());

        for hand in selected_hands {
            used_cards.insert(hand[0]);
            used_cards.insert(hand[1]);
            player_hands.push(vec![hand[0], hand[1]]);
        }

        let remaining_deck: Vec<Card> = all
            .iter()
            .copied()
            .filter(|card| !used_cards.contains(card))
            .collect();

        let equities =
            calculate_exact_equity(&player_hands, board, &remaining_deck, missing_board_cards);
        for (i, value) in equities.into_iter().enumerate() {
            totals[i] += value;
        }
    });

    totals
        .into_iter()
        .map(|sum| sum / assignment_count as f64)
        .collect()
}

/// Samples one valid set of per-player hands for Monte Carlo simulation.
///
/// Range players are sampled from their range; one-card and random players
/// are left partially/fully unknown so MonteCarloGame can deal from deck.
fn sample_monte_carlo_hands_for_specs(
    player_specs: &[PlayerInputSpec],
    board: &[Card],
    rng: &mut rand::rngs::ThreadRng,
) -> Option<Vec<rs_poker::core::Hand>> {
    for _ in 0..100 {
        let mut used_cards: HashSet<Card> = board.iter().copied().collect();
        let mut hands = Vec::with_capacity(player_specs.len());
        let mut valid = true;

        for spec in player_specs {
            let mut hand = match spec {
                PlayerInputSpec::Exact([c1, c2]) => {
                    if used_cards.contains(c1) || used_cards.contains(c2) {
                        valid = false;
                        break;
                    }
                    used_cards.insert(*c1);
                    used_cards.insert(*c2);
                    rs_poker::core::Hand::new_with_cards(vec![*c1, *c2])
                }
                PlayerInputSpec::Range(options) => {
                    let sampled = options
                        .choose(rng)
                        .expect("range is validated as non-empty");
                    if used_cards.contains(&sampled[0]) || used_cards.contains(&sampled[1]) {
                        valid = false;
                        break;
                    }
                    used_cards.insert(sampled[0]);
                    used_cards.insert(sampled[1]);
                    rs_poker::core::Hand::new_with_cards(vec![sampled[0], sampled[1]])
                }
                PlayerInputSpec::OneKnown(card) => {
                    if used_cards.contains(card) {
                        valid = false;
                        break;
                    }
                    used_cards.insert(*card);
                    rs_poker::core::Hand::new_with_cards(vec![*card])
                }
                PlayerInputSpec::RandomTwo => rs_poker::core::Hand::default(),
            };

            for board_card in board {
                hand.insert(*board_card);
            }
            hands.push(hand);
        }

        if valid {
            return Some(hands);
        }
    }

    None
}

/// Runs Monte Carlo equity for mixed player specs.
fn calculate_monte_carlo_equity_for_specs(
    player_specs: &[PlayerInputSpec],
    board: &[Card],
    iterations: usize,
) -> Result<(Vec<f64>, usize), SnapError> {
    let mut rng = rand::rng();
    let mut wins: Vec<u64> = vec![0; player_specs.len()];
    let mut samples = 0usize;

    for _ in 0..iterations {
        let Some(hands) = sample_monte_carlo_hands_for_specs(player_specs, board, &mut rng) else {
            continue;
        };

        let mut game = holdem::MonteCarloGame::new(hands)
            .map_err(|e| SnapError::InvalidHand(e.to_string()))?;
        let (winners, _) = game.simulate();

        for idx in winners.ones() {
            wins[idx] += 1;
        }
        samples += 1;
    }

    if samples == 0 {
        return Err(SnapError::InvalidRange(
            "No valid samples generated from provided inputs".to_string(),
        ));
    }

    let total: u64 = wins.iter().sum();
    if total == 0 {
        let n = player_specs.len();
        return Ok((vec![100.0 / n as f64; n], samples));
    }

    Ok((
        wins.iter()
            .map(|&w| (w as f64 / total as f64) * 100.0)
            .collect(),
        samples,
    ))
}

/// Solves equity for inputs containing unknown-hole players.
///
/// Uses exact enumeration when affordable, otherwise Monte Carlo.
fn calculate_equity_with_dynamic_players_with_math(
    player_specs: &[PlayerInputSpec],
    board: &[Card],
    iterations: u32,
) -> Result<EquityResult, SnapError> {
    let num_players = player_specs.len();

    if board.len() + (2 * num_players) > 52 {
        return Err(SnapError::InvalidHand(
            "Too many players/cards for a standard 52-card deck".to_string(),
        ));
    }

    let missing_board_cards = 5 - board.len();
    let remaining_after_holes = 52 - board.len() - (2 * num_players);
    let runout_combinations = combination_count(remaining_after_holes, missing_board_cards);

    if runout_combinations == 0 {
        return Err(SnapError::InvalidHand(
            "No possible board runouts for current inputs".to_string(),
        ));
    }

    let iteration_budget_usize = default_iterations(iterations);
    let iteration_budget = iteration_budget_usize as u128;
    let exact_assignment_limit = iteration_budget / runout_combinations as u128;
    let max_exclusive = Some(exact_assignment_limit.saturating_add(1));
    let valid_assignment_count =
        count_valid_assignments_for_specs(player_specs, board, max_exclusive);

    if valid_assignment_count == 0 {
        return Err(SnapError::InvalidRange(
            "No valid hand assignments available after card collision checks".to_string(),
        ));
    }

    if valid_assignment_count <= exact_assignment_limit {
        let equities =
            calculate_exact_equity_for_specs(player_specs, board, valid_assignment_count);
        let total_states = valid_assignment_count.saturating_mul(runout_combinations as u128);
        return Ok(EquityResult {
            equities,
            math: EquityMath {
                mode: EquitySolveMode::ExactEnumeration,
                iteration_budget: iteration_budget_usize,
                assignment_combinations: valid_assignment_count,
                board_runout_combinations: runout_combinations as u128,
                total_states,
                samples_used: total_states.min(usize::MAX as u128) as usize,
            },
        });
    }

    let (equities, samples_used) =
        calculate_monte_carlo_equity_for_specs(player_specs, board, iteration_budget_usize)?;
    Ok(EquityResult {
        equities,
        math: EquityMath {
            mode: EquitySolveMode::MonteCarlo,
            iteration_budget: iteration_budget_usize,
            assignment_combinations: valid_assignment_count,
            board_runout_combinations: runout_combinations as u128,
            total_states: valid_assignment_count.saturating_mul(runout_combinations as u128),
            samples_used,
        },
    })
}

/// Solves equity for fully specified per-player two-card hands.
fn calculate_equity_from_hands(
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

/// Validates normalized per-player range inputs.
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

/// Counts valid range assignments across players, respecting collisions.
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

/// Enumerates valid one-hand-per-player assignments from ranges.
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

/// Solves equity for range-only inputs (no dynamic unknown-hole players).
fn calculate_equity_from_ranges_with_math(
    player_ranges: &[Vec<Vec<Card>>],
    board: &[Card],
    iterations: u32,
) -> Result<EquityResult, SnapError> {
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

    let iteration_budget_usize = default_iterations(iterations);
    let iteration_budget = iteration_budget_usize as u128;
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

        let equities: Vec<f64> = totals
            .into_iter()
            .map(|sum| sum / valid_assignment_count as f64)
            .collect();
        let total_states = valid_assignment_count.saturating_mul(runout_combinations_u128);
        return Ok(EquityResult {
            equities,
            math: EquityMath {
                mode: EquitySolveMode::ExactEnumeration,
                iteration_budget: iteration_budget_usize,
                assignment_combinations: valid_assignment_count,
                board_runout_combinations: runout_combinations_u128,
                total_states,
                samples_used: total_states.min(usize::MAX as u128) as usize,
            },
        });
    }

    let mut rng = rand::rng();
    let mut totals = vec![0.0_f64; num_players];
    let mut samples = 0usize;
    let sample_iterations = iteration_budget_usize;

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

        let equities = calculate_equity_from_hands(&sampled_hands, board, 1)?;
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

    Ok(EquityResult {
        equities: totals.into_iter().map(|sum| sum / samples as f64).collect(),
        math: EquityMath {
            mode: EquitySolveMode::MonteCarlo,
            iteration_budget: iteration_budget_usize,
            assignment_combinations: valid_assignment_count,
            board_runout_combinations: runout_combinations_u128,
            total_states: valid_assignment_count.saturating_mul(runout_combinations_u128),
            samples_used: samples,
        },
    })
}

/// Alias for [`calculate_equity`].
///
/// Kept for API compatibility with existing range-oriented call sites.
/// Semantics are identical to `calculate_equity`.
///
/// # Arguments
/// - `player_inputs`: One string per player.
/// - `board`: Community card string (`""`, flop, turn, or river).
/// - `iterations`: Enumeration budget and MC sample count fallback.
pub fn calculate_equity_with_ranges(
    player_inputs: &[String],
    board: &str,
    iterations: u32,
) -> Result<Vec<f64>, SnapError> {
    calculate_equity(player_inputs, board, iterations)
}
