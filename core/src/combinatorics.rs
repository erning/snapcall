use crate::{Card, Suit, Value};

/// Returns a full 52-card deck in deterministic rank/suit order.
pub(crate) fn all_cards() -> Vec<Card> {
    const SUITS: [Suit; 4] = [Suit::Spade, Suit::Heart, Suit::Diamond, Suit::Club];
    const VALUES: [Value; 13] = [
        Value::Ace,
        Value::King,
        Value::Queen,
        Value::Jack,
        Value::Ten,
        Value::Nine,
        Value::Eight,
        Value::Seven,
        Value::Six,
        Value::Five,
        Value::Four,
        Value::Three,
        Value::Two,
    ];

    let mut cards = Vec::with_capacity(52);
    for value in VALUES {
        for suit in SUITS {
            cards.push(Card::new(value, suit));
        }
    }
    cards
}

/// Computes `n choose k` with overflow clamping.
pub(crate) fn combination_count(n: usize, k: usize) -> usize {
    if k > n {
        return 0;
    }
    if k == 0 || k == n {
        return 1;
    }

    let k = k.min(n - k);
    let mut result: u128 = 1;
    for i in 0..k {
        result = result * (n - i) as u128 / (i + 1) as u128;
        if result > usize::MAX as u128 {
            return usize::MAX;
        }
    }

    result as usize
}

/// Resolves iteration budget; `0` means default `10_000`.
pub(crate) fn default_iterations(iterations: u32) -> usize {
    if iterations == 0 {
        10000
    } else {
        iterations as usize
    }
}

/// Iterates all `k`-card combinations from `cards`.
pub(crate) fn for_each_combination<F>(cards: &[Card], k: usize, mut callback: F)
where
    F: FnMut(&[Card]),
{
    if k > cards.len() {
        return;
    }

    if k == 0 {
        callback(&[]);
        return;
    }

    let mut selected = Vec::with_capacity(k);

    fn recurse<F>(
        cards: &[Card],
        k: usize,
        start: usize,
        selected: &mut Vec<Card>,
        callback: &mut F,
    ) where
        F: FnMut(&[Card]),
    {
        if selected.len() == k {
            callback(selected);
            return;
        }

        let remaining_needed = k - selected.len();
        let end = cards.len() - remaining_needed;
        for idx in start..=end {
            selected.push(cards[idx]);
            recurse(cards, k, idx + 1, selected, callback);
            selected.pop();
        }
    }

    recurse(cards, k, 0, &mut selected, &mut callback);
}
