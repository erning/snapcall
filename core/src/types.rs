/// Errors that can occur in the core engine.
///
/// Covers invalid card strings, malformed hands, and unparseable ranges.
#[derive(Debug, Clone, PartialEq, thiserror::Error)]
pub enum SnapError {
    /// A card string could not be parsed (e.g. `"Xz"`).
    #[error("Invalid card string: {0}")]
    InvalidCard(String),
    /// A hand is structurally invalid (e.g. wrong number of cards, duplicates).
    #[error("Invalid hand: {0}")]
    InvalidHand(String),
    /// A range expression could not be parsed or produced no hands.
    #[error("Invalid range: {0}")]
    InvalidRange(String),
}

/// Solve mode used by the equity engine.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum EquityEstimateMode {
    ExactEnumeration,
    MonteCarlo,
}

impl std::fmt::Display for EquityEstimateMode {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            EquityEstimateMode::ExactEnumeration => write!(f, "exact"),
            EquityEstimateMode::MonteCarlo => write!(f, "monte_carlo"),
        }
    }
}

/// Full equity result with per-player equity percentages and computation metadata.
///
/// - `equities[0]` is hero's equity; all values sum to 100.0.
/// - `mode` indicates which algorithm was used.
/// - `samples` is the number of valid iterations completed.
#[derive(Debug, Clone, PartialEq)]
pub struct EquityResult {
    pub equities: Vec<f64>,
    pub mode: EquityEstimateMode,
    pub samples: usize,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn snap_error_display_invalid_card_includes_input() {
        let e = SnapError::InvalidCard("Xz".into());
        assert!(e.to_string().contains("Xz"));
    }

    #[test]
    fn snap_error_display_invalid_hand_includes_input() {
        let e = SnapError::InvalidHand("bad".into());
        assert!(e.to_string().contains("bad"));
    }

    #[test]
    fn snap_error_display_invalid_range_includes_input() {
        let e = SnapError::InvalidRange("r".into());
        assert!(e.to_string().contains("r"));
    }

    #[test]
    fn snap_error_is_std_error() {
        let e: Box<dyn std::error::Error> = Box::new(SnapError::InvalidCard("x".into()));
        assert!(!e.to_string().is_empty());
    }
}
