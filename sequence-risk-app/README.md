# Sequence of Returns Risk Demo

Static web app that illustrates how the order of market returns interacts with a steady retirement withdrawal plan.

## Running locally

Open `index.html` in a browser (no build step required). Start with an initial balance and a withdrawal rate, pick the
return window, and click **Run Simulation**. Use the green **Random** button to reshuffle the historical order to reshuffle the
returns; the same randomized order is then applied to each strategy so you can see how the guardrails change the outcome.

## Scenarios

- **Random Sequence** – withdrawals interact with market volatility directly.
- **Strategy 1** – zero participation in down years, 50 % participation in gains (Buffett rule).
- **Strategy 2** – losses capped at −10 %, gains participate at 75 %.

Historical S&P 500 total returns (1970–2022) are embedded in `script.js`. Swap in your preferred dataset for production
use or extend the UI with additional index choices.
