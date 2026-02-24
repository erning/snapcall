use clap::{Parser, Subcommand};
use snapcall_core::{calculate_equity, evaluate_hand, hand_type_name, parse_cards};

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
        /// Player hole cards, comma-separated for each player (e.g., "Ah Ad,Kh Kd")
        #[arg(short = 'p', long)]
        hands: String,

        /// Community cards (optional)
        #[arg(short = 'b', long)]
        board: Option<String>,

        /// Number of Monte Carlo iterations
        #[arg(short = 'i', long, default_value = "10000")]
        iterations: u32,
    },
}

fn main() {
    let cli = Cli::parse();

    match cli.command {
        Commands::Eval { cards } => match parse_cards(&cards) {
            Ok(cards) => match evaluate_hand(&cards) {
                Ok(rank) => {
                    println!(
                        "Hand: {}",
                        cards
                            .iter()
                            .map(|c| format!("{:?}", c))
                            .collect::<Vec<_>>()
                            .join(" ")
                    );
                    println!("Rank: {:?}", rank);
                    println!("Type: {}", hand_type_name(&rank));
                }
                Err(e) => eprintln!("Error evaluating hand: {}", e),
            },
            Err(e) => eprintln!("Error parsing cards: {}", e),
        },
        Commands::Equity {
            hands,
            board,
            iterations,
        } => {
            let player_hands: Vec<_> = hands.split(',').map(|s| s.to_string()).collect();
            let parsed_hands: Result<Vec<_>, _> =
                player_hands.iter().map(|h| parse_cards(h)).collect();

            let parsed_hands = match parsed_hands {
                Ok(h) => h,
                Err(e) => {
                    eprintln!("Error parsing hands: {}", e);
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
