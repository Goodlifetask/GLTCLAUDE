/**
 * seed-translations-google.ts
 * Auto-fills ALL translation keys for ALL active languages using Google Translate (free endpoint).
 * Run with: node ../../node_modules/tsx/dist/cli.mjs prisma/seed-translations-google.ts
 *
 * Options (env vars):
 *   LANG_CODE=fr   — only translate one language
 *   SKIP_EXISTING=0 — overwrite existing translations (default: skip)
 *   BATCH=50        — keys per Google Translate batch (default 50)
 *   DELAY_MS=120    — ms between requests (default 120)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ── Config ────────────────────────────────────────────────────────────────────
const ONLY_LANG    = process.env['LANG_CODE'] ?? '';
const SKIP_EXIST   = process.env['SKIP_EXISTING'] !== '0';
const BATCH_SIZE   = parseInt(process.env['BATCH'] ?? '50', 10);
const DELAY_MS     = parseInt(process.env['DELAY_MS'] ?? '120', 10);

// Languages we skip (use English as-is or not supported well by GT)
const SKIP_LANGS = new Set(['en']);

// ── Google Translate free endpoint ────────────────────────────────────────────
// Uses the same endpoint the GT browser widget uses — no API key required,
// but is rate-limited (use small batches + delays).
async function translateBatch(texts: string[], targetLang: string): Promise<string[]> {
  const results: string[] = [];

  for (const text of texts) {
    if (!text.trim()) {
      results.push(text);
      continue;
    }

    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${encodeURIComponent(targetLang)}&dt=t&q=${encodeURIComponent(text)}`;

    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; seed-script)',
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(10_000),
      });

      if (!res.ok) {
        console.warn(`  ⚠ GT ${res.status} for lang=${targetLang}, text="${text.substring(0, 30)}"`);
        results.push(text); // fallback to English
        continue;
      }

      // Response shape: [[["translated","original",null,null,1],...],null,"en",...]
      const data = await res.json() as any;
      const translated = (data[0] as any[])
        .map((chunk: any) => chunk[0] ?? '')
        .join('');

      results.push(translated || text);
    } catch (err: any) {
      console.warn(`  ⚠ GT error for lang=${targetLang}: ${err.message}`);
      results.push(text); // fallback to English
    }

    // Small per-request delay to avoid rate-limit
    await sleep(DELAY_MS);
  }

  return results;
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n🌍  Auto-translate — Google Translate seed\n');

  // 1. Load all active translation keys
  const keys = await prisma.translationKey.findMany({
    where: { isActive: true },
    orderBy: { key: 'asc' },
    include: { translations: true },
  });
  console.log(`📚  ${keys.length} translation keys loaded`);

  // 2. Load all active languages (from languages linked to countries)
  const allLangs = await prisma.language.findMany({
    where: { isActive: true },
    select: { code: true, name: true },
    orderBy: { code: 'asc' },
  });

  const langs = allLangs.filter(l =>
    !SKIP_LANGS.has(l.code) &&
    (ONLY_LANG ? l.code === ONLY_LANG : true)
  );

  console.log(`🌐  ${langs.length} languages to translate`);
  if (ONLY_LANG) console.log(`    (filtered to: ${ONLY_LANG})`);
  console.log(`⚙   Batch size: ${BATCH_SIZE}, Delay: ${DELAY_MS}ms, Skip existing: ${SKIP_EXIST}\n`);

  let totalCreated = 0;
  let totalSkipped = 0;
  let totalErrors  = 0;

  // 3. For each language, translate all keys
  for (let li = 0; li < langs.length; li++) {
    const lang = langs[li];
    console.log(`[${li + 1}/${langs.length}] 🔤  ${lang.name} (${lang.code})`);

    // Build map of already-translated keyIds
    const existingSet = new Set(
      keys.flatMap(k => k.translations.filter(t => t.langCode === lang.code).map(() => k.id))
    );

    // Determine which keys need translating
    const toTranslate = SKIP_EXIST
      ? keys.filter(k => !existingSet.has(k.id))
      : keys;

    if (toTranslate.length === 0) {
      console.log(`    ✓  all ${keys.length} already translated — skipping`);
      totalSkipped += keys.length;
      continue;
    }

    console.log(`    → ${toTranslate.length} to translate (${existingSet.size} already exist)`);

    // Process in batches
    let langCreated = 0;
    let langErrors  = 0;

    for (let i = 0; i < toTranslate.length; i += BATCH_SIZE) {
      const batch = toTranslate.slice(i, i + BATCH_SIZE);
      const texts = batch.map(k => k.defaultValue);

      process.stdout.write(`    batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(toTranslate.length / BATCH_SIZE)} ...`);

      let translated: string[];
      try {
        translated = await translateBatch(texts, lang.code);
      } catch (err: any) {
        console.warn(` ERROR: ${err.message}`);
        langErrors += batch.length;
        continue;
      }

      // Upsert into DB
      for (let j = 0; j < batch.length; j++) {
        const key   = batch[j]!;
        const value = translated[j] ?? key.defaultValue;

        try {
          await prisma.translation.upsert({
            where:  { keyId_langCode: { keyId: key.id, langCode: lang.code } },
            update: { value, isApproved: true, updatedBy: 'google-translate-seed' },
            create: { keyId: key.id, langCode: lang.code, value, isApproved: true, updatedBy: 'google-translate-seed' },
          });
          langCreated++;
        } catch {
          langErrors++;
        }
      }

      console.log(` ✓ ${batch.length}`);

      // Delay between batches to avoid rate-limiting
      if (i + BATCH_SIZE < toTranslate.length) await sleep(DELAY_MS * 2);
    }

    totalCreated += langCreated;
    totalErrors  += langErrors;
    console.log(`    ✅  ${langCreated} saved, ${langErrors} errors\n`);
  }

  console.log('─'.repeat(50));
  console.log(`✅  Done!`);
  console.log(`   Created/updated : ${totalCreated}`);
  console.log(`   Skipped (exist) : ${totalSkipped}`);
  console.log(`   Errors          : ${totalErrors}`);
  console.log('─'.repeat(50) + '\n');
}

main()
  .catch(e => { console.error('Fatal:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
