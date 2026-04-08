import { FastifyInstance } from 'fastify';
import fs from 'fs';
import path from 'path';

// Try multiple candidate paths — __dirname differs between tsx watch and compiled output
const CANDIDATE_PATHS = [
  path.resolve(__dirname, '../../../data/menu-config.json'),         // compiled: dist/routes → root
  path.resolve(process.cwd(), 'data/menu-config.json'),              // tsx from services/api/
  path.resolve(process.cwd(), 'services/api/data/menu-config.json'), // tsx from monorepo root
  path.resolve(__dirname, '../../data/menu-config.json'),            // alternate depth
];

const CONFIG_PATH: string = (() => {
  for (const p of CANDIDATE_PATHS) {
    if (fs.existsSync(p)) return p;
  }
  return CANDIDATE_PATHS[1]; // default: cwd-relative
})();

const DEFAULT_CONFIG = {
  web: [
    { id: 'dashboard',     label: 'Dashboard',     icon: '⊞',  href: '/dashboard',     target: '_self', visible: true, order: 0, badge: null },
    { id: 'tasks',         label: 'Tasks',         icon: '◎',  href: '/tasks',         target: '_self', visible: true, order: 1, badge: null },
    { id: 'calendar',      label: 'Calendar',      icon: '📅', href: '/calendar',      target: '_self', visible: true, order: 2, badge: null },
    { id: 'fly-alarms',    label: 'Fly-Alarms',    icon: '⚡', href: '/fly-alarms',    target: '_self', visible: true, order: 3, badge: null },
    { id: 'fridge',        label: '🧊 Fridge',     icon: '🧊', href: '/fridge',        target: '_self', visible: true, order: 4, badge: null },
    { id: 'subscriptions', label: '💳 Subscriptions', icon: '💳', href: '/subscriptions', target: '_self', visible: true, order: 5, badge: null },
    { id: 'documents',    label: '📋 Documents',    icon: '📋', href: '/documents',    target: '_self', visible: true, order: 6, badge: null },
    { id: 'settings',     label: 'Settings',        icon: '⊙',  href: '/settings',     target: '_self', visible: true, order: 7, badge: null },
  ],
  admin: [] as any[],
};

export function readMenuConfig() {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch {
    // File not found at resolved path — return DEFAULT_CONFIG with Fridge included
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
