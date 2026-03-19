import { FastifyInstance } from 'fastify';
import { authenticate } from '../middleware/auth';

export async function subscriptionsRoutes(server: FastifyInstance) {
  // GET /v1/subscriptions/me
  server.get('/me', { preHandler: authenticate }, async (request, reply) => {
    const subscription = await server.prisma.subscription.findFirst({
      where: { userId: request.user.sub },
      orderBy: { createdAt: 'desc' },
    });

    return reply.send({ success: true, data: subscription });
  });

  // POST /v1/subscriptions/portal — create Stripe billing portal session
  server.post('/portal', { preHandler: authenticate }, async (request, reply) => {
    // Placeholder: In production, create Stripe customer portal session
    return reply.send({ success: true, data: { url: null, message: 'Stripe integration pending' } });
  });

  // POST /v1/subscriptions/checkout — create Stripe checkout session
  server.post('/checkout', { preHandler: authenticate }, async (request, reply) => {
    // Placeholder: In production, create Stripe checkout session
    return reply.send({ success: true, data: { url: null, message: 'Stripe integration pending' } });
  });
}
