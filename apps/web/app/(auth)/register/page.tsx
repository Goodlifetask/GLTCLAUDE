'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { api } from '../../../lib/api';
import { useAuthStore } from '../../../store/auth';
import toast from 'react-hot-toast';
import '../../../lib/i18n';
import { useTranslation } from 'react-i18next';
import i18n from '../../../lib/i18n';

const UI_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
  { code: 'pt', name: 'Português' },
  { code: 'ar', name: 'العربية' },
  { code: 'hi', name: 'हिन्दी' },
  { code: 'zh', name: '中文' },
  { code: 'ja', name: '日本語' },
  { code: 'ko', name: '한국어' },
  { code: 'ru', name: 'Русский' },
  { code: 'tr', name: 'Türkçe' },
];

const schema = z.object({
  name:     z.string().min(2, 'Name must be at least 2 characters').max(100),
  email:    z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});
type FormData = z.infer<typeof schema>;

interface ApiProfession {
  value: string;
  label: string;
  icon:  string;
}

const USE_CASES = [
  {
    value: 'individual',
    label: 'Just Me',
    icon: '👤',
    desc: 'Personal tasks & reminders',
    color: '#6C4EFF',
    glow: 'rgba(108,78,255,0.25)',
  },
  {
    value: 'family',
    label: 'Family',
    icon: '👨‍👩‍👧',
    desc: 'Household & family planning',
    color: '#f59e0b',
    glow: 'rgba(245,158,11,0.25)',
  },
  {
    value: 'team',
    label: 'Office / Team',
    icon: '🏢',
    desc: 'Work tasks & collaboration',
    color: '#3b82f6',
    glow: 'rgba(59,130,246,0.25)',
  },
  {
    value: 'community',
    label: 'Community',
    icon: '🌐',
    desc: 'Groups, clubs & organisations',
    color: '#10b981',
    glow: 'rgba(16,185,129,0.25)',
  },
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
  backgroundColor: '#1e1460',
};

