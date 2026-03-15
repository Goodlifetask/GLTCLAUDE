'use client';
import { Sidebar } from '../../components/layout/Sidebar';
import { RightPanel } from '../../components/layout/RightPanel';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr 288px', minHeight: '100vh' }}>
      <Sidebar />
      <main style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
        {children}
      </main>
      <RightPanel />
    </div>
  );
}
