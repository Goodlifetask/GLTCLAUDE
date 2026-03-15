'use client';
import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi } from '../../lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // If already logged in, go straight to dashboard
  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('admin_token')) {
      router.replace('/dashboard');
    }
  }, [router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await adminApi.auth.login({ email, password });
      localStorage.setItem('admin_token', res.accessToken);
      router.replace('/dashboard');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      setError(msg.includes('401') || msg.includes('Unauthorized')
        ? 'Invalid email or password.'
        : `Login failed: ${msg}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-body)',
    }}>
      <div style={{
        width: '100%',
        maxWidth: 400,
        background: 'var(--bg-white)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--r-xl)',
        padding: '40px 36px',
        boxShadow: 'var(--shadow-lg)',
      }}>
        {/* Logo / title */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            background: 'var(--brand)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 22,
            margin: '0 auto 14px',
          }}>
            🛡
          </div>
          <div style={{
            fontFamily: 'Manrope, sans-serif',
            fontSize: 22,
            fontWeight: 800,
            color: 'var(--text-primary)',
            letterSpacing: '-0.02em',
          }}>
            Admin Portal
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            GoodLifeTask — Restricted Access
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              className="form-input"
              type="email"
              placeholder="admin@goodlifetask.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoFocus
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              className="form-input"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          {error && (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: 'var(--r-md)',
              padding: '10px 14px',
              fontSize: 13,
              color: '#dc2626',
              marginBottom: 16,
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}
            disabled={loading}
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <div style={{
          marginTop: 24,
          padding: '12px 14px',
          background: 'var(--bg-muted)',
          borderRadius: 'var(--r-md)',
          fontSize: 12,
          color: 'var(--text-muted)',
          textAlign: 'center',
        }}>
          This portal is for authorized administrators only. Unauthorized access is prohibited.
        </div>
      </div>
    </div>
  );
}
