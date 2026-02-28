use crate::{
    BoardCardsInput, Card, Deck, EquityResult, EquitySolveMode, FlatHand, HoleCardsInput, Rankable,
    SnapError,
};
use rand::prelude::{IndexedRandom, SliceRandom};
use std::collections::HashSet;

/// Estimates hero's equity against one or more villains via Monte Carlo simulation.
///
/// # Arguments
/// - `board`: public cards (0, 3, 4, or 5 cards), e.g. `"AhKdQc"`
/// - `hero`: hero's hole cards, range, or `""` for unknown
/// - `villains`: each villain's hole cards, range, or `""` for unknown
/// - `iterations`: Monte Carlo sample count; 0 defaults to 10,000
///
/// # Returns
/// `equities[0]` is hero's equity percentage. All equities sum to 100.0.
pub fn estimate_equity(
    board: &str,
    hero: &str,
    villains: &[&str],
    iterations: usize,
) -> Result<EquityResult, SnapError> {
    if villains.is_empty() {
        return Err(SnapError::InvalidHand(
            "Need at least 1 villain".to_string(),
        ));
    }

    // --- Parse inputs ---
    let board_input: BoardCardsInput = board.parse()?;
    let board_cards = board_input.cards();
    let board_set: HashSet<Card> = board_cards.iter().copied().collect();

    let mut players: Vec<HoleCardsInput> = Vec::with_capacity(1 + villains.len());
    players.push(hero.parse()?);
    for v in villains {
        players.push(v.parse()?);
    }

    let num_players = players.len();
    if board_cards.len() + 2 * num_players > 52 {
        return Err(SnapError::InvalidHand(
            "Too many players/cards for a 52-card deck".to_string(),
        ));
    }

    // --- Validate known cards & pre-filter ranges ---
    let mut fixed_known: HashSet<Card> = board_set.clone();

    for (idx, p) in players.iter_mut().enumerate() {
        match p {
            HoleCardsInput::Exact(hand) => {
                let cards: Vec<Card> = hand.iter().copied().collect();
                if cards[0] == cards[1] {
                    return Err(SnapError::InvalidHand(
                        "Player hand contains duplicate cards".to_string(),
                    ));
                }
                for &c in &cards {
                    if board_set.contains(&c) {
                        return Err(SnapError::InvalidHand(format!(
                            "Player {} hand conflicts with board",
                            idx + 1
                        )));
                    }
                    if !fixed_known.insert(c) {
                        return Err(SnapError::InvalidHand(format!(
                            "Duplicate known card for player {}",
                            idx + 1
                        )));
                    }
                }
            }
            HoleCardsInput::Partial(card) => {
                if board_set.contains(card) {
                    return Err(SnapError::InvalidHand(format!(
                        "Player {} card conflicts with board",
                        idx + 1
                    )));
                }
                if !fixed_known.insert(*card) {
                    return Err(SnapError::InvalidHand(format!(
                        "Duplicate known card for player {}",
                        idx + 1
                    )));
                }
            }
            HoleCardsInput::Range(ref mut hands) => {
                hands.retain(|fh| {
                    let mut iter = fh.iter();
                    let c1 = match iter.next() {
                        Some(c) => *c,
                        None => return false,
                    };
                    let c2 = match iter.next() {
                        Some(c) => *c,
                        None => return false,
                    };
                    c1 != c2 && !board_set.contains(&c1) && !board_set.contains(&c2)
                });
                if hands.is_empty() {
                    return Err(SnapError::InvalidRange(
                        "Range produced no valid hands after filtering".to_string(),
                    ));
                }
            }
            HoleCardsInput::Unknown => {}
        }
    }

    // --- Monte Carlo simulation ---
    let iters = if iterations == 0 { 10_000 } else { iterations };
    let full_deck: Vec<Card> = Deck::default().into_iter().collect();
    let mut rng = rand::rng();
    let mut wins: Vec<u64> = vec![0; num_players];
    let mut samples = 0usize;
    let missing_board = 5 - board_cards.len();

    'outer: for _ in 0..iters {
        let mut used: HashSet<Card> = board_set.clone();
        for p in &players {
            match p {
                HoleCardsInput::Exact(hand) => {
                    for c in hand.iter() {
                        used.insert(*c);
                    }
                }
                HoleCardsInput::Partial(c) => {
                    used.insert(*c);
                }
                _ => {}
            }
        }

        // First pass: deal Range players via rejection sampling
        let mut hole_cards: Vec<[Card; 2]> = vec![[full_deck[0], full_deck[0]]; num_players];

        for (idx, p) in players.iter().enumerate() {
            if let HoleCardsInput::Range(hands) = p {
                let mut found = false;
                for _ in 0..100 {
                    let hand = hands.choose(&mut rng).expect("non-empty after filtering");
                    let mut iter = hand.iter().copied();
                    let c1 = iter.next().unwrap();
                    let c2 = iter.next().unwrap();
                    if !used.contains(&c1) && !used.contains(&c2) {
                        used.insert(c1);
                        used.insert(c2);
                        hole_cards[idx] = [c1, c2];
                        found = true;
                        break;
                    }
                }
                if !found {
                    continue 'outer;
                }
            }
        }

        // Shuffle available cards
        let mut available: Vec<Card> = full_deck
            .iter()
            .copied()
            .filter(|c| !used.contains(c))
            .collect();
        available.shuffle(&mut rng);
        let mut cursor = 0;

        // Second pass: deal non-Range players
        let mut valid = true;
        for (idx, p) in players.iter().enumerate() {
            match p {
                HoleCardsInput::Exact(hand) => {
                    let mut iter = hand.iter().copied();
                    hole_cards[idx] = [iter.next().unwrap(), iter.next().unwrap()];
                }
                HoleCardsInput::Partial(known) => {
                    if cursor >= available.len() {
                        valid = false;
                        break;
                    }
                    hole_cards[idx] = [*known, available[cursor]];
                    cursor += 1;
                }
                HoleCardsInput::Unknown => {
                    if cursor + 1 >= available.len() {
                        valid = false;
                        break;
                    }
                    hole_cards[idx] = [available[cursor], available[cursor + 1]];
                    cursor += 2;
                }
                HoleCardsInput::Range(_) => {} // already dealt
            }
        }
        if !valid {
            continue;
        }

        // Complete the board
        let mut full_board = board_cards.clone();
        for _ in 0..missing_board {
            if cursor >= available.len() {
                continue 'outer;
            }
            full_board.push(available[cursor]);
            cursor += 1;
        }

        // Evaluate hands
        let ranks: Vec<_> = hole_cards
            .iter()
            .map(|hole| {
                let mut cards = Vec::with_capacity(7);
                cards.extend_from_slice(hole);
                cards.extend_from_slice(&full_board);
                FlatHand::new_with_cards(cards).rank()
            })
            .collect();

        if let Some(best) = ranks.iter().max() {
            for (i, r) in ranks.iter().enumerate() {
                if r == best {
                    wins[i] += 1;
                }
            }
        }

        samples += 1;
    }

    if samples == 0 {
        return Err(SnapError::InvalidRange(
            "No valid samples generated".to_string(),
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
