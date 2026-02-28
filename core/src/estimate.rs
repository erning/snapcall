use std::collections::HashSet;

use rs_poker::core::Card;

use crate::enumeration::{estimate_enumeration_count, estimate_equity_exact_enumeration};
use crate::input::{BoardCardsInput, HoleCardsInput};
use crate::monte_carlo::estimate_equity_monte_carlo;
use crate::types::{EquityResult, SnapError};

/// Estimates equity for hero against one or more villains.
///
/// Automatically chooses between exact enumeration and Monte Carlo simulation
/// based on the number of possible combinations vs the requested iteration count.
///
/// # Arguments
/// - `board` — community cards as a string (`""` for preflop, or 3/4/5 cards like `"AhKdQc"`)
/// - `hero` — hero's hole cards, or a single known card (e.g. `"Ah"`)
/// - `villains` — each villain's hole cards, range, or `""` for unknown
/// - `iterations` — maximum sample count.
///   When the total enumerable combinations ≤ this value, exact enumeration is used.
///
/// # Returns
/// An [`EquityResult`] where `equities[0]` is hero's equity percentage.
/// All equities sum to 100.0.
///
/// # Errors
/// Returns [`SnapError`] on invalid cards, conflicting/duplicate cards, or empty ranges.
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
    let hero_input: HoleCardsInput = hero.parse()?;
    if matches!(
        hero_input,
        HoleCardsInput::Range(_) | HoleCardsInput::Unknown
    ) {
        return Err(SnapError::InvalidHand(
            "Hero must be exact hole cards (e.g. \"AhKd\") or a single card (e.g. \"Ah\")"
                .to_string(),
        ));
    }
    players.push(hero_input);
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
                    c1 != c2 && !fixed_known.contains(&c1) && !fixed_known.contains(&c2)
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

    let missing_board = 5 - board_cards.len();

    // --- Decide mode: exact enumeration vs Monte Carlo ---
    let mut partial_count = 0usize;
    let mut unknown_count = 0usize;
    let mut range_product: usize = 1;
    let mut range_count = 0usize;

    for p in &players {
        match p {
            HoleCardsInput::Partial(_) => partial_count += 1,
            HoleCardsInput::Unknown => unknown_count += 1,
            HoleCardsInput::Range(hands) => {
                range_product = range_product.saturating_mul(hands.len());
                range_count += 1;
            }
            HoleCardsInput::Exact(_) => {}
        }
    }

    let non_range_slots = partial_count + 2 * unknown_count + missing_board;
    // Available cards for the non-range combination: 52 − fixed_known − (approx 2 per range player)
    let available_for_estimate = 52usize
        .saturating_sub(fixed_known.len())
        .saturating_sub(2 * range_count);

    let use_exact = if let Some(enum_count) =
        estimate_enumeration_count(available_for_estimate, non_range_slots, range_product)
    {
        enum_count > 0 && enum_count <= iterations
    } else {
        false
    };

    if use_exact {
        Ok(estimate_equity_exact_enumeration(
            &board_cards,
            &board_set,
            &players,
            &fixed_known,
        ))
    } else {
        estimate_equity_monte_carlo(&board_cards, &board_set, &players, iterations)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::EquityEstimateMode;

    // ── Validation tests ──────────────────────────────────────────────

    #[test]
    fn equity_no_villains() {
        let result = estimate_equity("", "AhKd", &[], 100);
        assert!(result.is_err());
    }

    #[test]
    fn equity_hero_range_rejected() {
        let result = estimate_equity("", "TT+", &["AhKd"], 100);
        assert!(result.is_err());
    }

    #[test]
    fn equity_hero_unknown_rejected() {
        let result = estimate_equity("", "", &["AhKd"], 100);
        assert!(result.is_err());
    }

    #[test]
    fn equity_hero_conflicts_with_board() {
        let result = estimate_equity("AhKdQc", "AhJs", &["2c3c"], 100);
        assert!(result.is_err());
    }

    #[test]
    fn equity_duplicate_cards_between_players() {
        let result = estimate_equity("", "AhKd", &["AhQs"], 100);
        assert!(result.is_err());
    }

    #[test]
    fn equity_villain_card_conflicts_with_board() {
        let result = estimate_equity("AhKdQc", "2s3s", &["Ah5d"], 100);
        assert!(result.is_err());
    }

    // ── Happy-path tests ──────────────────────────────────────────────

    #[test]
    fn equity_aa_vs_kk_preflop() {
        let result = estimate_equity("", "AhAd", &["KhKd"], 10_000).unwrap();
        assert_eq!(result.equities.len(), 2);
        assert!(result.samples > 0);
        assert!(result.equities[0] > 70.0, "AA should dominate KK");
        assert!(result.equities[0] < 95.0);
    }

    #[test]
    fn equity_sum_to_100() {
        let result = estimate_equity("", "AhKd", &["QsQc"], 5_000).unwrap();
        let sum: f64 = result.equities.iter().sum();
        assert!(
            (sum - 100.0).abs() < 0.01,
            "equities should sum to 100, got {sum}"
        );
    }

    #[test]
    fn equity_with_flop() {
        let result = estimate_equity("2h5h9c", "AhKh", &["QsQc"], 5_000).unwrap();
        assert_eq!(result.equities.len(), 2);
        assert!(result.samples > 0);
    }

    #[test]
    fn equity_with_river() {
        let r1 = estimate_equity("2h5h9cTdJs", "AhKh", &["QsQc"], 100).unwrap();
        let r2 = estimate_equity("2h5h9cTdJs", "AhKh", &["QsQc"], 100).unwrap();
        assert_eq!(
            r1.equities, r2.equities,
            "river results should be deterministic"
        );
    }

    #[test]
    fn equity_hero_partial() {
        let result = estimate_equity("", "Ah", &["KhKd"], 5_000).unwrap();
        assert_eq!(result.equities.len(), 2);
        assert!(result.samples > 0);
    }

    #[test]
    fn equity_villain_unknown() {
        let result = estimate_equity("", "AhAd", &[""], 5_000).unwrap();
        assert_eq!(result.equities.len(), 2);
        assert!(result.equities[0] > 70.0, "AA should dominate random hand");
    }

    #[test]
    fn equity_villain_range() {
        let result = estimate_equity("", "AhAd", &["TT+"], 5_000).unwrap();
        assert_eq!(result.equities.len(), 2);
        assert!(result.equities[0] > 60.0, "AA should beat TT+");
    }

    #[test]
    fn equity_multiple_villains() {
        let result = estimate_equity("", "AhAd", &["KhKd", "QsQc"], 5_000).unwrap();
        assert_eq!(result.equities.len(), 3);
        let sum: f64 = result.equities.iter().sum();
        assert!((sum - 100.0).abs() < 0.01);
        assert!(result.equities[0] > 50.0, "AA should lead vs KK and QQ");
    }

    #[test]
    fn equity_zero_iterations_uses_mc_with_zero() {
        // iterations=0 means 0 MC samples, but exact enumeration may still kick in
        // Preflop exact hands: C(48, 5) = 1,712,304 > 0, so MC with 0 iterations
        let result = estimate_equity("", "AhAd", &["KhKd"], 0);
        // With 0 iterations and enum_count > 0, MC runs 0 iterations → error
        assert!(result.is_err());
    }

    #[test]
    fn equity_mode_exact_on_river() {
        let result = estimate_equity("2h5h9cTdJs", "AhKh", &["QsQc"], 100).unwrap();
        assert_eq!(result.mode, EquityEstimateMode::ExactEnumeration);
    }
}
