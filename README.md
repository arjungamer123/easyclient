# 6K + 4 Beers Draft Lottery

A mobile-first fantasy-football draft-order generator for two runners representing ten managers.

## Live calculator

https://raw.githack.com/arjungamer123/easyclient/main/index.html

## Event protocol

1. Generate and share the pre-run lock code.
2. Record both exact 6K elapsed times.
3. At the bar, tap each beer card when that glass is served—two beers per runner.
4. Enter the bar name, receipt/check reference and printed pre-tip total.
5. Reveal the order and share the verification link.

The calculator normalizes the evidence, creates a SHA-256 proof and uses the digest to drive a deterministic Fisher–Yates shuffle. Identical evidence always reproduces the same order.

Drinking speed is not scored. Non-alcoholic beer works identically.
