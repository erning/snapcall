use clap::{Parser, Subcommand};
use snapcall_core::{calculate_equity, evaluate_hand, hand_type_name, parse_cards, Card, Suit};

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

        /// Total number of players (fills remaining slots with random hands)
        #[arg(short = 'n', long = "player-count")]
        player_count: Option<usize>,

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
            player_count,
            board,
            iterations,
        } => {
            // Extend player list with empty strings if player_count is specified
            let mut player = player;
            if let Some(count) = player_count {
                if count < player.len() {
                    eprintln!(
                        "Error: player-count ({}) cannot be less than number of -p arguments ({})",
                        count,
                        player.len()
                    );
                    return;
                }
                // Fill remaining slots with empty strings (random hands)
                while player.len() < count {
                    player.push(String::new());
                }
            }

            let board_str = board.unwrap_or_default();

            match calculate_equity(&player, &board_str, iterations) {
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
