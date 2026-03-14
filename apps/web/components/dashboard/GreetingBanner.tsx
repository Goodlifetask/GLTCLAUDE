'use client';

import { useAuthStore } from '../../store/auth';
import { format } from 'date-fns';

export function GreetingBanner() {
  const user = useAuthStore((s) => s.user);
  const hour = new Date().getHours();

  const greeting =
    hour < 12 ? 'Good morning' :
    hour < 17 ? 'Good afternoon' :
                'Good evening';

  const firstName = user?.name?.split(' ')[0] ?? 'there';

  return (
    <div
      className="rounded-lg px-6 py-5"
      style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))' }}
    >
      <p className="text-white/80 text-sm font-medium">
        {format(new Date(), 'EEEE, MMMM d')}
      </p>
      <h1 className="text-white font-display font-bold text-2xl mt-1">
        {greeting}, {firstName} 👋
      </h1>
      <p className="text-white/70 text-sm mt-1">
        Here&apos;s what you have on for today.
      </p>
    </div>
  );
}
