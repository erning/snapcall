use std::process::ExitCode;

use clap::{Parser, Subcommand};
use rs_poker::core::{FlatHand, Rankable};
use snapcall_core::estimate_equity;

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

fn main() -> ExitCode {
    let cli = Cli::parse();

    let result = match cli.command {
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
    };

    match result {
        Ok(()) => ExitCode::SUCCESS,
        Err(msg) => {
            eprintln!("Error: {msg}");
            ExitCode::FAILURE
        }
    }
}

fn run_evaluate_command(hand: &str) -> Result<(), String> {
    let cleaned: String = hand
        .chars()
        .filter(|c| !c.is_whitespace() && *c != ',')
        .collect();

    let fh = FlatHand::new_from_str(&cleaned)
        .map_err(|e| format!("parsing hand '{}': {:?}", hand, e))?;

    if fh.len() < 5 || fh.len() > 7 {
        return Err(format!("hand must have 5-7 cards, got {}", fh.len()));
    }

    println!("Rank: {:?}", fh.rank());
    Ok(())
}

fn run_equity_command(
    board: Option<String>,
    hero: String,
    villains: Vec<String>,
    villain_count: Option<usize>,
    iterations: u32,
) -> Result<(), String> {
    let count = villain_count.unwrap_or(villains.len());
    if count == 0 {
        return Err("provide at least one opponent via --villain or --villain-count".to_string());
    }

    let board_str = board.unwrap_or_default();
    let mut villains_str: Vec<&str> = villains.iter().map(|s| s.as_str()).collect();
    while villains_str.len() < count {
        villains_str.push("");
    }

    let result = estimate_equity(&board_str, &hero, &villains_str, iterations as usize)
        .map_err(|e| format!("calculating equity: {e}"))?;

    println!("Computation:");
    println!("  Mode: {}", result.mode);
    println!("  Samples: {}", result.samples);
    println!();

    println!("Equity Results:");
    println!("  Hero:      {:.2}%", result.equities[0]);
    for (i, eq) in result.equities[1..].iter().enumerate() {
        println!("  Villain {}: {:.2}%", i + 1, eq);
    }
    Ok(())
}

fn run_pot_odds_command(pot_size: f64, call_amount: f64) -> Result<(), String> {
    if pot_size <= 0.0 {
        return Err(format!("pot size must be positive, got {}", pot_size));
    }
    if call_amount <= 0.0 {
        return Err(format!("call amount must be positive, got {}", call_amount));
    }

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
    Ok(())
}
