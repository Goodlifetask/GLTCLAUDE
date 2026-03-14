import { FastifyInstance } from 'fastify';

export async function webhooksRoutes(server: FastifyInstance) {
  // POST /v1/webhooks/stripe
  server.post('/stripe', {
    config: { rawBody: true },
  }, async (request, reply) => {
    // Placeholder: verify Stripe-Signature header and process events
    const event = request.body as any;
    server.log.info({ type: event?.type }, 'Stripe webhook received');

    // Store raw event for audit
    try {
      await server.prisma.webhookEvent.create({
        data: {
          provider: 'stripe',
          event_type: event?.type ?? 'unknown',
          payload: event,
          processed: false,
        },
      });
    } catch (err) {
      server.log.error(err, 'Failed to store webhook event');
    }

    return reply.status(200).send({ received: true });
  });

  // POST /v1/webhooks/revenuecat
  server.post('/revenuecat', async (request, reply) => {
    const event = request.body as any;
    server.log.info({ type: event?.event?.type }, 'RevenueCat webhook received');

    try {
      await server.prisma.webhookEvent.create({
        data: {
          provider: 'revenuecat',
          event_type: event?.event?.type ?? 'unknown',
          payload: event,
          processed: false,
        },
      });
    } catch (err) {
      server.log.error(err, 'Failed to store RevenueCat webhook event');
    }

    return reply.status(200).send({ received: true });
  });
}
