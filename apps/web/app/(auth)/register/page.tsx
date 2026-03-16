'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { api } from '../../../lib/api';
import { useAuthStore } from '../../../store/auth';
import toast from 'react-hot-toast';
import { REMINDER_CATEGORIES } from '@glt/shared';

const schema = z.object({
  name:     z.string().min(2, 'Name must be at least 2 characters').max(100),
  email:    z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});
type FormData = z.infer<typeof schema>;

const PROFESSIONS = [
  'Select Role', 'Student', 'Teacher', 'Nurse', 'Doctor', 'Engineer',
  'Developer', 'Manager', 'Entrepreneur', 'Parent', 'Retiree', 'Chef',
  'Carpenter', 'Other',
];

const COUNTRIES = [
  'Select Country', 'United States', 'United Kingdom', 'Australia', 'Canada',
  'India', 'Germany', 'France', 'Japan', 'Brazil', 'South Africa',
  'UAE', 'Singapore', 'Nigeria', 'Mexico', 'Other',
];

const LANGUAGES = [
  'English', 'Spanish', 'French', 'German', 'Hindi',
  'Japanese', 'Chinese', 'Russian', 'Portuguese', 'Arabic',
];

const INTERESTS = [
  ...REMINDER_CATEGORIES.map(c => ({ label: c.name, icon: c.icon, slug: c.slug, color: c.color })),
  { label: 'Technology', icon: '💻', slug: 'technology', color: '#0ea5e9' },
  { label: 'Sports',     icon: '⚽', slug: 'sports',     color: '#22c55e' },
  { label: 'Automotive', icon: '🚗', slug: 'automotive', color: '#f97316' },
  { label: 'Cooking',    icon: '🍳', slug: 'cooking',    color: '#ec4899' },
];

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(255,255,255,0.07)',
  border: '1px solid rgba(255,255,255,0.15)',
  borderRadius: 10,
  padding: '12px 14px',
  fontSize: 14,
  color: '#ffffff',
  fontFamily: 'inherit',
  outline: 'none',
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  cursor: 'pointer',
  colorScheme: 'dark',
  appearance: 'auto',
};

