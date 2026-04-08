import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { pipeline } from 'stream/promises';

const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads/documents');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// ─── AI Scanning ──────────────────────────────────────────────────────────────
async function scanDocumentWithAI(imagePath: string): Promise<{
  docType: string;
  documentNumber?: string;
  holderName?: string;
  issuingAuthority?: string;
  issuingCountry?: string;
  issueDate?: string;   // ISO date string
  expiryDate?: string;  // ISO date string
  name?: string;        // suggested display name
  confidence: number;
  raw: string;
}> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === 'your-anthropic-api-key-here') {
    return { docType: 'other', confidence: 0, raw: 'No API key configured' };
  }

  const client = new Anthropic({ apiKey });
  const imageBuffer = fs.readFileSync(imagePath);
  const base64 = imageBuffer.toString('base64');
  const ext = path.extname(imagePath).toLowerCase();
  const mediaType = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';

  const prompt = `You are a document scanner. Analyze this document image and extract all relevant information.

Return a JSON object with these exact fields (use null for fields you cannot determine):
{
  "docType": one of: "passport" | "drivers_license" | "national_id" | "visa" | "insurance" | "vehicle_registration" | "health_card" | "work_permit" | "residence_permit" | "professional_license" | "birth_certificate" | "marriage_certificate" | "tax_document" | "other",
  "name": "a short display name for this document (e.g. 'John Smith Passport', 'NY Driver License')",
  "documentNumber": "the document/ID number",
  "holderName": "full name of the document holder",
  "issuingAuthority": "the authority/organization that issued the document",
  "issuingCountry": "country that issued the document (full name)",
  "issueDate": "YYYY-MM-DD format or null",
  "expiryDate": "YYYY-MM-DD format or null",
  "confidence": a number 0-100 indicating how confident you are in the extraction
}

IMPORTANT: Return ONLY valid JSON, no markdown, no explanation.`;

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
        { type: 'text', text: prompt },
      ],
    }],
  });

  const raw = (message.content[0] as any).text ?? '';
  try {
    const parsed = JSON.parse(raw);
    return { ...parsed, raw };
  } catch {
    return { docType: 'other', confidence: 0, raw };
  }
}

// ─── Reminder helpers ─────────────────────────────────────────────────────────
function getReminderSchedule(expiryDate: Date): Array<{ daysBeforeExpiry: number; fireAt: Date; title: string }> {
  const now = new Date();
  const schedule: Array<{ daysBeforeExpiry: number; fireAt: Date; title: string }> = [];

  const milestones = [30, 14, 7, 6, 5, 4, 3, 2, 1, 0];

  for (const days of milestones) {
    const fireAt = new Date(expiryDate);
    fireAt.setDate(fireAt.getDate() - days);
    fireAt.setHours(9, 0, 0, 0);
    if (fireAt > now) {
      let title: string;
      if (days === 0)       title = `📄 Document expires TODAY`;
      else if (days === 1)  title = `📄 Document expires TOMORROW`;
      else if (days === 7)  title = `📄 Document expires in 1 week`;
      else if (days === 14) title = `📄 Document expires in 2 weeks`;
      else if (days === 30) title = `📄 Document expires in 1 month`;
      else                  title = `📄 Document expires in ${days} days`;
      schedule.push({ daysBeforeExpiry: days, fireAt, title });
    }
  }

  return schedule;
}

async function createDocumentReminders(
  prisma: PrismaClient,
  userId: string,
  documentId: string,
  documentName: string,
  expiryDate: Date,
): Promise<string[]> {
  const schedule = getReminderSchedule(expiryDate);
  const ids: string[] = [];

  for (const item of schedule) {
    const title = item.title.replace('Document', `"${documentName}"`);
    const reminder = await (prisma as any).reminder.create({
      data: {
        userId,
        title,
        type: 'task',
        fireAt: item.fireAt,
        notes: `Auto-generated for document: ${documentName} (expires ${expiryDate.toLocaleDateString()})`,
        isRecurring: false,
        status: 'pending',
      },
    });
    ids.push(reminder.id);
  }

  return ids;
}

async function deleteDocumentReminders(prisma: PrismaClient, reminderIds: string[]) {
  if (!reminderIds.length) return;
  await (prisma as any).reminder.updateMany({
    where: { id: { in: reminderIds } },
    data: { deletedAt: new Date() },
  });
}

