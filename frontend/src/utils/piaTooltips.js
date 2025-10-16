// piaTooltips.js
// Developer-ready constants module with typed exports.

export const tooltips = {
  pia: {
    doubleHit: {
      short: {
        title: "Why did my PIA change?",
        text:
          "Claiming early cuts your check, and stopping work adds zeros to your 35-year average—both reduce your PIA.",
      },
      medium: {
        title: "The double hit",
        text:
          "SSA assumes your last income repeats to 67. If you stop at 62, those years become zeros and you also take the ~30% early-claim cut. Result: a lower PIA.",
      },
      compact: {
        title: "Why working to 67 matters",
        text:
          "SSA projects your latest earnings through FRA. If you stop at 62, 62–67 become zeros and you also get the ~30% early-claim reduction. Keep earning (even part-time) to replace low/zero years and raise your PIA.",
      },
    },
  },
};

export const labels = {
  toggle: {
    ssaProjection: "Assume SSA projection (repeat last year to 67)",
    stopAt62: "Stop work at 62 (zeros 62–67)",
  },
  banner: {
    summary:
      "Loaded: {file} • Years: {yearsCount} • Zeros in top-35: {zeroCount} • 61–67: {status}",
  },
};
