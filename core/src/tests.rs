use super::*;

#[test]
fn test_parse_cards() {
    let cards = parse_cards("Ah Kd Qc").unwrap();
    assert_eq!(cards.len(), 3);
    assert!(cards.iter().any(|card| card.value == Value::Ace));
}

#[test]
fn test_player_input_from_str_exact() {
    let hand: HoleCardsInput = "AhAd".parse().unwrap();
    assert!(matches!(hand, HoleCardsInput::Exact(_)));
}

#[test]
fn test_player_input_from_str_partial_and_unknown() {
    let partial: HoleCardsInput = "Ah".parse().unwrap();
    let unknown: HoleCardsInput = "".parse().unwrap();
    assert!(matches!(partial, HoleCardsInput::Partial(_)));
    assert!(matches!(unknown, HoleCardsInput::Unknown));
}

#[test]
fn test_player_input_from_str_range() {
    let hand: HoleCardsInput = "TT+".parse().unwrap();
    assert!(matches!(hand, HoleCardsInput::Range(_)));
}

#[test]
fn test_board_cards_input_from_str_streets() {
    let preflop: BoardCardsInput = "".parse().unwrap();
    let flop: BoardCardsInput = "AsKdQh".parse().unwrap();
    let turn: BoardCardsInput = "AsKdQh2c".parse().unwrap();
    let river: BoardCardsInput = "AsKdQh2c9d".parse().unwrap();

    assert!(matches!(preflop, BoardCardsInput::PreFlop));
    assert!(matches!(flop, BoardCardsInput::Flop(_)));
    assert!(matches!(turn, BoardCardsInput::Turn(_)));
    assert!(matches!(river, BoardCardsInput::River(_)));
}

#[test]
fn test_evaluate_royal_flush() {
    let rank = evaluate_hand("As Ks Qs Js Ts").unwrap();
    assert!(matches!(rank, Rank::StraightFlush(_)));
}

#[test]
fn test_evaluate_pair() {
    let rank = evaluate_hand("Ah Ad Kc Qd Js").unwrap();
    assert!(matches!(rank, Rank::OnePair(_)));
}

#[test]
fn test_calculate_equity_basic() {
    let result = calculate_equity(
        &["Ah Ad".to_string(), "Kh Kd".to_string()],
        "2c 7d 9h",
        10_000,
    )
    .unwrap();
    assert_eq!(result.equities.len(), 2);
    // AA vs KK on this board: AA should be heavily favored (~90%+)
    assert!(result.equities[0] > 80.0);
    assert!((result.equities.iter().sum::<f64>() - 100.0).abs() < 1e-9);
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
fn test_calculate_equity_supports_single_card_and_empty_input() {
    let result = calculate_equity(&["Ah".to_string(), "".to_string()], "", 200).unwrap();
    assert_eq!(result.equities.len(), 2);
    assert!((result.equities.iter().sum::<f64>() - 100.0).abs() < 1e-9);
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
fn test_calculate_equity_monte_carlo_mode() {
    let result = calculate_equity(
        &["Ah Ad".to_string(), "Kh Kd".to_string()],
        "2c 7d 9h",
        1000,
    )
    .unwrap();

    assert_eq!(result.mode, EquitySolveMode::MonteCarlo);
    assert!(result.samples > 0);
    assert!(result.samples <= 1000);
}

#[test]
fn test_calculate_equity_with_ranges() {
    let result = calculate_equity(&["AKs".to_string(), "TT".to_string()], "", 5000).unwrap();
    assert_eq!(result.equities.len(), 2);
    assert!((result.equities.iter().sum::<f64>() - 100.0).abs() < 1e-9);
}
