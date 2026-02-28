use crate::SnapError;
use rs_poker::core::{Card, FlatHand, Rankable};
use rs_poker::holdem::RangeParser;
use std::str::FromStr;

#[derive(Clone)]
pub enum HoleCardsInput {
    Exact(FlatHand),
    Range(Vec<FlatHand>),
    Partial(Card),
    Unknown,
}

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

impl FromStr for HoleCardsInput {
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

        let range_hands = RangeParser::parse_many(&cleaned).map_err(|e| {
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

impl FromStr for BoardCardsInput {
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

fn normalize_cards_str(s: &str) -> String {
    s.chars()
        .filter(|c| !c.is_whitespace() && *c != ',')
        .collect()
}
