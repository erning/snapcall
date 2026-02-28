# cli/

**Overview:** `snapcall` CLI binary for running the engine locally (smoke tests + debugging).

## ENTRY POINT

- `cli/src/main.rs` (clap derive)

## COMMANDS

```bash
# Evaluate a 5-7 card hand rank
cargo run --bin snapcall -- eval "AsKsQsJsTs"

# Equity: hero is required; one or more villains via -V; optionally pad with -n
cargo run --bin snapcall -- equity -H "AcKs" -V "KQs" -V "99" -V "22+" -b "5c6c7c8h" -i 100000
cargo run --bin snapcall -- equity -H "Ah" -V "" -i 5000
cargo run --bin snapcall -- equity -H "AhAd" -V "KhKd" -n 3 -i 10000

# Pot odds
cargo run --bin snapcall -- pot-odds --pot-size 300 --call-amount 75
```

## BEHAVIOR NOTES

- `eval`: strips whitespace/commas before parsing (`FlatHand::new_from_str`).
- `equity`: if `--villain-count/-n` is larger than provided villains, missing villains are treated as unknown hands (`""`).
- Output prints computation mode (`exact` vs `monte_carlo`) plus sample count.

## ANTI-PATTERNS

- Do not document `-p` player flags for this CLI; equity uses `-H/--hero` and `-V/--villain`.
