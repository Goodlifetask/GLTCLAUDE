import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const keyCount = await prisma.translationKey.count({ where: { isActive: true } });
  const langs = await prisma.language.findMany({ where: { isActive: true }, select: { code: true, name: true }, orderBy: { code: 'asc' } });
  const unique = [...new Map(langs.map((l: { code: string; name: string }) => [l.code, l])).values()];
  const counts = await prisma.translation.groupBy({ by: ['langCode'], _count: { _all: true } });
  const countMap = Object.fromEntries(counts.map((c: any) => [c.langCode, c._count._all]));
  const needWork = unique.filter((l: any) => l.code !== 'en' && (countMap[l.code] ?? 0) < keyCount);
  console.log(`Keys: ${keyCount} | Unique langs: ${unique.length} | Need work: ${needWork.length}`);
  needWork.forEach((l: any) => console.log(` ${l.code.padEnd(6)} ${l.name.padEnd(30)} ${countMap[l.code] ?? 0} / ${keyCount}`));
  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
