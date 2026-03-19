import { FastifyInstance } from 'fastify';
import Stripe from 'stripe';
import { env } from '../lib/env';

export async function webhooksRoutes(server: FastifyInstance) {
  // POST /v1/webhooks/stripe
  // Stripe sends a raw body — rawBody plugin must be enabled for signature verification
  server.post('/stripe', {
    config: { rawBody: true },
  }, async (request, reply) => {
    const sig = request.headers['stripe-signature'] as string;

    if (!sig) {
      server.log.warn('Stripe webhook received without signature — rejected');
      return reply.status(400).send({ error: 'Missing Stripe-Signature header' });
    }

    if (!env.STRIPE_WEBHOOK_SECRET) {
      server.log.error('STRIPE_WEBHOOK_SECRET not configured — cannot verify webhook');
      return reply.status(500).send({ error: 'Webhook secret not configured' });
    }

    let event: Stripe.Event;
    try {
      const stripe = new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: '2024-04-10' });
      // rawBody is a Buffer set by the raw-body parser
      const rawBody = (request as any).rawBody as Buffer | string;
      event = stripe.webhooks.constructEvent(rawBody, sig, env.STRIPE_WEBHOOK_SECRET);
    } catch (err: any) {
      server.log.warn({ err: err.message }, 'Stripe webhook signature verification failed');
      return reply.status(400).send({ error: `Webhook verification failed: ${err.message}` });
    }

    server.log.info({ type: event.type, id: event.id }, 'Stripe webhook verified');

    try {
      await server.prisma.webhookEvent.create({
        data: {
          provider:   'stripe',
          event_type: event.type,
          payload:    event as any,
          processed:  false,
        },
      });
    } catch (err) {
      server.log.error(err, 'Failed to store Stripe webhook event');
    }

    return reply.status(200).send({ received: true });
  });

  // POST /v1/webhooks/revenuecat
  // RevenueCat sends an Authorization header with a shared secret
  server.post('/revenuecat', async (request, reply) => {
    const authHeader = request.headers['authorization'];
    const expectedSecret = env.REVENUECAT_WEBHOOK_SECRET;

    if (!expectedSecret) {
      server.log.error('REVENUECAT_WEBHOOK_SECRET not configured — cannot verify webhook');
      return reply.status(500).send({ error: 'Webhook secret not configured' });
    }

    if (!authHeader || authHeader !== expectedSecret) {
      server.log.warn('RevenueCat webhook received with invalid authorization — rejected');
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const event = request.body as any;
    server.log.info({ type: event?.event?.type }, 'RevenueCat webhook verified');

    try {
      await server.prisma.webhookEvent.create({
        data: {
          provider:   'revenuecat',
          event_type: event?.event?.type ?? 'unknown',
          payload:    event,
          processed:  false,
        },
      });
    } catch (err) {
      server.log.error(err, 'Failed to store RevenueCat webhook event');
    }

    return reply.status(200).send({ received: true });
  });
}
