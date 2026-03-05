use std::collections::HashSet;

use rand::prelude::{IndexedRandom, SliceRandom};
use rs_poker::core::{Card, Deck, Rank, Rankable};

use crate::input::HoleCardsInput;
use crate::types::{EquityEstimateMode, EquityResult, SnapError};

/// Monte Carlo equity estimation via random sampling.
///
/// Deals random cards to incomplete hands, evaluates all players,
/// and accumulates win counts over `iterations` samples.
pub(crate) fn estimate_equity_monte_carlo(
    board_cards: &[Card],
    board_set: &HashSet<Card>,
    players: &[HoleCardsInput],
    iterations: usize,
) -> Result<EquityResult, SnapError> {
    let num_players = players.len();
    let full_deck: Vec<Card> = Deck::default().into_iter().collect();
    let mut rng = rand::rng();
    let mut wins: Vec<usize> = vec![0; num_players];
    let mut samples = 0usize;
    let missing_board = 5 - board_cards.len();

    // Pre-collect fixed cards (board + exact/partial) to avoid recomputing each iteration
    let mut fixed_cards: Vec<Card> = board_set.iter().copied().collect();
    for p in players {
        match p {
            HoleCardsInput::Exact(hand) => {
                for c in hand.iter() {
                    fixed_cards.push(*c);
                }
            }
            HoleCardsInput::Partial(c) => {
                fixed_cards.push(*c);
            }
            _ => {}
        }
    }

    // Pre-allocate reusable buffers outside the hot loop
    let mut used: HashSet<Card> = HashSet::with_capacity(fixed_cards.len() + num_players * 2);
    let mut available: Vec<Card> = Vec::with_capacity(full_deck.len());
    let mut hole_cards: Vec<[Card; 2]> = vec![[full_deck[0], full_deck[0]]; num_players];
    let mut full_board: Vec<Card> = Vec::with_capacity(5);
    let mut seven_cards: Vec<Card> = Vec::with_capacity(7);
    let mut ranks: Vec<Rank> = Vec::with_capacity(num_players);

    'outer: for _ in 0..iterations {
        // Reset used set and fill with fixed cards
        used.clear();
        used.extend(&fixed_cards);

        // First pass: deal Range players via rejection sampling
        for (idx, p) in players.iter().enumerate() {
            if let HoleCardsInput::Range(hands) = p {
                let mut found = false;
                for _ in 0..100 {
                    let Some(hand) = hands.choose(&mut rng) else {
                        continue 'outer;
                    };
                    let mut iter = hand.iter().copied();
                    let (Some(c1), Some(c2)) = (iter.next(), iter.next()) else {
                        continue 'outer;
                    };
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

        // Rebuild available cards from full deck, reusing the Vec
        available.clear();
        available.extend(full_deck.iter().copied().filter(|c| !used.contains(c)));
        available.shuffle(&mut rng);
        let mut cursor = 0;

        // Second pass: deal non-Range players
        let mut valid = true;
        for (idx, p) in players.iter().enumerate() {
            match p {
                HoleCardsInput::Exact(hand) => {
                    let mut iter = hand.iter().copied();
                    let (Some(c1), Some(c2)) = (iter.next(), iter.next()) else {
                        valid = false;
                        break;
                    };
                    hole_cards[idx] = [c1, c2];
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

        // Complete the board, reusing the Vec
        full_board.clear();
        full_board.extend_from_slice(board_cards);
        for _ in 0..missing_board {
            if cursor >= available.len() {
                continue 'outer;
            }
            full_board.push(available[cursor]);
            cursor += 1;
        }

        // Evaluate hands using reusable buffers
        ranks.clear();
        for hole in hole_cards.iter() {
            seven_cards.clear();
            seven_cards.extend_from_slice(hole);
            seven_cards.extend_from_slice(&full_board);
            ranks.push(seven_cards.as_slice().rank());
        }

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

    let total: usize = wins.iter().sum();
    let equities = if total == 0 {
        vec![100.0 / num_players as f64; num_players]
    } else {
        wins.iter()
            .map(|&w| (w as f64 / total as f64) * 100.0)
            .collect()
    };

    Ok(EquityResult {
        equities,
        mode: EquityEstimateMode::MonteCarlo,
        samples,
    })
}
