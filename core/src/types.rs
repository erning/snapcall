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
pub enum EquityEstimateMode {
    ExactEnumeration,
    MonteCarlo,
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
}
