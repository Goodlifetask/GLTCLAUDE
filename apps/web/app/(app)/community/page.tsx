'use client';
import { useRouter } from 'next/navigation';

export default function CommunityPage() {
  const router = useRouter();

  return (
    <>
      {/* Topbar */}
      <div style={{
        background: 'rgba(20,18,16,0.85)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--b1)', padding: '0 26px', height: 56,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 40
      }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 500, color: 'var(--t1)' }}>
            🌐 Community
          </div>
          <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 1 }}>
            Groups, clubs & shared spaces
          </div>
        </div>
      </div>

      <div style={{ padding: '60px 26px', flex: 1 }}>
        <div style={{ maxWidth: 520, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontSize: 72, marginBottom: 20 }}>🌐</div>
          <div style={{
            fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800,
            color: 'var(--t1)', marginBottom: 12, letterSpacing: '-0.01em'
          }}>
            Community is Coming Soon
          </div>
          <div style={{ fontSize: 14, color: 'var(--t3)', lineHeight: 1.8, marginBottom: 32, maxWidth: 400, margin: '0 auto 32px' }}>
            Community spaces let groups, clubs, and organisations share tasks, events, and announcements — all in one place.
          </div>

          {/* Feature preview cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14, marginBottom: 36, textAlign: 'left' }}>
            {[
              { icon: '📋', title: 'Shared Task Boards', desc: 'Coordinate tasks across your entire group' },
              { icon: '📣', title: 'Announcements', desc: 'Broadcast updates to all members at once' },
              { icon: '📅', title: 'Community Events', desc: 'Plan events everyone can see and RSVP to' },
              { icon: '🏆', title: 'Leaderboards', desc: 'Celebrate top contributors in your community' },
            ].map(f => (
              <div key={f.title} style={{
                padding: '16px 14px', borderRadius: 14,
                background: 'rgba(16,185,129,0.06)',
                border: '1px solid rgba(16,185,129,0.18)',
              }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>{f.icon}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#34d399', marginBottom: 4 }}>{f.title}</div>
                <div style={{ fontSize: 11, color: 'var(--t3)', lineHeight: 1.5 }}>{f.desc}</div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 10,
            padding: '10px 20px', borderRadius: 12,
            background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)',
          }}>
            <span style={{ fontSize: 16 }}>🔔</span>
            <span style={{ fontSize: 12, color: '#34d399', fontWeight: 600 }}>You'll be notified when Community launches</span>
          </div>

          <div style={{ marginTop: 28 }}>
            <button
              onClick={() => router.push('/dashboard')}
              style={{
                padding: '10px 22px', borderRadius: 10,
                background: 'var(--bg-raised)', border: '1px solid var(--b1)',
                cursor: 'pointer', fontFamily: 'var(--font-body)',
                fontSize: 13, fontWeight: 600, color: 'var(--t2)'
              }}
            >
              ← Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
