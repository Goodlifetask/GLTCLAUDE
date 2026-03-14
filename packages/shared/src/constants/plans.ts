import type { UserPlan } from '../types/user';

export interface PlanConfig {
  name: string;
  price: number;      // USD/month
  reminderLimit: number;  // -1 = unlimited
  features: string[];
  stripeMonthlyPriceId?: string;
  stripeYearlyPriceId?: string;
}

export const PLAN_CONFIG: Record<UserPlan, PlanConfig> = {
  free: {
    name: 'Free',
    price: 0,
    reminderLimit: 20,
    features: [
      'Up to 20 reminders',
      'Basic reminder types',
      'Push notifications',
    ],
  },
  pro: {
    name: 'Pro',
    price: 9.99,
    reminderLimit: -1,
    features: [
      'Unlimited reminders',
      'All 5 reminder types',
      'Calendar sync (Google, Outlook, iCloud)',
      'Voice assistant integration (Alexa, Google, Siri)',
      'Rich push notifications',
      'All colour themes',
      'Priority email support',
    ],
    stripeMonthlyPriceId: process.env['STRIPE_PRO_MONTHLY_PRICE_ID'],
    stripeYearlyPriceId: process.env['STRIPE_PRO_YEARLY_PRICE_ID'],
  },
  team: {
    name: 'Team',
    price: 24.99,
    reminderLimit: -1,
    features: [
      'Everything in Pro',
      'Shared reminder lists',
      'Team collaboration',
      'Workspace management',
      'Priority support',
      'Team analytics',
    ],
    stripeMonthlyPriceId: process.env['STRIPE_TEAM_MONTHLY_PRICE_ID'],
    stripeYearlyPriceId: process.env['STRIPE_TEAM_YEARLY_PRICE_ID'],
  },
};

export function canCreateReminder(plan: UserPlan, currentCount: number): boolean {
  const limit = PLAN_CONFIG[plan].reminderLimit;
  if (limit === -1) return true;
  return currentCount < limit;
}

export function planHasCalendarSync(plan: UserPlan): boolean {
  return plan === 'pro' || plan === 'team';
}

export function planHasVoiceAssistants(plan: UserPlan): boolean {
  return plan === 'pro' || plan === 'team';
}

export function planHasTeamFeatures(plan: UserPlan): boolean {
  return plan === 'team';
}
