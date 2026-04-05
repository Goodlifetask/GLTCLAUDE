/**
 * Minimal RRule helper for workers.
 * Returns the next occurrence after `after` date for a given rrule string.
 * Returns null if no next occurrence (rule ended or invalid).
 */

export function parseRRule(_rule: string): boolean {
  return true; // placeholder — real parsing done by rrule lib if available
}

export function nextOccurrence(rruleString: string, after: Date): Date | null {
  try {
    // Dynamically require rrule — if not installed, return null gracefully
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { RRule } = require('rrule');
    const rule = RRule.fromString(rruleString);
    return rule.after(after, false) ?? null;
  } catch {
    return null;
  }
}
