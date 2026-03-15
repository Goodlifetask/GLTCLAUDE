export type ReminderType = 'call' | 'task' | 'email' | 'location' | 'event';

export type ReminderStatus = 'pending' | 'completed' | 'snoozed' | 'deleted';

export type ReminderPriority = 'low' | 'medium' | 'high' | 'urgent';

export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';

export interface RecurrenceRule {
  id: string;
  frequency: RecurrenceFrequency;
  interval: number;             // Every N days/weeks/months/years
  daysOfWeek: number[];         // 0=Sun, 1=Mon, ..., 6=Sat
  dayOfMonth: number | null;    // 1-31
  monthOfYear: number | null;   // 1-12
  endDate: Date | null;
  maxOccurrences: number | null;
  rruleString: string;          // RFC 5545 RRULE string
}

export interface Contact {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  avatarUrl: string | null;
}

export interface Location {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  triggerType: 'enter' | 'exit';
}

export interface ReminderList {
  id: string;
  userId: string;
  name: string;
  color: string;
  icon: string;
  isSystem: boolean;
  reminderCount: number;
}

// Type-specific metadata stored in JSONB
export interface CallReminderMeta {
  phoneNumber: string;
  repeatUntilAnswered: boolean;
  maxRepeatCount: number;
}

export interface TaskReminderMeta {
  subTasks: Array<{ id: string; title: string; completed: boolean }>;
  estimatedMinutes: number | null;
}

export interface EmailReminderMeta {
  recipientEmail: string;
  subject: string | null;
  draftBody: string | null;
}

export interface LocationReminderMeta {
  locationId: string;
}

export interface EventReminderMeta {
  calendarEventId: string | null;
  rsvpStatus: 'pending' | 'accepted' | 'declined' | null;
  guests: Array<{ email: string; name: string }>;
  meetingUrl: string | null;
}

export type ReminderMetadata =
  | CallReminderMeta
  | TaskReminderMeta
  | EmailReminderMeta
  | LocationReminderMeta
  | EventReminderMeta;

export interface Reminder {
  id: string;
  userId: string;
  listId: string | null;
  type: ReminderType;
  title: string;
  notes: string | null;
  status: ReminderStatus;
  priority: ReminderPriority;
  category: string | null;
  fireAt: Date;
  snoozedUntil: Date | null;
  completedAt: Date | null;
  recurrence: RecurrenceRule | null;
  contact: Contact | null;
  location: Location | null;
  metadata: ReminderMetadata | null;
  createdAt: Date;
  updatedAt: Date;
}

// System category names
export type SystemCategory =
  | 'Work'
  | 'Personal'
  | 'Health'
  | 'Finance'
  | 'Family'
  | 'Travel'
  | 'Shopping'
  | 'Education';

export const SYSTEM_CATEGORIES: SystemCategory[] = [
  'Work', 'Personal', 'Health', 'Finance',
  'Family', 'Travel', 'Shopping', 'Education',
];
