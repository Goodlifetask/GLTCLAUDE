'use client';

import { useState } from 'react';
import Link from 'next/link';
import { api } from '../../../lib/api';
import toast from 'react-hot-toast';

export default function ForgotPasswordPage() {
  const [email, setEmail]     = useState('');
  const [sent, setSent]       = useState(false);
  const [loading, setLoading] = useState(false);

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px',
    background: 'var(--card)', border: '1px solid var(--b1)',
    borderRadius: 'var(--r-sm)',
    color: 'var(--t1)', fontFamily: 'var(--font-body)', fontSize: 13,
    outline: 'none', boxSizing: 'border-box',
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      await api.auth.forgotPassword(email);
      setSent(true);
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

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
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, color: 'var(--t1)', margin: 0, letterSpacing: '-0.01em' }}>
            GoodLifeTask
          </h1>
          <p style={{ color: 'var(--t3)', fontSize: 13, marginTop: 6 }}>Reset your password</p>
        </div>

        <div style={{
          background: 'var(--card)', border: '1px solid var(--b1)',
          borderRadius: 'var(--r-lg)', padding: 24,
          boxShadow: 'var(--sh-lg)'
        }}>
          {sent ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>📬</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, color: 'var(--t1)', marginBottom: 10 }}>
                Check your email
              </div>
              <p style={{ fontSize: 13, color: 'var(--t3)', lineHeight: 1.6, margin: '0 0 20px' }}>
                If <strong style={{ color: 'var(--t2)' }}>{email}</strong> is registered, you&apos;ll receive a password reset link shortly.
              </p>
              <Link href="/login" style={{
                display: 'block', textAlign: 'center', padding: '10px 0',
                background: 'var(--amber)', color: '#fff', borderRadius: 'var(--r-sm)',
                fontSize: 13, fontWeight: 700, textDecoration: 'none',
                boxShadow: 'var(--sh-amber)'
              }}>
                Back to Sign In
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <p style={{ fontSize: 13, color: 'var(--t3)', margin: '0 0 16px', lineHeight: 1.6 }}>
                  Enter the email address for your account and we&apos;ll send you a reset link.
                </p>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--t2)', marginBottom: 6 }}>
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  style={inputStyle}
                  autoFocus
                  autoComplete="email"
                />
              </div>

              <button
                type="submit"
                disabled={loading || !email}
                style={{
                  width: '100%', padding: '11px 0',
                  background: 'var(--amber)', color: '#ffffff',
                  border: 'none', borderRadius: 'var(--r-sm)',
                  fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 700,
                  cursor: loading || !email ? 'not-allowed' : 'pointer',
                  boxShadow: 'var(--sh-amber)',
                  opacity: loading || !email ? 0.7 : 1,
                  transition: 'opacity 0.15s'
                }}
              >
                {loading ? 'Sending…' : 'Send Reset Link'}
              </button>
            </form>
          )}
        </div>

        <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--t3)', marginTop: 18 }}>
          Remember your password?{' '}
          <Link href="/login" style={{ color: 'var(--amber)', fontWeight: 600, textDecoration: 'none' }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
