//! SnapCall Core — Texas Hold'em Equity Calculator
//!
//! Provides Monte Carlo equity estimation for Texas Hold'em poker hands.
//! Built on top of `rs-poker` for card representation and hand evaluation.
//!
//! # Quick Start
//!
//! ```no_run
//! use snapcall_core::estimate_equity;
//!
//! let result = estimate_equity("AhKdQc", "AsKs", &["JdJc"], 10_000).unwrap();
//! println!("Hero equity: {:.1}%", result.equities[0]);
//! ```

pub use rs_poker::core::{Card, Deck, Rank, Rankable, Suit, Value};
pub use rs_poker::core::{FlatHand, Hand};
pub use rs_poker::holdem;

// ── Public types ──────────────────────────────────────────────────────

/// Errors that can occur in the core engine.
///
/// Covers invalid card strings, malformed hands, and unparseable ranges.
#[derive(Debug, Clone, PartialEq)]
pub enum SnapError {
    /// A card string could not be parsed (e.g. `"Xz"`).
    InvalidCard(String),
    /// A hand is structurally invalid (e.g. wrong number of cards, duplicates).
    InvalidHand(String),
    /// A range expression could not be parsed or produced no hands.
    InvalidRange(String),
}

impl std::fmt::Display for SnapError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            SnapError::InvalidCard(s) => write!(f, "Invalid card string: {}", s),
            SnapError::InvalidHand(s) => write!(f, "Invalid hand: {}", s),
            SnapError::InvalidRange(s) => write!(f, "Invalid range: {}", s),
        }
    }
}

impl std::error::Error for SnapError {}

/// Solve mode used by the equity engine.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum EquitySolveMode {
    ExactEnumeration,
    MonteCarlo,
}

/// Full equity result with per-player equity percentages and computation metadata.
///
/// - `equities[0]` is hero's equity; all values sum to 100.0.
/// - `mode` indicates which algorithm was used.
/// - `samples` is the number of valid Monte Carlo iterations completed.
#[derive(Debug, Clone, PartialEq)]
pub struct EquityResult {
    pub equities: Vec<f64>,
    pub mode: EquitySolveMode,
    pub samples: usize,
}

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

        let range_hands =
            rs_poker::holdem::RangeParser::parse_many(&cleaned).map_err(|e| {
                SnapError::InvalidRange(format!(
                    "Failed to parse range '{}': {:?}",
                    trimmed, e
                ))
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

// ── Public function ───────────────────────────────────────────────────

/// Estimates equity for hero against one or more villains via Monte Carlo simulation.
///
/// # Arguments
/// - `board` — community cards as a string (`""` for preflop, or 3/4/5 cards like `"AhKdQc"`)
/// - `hero` — hero's hole cards, a range expression, or `""` for unknown
/// - `villains` — each villain's hole cards, range, or `""` for unknown
/// - `iterations` — Monte Carlo sample count; `0` defaults to 10 000
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
    let board_set: std::collections::HashSet<Card> = board_cards.iter().copied().collect();

    let mut players: Vec<HoleCardsInput> = Vec::with_capacity(1 + villains.len());
    let hero_input: HoleCardsInput = hero.parse()?;
    if matches!(hero_input, HoleCardsInput::Range(_) | HoleCardsInput::Unknown) {
        return Err(SnapError::InvalidHand(
            "Hero must be exact hole cards (e.g. \"AhKd\") or a single card (e.g. \"Ah\")".to_string(),
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
    let mut fixed_known: std::collections::HashSet<Card> = board_set.clone();

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
                    c1 != c2 && !board_set.contains(&c1) && !board_set.contains(&c2)
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

    // --- Monte Carlo simulation ---
    let iters = if iterations == 0 { 10_000 } else { iterations };
    let full_deck: Vec<Card> = Deck::default().into_iter().collect();
    let mut rng = rand::rng();
    let mut wins: Vec<u64> = vec![0; num_players];
    let mut samples = 0usize;
    let missing_board = 5 - board_cards.len();

    use rand::prelude::{IndexedRandom, SliceRandom};

    'outer: for _ in 0..iters {
        let mut used: std::collections::HashSet<Card> = board_set.clone();
        for p in &players {
            match p {
                HoleCardsInput::Exact(hand) => {
                    for c in hand.iter() {
                        used.insert(*c);
                    }
                }
                HoleCardsInput::Partial(c) => {
                    used.insert(*c);
                }
                _ => {}
            }
        }

        // First pass: deal Range players via rejection sampling
        let mut hole_cards: Vec<[Card; 2]> = vec![[full_deck[0], full_deck[0]]; num_players];

        for (idx, p) in players.iter().enumerate() {
            if let HoleCardsInput::Range(hands) = p {
                let mut found = false;
                for _ in 0..100 {
                    let hand = hands.choose(&mut rng).expect("non-empty after filtering");
                    let mut iter = hand.iter().copied();
                    let c1 = iter.next().unwrap();
                    let c2 = iter.next().unwrap();
                    if !used.contains(&c1) && !used.contains(&c2) {
                        used.insert(c1);
                        used.insert(c2);
                        hole_cards[idx] = [c1, c2];
                        found = true;
                        break;
                    }
                }
                if !found {
                    continue 'outer;
                }
            }
        }

        // Shuffle available cards
        let mut available: Vec<Card> = full_deck
            .iter()
            .copied()
            .filter(|c| !used.contains(c))
            .collect();
        available.shuffle(&mut rng);
        let mut cursor = 0;

        // Second pass: deal non-Range players
        let mut valid = true;
        for (idx, p) in players.iter().enumerate() {
            match p {
                HoleCardsInput::Exact(hand) => {
                    let mut iter = hand.iter().copied();
                    hole_cards[idx] = [iter.next().unwrap(), iter.next().unwrap()];
                }
                HoleCardsInput::Partial(known) => {
                    if cursor >= available.len() {
                        valid = false;
                        break;
                    }
                    hole_cards[idx] = [*known, available[cursor]];
                    cursor += 1;
                }
                HoleCardsInput::Unknown => {
                    if cursor + 1 >= available.len() {
                        valid = false;
                        break;
                    }
                    hole_cards[idx] = [available[cursor], available[cursor + 1]];
                    cursor += 2;
                }
                HoleCardsInput::Range(_) => {} // already dealt
            }
        }
        if !valid {
            continue;
        }

        // Complete the board
        let mut full_board = board_cards.clone();
        for _ in 0..missing_board {
            if cursor >= available.len() {
                continue 'outer;
            }
            full_board.push(available[cursor]);
            cursor += 1;
        }

        // Evaluate hands
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

        samples += 1;
    }

    if samples == 0 {
        return Err(SnapError::InvalidRange(
            "No valid samples generated".to_string(),
        ));
    }

    let total: u64 = wins.iter().sum();
    let equities = if total == 0 {
        vec![100.0 / num_players as f64; num_players]
    } else {
        wins.iter()
            .map(|&w| (w as f64 / total as f64) * 100.0)
            .collect()
    };

    Ok(EquityResult {
        equities,
        mode: EquitySolveMode::MonteCarlo,
        samples,
    })
}

// ── Private helpers ───────────────────────────────────────────────────

/// Strip whitespace and commas from a card string (e.g. `"Ah, Kd"` → `"AhKd"`).
fn normalize_cards_str(s: &str) -> String {
    s.chars()
        .filter(|c| !c.is_whitespace() && *c != ',')
        .collect()
}

// ── Tests ─────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests;
