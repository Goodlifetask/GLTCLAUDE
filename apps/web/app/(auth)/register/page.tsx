'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Bell, Eye, EyeOff } from 'lucide-react';
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

export default function RegisterPage() {
  const router = useRouter();
  const { setUser, setAccessToken } = useAuthStore();
  const [showPw, setShowPw] = useState(false);

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
      router.push('/onboarding');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? 'Registration failed');
    },
  });

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
