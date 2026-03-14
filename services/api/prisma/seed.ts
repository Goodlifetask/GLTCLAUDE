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
