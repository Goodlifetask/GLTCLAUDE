import { PrismaClient, AdminRole } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create Super Admin
  const adminPassword = await bcrypt.hash('SuperAdmin123!', 12);
  const superAdmin = await prisma.adminUser.upsert({
    where: { email: 'admin@goodlifetask.com' },
    update: {},
    create: {
      email:        'admin@goodlifetask.com',
      name:         'Super Admin',
      passwordHash: adminPassword,
      role:         AdminRole.super_admin,
      isActive:     true,
    },
  });
  console.log(`✅ Super Admin created: ${superAdmin.email}`);

  // Create demo users
  const userPassword = await bcrypt.hash('DemoUser123!', 12);

  const freeUser = await prisma.user.upsert({
    where: { email: 'free@demo.com' },
    update: {},
    create: {
      email:        'free@demo.com',
      name:         'Free User Demo',
      passwordHash: userPassword,
      plan:         'free',
      locale:       'en',
      timezone:     'America/New_York',
      theme:        'warm_corporate',
    },
  });

  const proUser = await prisma.user.upsert({
    where: { email: 'pro@demo.com' },
    update: {},
    create: {
      email:        'pro@demo.com',
      name:         'Pro User Demo',
      passwordHash: userPassword,
      plan:         'pro',
      locale:       'en',
      timezone:     'America/Los_Angeles',
      theme:        'blue_spectrum',
    },
  });

  console.log(`✅ Demo users created: ${freeUser.email}, ${proUser.email}`);

  // Create system reminder lists for demo users
  const systemLists = [
    { name: 'Work',      color: '#3F8EFC', icon: 'briefcase',  isSystem: true },
    { name: 'Personal',  color: '#F0A202', icon: 'person',     isSystem: true },
    { name: 'Health',    color: '#2ECC71', icon: 'heart',      isSystem: true },
    { name: 'Finance',   color: '#F59E0B', icon: 'dollar',     isSystem: true },
    { name: 'Family',    color: '#EC4899', icon: 'home',       isSystem: true },
    { name: 'Travel',    color: '#8B5CF6', icon: 'airplane',   isSystem: true },
    { name: 'Shopping',  color: '#EF4444', icon: 'cart',       isSystem: true },
    { name: 'Education', color: '#06B6D4', icon: 'book',       isSystem: true },
  ];

  for (const user of [freeUser, proUser]) {
    for (const list of systemLists) {
      await prisma.reminderList.upsert({
        where: {
          id: `${user.id}-${list.name}`.substring(0, 36).padEnd(36, '0'),
        },
        update: {},
        create: { userId: user.id, ...list },
      });
    }
  }

  // Sample reminders for free user
  const workList = await prisma.reminderList.findFirst({
    where: { userId: freeUser.id, name: 'Work' },
  });

  if (workList) {
    await prisma.reminder.createMany({
      skipDuplicates: true,
      data: [
        {
          userId:   freeUser.id,
          listId:   workList.id,
          type:     'task',
          title:    'Review Q1 budget proposal',
          priority: 'high',
          status:   'pending',
          fireAt:   new Date(Date.now() + 3600000), // 1 hour from now
          metadata: { subTasks: [], estimatedMinutes: 60 },
        },
        {
          userId:   freeUser.id,
          listId:   workList.id,
          type:     'call',
          title:    'Call Sarah re: project kickoff',
          priority: 'medium',
          status:   'pending',
          fireAt:   new Date(Date.now() + 7200000), // 2 hours from now
          metadata: { phoneNumber: '+1 555 0100', repeatUntilAnswered: true, maxRepeatCount: 3 },
        },
      ],
    });
  }

  console.log('✅ Sample reminders created');

  // ── Countries & Languages ─────────────────────────────────────────────────
  const COUNTRY_LANGUAGES: {
    country: string;
    code: string;
    sortOrder: number;
    languages: { name: string; code: string; isRtl?: boolean }[];
  }[] = [
    // Americas
    { country: 'United States',     code: 'US', sortOrder: 1,  languages: [{ name: 'English', code: 'en' }, { name: 'Spanish', code: 'es' }] },
    { country: 'Canada',            code: 'CA', sortOrder: 2,  languages: [{ name: 'English', code: 'en' }, { name: 'French', code: 'fr' }] },
    { country: 'Mexico',            code: 'MX', sortOrder: 3,  languages: [{ name: 'Spanish', code: 'es' }] },
    { country: 'Brazil',            code: 'BR', sortOrder: 4,  languages: [{ name: 'Portuguese', code: 'pt' }] },
    { country: 'Argentina',         code: 'AR', sortOrder: 5,  languages: [{ name: 'Spanish', code: 'es' }] },
    { country: 'Colombia',          code: 'CO', sortOrder: 6,  languages: [{ name: 'Spanish', code: 'es' }] },
    { country: 'Chile',             code: 'CL', sortOrder: 7,  languages: [{ name: 'Spanish', code: 'es' }] },
    { country: 'Peru',              code: 'PE', sortOrder: 8,  languages: [{ name: 'Spanish', code: 'es' }, { name: 'Quechua', code: 'qu' }] },
    { country: 'Venezuela',         code: 'VE', sortOrder: 9,  languages: [{ name: 'Spanish', code: 'es' }] },
    { country: 'Cuba',              code: 'CU', sortOrder: 10, languages: [{ name: 'Spanish', code: 'es' }] },
    { country: 'Haiti',             code: 'HT', sortOrder: 11, languages: [{ name: 'French', code: 'fr' }, { name: 'Haitian Creole', code: 'ht' }] },
    { country: 'Jamaica',           code: 'JM', sortOrder: 12, languages: [{ name: 'English', code: 'en' }] },
    // Europe
    { country: 'United Kingdom',    code: 'GB', sortOrder: 20, languages: [{ name: 'English', code: 'en' }, { name: 'Welsh', code: 'cy' }] },
    { country: 'France',            code: 'FR', sortOrder: 21, languages: [{ name: 'French', code: 'fr' }] },
    { country: 'Germany',           code: 'DE', sortOrder: 22, languages: [{ name: 'German', code: 'de' }] },
    { country: 'Spain',             code: 'ES', sortOrder: 23, languages: [{ name: 'Spanish', code: 'es' }, { name: 'Catalan', code: 'ca' }, { name: 'Basque', code: 'eu' }] },
    { country: 'Italy',             code: 'IT', sortOrder: 24, languages: [{ name: 'Italian', code: 'it' }] },
    { country: 'Portugal',          code: 'PT', sortOrder: 25, languages: [{ name: 'Portuguese', code: 'pt' }] },
    { country: 'Netherlands',       code: 'NL', sortOrder: 26, languages: [{ name: 'Dutch', code: 'nl' }] },
    { country: 'Belgium',           code: 'BE', sortOrder: 27, languages: [{ name: 'Dutch', code: 'nl' }, { name: 'French', code: 'fr' }, { name: 'German', code: 'de' }] },
    { country: 'Switzerland',       code: 'CH', sortOrder: 28, languages: [{ name: 'German', code: 'de' }, { name: 'French', code: 'fr' }, { name: 'Italian', code: 'it' }] },
    { country: 'Austria',           code: 'AT', sortOrder: 29, languages: [{ name: 'German', code: 'de' }] },
    { country: 'Sweden',            code: 'SE', sortOrder: 30, languages: [{ name: 'Swedish', code: 'sv' }] },
    { country: 'Norway',            code: 'NO', sortOrder: 31, languages: [{ name: 'Norwegian', code: 'no' }] },
    { country: 'Denmark',           code: 'DK', sortOrder: 32, languages: [{ name: 'Danish', code: 'da' }] },
    { country: 'Finland',           code: 'FI', sortOrder: 33, languages: [{ name: 'Finnish', code: 'fi' }, { name: 'Swedish', code: 'sv' }] },
    { country: 'Poland',            code: 'PL', sortOrder: 34, languages: [{ name: 'Polish', code: 'pl' }] },
    { country: 'Czech Republic',    code: 'CZ', sortOrder: 35, languages: [{ name: 'Czech', code: 'cs' }] },
    { country: 'Hungary',           code: 'HU', sortOrder: 36, languages: [{ name: 'Hungarian', code: 'hu' }] },
    { country: 'Romania',           code: 'RO', sortOrder: 37, languages: [{ name: 'Romanian', code: 'ro' }] },
    { country: 'Greece',            code: 'GR', sortOrder: 38, languages: [{ name: 'Greek', code: 'el' }] },
    { country: 'Ukraine',           code: 'UA', sortOrder: 39, languages: [{ name: 'Ukrainian', code: 'uk' }] },
    { country: 'Russia',            code: 'RU', sortOrder: 40, languages: [{ name: 'Russian', code: 'ru' }] },
    { country: 'Ireland',           code: 'IE', sortOrder: 41, languages: [{ name: 'English', code: 'en' }, { name: 'Irish', code: 'ga' }] },
    { country: 'Croatia',           code: 'HR', sortOrder: 42, languages: [{ name: 'Croatian', code: 'hr' }] },
    { country: 'Serbia',            code: 'RS', sortOrder: 43, languages: [{ name: 'Serbian', code: 'sr' }] },
    // Middle East
    { country: 'Saudi Arabia',      code: 'SA', sortOrder: 50, languages: [{ name: 'Arabic', code: 'ar', isRtl: true }] },
    { country: 'United Arab Emirates', code: 'AE', sortOrder: 51, languages: [{ name: 'Arabic', code: 'ar', isRtl: true }] },
    { country: 'Israel',            code: 'IL', sortOrder: 52, languages: [{ name: 'Hebrew', code: 'he', isRtl: true }, { name: 'Arabic', code: 'ar', isRtl: true }] },
    { country: 'Iran',              code: 'IR', sortOrder: 53, languages: [{ name: 'Persian (Farsi)', code: 'fa', isRtl: true }] },
    { country: 'Turkey',            code: 'TR', sortOrder: 54, languages: [{ name: 'Turkish', code: 'tr' }] },
    { country: 'Egypt',             code: 'EG', sortOrder: 55, languages: [{ name: 'Arabic', code: 'ar', isRtl: true }] },
    { country: 'Jordan',            code: 'JO', sortOrder: 56, languages: [{ name: 'Arabic', code: 'ar', isRtl: true }] },
    { country: 'Lebanon',           code: 'LB', sortOrder: 57, languages: [{ name: 'Arabic', code: 'ar', isRtl: true }, { name: 'French', code: 'fr' }] },
    { country: 'Qatar',             code: 'QA', sortOrder: 58, languages: [{ name: 'Arabic', code: 'ar', isRtl: true }] },
    { country: 'Kuwait',            code: 'KW', sortOrder: 59, languages: [{ name: 'Arabic', code: 'ar', isRtl: true }] },
    { country: 'Iraq',              code: 'IQ', sortOrder: 60, languages: [{ name: 'Arabic', code: 'ar', isRtl: true }, { name: 'Kurdish', code: 'ku' }] },
    { country: 'Afghanistan',       code: 'AF', sortOrder: 61, languages: [{ name: 'Pashto', code: 'ps', isRtl: true }, { name: 'Dari', code: 'fa', isRtl: true }] },
    // South Asia
    { country: 'India',             code: 'IN', sortOrder: 70, languages: [{ name: 'Hindi', code: 'hi' }, { name: 'English', code: 'en' }, { name: 'Bengali', code: 'bn' }, { name: 'Tamil', code: 'ta' }, { name: 'Telugu', code: 'te' }, { name: 'Marathi', code: 'mr' }, { name: 'Gujarati', code: 'gu' }, { name: 'Punjabi', code: 'pa' }, { name: 'Kannada', code: 'kn' }, { name: 'Malayalam', code: 'ml' }, { name: 'Urdu', code: 'ur', isRtl: true }] },
    { country: 'Pakistan',          code: 'PK', sortOrder: 71, languages: [{ name: 'Urdu', code: 'ur', isRtl: true }, { name: 'English', code: 'en' }, { name: 'Punjabi', code: 'pa' }] },
    { country: 'Bangladesh',        code: 'BD', sortOrder: 72, languages: [{ name: 'Bengali', code: 'bn' }] },
    { country: 'Sri Lanka',         code: 'LK', sortOrder: 73, languages: [{ name: 'Sinhala', code: 'si' }, { name: 'Tamil', code: 'ta' }] },
    { country: 'Nepal',             code: 'NP', sortOrder: 74, languages: [{ name: 'Nepali', code: 'ne' }] },
    // East & Southeast Asia
    { country: 'China',             code: 'CN', sortOrder: 80, languages: [{ name: 'Chinese (Mandarin)', code: 'zh' }, { name: 'Cantonese', code: 'yue' }] },
    { country: 'Japan',             code: 'JP', sortOrder: 81, languages: [{ name: 'Japanese', code: 'ja' }] },
    { country: 'South Korea',       code: 'KR', sortOrder: 82, languages: [{ name: 'Korean', code: 'ko' }] },
    { country: 'Taiwan',            code: 'TW', sortOrder: 83, languages: [{ name: 'Chinese (Traditional)', code: 'zh-TW' }] },
    { country: 'Hong Kong',         code: 'HK', sortOrder: 84, languages: [{ name: 'Cantonese', code: 'yue' }, { name: 'English', code: 'en' }] },
    { country: 'Indonesia',         code: 'ID', sortOrder: 85, languages: [{ name: 'Indonesian', code: 'id' }] },
    { country: 'Malaysia',          code: 'MY', sortOrder: 86, languages: [{ name: 'Malay', code: 'ms' }, { name: 'English', code: 'en' }] },
    { country: 'Philippines',       code: 'PH', sortOrder: 87, languages: [{ name: 'Filipino (Tagalog)', code: 'tl' }, { name: 'English', code: 'en' }] },
    { country: 'Thailand',          code: 'TH', sortOrder: 88, languages: [{ name: 'Thai', code: 'th' }] },
    { country: 'Vietnam',           code: 'VN', sortOrder: 89, languages: [{ name: 'Vietnamese', code: 'vi' }] },
    { country: 'Singapore',         code: 'SG', sortOrder: 90, languages: [{ name: 'English', code: 'en' }, { name: 'Malay', code: 'ms' }, { name: 'Chinese (Mandarin)', code: 'zh' }] },
    { country: 'Myanmar',           code: 'MM', sortOrder: 91, languages: [{ name: 'Burmese', code: 'my' }] },
    // Central Asia
    { country: 'Kazakhstan',        code: 'KZ', sortOrder: 95, languages: [{ name: 'Kazakh', code: 'kk' }, { name: 'Russian', code: 'ru' }] },
    { country: 'Uzbekistan',        code: 'UZ', sortOrder: 96, languages: [{ name: 'Uzbek', code: 'uz' }] },
    { country: 'Azerbaijan',        code: 'AZ', sortOrder: 97, languages: [{ name: 'Azerbaijani', code: 'az' }] },
    { country: 'Georgia',           code: 'GE', sortOrder: 98, languages: [{ name: 'Georgian', code: 'ka' }] },
    { country: 'Armenia',           code: 'AM', sortOrder: 99, languages: [{ name: 'Armenian', code: 'hy' }] },
    // Africa
    { country: 'Nigeria',           code: 'NG', sortOrder: 100, languages: [{ name: 'English', code: 'en' }, { name: 'Hausa', code: 'ha' }, { name: 'Yoruba', code: 'yo' }, { name: 'Igbo', code: 'ig' }] },
    { country: 'Ethiopia',          code: 'ET', sortOrder: 101, languages: [{ name: 'Amharic', code: 'am' }, { name: 'Oromo', code: 'om' }] },
    { country: 'South Africa',      code: 'ZA', sortOrder: 102, languages: [{ name: 'English', code: 'en' }, { name: 'Zulu', code: 'zu' }, { name: 'Xhosa', code: 'xh' }, { name: 'Afrikaans', code: 'af' }] },
    { country: 'Kenya',             code: 'KE', sortOrder: 103, languages: [{ name: 'Swahili', code: 'sw' }, { name: 'English', code: 'en' }] },
    { country: 'Tanzania',          code: 'TZ', sortOrder: 104, languages: [{ name: 'Swahili', code: 'sw' }, { name: 'English', code: 'en' }] },
    { country: 'Ghana',             code: 'GH', sortOrder: 105, languages: [{ name: 'English', code: 'en' }] },
    { country: 'Morocco',           code: 'MA', sortOrder: 106, languages: [{ name: 'Arabic', code: 'ar', isRtl: true }, { name: 'French', code: 'fr' }] },
    { country: 'Algeria',           code: 'DZ', sortOrder: 107, languages: [{ name: 'Arabic', code: 'ar', isRtl: true }, { name: 'French', code: 'fr' }] },
    { country: 'Somalia',           code: 'SO', sortOrder: 108, languages: [{ name: 'Somali', code: 'so' }, { name: 'Arabic', code: 'ar', isRtl: true }] },
    // Oceania
    { country: 'Australia',         code: 'AU', sortOrder: 110, languages: [{ name: 'English', code: 'en' }] },
    { country: 'New Zealand',       code: 'NZ', sortOrder: 111, languages: [{ name: 'English', code: 'en' }, { name: 'Māori', code: 'mi' }] },
  ];

  for (const { country, code, sortOrder, languages } of COUNTRY_LANGUAGES) {
    const c = await prisma.country.upsert({
      where: { name: country },
      update: { sortOrder, code },
      create: { name: country, code, sortOrder },
    });
    for (let i = 0; i < languages.length; i++) {
      const lang = languages[i];
      await prisma.language.upsert({
        where: { countryId_name: { countryId: c.id, name: lang.name } },
        update: { code: lang.code, isRtl: lang.isRtl ?? false, sortOrder: i },
        create: { name: lang.name, code: lang.code, countryId: c.id, isRtl: lang.isRtl ?? false, sortOrder: i },
      });
    }
  }
  console.log('✅ Countries & Languages seeded');

  console.log('🌱 Seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
