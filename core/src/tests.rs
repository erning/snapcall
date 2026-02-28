use super::*;

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

    let has_aks = hands
        .iter()
        .any(|(v1, v2, suited)| *v1 == Value::Ace && *v2 == Value::King && *suited);
    assert!(has_aks, "Range should include AKs");
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
