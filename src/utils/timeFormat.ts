/**
 * Utility functions for displaying, formatting, and converting process timers into hours
 * Requirement: "all timers in hours"
 */

/**
 * Formats seconds into HH:MM:SS format and decimal hours representation
 * Examples:
 *   300s (5m)  -> { hhmmss: "00:05:00", decimalHours: "0.083 hrs", shortHours: "0.08h", fullDisplay: "00:05:00 (0.083 hrs)" }
 *   900s (15m) -> { hhmmss: "00:15:00", decimalHours: "0.250 hrs", shortHours: "0.25h", fullDisplay: "00:15:00 (0.250 hrs)" }
 *   3600s (1h) -> { hhmmss: "01:00:00", decimalHours: "1.000 hrs", shortHours: "1.00h", fullDisplay: "01:00:00 (1.000 hrs)" }
 */
export function formatTimerInHours(seconds: number) {
  const totalSecs = Math.max(0, Math.floor(seconds || 0));
  const hrs = Math.floor(totalSecs / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  const secs = totalSecs % 60;

  const hh = hrs.toString().padStart(2, '0');
  const mm = mins.toString().padStart(2, '0');
  const ss = secs.toString().padStart(2, '0');

  const hhmmss = `${hh}:${mm}:${ss}`;
  const hoursDecimalVal = Number((totalSecs / 3600).toFixed(3));
  const hoursTwoDecVal = Number((totalSecs / 3600).toFixed(2));

  const decimalHours = `${hoursDecimalVal.toFixed(3)} hrs`;
  const shortHours = `${hoursTwoDecVal.toFixed(2)}h`;
  const fullDisplay = `${hhmmss} (${decimalHours})`;

  return {
    hh,
    mm,
    ss,
    hhmmss,
    decimalHours,
    shortHours,
    hoursTwoDec: `${hoursTwoDecVal.toFixed(2)} hrs`,
    fullDisplay,
    hoursValue: hoursDecimalVal,
  };
}

/**
 * Convert hours to seconds
 */
export function hoursToSeconds(hours: number): number {
  return Math.max(0, Math.round((hours || 0) * 3600));
}

/**
 * Convert seconds to decimal hours (fixed to specified decimal places)
 */
export function secondsToDecimalHours(seconds: number, decimals: number = 2): string {
  const s = Math.max(0, seconds || 0);
  return (s / 3600).toFixed(decimals);
}
