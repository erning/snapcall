use rs_poker::core::{Card, FlatHand, Rankable};

use crate::types::SnapError;

/// Hero or villain hole-cards input.
///
/// Parsed via `FromStr`:
/// - `""` → `Unknown` (random hand)
/// - `"Ah"` → `Partial` (one known card, second dealt randomly)
/// - `"AhKd"` → `Exact` (both cards known)
/// - `"TT+"` / `"AKs"` → `Range` (expanded via `rs_poker::holdem::RangeParser`)
#[derive(Clone)]
pub enum HoleCardsInput {
    Exact(FlatHand),
    Range(Vec<FlatHand>),
    Partial(Card),
    Unknown,
}

/// Board (community cards) input.
///
/// Parsed via `FromStr`:
/// - `""` → `PreFlop`
/// - 3 cards → `Flop`
/// - 4 cards → `Turn`
/// - 5 cards → `River`
#[derive(Clone)]
pub enum BoardCardsInput {
    PreFlop,
    Flop(FlatHand),
    Turn(FlatHand),
    River(FlatHand),
}

impl BoardCardsInput {
    pub fn cards(&self) -> Vec<Card> {
        match self {
            Self::PreFlop => vec![],
            Self::Flop(hand) | Self::Turn(hand) | Self::River(hand) => {
                hand.iter().copied().collect()
            }
        }
    }
}

impl std::str::FromStr for HoleCardsInput {
    type Err = SnapError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        let trimmed = s.trim();
        if trimmed.is_empty() {
            return Ok(Self::Unknown);
        }

        let cleaned = normalize_cards_str(trimmed);

        if let Ok(hand) = FlatHand::new_from_str(&cleaned) {
            match hand.len() {
                1 => {
                    return Ok(Self::Partial(hand.cards().next().unwrap()));
                }
                2 => return Ok(Self::Exact(hand)),
                n => {
                    return Err(SnapError::InvalidHand(format!(
                        "Board must have 0, 3, 4, or 5 cards, got {}",
                        n
                    )));
                }
            }
        }

        let range_hands = rs_poker::holdem::RangeParser::parse_many(&cleaned).map_err(|e| {
            SnapError::InvalidRange(format!("Failed to parse range '{}': {:?}", trimmed, e))
        })?;

        if range_hands.is_empty() {
            return Err(SnapError::InvalidRange(format!(
                "Range '{}' produced no hands",
                trimmed
            )));
        }

        if range_hands.iter().any(|hand| hand.len() != 2) {
            return Err(SnapError::InvalidRange(format!(
                "Range '{}' contains non-two-card hand",
                trimmed
            )));
        }

        Ok(Self::Range(range_hands))
    }
}

impl std::str::FromStr for BoardCardsInput {
    type Err = SnapError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        let trimmed = s.trim();
        if trimmed.is_empty() {
            return Ok(Self::PreFlop);
        }

        let cleaned = normalize_cards_str(trimmed);
        let hand = FlatHand::new_from_str(&cleaned).map_err(|e| {
            SnapError::InvalidHand(format!("Failed to parse board '{}': {:?}", trimmed, e))
        })?;

        match hand.len() {
            3 => Ok(Self::Flop(hand)),
            4 => Ok(Self::Turn(hand)),
            5 => Ok(Self::River(hand)),
            n => Err(SnapError::InvalidHand(format!(
                "Board must have 0, 3, 4, or 5 cards, got {}",
                n
            ))),
        }
    }
}

/// Strip whitespace and commas from a card string (e.g. `"Ah, Kd"` → `"AhKd"`).
pub(crate) fn normalize_cards_str(s: &str) -> String {
    s.chars()
        .filter(|c| !c.is_whitespace() && *c != ',')
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    // ── HoleCardsInput parsing ────────────────────────────────────────

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

    // ── BoardCardsInput parsing ───────────────────────────────────────

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
}
