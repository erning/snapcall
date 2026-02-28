use clap::{Parser, Subcommand};
use rs_poker::core::{FlatHand, Rankable};
use snapcall_core::{estimate_equity, EquityEstimateMode};

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
    #[command(name = "evaluate", alias = "eval")]
    Evaluate {
        /// Hand to evaluate (e.g., "As Ks Qs Js Ts")
        hand: String,
    },
    /// Calculate equity for multiple players
    Equity {
        /// Community cards string with 0/3/4/5 known cards
        #[arg(short = 'b', long = "board")]
        board: Option<String>,

        /// Hero hand as 1 or 2 known cards (e.g., "Ah" or "AhAd")
        #[arg(short = 'H', long = "hero", required = true)]
        hero: String,

        /// One or more villains: unknown / partial / exact / range (e.g., "", "Kh", "KhKd", "TT+")
        #[arg(short = 'V', long = "villain", num_args = 1..)]
        villains: Vec<String>,

        /// Total number of villains (fills missing villains as unknown hands)
        #[arg(short = 'n', long = "villain-count")]
        villain_count: Option<usize>,

        /// Number of Monte Carlo iterations
        #[arg(short = 'i', long, default_value = "100000")]
        iterations: u32,
    },

    /// Calculate pot odds
    PotOdds {
        /// Current pot size before your call (includes opponent action)
        #[arg(short = 'p', long = "pot-size", required = true)]
        pot_size: f64,

        /// Amount you need to call
        #[arg(short = 'c', long = "call-amount", required = true)]
        call_amount: f64,
    },
}

fn main() {
    let cli = Cli::parse();

    match cli.command {
        Commands::Evaluate { hand } => run_evaluate_command(&hand),
        Commands::Equity {
            board,
            hero,
            villains,
            villain_count,
            iterations,
        } => run_equity_command(board, hero, villains, villain_count, iterations),
        Commands::PotOdds {
            pot_size,
            call_amount,
        } => run_pot_odds_command(pot_size, call_amount),
    }
}

fn run_evaluate_command(hand: &str) {
    let cleaned: String = hand
        .chars()
        .filter(|c| !c.is_whitespace() && *c != ',')
        .collect();

    let fh = match FlatHand::new_from_str(&cleaned) {
        Ok(h) => h,
        Err(e) => {
            eprintln!("Error parsing hand '{}': {:?}", hand, e);
            return;
        }
    };

    if fh.len() < 5 || fh.len() > 7 {
        eprintln!("Hand must have 5-7 cards, got {}", fh.len());
        return;
    }

    println!("Rank: {:?}", fh.rank());
}

fn run_equity_command(
    board: Option<String>,
    hero: String,
    villains: Vec<String>,
    villain_count: Option<usize>,
    iterations: u32,
) {
    let count = villain_count.unwrap_or(villains.len());
    if count == 0 {
        eprintln!("Error: provide at least one opponent via --villain or --villain-count");
        return;
    }

    let board_str = board.unwrap_or_default();
    let mut villains_str: Vec<&str> = villains.iter().map(|s| s.as_str()).collect();
    while villains_str.len() < count {
        villains_str.push("");
    }

    match estimate_equity(&board_str, &hero, &villains_str, iterations as usize) {
        Ok(result) => {
            let mode = match result.mode {
                EquityEstimateMode::ExactEnumeration => "exact",
                EquityEstimateMode::MonteCarlo => "monte_carlo",
            };
            println!("Computation:");
            println!("  Mode: {}", mode);
            println!("  Samples: {}", result.samples);
            println!();

            println!("Equity Results:");
            println!("  Hero:      {:.2}%", result.equities[0]);
            for (i, eq) in result.equities[1..].iter().enumerate() {
                println!("  Villain {}: {:.2}%", i + 1, eq);
            }
        }
        Err(e) => eprintln!("Error calculating equity: {}", e),
    }
}

fn run_pot_odds_command(pot_size: f64, call_amount: f64) {
    let total_pot_after_call = pot_size + call_amount;
    let pot_odds_pct = (call_amount / total_pot_after_call) * 100.0;

    println!("Pot Odds Calculation:");
    println!("  Pot Size (Before Call): {:.0}", pot_size);
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
