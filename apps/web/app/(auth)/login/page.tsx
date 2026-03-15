'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { api } from '../../../lib/api';
import { useAuthStore } from '../../../store/auth';
import toast from 'react-hot-toast';

const schema = z.object({
  email:    z.string().email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
});
type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const router  = useRouter();
  const { setUser, setAccessToken } = useAuthStore();
  const [showPw, setShowPw] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const mutation = useMutation({
    mutationFn: (data: FormData) => api.auth.login(data),
    onSuccess: (res: any) => {
      const u = res.data.user;
      setUser({ ...u, avatarUrl: u.avatar_url ?? null });
      setAccessToken(res.data.tokens.access_token);
      router.push('/dashboard');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? 'Login failed');
    },
  });

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px',
    background: 'var(--card)', border: '1px solid var(--b1)',
    borderRadius: 'var(--r-sm)',
    color: 'var(--t1)', fontFamily: 'var(--font-body)', fontSize: 13,
    outline: 'none', transition: 'border-color 0.15s',
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', padding: '0 16px'
    }}>
      <div style={{ width: '100%', maxWidth: 360 }}>
        {/* Logo */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 32 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14,
            background: 'linear-gradient(145deg, var(--amber), var(--amber-dim))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: 'var(--sh-amber)', marginBottom: 14,
            fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 24, color: '#ffffff'
          }}>G</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, color: 'var(--t1)', margin: 0, letterSpacing: '-0.01em' }}>GoodLifeTask</h1>
          <p style={{ color: 'var(--t3)', fontSize: 13, marginTop: 6 }}>Sign in to your account</p>
        </div>

        {/* Card */}
        <div style={{
          background: 'var(--card)', border: '1px solid var(--b1)',
          borderRadius: 'var(--r-lg)', padding: 24,
          boxShadow: 'var(--sh-lg)'
        }}>
          <form onSubmit={handleSubmit((d) => mutation.mutate(d))} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Email */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--t2)', marginBottom: 6 }}>
                Email
              </label>
              <input
                id="email"
                type="email"
                {...register('email')}
                placeholder="you@example.com"
                style={inputStyle}
                autoComplete="email"
              />
              {errors.email && <p style={{ color: 'var(--coral)', fontSize: 11, marginTop: 4 }}>{errors.email.message}</p>}
            </div>

            {/* Password */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--t2)' }}>
                  Password
                </label>
                <Link href="/forgot-password" style={{ fontSize: 11, color: 'var(--amber)', fontWeight: 600, textDecoration: 'none' }}>
                  Forgot password?
                </Link>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  id="password"
                  type={showPw ? 'text' : 'password'}
                  {...register('password')}
                  placeholder="••••••••"
                  style={{ ...inputStyle, paddingRight: 40 }}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t3)',
                    display: 'flex', alignItems: 'center', padding: 0
                  }}
                  tabIndex={-1}
                >
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {errors.password && <p style={{ color: 'var(--coral)', fontSize: 11, marginTop: 4 }}>{errors.password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={mutation.isPending}
              style={{
                width: '100%', padding: '11px 0',
                background: 'var(--amber)', color: '#ffffff',
                border: 'none', borderRadius: 'var(--r-sm)',
                fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 700,
                cursor: mutation.isPending ? 'not-allowed' : 'pointer',
                boxShadow: 'var(--sh-amber)',
                opacity: mutation.isPending ? 0.7 : 1,
                transition: 'opacity 0.15s'
              }}
            >
              {mutation.isPending ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '18px 0' }}>
            <div style={{ flex: 1, height: 1, background: 'var(--b1)' }} />
            <span style={{ fontSize: 11, color: 'var(--t3)' }}>or</span>
            <div style={{ flex: 1, height: 1, background: 'var(--b1)' }} />
          </div>

          {/* Demo login shortcut */}
          <button
            type="button"
            onClick={() => mutation.mutate({ email: 'free@demo.com', password: 'DemoUser123!' })}
            disabled={mutation.isPending}
            style={{
              width: '100%', padding: '11px 0',
              background: 'transparent', color: 'var(--t2)',
              border: '1px solid var(--b1)', borderRadius: 'var(--r-sm)',
              fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600,
              cursor: mutation.isPending ? 'not-allowed' : 'pointer',
              opacity: mutation.isPending ? 0.7 : 1,
              transition: 'background 0.15s, color 0.15s'
            }}
          >
            Try Demo Account
          </button>
        </div>

        <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--t3)', marginTop: 18 }}>
          Don&apos;t have an account?{' '}
          <Link href="/register" style={{ color: 'var(--amber)', fontWeight: 600, textDecoration: 'none' }}>
            Sign up free
          </Link>
        </p>
      </div>
    </div>
  );
}
