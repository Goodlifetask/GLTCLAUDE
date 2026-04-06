import { FastifyInstance } from 'fastify';
import fs from 'fs';
import path from 'path';

const CONFIG_PATH = path.resolve(__dirname, '../../../data/menu-config.json');

const DEFAULT_CONFIG = {
  web: [
    { id: 'dashboard',  label: 'Dashboard', icon: '⊞',  href: '/dashboard',  target: '_self', visible: true, order: 0, badge: null },
    { id: 'tasks',      label: 'Tasks',     icon: '◎',  href: '/tasks',      target: '_self', visible: true, order: 1, badge: null },
    { id: 'calendar',   label: 'Calendar',  icon: '📅', href: '/calendar',   target: '_self', visible: true, order: 2, badge: null },
    { id: 'fly-alarms', label: 'Fly-Alarms',icon: '⚡', href: '/fly-alarms', target: '_self', visible: true, order: 3, badge: null },
    { id: 'settings',   label: 'Settings',  icon: '⊙',  href: '/settings',   target: '_self', visible: true, order: 4, badge: null },
  ],
  admin: [] as any[],
};

export function readMenuConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function writeMenuConfig(config: any) {
  const dir = path.dirname(CONFIG_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
}

// Public route — no auth required, used by the web app sidebar
export async function menuConfigPublicRoutes(server: FastifyInstance) {
  server.get('/menu-config', async (_req, reply) => {
    return reply.send({ success: true, data: readMenuConfig() });
  });
}
