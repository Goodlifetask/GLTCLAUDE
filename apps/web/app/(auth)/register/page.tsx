'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Bell, Eye, EyeOff, CheckSquare } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { api } from '../../../lib/api';
import { useAuthStore } from '../../../store/auth';
import toast from 'react-hot-toast';

const schema = z.object({
  name:     z.string().min(2, 'Name must be at least 2 characters').max(100),
  email:    z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});
type FormData = z.infer<typeof schema>;

type AccountType = 'individual' | 'family' | 'team' | 'community';

const ACCOUNT_TYPES: {
  type: AccountType;
  emoji: string;
  title: string;
  description: string;
  route: string;
}[] = [
  {
    type: 'individual',
    emoji: '👤',
    title: 'Individual',
    description: 'Just for me. Personal reminders, tasks and events.',
    route: '/onboarding',
  },
  {
    type: 'family',
    emoji: '👨‍👩‍👧‍👦',
    title: 'Family',
    description: 'For my household. Share and assign tasks with family members.',
    route: '/onboarding/family-setup',
  },
  {
    type: 'team',
    emoji: '🏢',
    title: 'Team',
    description: 'For work. Collaborate with colleagues on projects and deadlines.',
    route: '/onboarding/team-setup',
  },
  {
    type: 'community',
    emoji: '🏘️',
    title: 'Community',
    description: 'For my group. Coordinate activities and reminders together.',
    route: '/onboarding/community-setup',
  },
];

export default function RegisterPage() {
  const router = useRouter();
  const { setUser, setAccessToken } = useAuthStore();
  const [showPw, setShowPw] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [hoveredType, setHoveredType] = useState<AccountType | null>(null);
  const [savingType, setSavingType] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const mutation = useMutation({
    mutationFn: (data: FormData) => api.auth.register(data),
    onSuccess: (res: any) => {
      const u = res.data.user;
      setUser({ ...u, avatarUrl: u.avatar_url ?? null });
      setAccessToken(res.data.tokens.access_token);
      toast.success('Account created! Welcome to GoodLifeTask.');
      setStep(2);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? 'Registration failed');
    },
  });

  async function handleAccountTypeSelect(type: AccountType, route: string) {
    if (savingType) return;
    setSavingType(true);
    try {
      await api.users.updateProfile({ profileCategory: type });
    } catch {
      // non-critical, continue
    } finally {
      setSavingType(false);
    }
    router.push(route);
  }

  if (step === 2) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(160deg, #fffaf7 0%, #fff4ed 45%, #fef0e6 100%)',
        padding: '32px 16px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Decorative blobs */}
        <div style={{
          position: 'absolute', top: -120, right: -120,
          width: 400, height: 400, borderRadius: '50%',
          background: 'radial-gradient(circle, color-mix(in srgb, var(--color-primary) 12%, transparent) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: -100, left: -100,
          width: 350, height: 350, borderRadius: '50%',
          background: 'radial-gradient(circle, color-mix(in srgb, var(--color-primary) 8%, transparent) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Brand header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'var(--color-primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px color-mix(in srgb, var(--color-primary) 35%, transparent)',
          }}>
            <CheckSquare size={20} color="#fff" />
          </div>
          <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-text)', letterSpacing: '-0.01em' }}>
            GoodLifeTask
          </span>
        </div>

        {/* Card */}
        <div style={{
          width: '100%',
          maxWidth: 560,
          background: '#fff',
          borderRadius: 24,
          boxShadow: '0 8px 48px rgba(0,0,0,0.1), 0 2px 8px rgba(0,0,0,0.06)',
          padding: '32px 32px 28px',
        }}>
          {/* Heading */}
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <h2 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 6px', color: 'var(--color-text)', letterSpacing: '-0.01em' }}>
              How will you use GoodLifeTask?
            </h2>
            <p style={{ fontSize: 14, color: 'var(--color-text-muted)', margin: 0 }}>
              This helps us set up the right tools for you
            </p>
          </div>

          {/* 2×2 grid of account type cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 12,
          }}>
            {ACCOUNT_TYPES.map(({ type, emoji, title, description, route }) => {
              const isHovered = hoveredType === type;
              return (
                <button
                  key={type}
                  type="button"
                  disabled={savingType}
                  onClick={() => handleAccountTypeSelect(type, route)}
                  onMouseEnter={() => setHoveredType(type)}
                  onMouseLeave={() => setHoveredType(null)}
                  style={{
                    minWidth: 200,
                    padding: '20px 16px',
                    borderRadius: 16,
                    border: `2px solid ${isHovered ? 'var(--color-primary)' : 'var(--color-border)'}`,
                    background: isHovered
                      ? 'color-mix(in srgb, var(--color-primary) 8%, transparent)'
                      : '#fff',
                    cursor: savingType ? 'not-allowed' : 'pointer',
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 10,
                    transition: 'all 0.18s cubic-bezier(.4,0,.2,1)',
                    boxShadow: isHovered
                      ? '0 4px 20px color-mix(in srgb, var(--color-primary) 18%, transparent)'
                      : '0 1px 4px rgba(0,0,0,0.05)',
                    opacity: savingType ? 0.7 : 1,
                  }}
                >
                  <span style={{ fontSize: 36, lineHeight: 1 }}>{emoji}</span>
                  <span style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: isHovered ? 'var(--color-primary)' : 'var(--color-text)',
                    transition: 'color 0.18s',
                  }}>
                    {title}
                  </span>
                  <span style={{
                    fontSize: 12,
                    color: 'var(--color-text-muted)',
                    lineHeight: 1.5,
                  }}>
                    {description}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Skip link */}
          <div style={{ textAlign: 'center', marginTop: 20 }}>
            <Link
              href="/onboarding"
              style={{
                fontSize: 13,
                color: 'var(--color-text-muted)',
                textDecoration: 'none',
                fontWeight: 500,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
              onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
            >
              Skip for now
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-surface)] px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-xl bg-[var(--color-primary)] flex items-center justify-center shadow-dark mb-3">
            <Bell className="w-7 h-7 text-white" />
          </div>
          <h1 className="font-display font-black text-2xl text-[var(--color-text)]">Create Account</h1>
          <p className="text-[var(--color-text-muted)] text-sm mt-1">Start organising your life</p>
        </div>

        <div className="card p-6">
          <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-[var(--color-text)] mb-1">
                Full Name
              </label>
              <input
                id="name"
                {...register('name')}
                placeholder="Jane Smith"
                className="input"
                autoComplete="name"
              />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[var(--color-text)] mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                {...register('email')}
                placeholder="you@example.com"
                className="input"
                autoComplete="email"
              />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[var(--color-text)] mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPw ? 'text' : 'password'}
                  {...register('password')}
                  placeholder="Min 8 characters"
                  className="input pr-10"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                  tabIndex={-1}
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
            </div>

            <button type="submit" disabled={mutation.isPending} className="btn-primary w-full">
              {mutation.isPending ? 'Creating account...' : 'Create Free Account'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-[var(--color-text-muted)] mt-4">
          Already have an account?{' '}
          <Link href="/login" className="text-[var(--color-primary)] font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
