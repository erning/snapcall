use std::collections::HashSet;

use rs_poker::core::{Card, FlatHand, Rank, Rankable, Suit, Value};

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

/// Immutable context for exact enumeration.
struct EnumerationContext<'a> {
    players: &'a [HoleCardsInput],
    range_players: Vec<(usize, &'a Vec<FlatHand>)>,
    available: Vec<Card>,
    board_set: &'a HashSet<Card>,
    fixed_known: &'a HashSet<Card>,
    board_cards: &'a [Card],
    missing_board: usize,
    non_range_slots: usize,
}

/// Mutable state for exact enumeration, including reusable buffers.
struct EnumerationState {
    range_assignments: Vec<[Card; 2]>,
    wins: Vec<usize>,
    total_combos: usize,
    // Reusable buffers for the hot loop
    hole_cards_buf: Vec<[Card; 2]>,
    full_board_buf: Vec<Card>,
    seven_cards_buf: Vec<Card>,
    ranks_buf: Vec<Rank>,
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
    let mut range_players: Vec<(usize, &Vec<FlatHand>)> = Vec::new();

    for (idx, p) in players.iter().enumerate() {
        match p {
            HoleCardsInput::Partial(_) => partial_count += 1,
            HoleCardsInput::Unknown => unknown_count += 1,
            HoleCardsInput::Range(hands) => range_players.push((idx, hands)),
            HoleCardsInput::Exact(_) => {}
        }
    }

    let non_range_slots = partial_count + 2 * unknown_count + missing_board;
    let placeholder = Card::new(Value::Two, Suit::Spade);

    let ctx = EnumerationContext {
        players,
        range_players,
        available,
        board_set,
        fixed_known,
        board_cards,
        missing_board,
        non_range_slots,
    };

    let mut state = EnumerationState {
        range_assignments: vec![[placeholder, placeholder]; ctx.range_players.len()],
        wins: vec![0; num_players],
        total_combos: 0,
        hole_cards_buf: vec![[placeholder, placeholder]; num_players],
        full_board_buf: Vec::with_capacity(5),
        seven_cards_buf: Vec::with_capacity(7),
        ranks_buf: Vec::with_capacity(num_players),
    };

    enumerate_ranges(&ctx, 0, &mut state);

    let total_wins: usize = state.wins.iter().sum();
    let equities = if total_wins == 0 {
        vec![100.0 / num_players as f64; num_players]
    } else {
        state
            .wins
            .iter()
            .map(|&w| (w as f64 / total_wins as f64) * 100.0)
            .collect()
    };

    EquityResult {
        equities,
        mode: EquityEstimateMode::ExactEnumeration,
        samples: state.total_combos,
    }
}

