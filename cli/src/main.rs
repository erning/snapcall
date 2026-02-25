use clap::{Parser, Subcommand};
use rand::prelude::IndexedRandom;
use snapcall_core::{evaluate_hand, hand_type_name, parse_cards, Card, Suit};

#[derive(Parser)]
#[command(name = "snapcall")]
#[command(about = "Texas Hold'em Equity Calculator")]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Evaluate a poker hand
    Eval {
        /// Cards to evaluate (e.g., "As Ks Qs Js Ts")
        cards: String,
    },
    /// Calculate equity for multiple players
    Equity {
        /// Player hole cards or range (e.g., -p "AhAd" -p "AKs" -p "TT+")
        #[arg(short = 'p', long = "player", num_args = 1.., required = true)]
        player: Vec<String>,

        /// Community cards (optional)
        #[arg(short = 'b', long)]
        board: Option<String>,

        /// Number of Monte Carlo iterations
        #[arg(short = 'i', long, default_value = "10000")]
        iterations: u32,
    },
    /// Calculate pot odds
    PotOdds {
        /// Current pot size (before opponent's bet)
        #[arg(short = 'p', long, required = true)]
        pot: f64,

        /// Opponent's bet amount
        #[arg(short = 'b', long, required = true)]
        bet: f64,

        /// Your call amount (defaults to opponent's bet)
        #[arg(short = 'c', long)]
        call: Option<f64>,
    },
}

/// Format a card in human-friendly format with Unicode suit symbols (not emoji)
///
/// Examples:
/// - Ah → "A♥"
/// - Ks → "K♠"
/// - Tc → "T♣"
/// - 8d → "8♦"
fn format_card(card: &Card) -> String {
    let suit_symbol = match card.suit {
        Suit::Spade => '♠',
        Suit::Heart => '♥',
        Suit::Club => '♣',
        Suit::Diamond => '♦',
    };
    let value_char = card.value.to_char().to_ascii_uppercase();
    format!("{}{}", value_char, suit_symbol)
}

/// Check if input looks like a range expression
/// Range indicators: + (TT+), - (AKs-AQs), s/o suit indicators
fn is_range(input: &str) -> bool {
    let input = input.trim();
    // Range indicators
    input.contains('+')
        || input.contains('-')
        || input.contains(',')
        || (input.len() >= 2 && (input.ends_with('s') || input.ends_with('o')))
}

/// Parse a hand or range into a vector of possible hands
/// Returns Vec<Vec<Card>> where each inner Vec is a possible hand (2 cards)
fn parse_hand_or_range(input: &str) -> Result<Vec<Vec<Card>>, String> {
    if is_range(input) {
        // Use rs_poker's RangeParser
        use rs_poker::holdem::RangeParser;

        let flat_hands = RangeParser::parse_many(input)
            .map_err(|e| format!("Failed to parse range '{}': {:?}", input, e))?;

        // Convert FlatHand to Vec<Card>
        let hands: Vec<Vec<Card>> = flat_hands
            .into_iter()
            .map(|fh: rs_poker::core::FlatHand| fh.iter().copied().collect())
            .collect();

        if hands.is_empty() {
            return Err(format!("Range '{}' produced no valid hands", input));
        }

        Ok(hands)
    } else {
        // Parse as specific cards
        let cards = parse_cards(input).map_err(|e| format!("{:?}", e))?;
        if cards.len() != 2 {
            return Err(format!(
                "Expected exactly 2 cards for a hand, got {}",
                cards.len()
            ));
        }
        Ok(vec![cards])
    }
}