export default function RegisterPage() {
  const router = useRouter();
  const { setUser, setAccessToken } = useAuthStore();
  const [showPw, setShowPw]         = useState(false);
  const [profession, setProfession] = useState('');
  const [country, setCountry]       = useState('');
  const [selLangs, setSelLangs]     = useState<string[]>(['English']);
  const [selInterests, setSelInterests] = useState<string[]>([]);
  const [fontSize, setFontSize]     = useState(14);

  function toggleLang(l: string) {
    setSelLangs(p => p.includes(l) ? p.filter(x => x !== l) : [...p, l]);
  }
  function toggleInterest(s: string) {
    setSelInterests(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s]);
  }

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const mutation = useMutation({
    mutationFn: (data: FormData) => api.auth.register({
      ...data,
      categories: selInterests,
      profession,
      country,
      languages: selLangs,
    }),
    onSuccess: (res: any) => {
      const u = res.data.user;
      setUser({ ...u, avatarUrl: u.avatar_url ?? null });
      setAccessToken(res.data.tokens.access_token);
      toast.success('Welcome to GoodLifeTask!');
      router.push('/dashboard');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? 'Registration failed');
    },
  });

  const pillBase: React.CSSProperties = {
    padding: '6px 14px',
    borderRadius: 20,
    border: '1px solid rgba(255,255,255,0.2)',
    background: 'rgba(255,255,255,0.06)',
    color: 'rgba(255,255,255,0.75)',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 500,
    fontFamily: 'inherit',
    transition: 'all 0.15s',
    whiteSpace: 'nowrap' as const,
  };
  function pillActive(color: string): React.CSSProperties {
    return {
      ...pillBase,
      background: `${color}28`,
      border: `1.5px solid ${color}`,
      color: color,
      fontWeight: 700,
      boxShadow: `0 0 8px ${color}44`,
    };
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #0a1628 0%, #0d2340 45%, #0b2535 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '24px 16px 40px',
      fontSize,
      position: 'relative',
    }}>

      {/* Font size controls */}
      <div style={{
        position: 'absolute', top: 16, right: 20,
        display: 'flex', gap: 6,
      }}>
        {[12, 14, 16].map((s, i) => (
          <button
            key={s}
            onClick={() => setFontSize(s)}
            style={{
              width: 32, height: 32, borderRadius: 8,
              background: fontSize === s ? '#6C4EFF' : 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              color: '#fff', cursor: 'pointer',
              fontSize: 10 + i * 2, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >A</button>
        ))}
      </div>

      {/* Logo */}
      <div style={{ marginBottom: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{
          width: 80, height: 80, borderRadius: '50%',
          background: 'linear-gradient(135deg, #1a3a5c, #0d6e8a)',
          border: '3px solid rgba(100,180,255,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 30px rgba(100,180,255,0.3)',
          marginBottom: 10,
          overflow: 'hidden',
        }}>
          <div style={{ textAlign: 'center', lineHeight: 1.1 }}>
            <div style={{ fontSize: 9, fontWeight: 900, color: '#4ade80', letterSpacing: '0.05em' }}>Good</div>
            <div style={{ fontSize: 11, fontWeight: 900, color: '#facc15', letterSpacing: '0.05em' }}>Life</div>
            <div style={{ fontSize: 9, fontWeight: 900, color: '#4ade80', letterSpacing: '0.05em' }}>Tasks</div>
          </div>
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: '#ffffff', margin: 0, letterSpacing: '-0.01em' }}>
          GoodLifeTask
        </h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', margin: '4px 0 0' }}>
          Create your account
        </p>
      </div>

      {/* Main form */}
      <form
        onSubmit={handleSubmit(d => mutation.mutate(d))}
        style={{ width: '100%', maxWidth: 820, marginTop: 16 }}
      >
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 32,
          alignItems: 'start',
        }}>

          {/* ── LEFT: Account Details ── */}
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#60a5fa', marginBottom: 20, letterSpacing: '0.01em' }}>
              Account Details
            </h2>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 6 }}>
                Full Name
              </label>
              <input
                {...register('name')}
                placeholder=""
                style={inputStyle}
                autoComplete="name"
              />
              {errors.name && <p style={{ color: '#f87171', fontSize: 11, marginTop: 4 }}>{errors.name.message}</p>}
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 6 }}>
                Email Address
              </label>
              <input
                type="email"
                {...register('email')}
                placeholder=""
                style={inputStyle}
                autoComplete="email"
              />
              {errors.email && <p style={{ color: '#f87171', fontSize: 11, marginTop: 4 }}>{errors.email.message}</p>}
            </div>

            <div style={{ marginBottom: 8 }}>
              <label style={{ display: 'block', fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 6 }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPw ? 'text' : 'password'}
                  {...register('password')}
                  placeholder=""
                  style={{ ...inputStyle, paddingRight: 44 }}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: 16, color: 'rgba(255,255,255,0.5)',
                  }}
                >
                  {showPw ? '👁' : '🔒'}
                </button>
              </div>
              {errors.password && <p style={{ color: '#f87171', fontSize: 11, marginTop: 4 }}>{errors.password.message}</p>}
            </div>
          </div>

          {/* ── RIGHT: Profile Setup ── */}
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#facc15', marginBottom: 20, letterSpacing: '0.01em' }}>
              Profile Setup
            </h2>

            {/* Profession + Country */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 6 }}>
                  Profession
                </label>
                <select
                  value={profession}
                  onChange={e => setProfession(e.target.value)}
                  style={selectStyle}
                >
                  {PROFESSIONS.map(p => <option key={p} value={p === 'Select Role' ? '' : p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 6 }}>
                  Country
                </label>
                <select
                  value={country}
                  onChange={e => setCountry(e.target.value)}
                  style={selectStyle}
                >
                  {COUNTRIES.map(c => <option key={c} value={c === 'Select Country' ? '' : c}>{c}</option>)}
                </select>
              </div>
            </div>

            {/* Languages */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 8 }}>
                Spoken Languages
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                {LANGUAGES.map(l => (
                  <button
                    key={l} type="button" onClick={() => toggleLang(l)}
                    style={selLangs.includes(l) ? pillActive('#6C4EFF') : pillBase}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>

            {/* Interests */}
            <div>
              <label style={{ display: 'block', fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 8 }}>
                Interests
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                {INTERESTS.map(it => (
                  <button
                    key={it.slug} type="button" onClick={() => toggleInterest(it.slug)}
                    style={selInterests.includes(it.slug) ? pillActive(it.color) : pillBase}
                  >
                    {it.icon} {it.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={mutation.isPending}
          style={{
            width: '100%',
            marginTop: 28,
            padding: '15px 0',
            background: mutation.isPending
              ? 'rgba(255,255,255,0.1)'
              : 'linear-gradient(90deg, #3b82f6 0%, #6C4EFF 40%, #a855f7 70%, #facc15 100%)',
            border: 'none',
            borderRadius: 12,
            color: '#fff',
            fontSize: 15,
            fontWeight: 700,
            cursor: mutation.isPending ? 'not-allowed' : 'pointer',
            letterSpacing: '0.02em',
            boxShadow: '0 4px 24px rgba(108,78,255,0.4)',
            transition: 'all 0.2s',
            fontFamily: 'inherit',
          }}
        >
          {mutation.isPending ? 'Creating account…' : '🎯 Create Account'}
        </button>

        {/* Footer links */}
        <div style={{ textAlign: 'center', marginTop: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', margin: 0 }}>
            Already have an account?{' '}
            <Link href="/login" style={{ color: '#60a5fa', fontWeight: 600, textDecoration: 'none' }}>
              Login
            </Link>
          </p>
          <Link href="/verify" style={{ fontSize: 13, color: '#60a5fa', textDecoration: 'none' }}>
            Has verification code?
          </Link>
          <Link
            href="/dashboard"
            style={{
              display: 'inline-block', margin: '0 auto',
              padding: '7px 18px', borderRadius: 8,
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: 'rgba(255,255,255,0.55)',
              fontSize: 12, textDecoration: 'none',
            }}
          >
            🔓 Bypass Login (Debug Mode)
          </Link>
        </div>

        {/* Footer */}
        <p style={{ textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 24 }}>
          Secured by next-gen encryption 🔑
        </p>
      </form>
    </div>
  );
}
