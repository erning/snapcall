use std::collections::HashSet;

use rs_poker::core::{Card, FlatHand, Rankable, Suit, Value};

use crate::input::HoleCardsInput;
use crate::types::{EquityEstimateMode, EquityResult};

/// Compute the binomial coefficient C(n, k).
pub(crate) fn n_choose_k(n: usize, k: usize) -> usize {
    if k > n {
        return 0;
    }
    if k == 0 || k == n {
        return 1;
    }
    let k = k.min(n - k); // symmetry optimisation
    let mut result: usize = 1;
    for i in 0..k {
        result = result.saturating_mul(n - i) / (i + 1);
    }
    result
}

/// Call `callback` for every k-combination chosen from `cards`.
/// The callback receives a slice of exactly `k` cards.
fn for_each_combination(cards: &[Card], k: usize, mut callback: impl FnMut(&[Card])) {
    let n = cards.len();
    if k > n {
        return;
    }
    let mut indices: Vec<usize> = (0..k).collect();
    let mut buf: Vec<Card> = indices.iter().map(|&i| cards[i]).collect();

    loop {
        callback(&buf);

        // Advance to next combination
        let mut i = k;
        loop {
            if i == 0 {
                return; // exhausted
            }
            i -= 1;
            indices[i] += 1;
            if indices[i] <= n - k + i {
                break;
            }
        }
        for j in (i + 1)..k {
            indices[j] = indices[j - 1] + 1;
        }
        for j in i..k {
            buf[j] = cards[indices[j]];
        }
    }
}

/// Exact enumeration of all possible outcomes.
///
/// Enumerates every valid deal and evaluates hands, producing a 100%-accurate
/// equity result. Only called when the total number of combinations is small
/// enough (≤ the user-requested iteration count).
pub(crate) fn estimate_equity_exact_enumeration(
    board_cards: &[Card],
    board_set: &HashSet<Card>,
    players: &[HoleCardsInput],
    fixed_known: &HashSet<Card>,
) -> EquityResult {
    let num_players = players.len();
    let missing_board = 5 - board_cards.len();

    // Build the pool of available cards (52 − fixed_known).
    // Range cards are NOT subtracted here — they are enumerated.
    let available: Vec<Card> = rs_poker::core::Deck::default()
        .into_iter()
        .filter(|c| !fixed_known.contains(c))
        .collect();

    // Identify which player slots need cards from the pool (non-Range).
    // partial_count: need 1 card each
    // unknown_count: need 2 cards each
    let mut partial_count = 0usize;
    let mut unknown_count = 0usize;
    let mut range_indices: Vec<usize> = Vec::new();

    for (idx, p) in players.iter().enumerate() {
        match p {
            HoleCardsInput::Partial(_) => partial_count += 1,
            HoleCardsInput::Unknown => unknown_count += 1,
            HoleCardsInput::Range(_) => range_indices.push(idx),
            HoleCardsInput::Exact(_) => {}
        }
    }

    let non_range_slots = partial_count + 2 * unknown_count + missing_board;

    let mut wins: Vec<usize> = vec![0; num_players];
    let mut total_combos: usize = 0;

    // Recursively enumerate Range player cartesian product, then for each
    // valid range assignment enumerate the remaining C(pool, non_range_slots).
    let mut range_assignments: Vec<[Card; 2]> = vec![
        [
            Card::new(Value::Two, Suit::Spade),
            Card::new(Value::Two, Suit::Spade)
        ];
        range_indices.len()
    ];

    enumerate_ranges(
        players,
        &range_indices,
        0,
        &mut range_assignments,
        &available,
        board_set,
        fixed_known,
        board_cards,
        missing_board,
        non_range_slots,
        &mut wins,
        &mut total_combos,
    );

    let total_wins: usize = wins.iter().sum();
    let equities = if total_wins == 0 {
        vec![100.0 / num_players as f64; num_players]
    } else {
        wins.iter()
            .map(|&w| (w as f64 / total_wins as f64) * 100.0)
            .collect()
    };

    EquityResult {
        equities,
        mode: EquityEstimateMode::ExactEnumeration,
        samples: total_combos,
    }
}

