import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(req: NextRequest) {
  const { name } = await req.json();

  if (!name || typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
  }

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 16,
      messages: [
        {
          role: 'user',
          content: `Reply with only a single emoji that best represents a reminder/task category called "${name.trim()}". Output the emoji character only, no text, no punctuation, no explanation.`,
        },
      ],
    });

    const icon = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map(b => b.text.trim())
      .join('')
      .replace(/[^\p{Emoji}\p{Emoji_Component}]/gu, '')
      .slice(0, 4) || '📁';

    return NextResponse.json({ icon });
  } catch (err: any) {
    console.error('[generate-icon]', err?.message);
    return NextResponse.json({ error: 'Failed to generate icon' }, { status: 500 });
  }
}
