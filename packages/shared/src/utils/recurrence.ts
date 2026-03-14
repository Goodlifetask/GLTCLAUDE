import type { RecurrenceRule, RecurrenceFrequency } from '../types/reminder';

/**
 * Builds an RFC 5545 RRULE string from a RecurrenceRule object.
 * Example output: "RRULE:FREQ=WEEKLY;INTERVAL=1;BYDAY=MO,WE,FR;UNTIL=20261231T000000Z"
 */
export function buildRRuleString(rule: Omit<RecurrenceRule, 'id' | 'rruleString'>): string {
  const parts: string[] = [];

  const freqMap: Record<RecurrenceFrequency, string> = {
    daily:   'DAILY',
    weekly:  'WEEKLY',
    monthly: 'MONTHLY',
    yearly:  'YEARLY',
    custom:  'DAILY', // custom uses interval on daily freq
  };

  parts.push(`FREQ=${freqMap[rule.frequency]}`);

  if (rule.interval > 1) {
    parts.push(`INTERVAL=${rule.interval}`);
  }

  if (rule.daysOfWeek.length > 0 && rule.frequency === 'weekly') {
    const days = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
    const byDay = rule.daysOfWeek.map((d) => days[d]).join(',');
    parts.push(`BYDAY=${byDay}`);
  }

  if (rule.dayOfMonth && rule.frequency === 'monthly') {
    parts.push(`BYMONTHDAY=${rule.dayOfMonth}`);
  }

  if (rule.monthOfYear && rule.frequency === 'yearly') {
    parts.push(`BYMONTH=${rule.monthOfYear}`);
  }

  if (rule.endDate) {
    const until = rule.endDate
      .toISOString()
      .replace(/[-:]/g, '')
      .split('.')[0] + 'Z';
    parts.push(`UNTIL=${until}`);
  }

  if (rule.maxOccurrences) {
    parts.push(`COUNT=${rule.maxOccurrences}`);
  }

  return `RRULE:${parts.join(';')}`;
}

/**
 * Computes the next fire time for a recurring reminder.
 * Returns null if the recurrence has ended.
 */
export function getNextFireTime(
  currentFireAt: Date,
  rule: RecurrenceRule,
  now: Date = new Date()
): Date | null {
  if (rule.endDate && now > rule.endDate) return null;

  const next = new Date(currentFireAt);

  switch (rule.frequency) {
    case 'daily':
    case 'custom':
      next.setDate(next.getDate() + rule.interval);
      break;
    case 'weekly':
      next.setDate(next.getDate() + 7 * rule.interval);
      break;
    case 'monthly':
      next.setMonth(next.getMonth() + rule.interval);
      break;
    case 'yearly':
      next.setFullYear(next.getFullYear() + rule.interval);
      break;
  }

  if (rule.endDate && next > rule.endDate) return null;
  return next;
}

/**
 * Human-readable description of a recurrence rule.
 * Example: "Every Monday and Wednesday at 9:30 AM"
 */
export function describeRecurrence(rule: RecurrenceRule): string {
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  switch (rule.frequency) {
    case 'daily':
      return rule.interval === 1 ? 'Every day' : `Every ${rule.interval} days`;
    case 'weekly': {
      const days = rule.daysOfWeek.map((d) => dayNames[d]).join(', ');
      if (rule.interval === 1) return days ? `Every ${days}` : 'Every week';
      return `Every ${rule.interval} weeks on ${days}`;
    }
    case 'monthly':
      return rule.interval === 1 ? 'Every month' : `Every ${rule.interval} months`;
    case 'yearly':
      return 'Every year';
    case 'custom':
      return `Every ${rule.interval} days`;
    default:
      return 'Recurring';
  }
}
