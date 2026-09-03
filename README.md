# 6K + 4 Beers Draft Order

A mobile-first fantasy-football draft-order generator for two runners representing ten managers.

## Live calculator

https://arjungamer123.github.io/easyclient/

## Inputs

The calculator uses only six durations:

1. Arjun's 6K time
2. The other runner's 6K time
3. Arjun's first beer time
4. The other runner's first beer time
5. Arjun's second beer time
6. The other runner's second beer time

Run times accept `28:42` or `2842`. Beer times accept `1:20` or total seconds such as `80`.

The six durations and fixed manager list are converted into a SHA-256 proof. That proof drives a deterministic Fisher–Yates shuffle, so identical times always reproduce the identical order.

There are no locks, timestamps, receipt fields, service logs or automatic messages.
