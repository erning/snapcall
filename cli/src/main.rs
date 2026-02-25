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
        /// Player hole cards (e.g., -p "Ah Ad" -p "Kh Kd")
        #[arg(short = 'p', long = "player", num_args = 1.., required = true)]
        player: Vec<String>,

        /// Community cards (optional)
        #[arg(short = 'b', long)]
        board: Option<String>,

        /// Number of Monte Carlo iterations
        #[arg(short = 'i', long, default_value = "10000")]
        iterations: u32,
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
            board,
            iterations,
        } => {
            let parsed_hands: Result<Vec<_>, _> = player.iter().map(|h| parse_cards(h)).collect();

            let parsed_hands = match parsed_hands {
                Ok(h) => h,
                Err(e) => {
                    eprintln!("Error parsing player hands: {}", e);
                    return;
                }
            };

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

            println!("Parsed Cards:");
            for (i, hand) in parsed_hands.iter().enumerate() {
                println!(
                    "  Player {}: {}",
                    i + 1,
                    hand.iter().map(format_card).collect::<Vec<_>>().join(" ")
                );
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

            match calculate_equity(&parsed_hands, &parsed_board, iterations) {
                Ok(equities) => {
                    println!("Equity Results ({} iterations):", iterations);
                    for (i, eq) in equities.iter().enumerate() {
                        println!("  Player {}: {:.2}%", i + 1, eq);
                    }
                }
                Err(e) => eprintln!("Error calculating equity: {}", e),
            }
        }
    }
}
