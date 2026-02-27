/// Errors that can occur in the core engine
#[derive(Debug, Clone, PartialEq)]
pub enum SnapError {
    InvalidCard(String),
    InvalidHand(String),
    InvalidRange(String),
}

/// Solve mode used by the equity engine.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum EquitySolveMode {
    ExactEnumeration,
    MonteCarlo,
}

/// Computation metadata for an equity solve.
#[derive(Debug, Clone, PartialEq)]
pub struct EquityMath {
    pub mode: EquitySolveMode,
    pub iteration_budget: usize,
    pub assignment_combinations: u128,
    pub board_runout_combinations: u128,
    pub total_states: u128,
    pub samples_used: usize,
}

/// Full equity response with result vector and computation metadata.
#[derive(Debug, Clone, PartialEq)]
pub struct EquityResult {
    pub equities: Vec<f64>,
    pub math: EquityMath,
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
