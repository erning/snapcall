use super::*;
use crate::combinatorics::{all_cards, combination_count};
use crate::equity::calculate_exact_equity;
use std::collections::HashSet;

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
    let actual =
        calculate_equity(&["Ah Ad".to_string(), "Kh Kd".to_string()], "2c 7d 9h", 990).unwrap();

    for (expected, result) in exact.iter().zip(actual.iter()) {
        assert!((expected - result).abs() < 1e-9);
    }
}

#[test]
fn test_calculate_equity_rejects_duplicate_cards() {
    let err = calculate_equity(&["Ah Ad".to_string(), "Ah Kd".to_string()], "", 100).unwrap_err();
    assert!(matches!(
        err,
        SnapError::InvalidHand(_) | SnapError::InvalidRange(_)
    ));
}

#[test]
fn test_calculate_equity_with_ranges_exact_matches_single_combo_equity() {
    let exact_from_hands =
        calculate_equity(&["Ah Ad".to_string(), "Kh Kd".to_string()], "2c 7d 9h", 990).unwrap();
    let exact_from_ranges =
        calculate_equity_with_ranges(&["Ah Ad".to_string(), "Kh Kd".to_string()], "2c 7d 9h", 990)
            .unwrap();

    for (lhs, rhs) in exact_from_hands.iter().zip(exact_from_ranges.iter()) {
        assert!((lhs - rhs).abs() < 1e-9);
    }
}

#[test]
fn test_calculate_equity_with_ranges_falls_back_to_monte_carlo() {
    let eq =
        calculate_equity_with_ranges(&["Ah Ad".to_string(), "Kh Kd".to_string()], "2c 7d 9h", 1)
            .unwrap();
    assert!(eq[0] == 0.0 || eq[0] == 50.0 || eq[0] == 100.0);
    assert!((eq.iter().sum::<f64>() - 100.0).abs() < 1e-9);
}

#[test]
fn test_calculate_equity_with_ranges_rejects_fully_colliding_ranges() {
    let err = calculate_equity_with_ranges(&["Ah Ad".to_string(), "Ah Kd".to_string()], "", 100)
        .unwrap_err();
    assert!(matches!(err, SnapError::InvalidHand(_)));
    assert!(err.to_string().contains("Duplicate known card detected"));
}

#[test]
fn test_calculate_equity_supports_single_card_and_empty_input() {
    let eq = calculate_equity(&["Ah".to_string(), "".to_string()], "", 200).unwrap();
    assert_eq!(eq.len(), 2);
    assert!((eq.iter().sum::<f64>() - 100.0).abs() < 1e-9);
}

#[test]
fn test_calculate_equity_rejects_invalid_board_street() {
    let err = calculate_equity(&["Ah Ad".to_string(), "Kh Kd".to_string()], "2c", 100).unwrap_err();
    assert!(matches!(err, SnapError::InvalidHand(_)));
    assert!(err
        .to_string()
        .contains("Board must have 0, 3, 4, or 5 cards"));
}

#[test]
fn test_calculate_equity_with_math_exact_mode() {
    let result =
        calculate_equity_with_math(&["Ah Ad".to_string(), "Kh Kd".to_string()], "2c 7d 9h", 990)
            .unwrap();

    assert_eq!(result.math.mode, EquitySolveMode::ExactEnumeration);
    assert_eq!(result.math.assignment_combinations, 1);
    assert_eq!(result.math.board_runout_combinations, 990);
    assert_eq!(result.math.total_states, 990);
    assert_eq!(result.math.samples_used, 990);
}

#[test]
fn test_calculate_equity_with_math_monte_carlo_mode() {
    let result =
        calculate_equity_with_math(&["Ah Ad".to_string(), "Kh Kd".to_string()], "2c 7d 9h", 1)
            .unwrap();

    assert_eq!(result.math.mode, EquitySolveMode::MonteCarlo);
    assert_eq!(result.math.assignment_combinations, 1);
    assert_eq!(result.math.board_runout_combinations, 990);
    assert_eq!(result.math.total_states, 990);
    assert!(result.math.samples_used > 0);
}