fn main() {
    let cli = Cli::parse();

    match cli.command {
        Commands::Eval { cards } => match parse_cards(&cards) {
            Ok(cards) => match evaluate_hand(&cards) {
                Ok(rank) => {
                    println!(
                        "Hand: {}",
                        cards.iter().map(format_card).collect::<Vec<_>>().join(" ")
                    );
                    println!("Rank: {:?}", rank);
                    println!("Type: {}", hand_type_name(&rank));
                }
                Err(e) => eprintln!("Error evaluating hand: {}", e),
            },
            Err(e) => eprintln!("Error parsing cards: {}", e),
        },
        Commands::Equity {
            player,
            board,
            iterations,
        } => {
            // Parse each player's hand or range
            let player_ranges: Vec<Vec<Vec<Card>>> = match player
                .iter()
                .map(|p| parse_hand_or_range(p))
                .collect::<Result<Vec<_>, _>>()
            {
                Ok(ranges) => ranges,
                Err(e) => {
                    eprintln!("Error: {}", e);
                    return;
                }
            };

            // Parse board
            let parsed_board = match board {
                Some(b) => match parse_cards(&b) {
                    Ok(c) => c,
                    Err(e) => {
                        eprintln!("Error parsing board: {}", e);
                        return;
                    }
                },
                None => vec![],
            };

            // Print parsed info
            println!("Player Ranges:");
            for (i, range) in player_ranges.iter().enumerate() {
                if range.len() == 1 {
                    println!(
                        "  Player {}: {}",
                        i + 1,
                        range[0]
                            .iter()
                            .map(format_card)
                            .collect::<Vec<_>>()
                            .join(" ")
                    );
                } else {
                    println!("  Player {}: {} combos (range)", i + 1, range.len());
                    // Show first few examples
                    let examples: Vec<_> = range.iter().take(3).collect();
                    for (j, hand) in examples.iter().enumerate() {
                        println!(
                            "    Example {}: {}",
                            j + 1,
                            hand.iter().map(format_card).collect::<Vec<_>>().join(" ")
                        );
                    }
                    if range.len() > 3 {
                        println!("    ... and {} more", range.len() - 3);
                    }
                }
            }
            if !parsed_board.is_empty() {
                println!(
                    "  Board: {}",
                    parsed_board
                        .iter()
                        .map(format_card)
                        .collect::<Vec<_>>()
                        .join(" ")
                );
            }
            println!();

            // Calculate equity with range sampling
            match calculate_equity_with_ranges(&player_ranges, &parsed_board, iterations) {
                Ok(equities) => {
                    println!("Equity Results ({} iterations):", iterations);
                    for (i, eq) in equities.iter().enumerate() {
                        println!("  Player {}: {:.2}%", i + 1, eq);
                    }
                }
                Err(e) => eprintln!("Error calculating equity: {}", e),
            }
        }
        Commands::PotOdds { pot, bet, call } => {
            let call_amount = call.unwrap_or(bet);
            calculate_pot_odds(pot, bet, call_amount);
        }
    }
}

/// Calculate pot odds and display result
fn calculate_pot_odds(pot: f64, bet: f64, call_amount: f64) {
    let total_pot_after_call = pot + bet + call_amount;
    let pot_odds_pct = (call_amount / total_pot_after_call) * 100.0;

    println!("Pot Odds Calculation:");
    println!("  Current Pot: {:.0}", pot);
    println!("  Opponent Bet: {:.0}", bet);
    println!("  Amount to Call: {:.0}", call_amount);
    println!("  Total Pot After Call: {:.0}", total_pot_after_call);
    println!();
    println!("  Pot Odds: {:.2}%", pot_odds_pct);
    println!();
    println!(
        "  You need at least {:.2}% equity to break even",
        pot_odds_pct
    );
}

/// Calculate equity with range support
/// Each iteration randomly samples one hand from each player's range
fn calculate_equity_with_ranges(
    player_ranges: &[Vec<Vec<Card>>],
    board: &[Card],
    iterations: u32,
) -> Result<Vec<f64>, String> {
    let mut rng = rand::rng();
    let num_players = player_ranges.len();
    let mut wins: Vec<u64> = vec![0; num_players];
    let iters = iterations as usize;

    for _ in 0..iters {
        // Sample one hand from each player's range
        let sampled_hands: Vec<Vec<Card>> = player_ranges
            .iter()
            .map(|range| range.choose(&mut rng).unwrap().clone())
            .collect();

        // Check for card collisions (same card used by different players)
        let mut all_cards = std::collections::HashSet::new();
        let mut collision = false;
        for hand in &sampled_hands {
            for card in hand {
                if !all_cards.insert(*card) {
                    collision = true;
                    break;
                }
            }
            if collision {
                break;
            }
        }

        if collision {
            // Skip this iteration due to card collision
            continue;
        }

        // Calculate equity for this sample
        match snapcall_core::calculate_equity(&sampled_hands, board, 1) {
            Ok(eq) => {
                // Add weighted wins
                for (i, e) in eq.iter().enumerate() {
                    // e is percentage (0-100), convert to win contribution
                    if *e > 50.0 {
                        wins[i] += 1;
                    } else if (*e - 50.0).abs() < f64::EPSILON {
                        // Tie - split the win
                        wins[i] += 1;
                    }
                }
            }
            Err(_) => continue,
        }
    }

    // Convert to percentages
    let total: u64 = wins.iter().sum();
    if total == 0 {
        let n = num_players;
        return Ok(vec![100.0 / n as f64; n]);
    }

    Ok(wins
        .iter()
        .map(|&w| (w as f64 / total as f64) * 100.0)
        .collect())
}