export default function RegisterPage() {
  const router = useRouter();
  const { setUser, setAccessToken } = useAuthStore();
  const { t } = useTranslation();
  const [showPw, setShowPw]         = useState(false);
  const [profession, setProfession] = useState('');
  const [useCase, setUseCase]       = useState('individual');
  const [fontSize, setFontSize]     = useState(14);
  const [uiLocale, setUiLocale]     = useState('en');

  function handleLocaleChange(code: string) {
    setUiLocale(code);
    i18n.changeLanguage(code);
  }

  /* ── DB-backed state ──────────────────────────────────────────── */
  const [countries,       setCountries]       = useState<ApiCountry[]>([]);
  const [selectedCountry, setSelectedCountry] = useState('');
  const [availableLangs,  setAvailableLangs]  = useState<{ id: string; name: string; code: string }[]>([]);
  const [selLangs,        setSelLangs]        = useState<string[]>([]);
  const [categories,      setCategories]      = useState<ApiCategory[]>([]);
  const [selInterests,    setSelInterests]    = useState<string[]>([]);
  const [loadingData,     setLoadingData]     = useState(true);

  /* ── Profession combobox state ─────────────────────────────────── */
  const [professions,     setProfessions]     = useState<ApiProfession[]>([]);
  const [profQuery,       setProfQuery]       = useState('');
  const [profOpen,        setProfOpen]        = useState(false);
  const profRef = useRef<HTMLDivElement>(null);

  /* Close dropdown when clicking outside */
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (profRef.current && !profRef.current.contains(e.target as Node)) {
        setProfOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const filteredProfs = professions.filter(p =>
    p.label.toLowerCase().includes(profQuery.toLowerCase()),
  );

  /* Fetch countries + categories + professions on mount */
  useEffect(() => {
    Promise.all([
      api.countries.list(),
      api.categories.list(),
      api.professions.list(),
    ]).then(([countriesRes, catsRes, profsRes]) => {
      const ctries: ApiCountry[]    = (countriesRes?.data ?? []).sort((a: ApiCountry, b: ApiCountry) => a.name.localeCompare(b.name));
      const cats: ApiCategory[]     = catsRes?.data ?? [];
      const profs: ApiProfession[]  = profsRes?.data ?? [];
      setProfessions(profs);
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
      categories:      selInterests,
      profession:      profession || profQuery.trim(),
      country:         selectedCountry,
      languages:       selLangs,
      profile_category: useCase,
      locale:          uiLocale,
    } as any),
    onSuccess: (res: any) => {
      const u = res.data.user;
      setUser({ ...u, avatarUrl: u.avatar_url ?? null });
      setAccessToken(res.data.tokens.access_token);
      toast.success('Welcome to GoodLifeTask!');
      const dest =
        useCase === 'family'    ? '/family'    :
        useCase === 'team'      ? '/team'      :
        useCase === 'community' ? '/community' :
        '/dashboard';
      router.push(dest);
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
      background: 'linear-gradient(160deg, #1A1040 0%, #2D1E8A 40%, #3D2BB8 75%, #2D1E8A 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '24px 16px 40px',
      fontSize,
      position: 'relative',
    }}>

      {/* Top controls: language picker + font size */}
      <div style={{ position: 'absolute', top: 16, right: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* Language selector */}
        <select
          value={uiLocale}
          onChange={e => handleLocaleChange(e.target.value)}
          style={{
            background: 'rgba(255,255,255,0.12)',
            border: '1px solid rgba(255,255,255,0.25)',
            borderRadius: 8,
            color: '#fff',
            fontSize: 12,
            fontWeight: 600,
            padding: '5px 8px',
            cursor: 'pointer',
            outline: 'none',
            fontFamily: 'inherit',
          }}
        >
          {UI_LANGUAGES.map(l => (
            <option key={l.code} value={l.code} style={{ background: '#1e1460', color: '#fff' }}>
              {l.name}
            </option>
          ))}
        </select>

        {/* Font size controls */}
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
          background: 'linear-gradient(135deg, #3D2BB8, #6C4EFF)',
          border: '3px solid rgba(196,181,253,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 30px rgba(108,78,255,0.45)',
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
          {t('common.createAccount', 'Create your account')}
        </p>
      </div>

      {/* Main form */}
      <form
        onSubmit={handleSubmit(d => mutation.mutate(d))}
        style={{ width: '100%', maxWidth: 820, marginTop: 16 }}
      >
        <div style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(196,181,253,0.15)',
          borderRadius: 20,
          padding: '28px 28px 24px',
          backdropFilter: 'blur(12px)',
          boxShadow: '0 8px 40px rgba(0,0,0,0.3)',
        }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, alignItems: 'start' }}>

          {/* ── LEFT: Account Details ── */}
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#C4B5FD', marginBottom: 20, letterSpacing: '0.01em' }}>
              {t('register.accountDetails', 'Account Details')}
            </h2>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 6 }}>{t('register.fullName', 'Full Name')}</label>
              <input {...register('name')} placeholder="" style={inputStyle} autoComplete="name" />
              {errors.name && <p style={{ color: '#f87171', fontSize: 11, marginTop: 4 }}>{errors.name.message}</p>}
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 6 }}>{t('settings.email', 'Email Address')}</label>
              <input type="email" {...register('email')} placeholder="" style={inputStyle} autoComplete="email" />
              {errors.email && <p style={{ color: '#f87171', fontSize: 11, marginTop: 4 }}>{errors.email.message}</p>}
            </div>

            <div style={{ marginBottom: 8 }}>
              <label style={{ display: 'block', fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 6 }}>{t('register.password', 'Password')}</label>
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
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#FDE68A', marginBottom: 20, letterSpacing: '0.01em' }}>
              {t('register.profileSetup', 'Profile Setup')}
            </h2>

            {/* Use-case selector */}
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 10 }}>
                I'm using GoodLifeTask for…
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                {USE_CASES.map(uc => {
                  const active = useCase === uc.value;
                  return (
                    <button
                      key={uc.value}
                      type="button"
                      onClick={() => setUseCase(uc.value)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '10px 12px',
                        borderRadius: 12,
                        border: active ? `1.5px solid ${uc.color}` : '1px solid rgba(255,255,255,0.12)',
                        background: active ? uc.glow : 'rgba(255,255,255,0.04)',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.15s',
                        boxShadow: active ? `0 0 12px ${uc.glow}` : 'none',
                        fontFamily: 'inherit',
                      }}
                    >
                      <span style={{ fontSize: 22, flexShrink: 0 }}>{uc.icon}</span>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: active ? uc.color : '#ffffff', lineHeight: 1.2 }}>
                          {uc.label}
                        </div>
                        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', marginTop: 2, lineHeight: 1.3 }}>
                          {uc.desc}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Profession (combobox) + Country */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div ref={profRef} style={{ position: 'relative' }}>
                <label style={{ display: 'block', fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 6 }}>
                  Profession
                </label>
                {/* Text input — type freely or pick from dropdown */}
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    value={profQuery}
                    placeholder="Type or search…"
                    autoComplete="off"
                    onFocus={() => setProfOpen(true)}
                    onChange={e => {
                      setProfQuery(e.target.value);
                      setProfession(e.target.value);
                      setProfOpen(true);
                    }}
                    style={{ ...inputStyle, paddingRight: 32 }}
                  />
                  {/* chevron */}
                  <span
                    onClick={() => setProfOpen(o => !o)}
                    style={{
                      position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                      color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 12, userSelect: 'none',
                    }}
                  >{profOpen ? '▲' : '▼'}</span>
                </div>

                {/* Dropdown suggestions */}
                {profOpen && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
                    background: '#1e1460',
                    border: '1px solid rgba(196,181,253,0.2)',
                    borderRadius: 10, marginTop: 4,
                    maxHeight: 220, overflowY: 'auto',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                  }}>
                    {/* "Use what I typed" option when query doesn't match any suggestion */}
                    {profQuery.trim() && !filteredProfs.some(p => p.label.toLowerCase() === profQuery.toLowerCase()) && (
                      <div
                        onMouseDown={() => { setProfession(profQuery.trim()); setProfOpen(false); }}
                        style={{
                          padding: '9px 14px', fontSize: 12, cursor: 'pointer',
                          color: '#C4B5FD', fontStyle: 'italic',
                          borderBottom: '1px solid rgba(255,255,255,0.06)',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(108,78,255,0.2)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        ✏️ Use "{profQuery.trim()}"
                      </div>
                    )}
                    {(filteredProfs.length === 0 && !profQuery.trim()) ? (
                      <div style={{ padding: '9px 14px', fontSize: 12, color: 'rgba(255,255,255,0.35)', fontStyle: 'italic' }}>
                        Start typing to search…
                      </div>
                    ) : filteredProfs.map(p => (
                      <div
                        key={p.value}
                        onMouseDown={() => {
                          setProfession(p.label);
                          setProfQuery(p.label);
                          setProfOpen(false);
                        }}
                        style={{
                          padding: '9px 14px', fontSize: 12.5, cursor: 'pointer',
                          color: '#ffffff', display: 'flex', alignItems: 'center', gap: 8,
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(108,78,255,0.2)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <span style={{ fontSize: 16 }}>{p.icon}</span>
                        <span>{p.label}</span>
                      </div>
                    ))}
                  </div>
                )}
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
        </div>{/* end glass card */}

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
          {mutation.isPending ? t('common.creating', 'Creating account…') : `🎯 ${t('common.createAccount', 'Create Account')}`}
        </button>

        {/* Footer links */}
        <div style={{ textAlign: 'center', marginTop: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', margin: 0 }}>
            {t('common.alreadyHaveAccount', 'Already have an account?')}{' '}
            <Link href="/login" style={{ color: '#60a5fa', fontWeight: 600, textDecoration: 'none' }}>{t('common.login', 'Login')}</Link>
          </p>
          <Link href="/login?mode=magic" style={{ fontSize: 13, color: '#60a5fa', textDecoration: 'none' }}>
            Sign in with a magic link instead
          </Link>
        </div>

        <p style={{ textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 24 }}>
          Secured by next-gen encryption 🔑
        </p>
      </form>
    </div>
  );
}
