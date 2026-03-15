export type ReminderType = 'call' | 'task' | 'email' | 'location' | 'event';
export type Priority = 'low' | 'medium' | 'high' | 'urgent';

export interface VoiceParsedReminder {
  type: ReminderType;
  title: string;
  date: string;  // YYYY-MM-DD
  time: string;  // HH:MM
  priority: Priority;
}

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const pad = (n: number) => String(n).padStart(2, '0');

function detectType(text: string): ReminderType {
  const l = text.toLowerCase();
  if (/\b(call|phone|ring|dial|phone call|voice call)\b/.test(l)) return 'call';
  if (/\b(email|e-mail|send an email|write an email|send a message)\b/.test(l)) return 'email';
  if (/\b(meeting|appointment|event|conference|interview|party|dinner|lunch|breakfast|session|webinar|seminar)\b/.test(l)) return 'event';
  if (/\b(location|when i (arrive|get to|reach))\b/.test(l)) return 'location';
  return 'task';
}

function extractPriority(text: string): { priority: Priority; text: string } {
  if (/\b(urgent|asap|immediately|critical|emergency|top priority)\b/i.test(text))
    return { priority: 'urgent', text: text.replace(/\b(urgent|asap|immediately|critical|emergency|top priority)\b/gi, '') };
  if (/\b(high priority|important|crucial|must do)\b/i.test(text))
    return { priority: 'high', text: text.replace(/\b(high priority|important|crucial|must do)\b/gi, '') };
  if (/\b(low priority|no rush|whenever)\b/i.test(text))
    return { priority: 'low', text: text.replace(/\b(low priority|no rush|whenever)\b/gi, '') };
  return { priority: 'medium', text };
}

function extractDateTime(text: string): { date: string; time: string; text: string } {
  const now = new Date();
  const target = new Date(now);
  let s = text.toLowerCase();
  let timeSet = false;

  // === DATE ===
  if (/\bday after tomorrow\b/.test(s)) {
    target.setDate(target.getDate() + 2);
    s = s.replace(/\bday after tomorrow\b/, '');
  } else if (/\btomorrow\b/.test(s)) {
    target.setDate(target.getDate() + 1);
    s = s.replace(/\btomorrow\b/, '');
  } else if (/\btoday\b/.test(s)) {
    s = s.replace(/\btoday\b/, '');
  } else {
    // "next/this/on monday" or just "monday"
    const dayMatch = s.match(/\b(next|this|on)?\s*(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/);
    if (dayMatch) {
      const targetDay = DAY_NAMES.indexOf(dayMatch[2]!);
      const curDay = now.getDay();
      let ahead = (targetDay - curDay + 7) % 7;
      if (ahead === 0) ahead = 7; // same weekday → next week
      target.setDate(target.getDate() + ahead);
      s = s.replace(dayMatch[0]!, '');
    } else {
      const inDays = s.match(/\bin\s+(\d+)\s+(days?)\b/);
      if (inDays) {
        target.setDate(target.getDate() + parseInt(inDays[1]!));
        s = s.replace(inDays[0]!, '');
      }
    }
  }

  // === RELATIVE TIME ===
  const inHours = s.match(/\bin\s+(\d+)\s+(hours?|hrs?)\b/);
  if (inHours) {
    const future = new Date(now.getTime() + parseInt(inHours[1]!) * 3_600_000);
    target.setFullYear(future.getFullYear(), future.getMonth(), future.getDate());
    target.setHours(future.getHours(), future.getMinutes(), 0, 0);
    s = s.replace(inHours[0]!, '');
    timeSet = true;
  }

  const inMins = s.match(/\bin\s+(\d+)\s+(minutes?|mins?)\b/);
  if (inMins && !timeSet) {
    const future = new Date(now.getTime() + parseInt(inMins[1]!) * 60_000);
    target.setFullYear(future.getFullYear(), future.getMonth(), future.getDate());
    target.setHours(future.getHours(), future.getMinutes(), 0, 0);
    s = s.replace(inMins[0]!, '');
    timeSet = true;
  }

  // === CLOCK TIME "at 3pm" / "at 3:30" ===
  if (!timeSet) {
    const atTime = s.match(/\bat\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
    if (atTime) {
      let h = parseInt(atTime[1]!);
      const m = atTime[2] ? parseInt(atTime[2]) : 0;
      const mer = (atTime[3] || '').toLowerCase();
      if (mer === 'pm' && h < 12) h += 12;
      else if (mer === 'am' && h === 12) h = 0;
      else if (!mer && h >= 1 && h <= 6) h += 12; // "at 3" → assume 3pm
      target.setHours(h, m, 0, 0);
      s = s.replace(atTime[0]!, '');
      timeSet = true;
    }
  }

  // === TIME-OF-DAY WORDS ===
  if (!timeSet) {
    const tow: [RegExp, number, number][] = [
      [/\bearly morning\b/, 7, 0],
      [/\bmorning\b/, 9, 0],
      [/\bnoon\b/, 12, 0],
      [/\bafternoon\b/, 14, 0],
      [/\bevening\b/, 18, 0],
      [/\bnight\b/, 20, 0],
      [/\bmidnight\b/, 0, 0],
    ];
    for (const [pattern, h, m] of tow) {
      if (pattern.test(s)) {
        target.setHours(h, m, 0, 0);
        s = s.replace(pattern, '');
        timeSet = true;
        break;
      }
    }
  }

  // Default: next round hour
  if (!timeSet) {
    target.setHours(now.getHours() + 1, 0, 0, 0);
  }

  // If still in the past, push forward one day
  if (target.getTime() <= now.getTime()) {
    target.setDate(target.getDate() + 1);
  }

  const date = `${target.getFullYear()}-${pad(target.getMonth() + 1)}-${pad(target.getDate())}`;
  const time = `${pad(target.getHours())}:${pad(target.getMinutes())}`;

  return { date, time, text: s.replace(/\s+/g, ' ').trim() };
}

function cleanTitle(text: string): string {
  return text
    .replace(/\b(please\s+)?(remind me to|remind me|set a reminder (to|for)|set a|add a|create a|schedule a|schedule|i need to|i have to|make sure to|don't forget to|don't forget|note to self)\b/gi, '')
    .replace(/\b(the|a|an)\s*$/i, '')
    .replace(/[,.\s]+$/, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^(.)/, (_, c: string) => c.toUpperCase());
}

export function parseVoiceTranscript(transcript: string): VoiceParsedReminder {
  const text = transcript.trim();
  const type = detectType(text);
  const { priority, text: t1 } = extractPriority(text);
  const { date, time, text: t2 } = extractDateTime(t1);
  const title = cleanTitle(t2) || cleanTitle(text) || transcript;
  return { type, title, date, time, priority };
}
