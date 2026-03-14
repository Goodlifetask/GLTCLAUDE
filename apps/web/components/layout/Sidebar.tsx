'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Calendar, List, Settings, LogOut, Bell,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useAuthStore } from '../../store/auth';
import { api } from '../../lib/api';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/calendar',  label: 'Calendar',  icon: Calendar        },
  { href: '/lists',     label: 'Lists',      icon: List            },
  { href: '/settings',  label: 'Settings',   icon: Settings        },
];

export function Sidebar() {
  const pathname = usePathname();
  const router   = useRouter();
  const { user, logout } = useAuthStore();

  const logoutMutation = useMutation({
    mutationFn: () => api.auth.logout(),
    onSettled: () => {
      logout();
      router.push('/login');
    },
  });

  return (
    <aside className="w-16 lg:w-56 flex flex-col bg-[var(--color-bg-dark)] border-r border-white/10 shrink-0">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-[var(--color-primary)] flex items-center justify-center">
            <Bell className="w-4 h-4 text-white" />
          </div>
          <span className="hidden lg:block font-display font-bold text-white text-sm leading-tight">
            GoodLife<br />Task
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname?.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-150',
                active
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'text-white/60 hover:bg-white/10 hover:text-white',
              )}
            >
              <Icon className="w-5 h-5 shrink-0" />
              <span className="hidden lg:block">{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User + Logout */}
      <div className="px-2 py-4 border-t border-white/10 space-y-1">
        {user && (
          <div className="hidden lg:flex items-center gap-2 px-3 py-2">
            <div className="w-6 h-6 rounded-full bg-[var(--color-primary)] flex items-center justify-center shrink-0">
              <span className="text-white text-xs font-bold">
                {user.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-white text-xs font-medium truncate">{user.name}</p>
              <p className="text-white/50 text-xs truncate">{user.plan}</p>
            </div>
          </div>
        )}
        <button
          onClick={() => logoutMutation.mutate()}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-white/60 hover:bg-white/10 hover:text-white transition-all duration-150"
        >
          <LogOut className="w-5 h-5 shrink-0" />
          <span className="hidden lg:block">Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
