use super::*;

// ── HoleCardsInput parsing ────────────────────────────────────────────

#[test]
fn hole_cards_exact() {
    let hand: HoleCardsInput = "AhAd".parse().unwrap();
    assert!(matches!(hand, HoleCardsInput::Exact(_)));
}

#[test]
fn hole_cards_exact_with_whitespace() {
    let hand: HoleCardsInput = " Ah Kd ".parse().unwrap();
    assert!(matches!(hand, HoleCardsInput::Exact(_)));
}

#[test]
fn hole_cards_exact_with_comma() {
    let hand: HoleCardsInput = "Ah,Kd".parse().unwrap();
    assert!(matches!(hand, HoleCardsInput::Exact(_)));
}

#[test]
fn hole_cards_partial() {
    let partial: HoleCardsInput = "Ah".parse().unwrap();
    assert!(matches!(partial, HoleCardsInput::Partial(_)));
}

#[test]
fn hole_cards_unknown() {
    let unknown: HoleCardsInput = "".parse().unwrap();
    assert!(matches!(unknown, HoleCardsInput::Unknown));
}

#[test]
fn hole_cards_range() {
    let hand: HoleCardsInput = "TT+".parse().unwrap();
    assert!(matches!(hand, HoleCardsInput::Range(_)));
}

#[test]
fn hole_cards_range_suited() {
    let hand: HoleCardsInput = "AKs".parse().unwrap();
    assert!(matches!(hand, HoleCardsInput::Range(_)));
}

#[test]
fn hole_cards_three_cards_is_error() {
    let result: Result<HoleCardsInput, _> = "AhKdQc".parse();
    assert!(result.is_err());
}

// ── BoardCardsInput parsing ───────────────────────────────────────────

#[test]
fn board_preflop() {
    let board: BoardCardsInput = "".parse().unwrap();
    assert!(matches!(board, BoardCardsInput::PreFlop));
    assert!(board.cards().is_empty());
}

#[test]
fn board_flop() {
    let board: BoardCardsInput = "AsKdQh".parse().unwrap();
    assert!(matches!(board, BoardCardsInput::Flop(_)));
    assert_eq!(board.cards().len(), 3);
}

#[test]
fn board_turn() {
    let board: BoardCardsInput = "AsKdQh2c".parse().unwrap();
    assert!(matches!(board, BoardCardsInput::Turn(_)));
    assert_eq!(board.cards().len(), 4);
}

#[test]
fn board_river() {
    let board: BoardCardsInput = "AsKdQh2c9d".parse().unwrap();
    assert!(matches!(board, BoardCardsInput::River(_)));
    assert_eq!(board.cards().len(), 5);
}

#[test]
fn board_with_whitespace_and_commas() {
    let board: BoardCardsInput = "As, Kd, Qh".parse().unwrap();
    assert!(matches!(board, BoardCardsInput::Flop(_)));
}

#[test]
fn board_one_card_is_error() {
    let result: Result<BoardCardsInput, _> = "As".parse();
    assert!(result.is_err());
}

#[test]
fn board_two_cards_is_error() {
    let result: Result<BoardCardsInput, _> = "AsKd".parse();
    assert!(result.is_err());
}

#[test]
fn board_invalid_card_is_error() {
    let result: Result<BoardCardsInput, _> = "XxYyZz".parse();
    assert!(result.is_err());
}

// ── SnapError Display ─────────────────────────────────────────────────

#[test]
fn snap_error_display() {
    let e = SnapError::InvalidCard("Xz".into());
    assert!(e.to_string().contains("Xz"));

    let e = SnapError::InvalidHand("bad".into());
    assert!(e.to_string().contains("bad"));

    let e = SnapError::InvalidRange("r".into());
    assert!(e.to_string().contains("r"));
}

#[test]
fn snap_error_is_std_error() {
    let e: Box<dyn std::error::Error> = Box::new(SnapError::InvalidCard("x".into()));
    assert!(!e.to_string().is_empty());
}

// ── estimate_equity validation ────────────────────────────────────────

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

// ── estimate_equity happy paths ───────────────────────────────────────

#[test]
fn equity_aa_vs_kk_preflop() {
    // AA is ~81% vs KK preflop
    let result = estimate_equity("", "AhAd", &["KhKd"], 10_000).unwrap();
    assert_eq!(result.equities.len(), 2);
    assert_eq!(result.mode, EquitySolveMode::MonteCarlo);
    assert!(result.samples > 0);
    assert!(result.equities[0] > 70.0, "AA should dominate KK");
    assert!(result.equities[0] < 95.0);
}

#[test]
fn equity_sum_to_100() {
    let result = estimate_equity("", "AhKd", &["QsQc"], 5_000).unwrap();
    let sum: f64 = result.equities.iter().sum();
    assert!((sum - 100.0).abs() < 0.01, "equities should sum to 100, got {sum}");
}

#[test]
fn equity_with_flop() {
    // AhKh on a heart flop — hero has flush draw advantage
    let result = estimate_equity("2h5h9c", "AhKh", &["QsQc"], 5_000).unwrap();
    assert_eq!(result.equities.len(), 2);
    assert!(result.samples > 0);
}

#[test]
fn equity_with_river() {
    // Full board — result is deterministic
    let r1 = estimate_equity("2h5h9cTdJs", "AhKh", &["QsQc"], 100).unwrap();
    let r2 = estimate_equity("2h5h9cTdJs", "AhKh", &["QsQc"], 100).unwrap();
    assert_eq!(r1.equities, r2.equities, "river results should be deterministic");
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
fn equity_default_iterations() {
    // iterations=0 should default to 10_000
    let result = estimate_equity("", "AhAd", &["KhKd"], 0).unwrap();
    assert!(result.samples > 5_000, "default should run ~10k samples");
}
