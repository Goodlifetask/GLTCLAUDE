import { FastifyInstance } from 'fastify';
import { authRoutes } from './auth';
import { usersRoutes } from './users';
import { remindersRoutes } from './reminders';
import { listsRoutes } from './lists';
import { devicesRoutes } from './devices';
import { subscriptionsRoutes } from './subscriptions';
import { webhooksRoutes } from './webhooks';
import { integrationsCalendarRoutes } from './integrations/calendar';

export async function registerRoutes(server: FastifyInstance) {
  await server.register(authRoutes,         { prefix: '/v1/auth' });
  await server.register(usersRoutes,        { prefix: '/v1/users' });
  await server.register(remindersRoutes,    { prefix: '/v1/reminders' });
  await server.register(listsRoutes,        { prefix: '/v1/lists' });
  await server.register(devicesRoutes,      { prefix: '/v1/devices' });
  await server.register(subscriptionsRoutes, { prefix: '/v1/subscriptions' });
  await server.register(webhooksRoutes,     { prefix: '/v1/webhooks' });
  await server.register(integrationsCalendarRoutes, { prefix: '/v1/integrations/calendar' });
}
