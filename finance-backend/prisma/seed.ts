import { PrismaClient, Role, RecordType } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Users
  const users = [
    { email: 'admin@zorvyn.io', fullName: 'System Admin', password: 'Admin@123456', role: Role.ADMIN },
    { email: 'analyst@zorvyn.io', fullName: 'Priya Sharma', password: 'Analyst@123', role: Role.ANALYST },
    { email: 'viewer@zorvyn.io', fullName: 'Aisha Khan', password: 'Viewer@123', role: Role.VIEWER },
  ];

  const createdUsers: any[] = [];

  for (const u of users) {
    const hashedPassword = await bcrypt.hash(u.password, 12);
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { fullName: u.fullName, role: u.role, hashedPassword },
      create: {
        email: u.email,
        fullName: u.fullName,
        hashedPassword,
        role: u.role,
      },
    });
    createdUsers.push(user);
    console.log(`  ✓ User: ${user.email} (${user.role})`);
  }

  // Get analyst ID for record creation
  const analyst = createdUsers.find((u) => u.email === 'analyst@zorvyn.io');

  // Financial Records
  const categories = ['Payroll', 'Marketing', 'Revenue', 'Utilities', 'Tax', 'Operations'];

  const records: any[] = [];

  for (let i = 0; i < 200; i++) {
    const isIncome = Math.random() < 0.4; // 40% income, 60% expense
    const type = isIncome ? RecordType.INCOME : RecordType.EXPENSE;
    const createdById = analyst.id;

    // Amount ranges per PRD
    const amount = isIncome
      ? Math.round((Math.random() * 490000 + 10000) * 100) / 100
      : Math.round((Math.random() * 199000 + 1000) * 100) / 100;

    // Spread across last 12 months, ensuring no future dates relative to April 5, 2026
    const monthsAgo = Math.floor(Math.random() * 12);
    const date = new Date(2026, 3, 5); // Today: April 5, 2026
    
    date.setMonth(date.getMonth() - monthsAgo);
    
    if (monthsAgo === 0) {
      // If today's month, limit day to <= 5
      date.setDate(Math.floor(Math.random() * 5) + 1);
    } else {
      const day = Math.floor(Math.random() * 28) + 1;
      date.setDate(day);
    }

    const category = categories[Math.floor(Math.random() * categories.length)];

    // 10% soft-deleted
    const isDeleted = Math.random() < 0.1;

    const descriptions = [
      `${category} payment for ${date.toLocaleString('default', { month: 'long' })}`,
      `Quarterly ${category.toLowerCase()} settlement`,
      `${type === 'INCOME' ? 'Received' : 'Paid'} — ${category}`,
      `${category} — invoice #${Math.floor(Math.random() * 9000) + 1000}`,
      `Monthly ${category.toLowerCase()} transaction`,
    ];

    records.push({
      amount,
      type,
      category,
      date,
      description: descriptions[Math.floor(Math.random() * descriptions.length)],
      createdById,
      isDeleted,
      deletedAt: isDeleted ? new Date() : null,
    });
  }

  // Delete existing records and create fresh
  await prisma.financialRecord.deleteMany({});
  await prisma.financialRecord.createMany({ data: records });

  console.log(`  ✓ Created ${records.length} financial records`);
  console.log(`  ✓ ${records.filter((r) => r.isDeleted).length} records soft-deleted`);
  console.log('✅ Seeding complete!');

  console.log('\n📋 Login Credentials:');
  console.log('---------------------------------------');
  for (const u of users) {
    console.log(`  ${u.role.padEnd(8)} | ${u.email.padEnd(22)} | ${u.password}`);
  }
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
