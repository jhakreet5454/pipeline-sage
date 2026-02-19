/**
 * Scoring engine — computes final score per hackathon rules.
 *
 *  Base score       : 100
 *  Speed bonus      : +10  if total time < 5 minutes
 *  Commit penalty   : -2   per commit above 20
 *  Fix bonus        : +2   per successful fix (up to 20)
 *  Iteration penalty: -5   per iteration above 3
 */
export function computeScore({ totalTime, commitCount, fixCount, iterationCount }) {
  let base = 100;
  const breakdown = { base };

  // Speed bonus
  const speedBonus = totalTime < 300_000 ? 10 : 0; // < 5 min in ms
  breakdown.speedBonus = speedBonus;

  // Fix bonus
  const fixBonus = Math.min(fixCount, 20) * 2;
  breakdown.fixBonus = fixBonus;

  // Commit penalty
  const commitPenalty = commitCount > 20 ? (commitCount - 20) * 2 : 0;
  breakdown.commitPenalty = -commitPenalty;

  // Iteration penalty
  const iterPenalty = iterationCount > 3 ? (iterationCount - 3) * 5 : 0;
  breakdown.iterationPenalty = -iterPenalty;

  const total = base + speedBonus + fixBonus - commitPenalty - iterPenalty;
  breakdown.total = Math.max(total, 0);

  return breakdown;
}

/**
 * Format milliseconds into human-readable "Xm Ys" string.
 */
export function formatDuration(ms) {
  const totalSec = Math.round(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return min > 0 ? `${min}m ${sec}s` : `${sec}s`;
}