// ─── Route handler ─────────────────────────────────────────────────────────────
export async function userDocumentsRoutes(server: FastifyInstance) {
  const prisma: PrismaClient = (server as any).prisma;

  function getUserId(request: FastifyRequest): string {
    return (request as any).user?.userId ?? (request as any).user?.sub;
  }

  // ── GET /  — list documents ──────────────────────────────────────────────────
  server.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = getUserId(request);
    const docs = await (prisma as any).userDocument.findMany({
      where: { userId, deletedAt: null, isArchived: false },
      orderBy: { expiryDate: 'asc' },
    });

    // Annotate with days until expiry
    const now = Date.now();
    const annotated = docs.map((d: any) => ({
      ...d,
      daysUntilExpiry: d.expiryDate
        ? Math.ceil((new Date(d.expiryDate).getTime() - now) / (1000 * 60 * 60 * 24))
        : null,
    }));

    return reply.send({ success: true, data: annotated });
  });

  // ── GET /:id — single doc ────────────────────────────────────────────────────
  server.get('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = getUserId(request);
    const { id } = request.params as { id: string };
    const doc = await (prisma as any).userDocument.findFirst({
      where: { id, userId, deletedAt: null },
    });
    if (!doc) return reply.status(404).send({ success: false, error: 'Not found' });
    return reply.send({ success: true, data: doc });
  });

  // ── POST /scan — upload image and AI scan ────────────────────────────────────
  server.post('/scan', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const parts = request.parts();
      let filePath: string | null = null;
      let fileName = `doc_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

      for await (const part of parts) {
        if (part.type === 'file') {
          const ext = path.extname(part.filename || '.jpg') || '.jpg';
          fileName += ext;
          filePath = path.join(UPLOAD_DIR, fileName);
          await pipeline(part.file, fs.createWriteStream(filePath));
        }
      }

      if (!filePath) return reply.status(400).send({ success: false, error: 'No file uploaded' });

      const scanResult = await scanDocumentWithAI(filePath);

      return reply.send({
        success: true,
        data: {
          imagePath: `uploads/documents/${fileName}`,
          scan: scanResult,
        },
      });
    } catch (err) {
      server.log.error(err);
      return reply.status(500).send({ success: false, error: 'Scan failed' });
    }
  });

  // ── POST / — create document ─────────────────────────────────────────────────
  server.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = getUserId(request);
    const body = request.body as any;

    const expiryDate = body.expiry_date ? new Date(body.expiry_date) : null;
    const issueDate  = body.issue_date  ? new Date(body.issue_date)  : null;

    const doc = await (prisma as any).userDocument.create({
      data: {
        userId,
        name:             body.name,
        docType:          body.doc_type    ?? 'other',
        documentNumber:   body.document_number   ?? null,
        holderName:       body.holder_name       ?? null,
        issuingAuthority: body.issuing_authority ?? null,
        issuingCountry:   body.issuing_country   ?? null,
        issueDate,
        expiryDate,
        notes:            body.notes     ?? null,
        imagePath:        body.image_path ?? null,
        aiScanData:       body.ai_scan_data ?? null,
      },
    });

    // Auto-create reminders if expiry date provided
    let reminderIds: string[] = [];
    if (expiryDate) {
      reminderIds = await createDocumentReminders(prisma, userId, doc.id, doc.name, expiryDate);
      await (prisma as any).userDocument.update({
        where: { id: doc.id },
        data: { reminderIds },
      });
    }

    return reply.status(201).send({ success: true, data: { ...doc, reminderIds } });
  });

  // ── PATCH /:id — update document ─────────────────────────────────────────────
  server.patch('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = getUserId(request);
    const { id }  = request.params as { id: string };
    const body    = request.body as any;

    const existing = await (prisma as any).userDocument.findFirst({
      where: { id, userId, deletedAt: null },
    });
    if (!existing) return reply.status(404).send({ success: false, error: 'Not found' });

    const newExpiryDate  = body.expiry_date ? new Date(body.expiry_date) : undefined;
    const newIssueDate   = body.issue_date  ? new Date(body.issue_date)  : undefined;
    const expiryChanged  = newExpiryDate && newExpiryDate.getTime() !== existing.expiryDate?.getTime();

    const updates: any = {};
    if (body.name             !== undefined) updates.name             = body.name;
    if (body.doc_type         !== undefined) updates.docType          = body.doc_type;
    if (body.document_number  !== undefined) updates.documentNumber   = body.document_number;
    if (body.holder_name      !== undefined) updates.holderName       = body.holder_name;
    if (body.issuing_authority!== undefined) updates.issuingAuthority = body.issuing_authority;
    if (body.issuing_country  !== undefined) updates.issuingCountry   = body.issuing_country;
    if (newIssueDate)  updates.issueDate  = newIssueDate;
    if (newExpiryDate) updates.expiryDate = newExpiryDate;
    if (body.notes    !== undefined) updates.notes    = body.notes;
    if (body.image_path !== undefined) updates.imagePath = body.image_path;

    // If expiry changed, rebuild all reminders
    if (expiryChanged) {
      await deleteDocumentReminders(prisma, existing.reminderIds ?? []);
      const newIds = await createDocumentReminders(
        prisma, userId, id, body.name ?? existing.name, newExpiryDate!,
      );
      updates.reminderIds = newIds;
    }

    const doc = await (prisma as any).userDocument.update({ where: { id }, data: updates });
    return reply.send({ success: true, data: doc });
  });

  // ── DELETE /:id — soft delete ─────────────────────────────────────────────────
  server.delete('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = getUserId(request);
    const { id }  = request.params as { id: string };

    const existing = await (prisma as any).userDocument.findFirst({
      where: { id, userId, deletedAt: null },
    });
    if (!existing) return reply.status(404).send({ success: false, error: 'Not found' });

    await deleteDocumentReminders(prisma, existing.reminderIds ?? []);
    await (prisma as any).userDocument.update({ where: { id }, data: { deletedAt: new Date() } });

    return reply.send({ success: true });
  });

  // ── GET /image/:filename — serve uploaded image ──────────────────────────────
  server.get('/image/:filename', async (request: FastifyRequest, reply: FastifyReply) => {
    const { filename } = request.params as { filename: string };
    // Basic safety check - no path traversal
    if (filename.includes('..') || filename.includes('/')) {
      return reply.status(400).send({ error: 'Invalid filename' });
    }
    const filePath = path.join(UPLOAD_DIR, filename);
    if (!fs.existsSync(filePath)) return reply.status(404).send({ error: 'Not found' });
    const ext = path.extname(filename).toLowerCase();
    const ct  = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
    reply.header('Content-Type', ct);
    return reply.send(fs.createReadStream(filePath));
  });
}