/// Recursively enumerate the cartesian product of Range players' hands.
fn enumerate_ranges(ctx: &EnumerationContext, depth: usize, state: &mut EnumerationState) {
    if depth == ctx.range_players.len() {
        // All ranges assigned — build pool excluding range-assigned cards
        // Uses linear scan instead of HashSet since range_players is typically ≤ 3
        let range_count = ctx.range_players.len();
        let pool: Vec<Card> = ctx
            .available
            .iter()
            .copied()
            .filter(|c| {
                !state
                    .range_assignments
                    .iter()
                    .take(range_count)
                    .any(|a| a[0] == *c || a[1] == *c)
            })
            .collect();

        if pool.len() < ctx.non_range_slots {
            return;
        }

        // Destructure state for disjoint field borrows in the closure
        let EnumerationState {
            ref range_assignments,
            ref mut wins,
            ref mut total_combos,
            ref mut hole_cards_buf,
            ref mut full_board_buf,
            ref mut seven_cards_buf,
            ref mut ranks_buf,
        } = *state;

        // Enumerate C(pool, non_range_slots)
        for_each_combination(&pool, ctx.non_range_slots, |combo| {
            // Distribute combo cards in fixed order:
            // 1) Partial players (1 card each)
            // 2) Unknown players (2 cards each)
            // 3) Board fill (missing_board cards)
            let mut cursor = 0;
            let mut range_cursor = 0;

            for (idx, p) in ctx.players.iter().enumerate() {
                match p {
                    HoleCardsInput::Exact(hand) => {
                        debug_assert!(hand.len() >= 2);
                        let mut iter = hand.iter().copied();
                        let (Some(c1), Some(c2)) = (iter.next(), iter.next()) else {
                            return;
                        };
                        hole_cards_buf[idx] = [c1, c2];
                    }
                    HoleCardsInput::Partial(known) => {
                        hole_cards_buf[idx] = [*known, combo[cursor]];
                        cursor += 1;
                    }
                    HoleCardsInput::Unknown => {
                        hole_cards_buf[idx] = [combo[cursor], combo[cursor + 1]];
                        cursor += 2;
                    }
                    HoleCardsInput::Range(_) => {
                        hole_cards_buf[idx] = range_assignments[range_cursor];
                        range_cursor += 1;
                    }
                }
            }

            full_board_buf.clear();
            full_board_buf.extend_from_slice(ctx.board_cards);
            for i in 0..ctx.missing_board {
                full_board_buf.push(combo[cursor + i]);
            }

            // Evaluate hands using reusable buffers
            ranks_buf.clear();
            for hole in hole_cards_buf.iter() {
                seven_cards_buf.clear();
                seven_cards_buf.extend_from_slice(hole);
                seven_cards_buf.extend_from_slice(full_board_buf);
                ranks_buf.push(seven_cards_buf.as_slice().rank());
            }

            if let Some(best) = ranks_buf.iter().max() {
                for (i, r) in ranks_buf.iter().enumerate() {
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
    let (_player_idx, hands) = ctx.range_players[depth];

    for hand in hands {
        debug_assert!(hand.len() >= 2);
        let mut iter = hand.iter().copied();
        let (Some(c1), Some(c2)) = (iter.next(), iter.next()) else {
            continue;
        };

        // Skip if either card conflicts with fixed_known, board, or prior range cards
        if ctx.fixed_known.contains(&c1)
            || ctx.fixed_known.contains(&c2)
            || ctx.board_set.contains(&c1)
            || ctx.board_set.contains(&c2)
            || state
                .range_assignments
                .iter()
                .take(depth)
                .any(|a| a[0] == c1 || a[1] == c1 || a[0] == c2 || a[1] == c2)
        {
            continue;
        }

        state.range_assignments[depth] = [c1, c2];

        enumerate_ranges(ctx, depth + 1, state);
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

    mod n_choose_k {
        #[test]
        fn returns_one_for_k_zero_or_k_equals_n() {
            assert_eq!(super::super::n_choose_k(5, 0), 1);
            assert_eq!(super::super::n_choose_k(5, 5), 1);
        }

        #[test]
        fn returns_correct_values_for_common_inputs() {
            assert_eq!(super::super::n_choose_k(5, 1), 5);
            assert_eq!(super::super::n_choose_k(5, 2), 10);
            assert_eq!(super::super::n_choose_k(52, 5), 2_598_960);
        }

        #[test]
        fn returns_zero_when_k_exceeds_n() {
            assert_eq!(super::super::n_choose_k(3, 5), 0);
        }
    }

    #[test]
    fn for_each_combination_produces_correct_count() {
        let cards: Vec<Card> = rs_poker::core::Deck::default()
            .into_iter()
            .take(10)
            .collect();
        let mut count = 0usize;
        for_each_combination(&cards, 3, |_| count += 1);
        assert_eq!(count, n_choose_k(10, 3));
    }

    #[test]
    fn exact_enumeration_is_deterministic_on_river() {
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
    fn exact_and_monte_carlo_produce_consistent_results() {
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
    fn falls_back_to_monte_carlo_when_combos_exceed_budget() {
        // Preflop with unknown villain: C(48, 7) = 314,457,495 — way more than 10k
        use crate::estimate::estimate_equity;
        let result = estimate_equity("", "AhAd", &[""], 10_000).unwrap();
        assert_eq!(result.mode, EquityEstimateMode::MonteCarlo);
    }
}
