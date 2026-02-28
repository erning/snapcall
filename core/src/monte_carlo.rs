use std::collections::HashSet;

use rand::prelude::{IndexedRandom, SliceRandom};
use rs_poker::core::{Card, Deck, FlatHand, Rankable};

use crate::input::HoleCardsInput;
use crate::types::{EquityEstimateMode, EquityResult, SnapError};

pub(crate) fn estimate_equity_monte_carlo(
    board_cards: &[Card],
    board_set: &HashSet<Card>,
    players: &[HoleCardsInput],
    iterations: usize,
) -> Result<EquityResult, SnapError> {
    let num_players = players.len();
    let full_deck: Vec<Card> = Deck::default().into_iter().collect();
    let mut rng = rand::rng();
    let mut wins: Vec<u64> = vec![0; num_players];
    let mut samples = 0usize;
    let missing_board = 5 - board_cards.len();

    'outer: for _ in 0..iterations {
        let mut used: HashSet<Card> = board_set.clone();
        for p in players {
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
        let mut full_board = board_cards.to_vec();
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
        mode: EquityEstimateMode::MonteCarlo,
        samples,
    })
}
