'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Globe, ChevronDown, Check, ArrowRight, ArrowLeft,
  User, Briefcase, CheckSquare,
} from 'lucide-react';
import { api } from '../../../lib/api';
import { useAuthStore } from '../../../store/auth';
import {
  PROFILE_CATEGORIES,
  FREQ_LABELS,
  getCategoryById,
  getTasksForCategory,
} from '../../../lib/profile-data';
import toast from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Language {
  id: string;
  name: string;
  code: string;
  isRtl: boolean;
}

interface Country {
  id: string;
  name: string;
  code: string;
  languages: Language[];
}

const TOTAL_STEPS = 4;
const FREQ_ORDER = ['daily', 'weekly', 'monthly', 'yearly'] as const;
type Freq = typeof FREQ_ORDER[number];

const STEP_META = [
  { label: 'Location',  icon: '🌍' },
  { label: 'Profile',   icon: '👤' },
  { label: 'Role',      icon: '🎯' },
  { label: 'Tasks',     icon: '✅' },
];

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', gap: 0, marginBottom: 36 }}>
      {STEP_META.map((s, i) => {
        const num      = i + 1;
        const done     = num < current;
        const active   = num === current;
        const upcoming = num > current;
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start' }}>
            {/* Connector line */}
            {i > 0 && (
              <div style={{
                width: 48, height: 2, marginTop: 15, flexShrink: 0,
                background: done
                  ? 'var(--color-primary)'
                  : upcoming
                    ? '#e5e7eb'
                    : 'linear-gradient(90deg, var(--color-primary) 0%, #e5e7eb 100%)',
                transition: 'background 0.4s',
              }} />
            )}
            {/* Step bubble + label */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                background: done ? 'var(--color-primary)'
                  : active ? 'var(--color-primary)'
                  : '#f3f4f6',
                border: `2px solid ${done || active ? 'var(--color-primary)' : '#e5e7eb'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: active ? '0 0 0 4px color-mix(in srgb, var(--color-primary) 18%, transparent)' : 'none',
                transition: 'all 0.35s cubic-bezier(.4,0,.2,1)',
              }}>
                {done ? (
                  <Check size={14} color="#fff" strokeWidth={3} />
                ) : (
                  <span style={{
                    fontSize: 12, fontWeight: 800,
                    color: active ? '#fff' : '#9ca3af',
                  }}>
                    {num}
                  </span>
                )}
              </div>
              <span style={{
                fontSize: 10, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase',
                color: active ? 'var(--color-primary)' : done ? 'var(--color-text-muted)' : '#9ca3af',
                transition: 'color 0.35s',
              }}>
                {s.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router  = useRouter();
  const { user, setUser } = useAuthStore();

  // ── hydration guard
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    const unsub = useAuthStore.persist.onFinishHydration(() => setHydrated(true));
    if (useAuthStore.persist.hasHydrated()) setHydrated(true);
    return unsub;
  }, []);
  useEffect(() => {
    if (hydrated && !user) router.replace('/login');
  }, [hydrated, user, router]);

  // ── global state
  const [step,   setStep]   = useState(1);
  const [saving, setSaving] = useState(false);

  // ── Step 1 state — country / language
  const [countries,           setCountries]           = useState<Country[]>([]);
  const [selectedCountry,     setSelectedCountry]     = useState<Country | null>(null);
  const [selectedLanguage,    setSelectedLanguage]    = useState<Language | null>(null);
  const [countrySearch,       setCountrySearch]       = useState('');
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);

  useEffect(() => {
    api.countries.list()
      .then((res: any) => setCountries(res.data ?? []))
      .catch(() => {});
  }, []);

  // ── Step 2 state — profile category
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // ── Step 3 state — sub-type
  const [selectedSubType, setSelectedSubType] = useState<string | null>(null);

  // ── Step 4 state — task frequencies
  const [selectedFreqs, setSelectedFreqs] = useState<Set<Freq>>(new Set(['daily', 'weekly']));

  // ─── Helpers ────────────────────────────────────────────────────────────────

  const filteredCountries = countries.filter((c) =>
    c.name.toLowerCase().includes(countrySearch.toLowerCase())
  );

  function selectCountry(c: Country) {
    setSelectedCountry(c);
    setCountrySearch('');
    setShowCountryDropdown(false);
    setSelectedLanguage(c.languages[0] ?? null);
  }

  function toggleFreq(freq: Freq) {
    setSelectedFreqs((prev) => {
      const next = new Set(prev);
      next.has(freq) ? next.delete(freq) : next.add(freq);
      return next;
    });
  }

  // ─── Navigation ─────────────────────────────────────────────────────────────

  async function goNext() {
    if (saving) return;

    if (step === 1) {
      if (selectedLanguage) {
        setSaving(true);
        try {
          await api.users.updateProfile({ locale: selectedLanguage.code });
          if (user) setUser({ ...user, locale: selectedLanguage.code });
        } catch {
          toast.error('Could not save language preference');
        } finally { setSaving(false); }
      }
      setStep(2);

    } else if (step === 2) {
      if (selectedCategory) {
        setSaving(true);
        try {
          await api.users.updateProfile({ profileCategory: selectedCategory, profileSubType: '' });
          if (user) setUser({ ...user, profileCategory: selectedCategory, profileSubType: null });
        } catch {
          toast.error('Could not save profile category');
        } finally { setSaving(false); }
      }
      setSelectedSubType(null);
      setStep(3);

    } else if (step === 3) {
      if (selectedSubType) {
        setSaving(true);
        try {
          await api.users.updateProfile({ profileSubType: selectedSubType });
          if (user) setUser({ ...user, profileSubType: selectedSubType });
        } catch {
          toast.error('Could not save your role');
        } finally { setSaving(false); }
      }
      setStep(4);

    } else if (step === 4) {
      setSaving(true);
      try {
        const prefs = Array.from(selectedFreqs);
        await api.users.updateProfile({ taskPreferences: prefs });
        if (user) setUser({ ...user, taskPreferences: prefs });
        toast.success('Profile set up! Welcome to GoodLifeTask 🎉');
        router.push('/dashboard');
      } catch {
        toast.error('Could not save task preferences');
        router.push('/dashboard');
      } finally { setSaving(false); }
    }
  }

  function goBack() { if (step > 1) setStep(step - 1); }

  function skip() {
    if (step >= TOTAL_STEPS) router.push('/dashboard');
    else setStep(step + 1);
  }

  // ─── Step 1 ──────────────────────────────────────────────────────────────────

  function renderStep1() {
    return (
      <>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 60, height: 60, borderRadius: 18,
            background: 'linear-gradient(135deg, var(--color-primary) 0%, #f97316 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: '0 8px 24px color-mix(in srgb, var(--color-primary) 30%, transparent)',
          }}>
            <Globe size={28} color="#fff" />
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 6px', color: 'var(--color-text)', letterSpacing: '-0.01em' }}>
            Where are you based?
          </h2>
          <p style={{ fontSize: 14, color: 'var(--color-text-muted)', margin: 0 }}>
            This helps us show the right date formats and language options
          </p>
        </div>

        {/* Country selector */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: 'var(--color-text)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Country
          </label>
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setShowCountryDropdown((v) => !v)}
              className="input"
              style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px' }}
            >
              <span style={{ color: selectedCountry ? 'var(--color-text)' : 'var(--color-text-muted)', fontSize: 14 }}>
                {selectedCountry ? `${getFlagEmoji(selectedCountry.code)}  ${selectedCountry.name}` : 'Select your country…'}
              </span>
              <ChevronDown size={15} color="var(--color-text-muted)" style={{ transition: 'transform 0.2s', transform: showCountryDropdown ? 'rotate(180deg)' : 'none' }} />
            </button>

            {showCountryDropdown && (
              <div style={{
                position: 'absolute', zIndex: 50, width: '100%', marginTop: 4,
                borderRadius: 12, border: '1px solid var(--color-border)',
                background: 'var(--color-surface)', boxShadow: '0 12px 40px rgba(0,0,0,0.14)',
                overflow: 'hidden',
              }}>
                <div style={{ padding: 8, borderBottom: '1px solid var(--color-border)' }}>
                  <input
                    autoFocus
                    type="text"
                    placeholder="Search countries…"
                    value={countrySearch}
                    onChange={(e) => setCountrySearch(e.target.value)}
                    className="input"
                    style={{ width: '100%', fontSize: 13 }}
                  />
                </div>
                <ul style={{ maxHeight: 240, overflowY: 'auto', margin: 0, padding: 0, listStyle: 'none' }}>
                  {filteredCountries.length === 0 ? (
                    <li style={{ padding: '14px 16px', fontSize: 13, color: 'var(--color-text-muted)', textAlign: 'center' }}>No countries found</li>
                  ) : filteredCountries.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => selectCountry(c)}
                        style={{
                          width: '100%', textAlign: 'left', padding: '9px 14px',
                          fontSize: 13, background: 'none', border: 'none', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: 10,
                          color: 'var(--color-text)',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-surface-raised)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                      >
                        <span style={{ fontSize: 18 }}>{getFlagEmoji(c.code)}</span>
                        <span style={{ flex: 1 }}>{c.name}</span>
                        {selectedCountry?.id === c.id && <Check size={14} color="var(--color-primary)" />}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Language tiles */}
        {selectedCountry && selectedCountry.languages.length > 0 && (
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 8, color: 'var(--color-text)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Language
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 }}>
              {selectedCountry.languages.map((lang) => {
                const sel = selectedLanguage?.id === lang.id;
                return (
                  <button
                    key={lang.id}
                    type="button"
                    onClick={() => setSelectedLanguage(lang)}
                    style={{
                      padding: '10px 14px', borderRadius: 10, fontSize: 14, fontWeight: 600,
                      border: `2px solid ${sel ? 'var(--color-primary)' : 'var(--color-border)'}`,
                      background: sel ? 'color-mix(in srgb, var(--color-primary) 10%, transparent)' : 'var(--color-surface)',
                      color: sel ? 'var(--color-primary)' : 'var(--color-text)',
                      cursor: 'pointer', textAlign: 'left',
                      transition: 'all 0.15s',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}
                  >
                    <span dir={lang.isRtl ? 'rtl' : 'ltr'}>{lang.name}</span>
                    {sel && <Check size={14} color="var(--color-primary)" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty state when no country selected */}
        {!selectedCountry && (
          <div style={{
            padding: '28px 20px', borderRadius: 14,
            background: 'color-mix(in srgb, var(--color-primary) 5%, transparent)',
            border: '1.5px dashed color-mix(in srgb, var(--color-primary) 25%, transparent)',
            textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 13,
          }}>
            🌍 Select a country above to see available languages
          </div>
        )}
      </>
    );
  }

  // ─── Step 2 ──────────────────────────────────────────────────────────────────

  function renderStep2() {
    return (
      <>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{
            width: 60, height: 60, borderRadius: 18,
            background: 'linear-gradient(135deg, var(--color-primary) 0%, #f97316 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: '0 8px 24px color-mix(in srgb, var(--color-primary) 30%, transparent)',
          }}>
            <User size={28} color="#fff" />
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 6px', color: 'var(--color-text)', letterSpacing: '-0.01em' }}>
            What best describes you?
          </h2>
          <p style={{ fontSize: 14, color: 'var(--color-text-muted)', margin: 0 }}>
            Choose the profile that fits your life — we'll tailor your experience
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
          gap: 10,
          maxHeight: 360,
          overflowY: 'auto',
          paddingRight: 2,
          paddingBottom: 2,
        }}>
          {PROFILE_CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                style={{
                  padding: '16px 8px 14px',
                  borderRadius: 14,
                  border: `2px solid ${isSelected ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  background: isSelected
                    ? 'color-mix(in srgb, var(--color-primary) 10%, transparent)'
                    : 'var(--color-surface)',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.18s cubic-bezier(.4,0,.2,1)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                  position: 'relative',
                  boxShadow: isSelected ? '0 2px 12px color-mix(in srgb, var(--color-primary) 20%, transparent)' : 'none',
                }}
              >
                {isSelected && (
                  <div style={{
                    position: 'absolute', top: 7, right: 7,
                    width: 18, height: 18, borderRadius: '50%',
                    background: 'var(--color-primary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Check size={11} color="#fff" strokeWidth={3} />
                  </div>
                )}
                <span style={{ fontSize: 32, lineHeight: 1 }}>{cat.emoji}</span>
                <span style={{
                  fontSize: 11, fontWeight: 700, lineHeight: 1.3,
                  color: isSelected ? 'var(--color-primary)' : 'var(--color-text)',
                }}>
                  {cat.label}
                </span>
              </button>
            );
          })}
        </div>
      </>
    );
  }

  // ─── Step 3 ──────────────────────────────────────────────────────────────────

  function renderStep3() {
    const category = selectedCategory ? getCategoryById(selectedCategory) : null;
    const subTypes = category?.subTypes ?? [];

    return (
      <>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{
            width: 60, height: 60, borderRadius: 18,
            background: 'linear-gradient(135deg, var(--color-primary) 0%, #f97316 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px', fontSize: 30,
            boxShadow: '0 8px 24px color-mix(in srgb, var(--color-primary) 30%, transparent)',
          }}>
            {category ? (
              <span style={{ fontSize: 30 }}>{category.emoji}</span>
            ) : (
              <Briefcase size={28} color="#fff" />
            )}
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 6px', color: 'var(--color-text)', letterSpacing: '-0.01em' }}>
            {category ? `Your ${category.label} role` : 'Your specific role'}
          </h2>
          <p style={{ fontSize: 14, color: 'var(--color-text-muted)', margin: 0 }}>
            Pick the option that fits best — you can always change it later
          </p>
        </div>

        {subTypes.length === 0 ? (
          <div style={{
            padding: '32px 20px', borderRadius: 14,
            background: 'color-mix(in srgb, var(--color-primary) 5%, transparent)',
            border: '1.5px dashed color-mix(in srgb, var(--color-primary) 25%, transparent)',
            textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 14,
          }}>
            No specific roles for this category.<br />Hit Continue to move on!
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))',
            gap: 8,
            maxHeight: 360,
            overflowY: 'auto',
            paddingRight: 2,
          }}>
            {subTypes.map((sub) => {
              const isSelected = selectedSubType === sub;
              return (
                <button
                  key={sub}
                  type="button"
                  onClick={() => setSelectedSubType(sub)}
                  style={{
                    padding: '11px 14px',
                    borderRadius: 10,
                    border: `2px solid ${isSelected ? 'var(--color-primary)' : 'var(--color-border)'}`,
                    background: isSelected
                      ? 'color-mix(in srgb, var(--color-primary) 10%, transparent)'
                      : 'var(--color-surface)',
                    cursor: 'pointer', textAlign: 'left',
                    fontSize: 13, fontWeight: isSelected ? 700 : 500,
                    color: isSelected ? 'var(--color-primary)' : 'var(--color-text)',
                    display: 'flex', alignItems: 'center', gap: 10,
                    transition: 'all 0.15s',
                  }}
                >
                  {/* Radio dot */}
                  <span style={{
                    width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                    border: `2px solid ${isSelected ? 'var(--color-primary)' : '#d1d5db'}`,
                    background: isSelected ? 'var(--color-primary)' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.15s',
                  }}>
                    {isSelected && <Check size={10} color="#fff" strokeWidth={3} />}
                  </span>
                  {sub}
                </button>
              );
            })}
          </div>
        )}
      </>
    );
  }

  // ─── Step 4 ──────────────────────────────────────────────────────────────────

  const FREQ_META: Record<string, { emoji: string; color: string; bg: string }> = {
    daily:   { emoji: '☀️', color: '#d97706', bg: '#fef3c7' },
    weekly:  { emoji: '📅', color: '#2563eb', bg: '#eff6ff' },
    monthly: { emoji: '📆', color: '#7c3aed', bg: '#f5f3ff' },
    yearly:  { emoji: '🗓️', color: '#059669', bg: '#ecfdf5' },
  };

  function renderStep4() {
    const tasks = selectedCategory ? getTasksForCategory(selectedCategory) : { daily: [], weekly: [], monthly: [], yearly: [] };
    const hasAnyTasks = FREQ_ORDER.some((f) => tasks[f].length > 0);

    return (
      <>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{
            width: 60, height: 60, borderRadius: 18,
            background: 'linear-gradient(135deg, var(--color-primary) 0%, #f97316 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: '0 8px 24px color-mix(in srgb, var(--color-primary) 30%, transparent)',
          }}>
            <CheckSquare size={28} color="#fff" />
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 6px', color: 'var(--color-text)', letterSpacing: '-0.01em' }}>
            Task preferences
          </h2>
          <p style={{ fontSize: 14, color: 'var(--color-text-muted)', margin: 0 }}>
            Which reminder frequencies are most useful for you?
          </p>
        </div>

        {!hasAnyTasks ? (
          <div style={{
            padding: '32px 20px', borderRadius: 14,
            background: 'color-mix(in srgb, var(--color-primary) 5%, transparent)',
            border: '1.5px dashed color-mix(in srgb, var(--color-primary) 25%, transparent)',
            textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 14, lineHeight: 1.6,
          }}>
            ✨ We'll personalise your tasks as you use the app.<br />
            Hit Finish to get started!
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 360, overflowY: 'auto', paddingRight: 2 }}>
            {FREQ_ORDER.map((freq) => {
              const freqTasks = tasks[freq];
              if (freqTasks.length === 0) return null;
              const isSelected = selectedFreqs.has(freq);
              const meta = FREQ_META[freq];
              return (
                <button
                  key={freq}
                  type="button"
                  onClick={() => toggleFreq(freq)}
                  style={{
                    padding: '14px 16px',
                    borderRadius: 14,
                    border: `2px solid ${isSelected ? 'var(--color-primary)' : 'var(--color-border)'}`,
                    background: isSelected
                      ? 'color-mix(in srgb, var(--color-primary) 6%, transparent)'
                      : 'var(--color-surface)',
                    cursor: 'pointer', textAlign: 'left',
                    transition: 'all 0.18s',
                    boxShadow: isSelected ? '0 2px 12px color-mix(in srgb, var(--color-primary) 15%, transparent)' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    {/* Checkbox */}
                    <div style={{
                      width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                      border: `2px solid ${isSelected ? 'var(--color-primary)' : '#d1d5db'}`,
                      background: isSelected ? 'var(--color-primary)' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.15s',
                    }}>
                      {isSelected && <Check size={12} color="#fff" strokeWidth={3} />}
                    </div>
                    {/* Emoji badge */}
                    <span style={{
                      fontSize: 13, padding: '3px 8px', borderRadius: 6, fontWeight: 700,
                      background: isSelected ? meta.bg : '#f3f4f6',
                      color: isSelected ? meta.color : '#6b7280',
                      transition: 'all 0.15s',
                    }}>
                      {meta.emoji} {FREQ_LABELS[freq]}
                    </span>
                    {/* Task count badge */}
                    <span style={{
                      marginLeft: 'auto', fontSize: 11, fontWeight: 600,
                      color: isSelected ? 'var(--color-primary)' : 'var(--color-text-muted)',
                      background: isSelected
                        ? 'color-mix(in srgb, var(--color-primary) 12%, transparent)'
                        : 'var(--color-surface-raised)',
                      padding: '2px 8px', borderRadius: 20,
                      transition: 'all 0.15s',
                    }}>
                      {freqTasks.length} tasks
                    </span>
                  </div>
                  {/* Task preview */}
                  <div style={{ paddingLeft: 30, fontSize: 12, color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
                    {freqTasks.slice(0, 3).join(' · ')}
                    {freqTasks.length > 3 && (
                      <span style={{ fontWeight: 600, opacity: 0.7 }}> · +{freqTasks.length - 3} more</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </>
    );
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

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

      {/* Stepper */}
      <div style={{ width: '100%', maxWidth: 560 }}>
        <StepIndicator current={step} />
      </div>

      {/* Card */}
      <div style={{
        width: '100%',
        maxWidth: step === 2 ? 600 : 520,
        background: '#fff',
        borderRadius: 24,
        boxShadow: '0 8px 48px rgba(0,0,0,0.1), 0 2px 8px rgba(0,0,0,0.06)',
        padding: '32px 32px 24px',
        transition: 'max-width 0.3s ease',
      }}>
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}

        {/* Action bar */}
        <div style={{
          display: 'flex', gap: 8, alignItems: 'center',
          marginTop: 28, paddingTop: 20,
          borderTop: '1px solid #f3f4f6',
        }}>
          {step > 1 && (
            <button
              type="button"
              onClick={goBack}
              disabled={saving}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '9px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600,
                border: '1.5px solid var(--color-border)',
                background: 'transparent', cursor: 'pointer',
                color: 'var(--color-text-muted)',
                transition: 'all 0.15s',
              }}
            >
              <ArrowLeft size={14} />
              Back
            </button>
          )}

          <div style={{ flex: 1 }} />

          <button
            type="button"
            onClick={skip}
            disabled={saving}
            style={{
              padding: '9px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600,
              border: 'none', background: 'transparent', cursor: 'pointer',
              color: 'var(--color-text-muted)',
              transition: 'color 0.15s',
            }}
          >
            Skip
          </button>

          <button
            type="button"
            onClick={goNext}
            disabled={saving}
            className="btn-primary"
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 22px', fontSize: 14, fontWeight: 700, borderRadius: 12,
            }}
          >
            {saving ? (
              <>
                <span style={{ opacity: 0.8 }}>Saving</span>
                <span style={{ animation: 'pulse 1s infinite' }}>…</span>
              </>
            ) : step === TOTAL_STEPS ? (
              'Finish 🎉'
            ) : (
              <>
                Continue
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Footer hint */}
      <p style={{ marginTop: 24, fontSize: 12, color: '#9ca3af', textAlign: 'center' }}>
        You can update all of this later in <strong style={{ color: 'var(--color-text-muted)' }}>Settings → Profile</strong>
      </p>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getFlagEmoji(code: string): string {
  if (!code || code.length < 2) return '🌐';
  const chars = [...code.toUpperCase().slice(0, 2)].map(
    (c) => 0x1f1e0 - 0x41 + c.charCodeAt(0)
  );
  return String.fromCodePoint(...chars);
}
