'use client';
import { useState } from 'react';

const NAV = [
  { section: 'Overview', items: [
    { label: 'Dashboard', icon: '⊞', page: 'dashboard', badge: null, badgeClass: null },
    { label: 'Analytics', icon: '↗', page: 'analytics', badge: 'Live', badgeClass: 'nb-brand' },
    { label: 'Activity Logs', icon: '≡', page: 'logs', badge: null, badgeClass: null },
  ]},
  { section: 'Users', items: [
    { label: 'All Users', icon: '◎', page: 'users', badge: '24.8k', badgeClass: 'nb-gray' },
    { label: 'Roles & Permissions', icon: '⬡', page: 'roles', badge: null, badgeClass: null },
    { label: 'Family Groups', icon: '👨‍👩‍👧', page: 'families', badge: null, badgeClass: null },
    { label: 'Subscriptions', icon: '◈', page: 'subs', badge: '3', badgeClass: 'nb-red' },
  ]},
  { section: 'Application', items: [
    { label: 'Categories', icon: '⊛', page: 'categories', badge: null, badgeClass: null },
    { label: 'Themes & UI', icon: '◑', page: 'themes', badge: null, badgeClass: null },
    { label: 'Languages', icon: '⊕', page: 'language', badge: null, badgeClass: null },
    { label: 'Translations', icon: '⟺', page: 'translations', badge: null, badgeClass: null },
    { label: 'Notifications', icon: '◉', page: 'notifs', badge: null, badgeClass: null },
  ]},
  { section: 'Monetisation', items: [
    { label: 'Web Ads', icon: '□', page: 'webads', badge: null, badgeClass: null },
    { label: 'Mobile Ads', icon: '▣', page: 'mobileads', badge: null, badgeClass: null },
    { label: 'Billing & Revenue', icon: '◇', page: 'billing', badge: null, badgeClass: null },
  ]},
  { section: 'Integrations', items: [
    { label: 'All Integrations', icon: '⊞', page: 'integrations', badge: '8', badgeClass: 'nb-green' },
    { label: 'Voice Assistants', icon: '◎', page: 'voice', badge: null, badgeClass: null },
    { label: 'Calendar Sync', icon: '⊡', page: 'calsync', badge: null, badgeClass: null },
    { label: 'Email Clients', icon: '⊠', page: 'emailint', badge: null, badgeClass: null },
    { label: 'API Keys', icon: '⊹', page: 'apikeys', badge: null, badgeClass: null },
  ]},
  { section: 'System', items: [
    { label: 'Settings', icon: '⊙', page: 'settings', badge: null, badgeClass: null },
    { label: 'Security', icon: '⊗', page: 'security', badge: null, badgeClass: null },
    { label: 'Backup & Restore', icon: '◫', page: 'backup', badge: null, badgeClass: null },
  ]},
];

export function AdminSidebar({ activePage, onNavigate }: { activePage: string; onNavigate: (page: string) => void }) {
  return (
    <aside className="sidebar">
      {/* Header */}
      <div className="sidebar-header">
        <div className="brand-row">
          <div className="brand-icon">G</div>
          <div className="brand-name">GoodLifeTask</div>
        </div>
        <div className="brand-env">
          <div className="env-dot" />
          Production
        </div>
      </div>

      {/* Search */}
      <div className="sidebar-search">
        <span className="sidebar-search-icon">⌕</span>
        <input type="text" placeholder="Search..." />
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        {NAV.map(section => (
          <div key={section.section} className="nav-section">
            <div className="nav-section-label">{section.section}</div>
            {section.items.map(item => {
              const isActive = activePage === item.page;
              return (
                <div
                  key={item.page}
                  className={`nav-link${isActive ? ' active' : ''}`}
                  onClick={() => onNavigate(item.page)}
                >
                  <span className="nav-icon">{item.icon}</span>
                  {item.label}
                  {item.badge && (
                    <span className={`nav-badge${item.badgeClass ? ' ' + item.badgeClass : ''}`}>
                      {item.badge}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="user-ava">SA</div>
          <div className="user-info">
            <div className="user-name">Super Admin</div>
            <div className="user-role">admin@goodlifetask.com</div>
          </div>
          <div className="user-menu">⋯</div>
        </div>
      </div>
    </aside>
  );
}
