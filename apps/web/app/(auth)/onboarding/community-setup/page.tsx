'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckSquare } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { api } from '../../../../lib/api';
import { useAuthStore } from '../../../../store/auth';
import toast from 'react-hot-toast';

export default function CommunitySetupPage() {
  const router = useRouter();
  const { user } = useAuthStore();

  // Hydration guard
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    const unsub = useAuthStore.persist.onFinishHydration(() => setHydrated(true));
    if (useAuthStore.persist.hasHydrated()) setHydrated(true);
    return unsub;
  }, []);
  useEffect(() => {
    if (hydrated && !user) router.replace('/login');
  }, [hydrated, user, router]);

  const [communityName, setCommunityName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await api.team.workspaces.create({ name: communityName, description: 'community' });
      const workspace = res.data ?? res;
      if (inviteEmail.trim() && workspace?.id) {
        await api.team.workspaces.invite(workspace.id, { email: inviteEmail.trim() });
      }
      return res;
    },
    onSuccess: () => {
      toast.success('Community created! 🎉');
      router.push('/onboarding');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? 'Could not create community');
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!communityName.trim()) {
      toast.error('Please enter a community name');
      return;
    }
    mutation.mutate();
  }

  if (!hydrated) return null;

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
        }} >
          <CheckSquare size={20} color="#fff" />
        </div>
        <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-text)', letterSpacing: '-0.01em' }}>
          GoodLifeTask
        </span>
      </div>

      {/* Card */}
      <div style={{
        width: '100%',
        maxWidth: 480,
        background: '#fff',
        borderRadius: 24,
        boxShadow: '0 8px 48px rgba(0,0,0,0.1), 0 2px 8px rgba(0,0,0,0.06)',
        padding: '32px 32px 28px',
      }}>
        {/* Heading */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 48, lineHeight: 1, marginBottom: 16 }}>🏘️</div>
          <h2 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 8px', color: 'var(--color-text)', letterSpacing: '-0.01em' }}>
            Set up your community
          </h2>
          <p style={{ fontSize: 14, color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.6 }}>
            Create a shared space where your community members can coordinate activities, assign tasks and stay connected.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Community name */}
          <div>
            <label style={{
              display: 'block', fontSize: 13, fontWeight: 600,
              marginBottom: 6, color: 'var(--color-text)',
            }}>
              Community name
            </label>
            <input
              type="text"
              value={communityName}
              onChange={(e) => setCommunityName(e.target.value)}
              placeholder="e.g. Neighbourhood Watch"
              className="input"
              style={{ width: '100%' }}
              autoComplete="off"
            />
          </div>

          {/* Invite email */}
          <div>
            <label style={{
              display: 'block', fontSize: 13, fontWeight: 600,
              marginBottom: 6, color: 'var(--color-text)',
            }}>
              Invite a member
            </label>
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="member@example.com"
              className="input"
              style={{ width: '100%' }}
              autoComplete="email"
            />
            <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 5 }}>
              Optional — you can invite more later
            </p>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={mutation.isPending}
            style={{
              width: '100%',
              padding: '12px 24px',
              borderRadius: 12,
              fontSize: 15,
              fontWeight: 700,
              border: 'none',
              cursor: mutation.isPending ? 'not-allowed' : 'pointer',
              background: 'linear-gradient(135deg, var(--color-primary) 0%, #6D28D9 100%)',
              color: '#fff',
              boxShadow: '0 4px 16px color-mix(in srgb, var(--color-primary) 35%, transparent)',
              transition: 'opacity 0.15s',
              opacity: mutation.isPending ? 0.75 : 1,
            }}
          >
            {mutation.isPending ? 'Creating community...' : 'Create Community'}
          </button>
        </form>

        {/* Skip link */}
        <div style={{ textAlign: 'center', marginTop: 16 }}>
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
