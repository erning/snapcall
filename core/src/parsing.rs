use crate::{Card, SnapError, Suit, Value};

/// Parses one card from a two-character string.
///
/// Format: `<rank><suit>`
/// - rank: `A K Q J T 9 8 7 6 5 4 3 2`
/// - suit: `s h d c`
///
/// # Arguments
/// - `s`: Card text like `"Ah"` or `"Tc"`.
///
/// # Returns
/// - `Ok(Card)` when parsing succeeds.
/// - `Err(SnapError::InvalidCard)` when format or value is invalid.
///
/// # Example
/// ```rust
/// use snapcall_core::parse_card;
///
/// let card = parse_card("Ah").unwrap();
/// assert_eq!(card.value.to_char(), 'A');
/// assert_eq!(card.suit.to_char(), 'h');
/// ```
pub fn parse_card(s: &str) -> Result<Card, SnapError> {
    if s.len() < 2 {
        return Err(SnapError::InvalidCard(s.to_string()));
    }

    let value_char = s.chars().next().unwrap();
    let suit_char = s.chars().nth(1).unwrap();

    let value =
        Value::from_char(value_char).ok_or_else(|| SnapError::InvalidCard(s.to_string()))?;
    let suit = Suit::from_char(suit_char).ok_or_else(|| SnapError::InvalidCard(s.to_string()))?;

    Ok(Card::new(value, suit))
}

/// Parses multiple cards from a single string.
///
/// Accepted layouts:
/// - space-separated: `"Ah Ks Qd"`
/// - comma-separated: `"Ah,Ks,Qd"`
/// - concatenated: `"AhKsQd"`
///
/// # Arguments
/// - `s`: Card sequence string.
///
/// # Returns
/// - `Ok(Vec<Card>)` for valid inputs.
/// - `Err(SnapError::InvalidCard)` for invalid or empty input.
///
/// # Example
/// ```rust
/// use snapcall_core::parse_cards;
///
/// let cards = parse_cards("Ah Ks Qd").unwrap();
/// assert_eq!(cards.len(), 3);
/// ```
pub fn parse_cards(s: &str) -> Result<Vec<Card>, SnapError> {
    // Remove all whitespace and commas
    let cleaned: String = s
        .chars()
        .filter(|c| !c.is_whitespace() && *c != ',')
        .collect();

    // If empty after cleaning, return error
    if cleaned.is_empty() {
        return Err(SnapError::InvalidCard("Empty card string".to_string()));
    }

    // Check if we can parse as concatenated cards (every 2 chars = 1 card)
    // Valid card format: value char (A, K, Q, J, T, 9-2) + suit char (s, h, d, c)
    if cleaned.len().is_multiple_of(2) && cleaned.len() >= 2 {
        // Try to parse as concatenated cards first
        let mut cards = Vec::new();
        let mut valid = true;

        for chunk in cleaned.as_bytes().chunks(2) {
            let card_str = std::str::from_utf8(chunk).unwrap();
            match parse_card(card_str) {
                Ok(card) => cards.push(card),
                Err(_) => {
                    valid = false;
                    break;
                }
            }
        }

        if valid && !cards.is_empty() {
            return Ok(cards);
        }
    }

    // Fall back to space/comma separated parsing
    let cleaned = s.replace(',', " ");
    cleaned.split_whitespace().map(parse_card).collect()
}

/// Parses a simplified two-rank range descriptor.
///
/// This helper accepts only compact forms like `"AKs"` or `"AKo"`
/// and returns a structural tuple `(high, low, suited)`.
///
/// # Arguments
/// - `range_str`: Simplified range token.
///
/// # Returns
/// - `Ok(Vec<(Value, Value, bool)>)` with one parsed descriptor.
/// - `Err(SnapError::InvalidRange)` for malformed input.
///
/// # Example
/// ```rust
/// use snapcall_core::{parse_range, Value};
///
/// let parsed = parse_range("AKs").unwrap();
/// assert_eq!(parsed[0], (Value::Ace, Value::King, true));
/// ```
pub fn parse_range(range_str: &str) -> Result<Vec<(Value, Value, bool)>, SnapError> {
    if range_str.len() < 2 {
        return Err(SnapError::InvalidRange(range_str.to_string()));
    }

    let chars: Vec<char> = range_str.chars().collect();
    let v1 =
        Value::from_char(chars[0]).ok_or_else(|| SnapError::InvalidRange(range_str.to_string()))?;
    let v2 =
        Value::from_char(chars[1]).ok_or_else(|| SnapError::InvalidRange(range_str.to_string()))?;

    let suited = if range_str.len() > 2 {
        match chars[2] {
            's' | 'S' => true,
            'o' | 'O' => false,
            _ => return Err(SnapError::InvalidRange(range_str.to_string())),
        }
    } else {
        false // offsuit by default if not specified
    };

    Ok(vec![(v1, v2, suited)])
}
