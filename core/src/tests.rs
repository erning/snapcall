use super::*;

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
