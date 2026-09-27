import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { prisma } from './lib/prisma';

async function seed() {
  console.log('🌱 Seeding database...');

  // Create admin user
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@cybercafe.local';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@1234';
  const adminName = process.env.ADMIN_NAME || 'Admin';

  const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
  
  if (!existing) {
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    await prisma.user.create({
      data: {
        email: adminEmail,
        name: adminName,
        passwordHash,
        role: 'ADMIN',
      },
    });
    console.log(`✅ Admin user created: ${adminEmail} / ${adminPassword}`);
  } else {
    console.log(`ℹ️ Admin user already exists: ${adminEmail}`);
  }

  // Create default pricing rules
  const pricingRules = [
    { paperSize: 'A4', colorMode: 'BW', pricePerPage: 2.0 },
    { paperSize: 'A4', colorMode: 'COLOR', pricePerPage: 10.0 },
    { paperSize: 'A3', colorMode: 'BW', pricePerPage: 4.0 },
    { paperSize: 'A3', colorMode: 'COLOR', pricePerPage: 20.0 },
    { paperSize: 'LETTER', colorMode: 'BW', pricePerPage: 2.0 },
    { paperSize: 'LETTER', colorMode: 'COLOR', pricePerPage: 10.0 },
  ];

  for (const rule of pricingRules) {
    await prisma.pricingRule.upsert({
      where: { paperSize_colorMode: { paperSize: rule.paperSize, colorMode: rule.colorMode } },
      update: {},
      create: rule,
    });
  }
  console.log('✅ Pricing rules seeded');

  // Create default settings
  const defaultSettings = [
    { key: 'cafeName', value: 'Cyber Cafe Print Hub' },
    { key: 'portalUrl', value: process.env.PORTAL_BASE_URL || 'http://localhost:5173' },
    { key: 'accentColor', value: '#6366f1' },
    { key: 'theme', value: 'dark' },
  ];

  for (const setting of defaultSettings) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: {},
      create: setting,
    });
  }
  console.log('✅ Default settings seeded');

  // Create a default printer entry
  const printerExists = await prisma.printer.findFirst();
  if (!printerExists) {
    await prisma.printer.create({
      data: {
        name: 'default',
        displayName: 'Default Printer',
        isDefault: true,
        status: 'UNKNOWN',
      },
    });
    console.log('✅ Default printer created');
  }

  console.log('\n🎉 Database seeded successfully!');
  console.log(`📧 Admin Login: ${adminEmail}`);
  console.log(`🔑 Admin Password: ${adminPassword}`);
  console.log(`🌐 Admin Dashboard: http://localhost:5174`);
  console.log(`👤 Customer Portal: http://localhost:5173`);
  
  await prisma.$disconnect();
}

seed().catch(error => {
  console.error('❌ Seed failed:', error);
  process.exit(1);
});