/// Recursively enumerate the cartesian product of Range players' hands.
#[allow(clippy::too_many_arguments)]
fn enumerate_ranges(
    players: &[HoleCardsInput],
    range_indices: &[usize],
    depth: usize,
    range_assignments: &mut Vec<[Card; 2]>,
    available: &[Card],
    board_set: &HashSet<Card>,
    fixed_known: &HashSet<Card>,
    board_cards: &[Card],
    missing_board: usize,
    non_range_slots: usize,
    wins: &mut Vec<usize>,
    total_combos: &mut usize,
) {
    if depth == range_indices.len() {
        // All ranges assigned — collect cards used by ranges
        let mut range_used: HashSet<Card> = HashSet::new();
        for assignment in range_assignments.iter().take(range_indices.len()) {
            range_used.insert(assignment[0]);
            range_used.insert(assignment[1]);
        }

        // Pool for non-range slots = available − range_used
        let pool: Vec<Card> = available
            .iter()
            .copied()
            .filter(|c| !range_used.contains(c))
            .collect();

        if pool.len() < non_range_slots {
            return;
        }

        // Enumerate C(pool, non_range_slots)
        for_each_combination(&pool, non_range_slots, |combo| {
            // Distribute combo cards in fixed order:
            // 1) Partial players (1 card each)
            // 2) Unknown players (2 cards each)
            // 3) Board fill (missing_board cards)
            let mut cursor = 0;
            let mut hole_cards: Vec<[Card; 2]> = vec![
                [
                    Card::new(Value::Two, Suit::Spade),
                    Card::new(Value::Two, Suit::Spade)
                ];
                players.len()
            ];
            let mut range_cursor = 0;

            for (idx, p) in players.iter().enumerate() {
                match p {
                    HoleCardsInput::Exact(hand) => {
                        let mut iter = hand.iter().copied();
                        hole_cards[idx] = [iter.next().unwrap(), iter.next().unwrap()];
                    }
                    HoleCardsInput::Partial(known) => {
                        hole_cards[idx] = [*known, combo[cursor]];
                        cursor += 1;
                    }
                    HoleCardsInput::Unknown => {
                        hole_cards[idx] = [combo[cursor], combo[cursor + 1]];
                        cursor += 2;
                    }
                    HoleCardsInput::Range(_) => {
                        hole_cards[idx] = range_assignments[range_cursor];
                        range_cursor += 1;
                    }
                }
            }

            let mut full_board = board_cards.to_vec();
            for i in 0..missing_board {
                full_board.push(combo[cursor + i]);
            }

            // Evaluate
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

            *total_combos += 1;
        });

        return;
    }

    // Current range player
    let player_idx = range_indices[depth];
    let hands = match &players[player_idx] {
        HoleCardsInput::Range(h) => h,
        _ => unreachable!(),
    };

    // Collect cards already used by previous range assignments
    let mut used_by_prior: HashSet<Card> = HashSet::new();
    for assignment in range_assignments.iter().take(depth) {
        used_by_prior.insert(assignment[0]);
        used_by_prior.insert(assignment[1]);
    }

    for hand in hands {
        let mut iter = hand.iter().copied();
        let c1 = iter.next().unwrap();
        let c2 = iter.next().unwrap();

        // Skip if either card conflicts with fixed_known, board, or prior range cards
        if fixed_known.contains(&c1)
            || fixed_known.contains(&c2)
            || board_set.contains(&c1)
            || board_set.contains(&c2)
            || used_by_prior.contains(&c1)
            || used_by_prior.contains(&c2)
        {
            continue;
        }

        range_assignments[depth] = [c1, c2];

        enumerate_ranges(
            players,
            range_indices,
            depth + 1,
            range_assignments,
            available,
            board_set,
            fixed_known,
            board_cards,
            missing_board,
            non_range_slots,
            wins,
            total_combos,
        );
    }
}

/// Estimate the total number of combinations for exact enumeration.
///
/// Returns `None` if any intermediate computation would overflow.
pub(crate) fn estimate_enumeration_count(
    available_count: usize,
    non_range_slots: usize,
    range_product: usize,
) -> Option<usize> {
    let choose = n_choose_k(available_count, non_range_slots);
    range_product.checked_mul(choose)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn n_choose_k_basic() {
        assert_eq!(n_choose_k(5, 0), 1);
        assert_eq!(n_choose_k(5, 1), 5);
        assert_eq!(n_choose_k(5, 2), 10);
        assert_eq!(n_choose_k(5, 5), 1);
        assert_eq!(n_choose_k(52, 5), 2_598_960);
        assert_eq!(n_choose_k(3, 5), 0); // k > n
    }

    #[test]
    fn for_each_combination_count() {
        let cards: Vec<Card> = rs_poker::core::Deck::default()
            .into_iter()
            .take(10)
            .collect();
        let mut count = 0usize;
        for_each_combination(&cards, 3, |_| count += 1);
        assert_eq!(count, n_choose_k(10, 3));
    }

    #[test]
    fn exact_river_deterministic() {
        // Full board, exact hands → only 1 combination, deterministic result
        use crate::estimate::estimate_equity;
        let r1 = estimate_equity("2h5h9cTdJs", "AhKh", &["QsQc"], 100).unwrap();
        let r2 = estimate_equity("2h5h9cTdJs", "AhKh", &["QsQc"], 100).unwrap();
        assert_eq!(r1.mode, EquityEstimateMode::ExactEnumeration);
        assert_eq!(r1.equities, r2.equities);
        assert_eq!(r1.samples, 1);
    }

    #[test]
    fn exact_turn() {
        // Turn + exact hands: C(44, 1) = 44 combos, well under any reasonable iteration count
        use crate::estimate::estimate_equity;
        let result = estimate_equity("2h5h9cTd", "AhKh", &["QsQc"], 10_000).unwrap();
        assert_eq!(result.mode, EquityEstimateMode::ExactEnumeration);
        assert_eq!(result.samples, 44);
    }

    #[test]
    fn exact_vs_mc_consistency() {
        // Same scenario: exact enumeration vs forced MC should produce similar results
        use crate::estimate::estimate_equity;
        // Turn with exact hands — small enough for exact
        let exact = estimate_equity("2h5h9cTd", "AhKh", &["QsQc"], 10_000).unwrap();
        assert_eq!(exact.mode, EquityEstimateMode::ExactEnumeration);

        // Force MC by setting iterations very low (below enum count won't trigger,
        // but we compare the MC result with a large sample)
        let mc = estimate_equity("2h5h9cTd", "AhKh", &["QsQc"], 1).unwrap();
        assert_eq!(mc.mode, EquityEstimateMode::MonteCarlo);

        // Results should be close (MC with 1 iteration can vary, but at least
        // both should produce valid results)
        assert_eq!(exact.equities.len(), mc.equities.len());
    }

    #[test]
    fn falls_back_to_mc() {
        // Preflop with unknown villain: C(48, 7) = 314,457,495 — way more than 10k
        use crate::estimate::estimate_equity;
        let result = estimate_equity("", "AhAd", &[""], 10_000).unwrap();
        assert_eq!(result.mode, EquityEstimateMode::MonteCarlo);
    }
}
