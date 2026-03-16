'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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

const PROFESSIONS = [
  'Select Role', 'Student', 'Teacher', 'Nurse', 'Doctor', 'Engineer',
  'Developer', 'Manager', 'Entrepreneur', 'Parent', 'Retiree', 'Chef',
  'Carpenter', 'Other',
];

interface ApiCountry {
  id: string;
  name: string;
  code: string;
  languages: { id: string; name: string; code: string; isRtl: boolean }[];
}

interface ApiCategory {
  slug:   string;
  name:   string;
  icon:   string;
  color:  string;
  source: 'system' | 'community';
}

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
  const [fontSize, setFontSize]     = useState(14);

  /* ── DB-backed state ──────────────────────────────────────────── */
  const [countries,       setCountries]       = useState<ApiCountry[]>([]);
  const [selectedCountry, setSelectedCountry] = useState('');
  const [availableLangs,  setAvailableLangs]  = useState<{ id: string; name: string; code: string }[]>([]);
  const [selLangs,        setSelLangs]        = useState<string[]>([]);
  const [categories,      setCategories]      = useState<ApiCategory[]>([]);
  const [selInterests,    setSelInterests]    = useState<string[]>([]);
  const [loadingData,     setLoadingData]     = useState(true);

  /* Fetch countries + categories on mount */
  useEffect(() => {
    Promise.all([
      api.countries.list(),
      api.categories.list(),
    ]).then(([countriesRes, catsRes]) => {
      const ctries: ApiCountry[] = countriesRes?.data ?? [];
      const cats: ApiCategory[]  = catsRes?.data ?? [];
      setCountries(ctries);
      setCategories(cats);

      if (ctries.length > 0) {
        const first = ctries[0];
        setSelectedCountry(first.name);
        setAvailableLangs(first.languages);
        const eng = first.languages.find(l => l.code === 'en' || l.name === 'English');
        if (eng) setSelLangs([eng.name]);
      }
    }).catch(() => {
      /* silently fail — form still works */
    }).finally(() => setLoadingData(false));
  }, []);

  /* Country change → filter languages */
  function handleCountryChange(countryName: string) {
    setSelectedCountry(countryName);
    setSelLangs([]);
    const found = countries.find(c => c.name === countryName);
    setAvailableLangs(found?.languages ?? []);
  }

  function toggleLang(name: string) {
    setSelLangs(p => p.includes(name) ? p.filter(x => x !== name) : [...p, name]);
  }
  function toggleInterest(slug: string) {
    setSelInterests(p => p.includes(slug) ? p.filter(x => x !== slug) : [...p, slug]);
  }

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const mutation = useMutation({
    mutationFn: (data: FormData) => api.auth.register({
      ...data,
      categories: selInterests,
      profession,
      country:    selectedCountry,
      languages:  selLangs,
    } as any),
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

  /* ── Pill styles ──────────────────────────────────────────────── */
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
      <div style={{ position: 'absolute', top: 16, right: 20, display: 'flex', gap: 6 }}>
        {[12, 14, 16].map((s, i) => (
          <button key={s} onClick={() => setFontSize(s)} style={{
            width: 32, height: 32, borderRadius: 8,
            background: fontSize === s ? '#6C4EFF' : 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.2)',
            color: '#fff', cursor: 'pointer',
            fontSize: 10 + i * 2, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>A</button>
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
          marginBottom: 10, overflow: 'hidden',
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
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, alignItems: 'start' }}>

          {/* ── LEFT: Account Details ── */}
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#60a5fa', marginBottom: 20, letterSpacing: '0.01em' }}>
              Account Details
            </h2>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 6 }}>Full Name</label>
              <input {...register('name')} placeholder="" style={inputStyle} autoComplete="name" />
              {errors.name && <p style={{ color: '#f87171', fontSize: 11, marginTop: 4 }}>{errors.name.message}</p>}
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 6 }}>Email Address</label>
              <input type="email" {...register('email')} placeholder="" style={inputStyle} autoComplete="email" />
              {errors.email && <p style={{ color: '#f87171', fontSize: 11, marginTop: 4 }}>{errors.email.message}</p>}
            </div>

            <div style={{ marginBottom: 8 }}>
              <label style={{ display: 'block', fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 6 }}>Password</label>
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
                >{showPw ? '👁' : '🔒'}</button>
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
                <label style={{ display: 'block', fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 6 }}>Profession</label>
                <select value={profession} onChange={e => setProfession(e.target.value)} style={selectStyle}>
                  {PROFESSIONS.map(p => (
                    <option key={p} value={p === 'Select Role' ? '' : p}>{p}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 6 }}>Country</label>
                <select
                  value={selectedCountry}
                  onChange={e => handleCountryChange(e.target.value)}
                  style={{ ...selectStyle, opacity: loadingData ? 0.5 : 1 }}
                  disabled={loadingData}
                >
                  {loadingData
                    ? <option>Loading…</option>
                    : <>
                        <option value="">Select Country</option>
                        {countries.map(c => (
                          <option key={c.id} value={c.name}>{c.name}</option>
                        ))}
                      </>
                  }
                </select>
              </div>
            </div>

            {/* Languages — filtered by selected country */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 8 }}>
                Spoken Languages
                {selectedCountry && (
                  <span style={{ marginLeft: 6, fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: 400 }}>
                    — {selectedCountry}
                  </span>
                )}
              </label>
              {availableLangs.length === 0 ? (
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', margin: 0, fontStyle: 'italic' }}>
                  {selectedCountry ? 'No languages on record for this country' : 'Select a country to see its languages'}
                </p>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                  {availableLangs.map(l => (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => toggleLang(l.name)}
                      style={selLangs.includes(l.name) ? pillActive('#6C4EFF') : pillBase}
                    >
                      {l.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Interests / Categories — from DB with per-category colors */}
            <div>
              <label style={{ display: 'block', fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 8 }}>
                Interests
                {categories.some(c => c.source === 'community') && (
                  <span style={{ marginLeft: 6, fontSize: 11, color: 'rgba(255,255,255,0.3)', fontWeight: 400 }}>
                    · includes community picks
                  </span>
                )}
              </label>
              {loadingData ? (
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', margin: 0, fontStyle: 'italic' }}>
                  Loading categories…
                </p>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                  {categories.map(cat => (
                    <button
                      key={cat.slug}
                      type="button"
                      onClick={() => toggleInterest(cat.slug)}
                      style={selInterests.includes(cat.slug) ? pillActive(cat.color) : pillBase}
                    >
                      {cat.icon} {cat.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={mutation.isPending}
          style={{
            width: '100%', marginTop: 28, padding: '15px 0',
            background: mutation.isPending
              ? 'rgba(255,255,255,0.1)'
              : 'linear-gradient(90deg, #3b82f6 0%, #6C4EFF 40%, #a855f7 70%, #facc15 100%)',
            border: 'none', borderRadius: 12, color: '#fff',
            fontSize: 15, fontWeight: 700,
            cursor: mutation.isPending ? 'not-allowed' : 'pointer',
            letterSpacing: '0.02em',
            boxShadow: '0 4px 24px rgba(108,78,255,0.4)',
            transition: 'all 0.2s', fontFamily: 'inherit',
          }}
        >
          {mutation.isPending ? 'Creating account…' : '🎯 Create Account'}
        </button>

        {/* Footer links */}
        <div style={{ textAlign: 'center', marginTop: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', margin: 0 }}>
            Already have an account?{' '}
            <Link href="/login" style={{ color: '#60a5fa', fontWeight: 600, textDecoration: 'none' }}>Login</Link>
          </p>
          <Link href="/verify" style={{ fontSize: 13, color: '#60a5fa', textDecoration: 'none' }}>
            Has verification code?
          </Link>
          <Link href="/dashboard" style={{
            display: 'inline-block', margin: '0 auto',
            padding: '7px 18px', borderRadius: 8,
            background: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.15)',
            color: 'rgba(255,255,255,0.55)',
            fontSize: 12, textDecoration: 'none',
          }}>
            🔓 Bypass Login (Debug Mode)
          </Link>
        </div>

        <p style={{ textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 24 }}>
          Secured by next-gen encryption 🔑
        </p>
      </form>
    </div>
  );
}
