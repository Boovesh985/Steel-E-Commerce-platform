/**
 * Admin seed script — creates the single admin account from .env.
 * Usage: node scripts/seed-admin.js
 *
 * This is the ONLY way to create the first admin account.
 * Additional admins can be promoted via PUT /api/admin/users/:id/role.
 */
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { PrismaClient } = require('../generated/auth-client');
const argon2 = require('argon2');

const prisma = new PrismaClient();

async function seedAdmin() {
  const { ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME, ADMIN_PHONE } = process.env;

  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.error('❌ ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env');
    process.exit(1);
  }

  try {
    // Check if admin already exists
    const existing = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });
    if (existing) {
      console.log(`✅ Admin already exists: ${ADMIN_EMAIL} (role: ${existing.role})`);
      if (existing.role !== 'ADMIN') {
        await prisma.user.update({
          where: { email: ADMIN_EMAIL },
          data: { role: 'ADMIN' },
        });
        console.log('   → Role updated to ADMIN');
      }
      return;
    }

    const passwordHash = await argon2.hash(ADMIN_PASSWORD, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
      hashLength: 32,
    });

    const admin = await prisma.user.create({
      data: {
        name: ADMIN_NAME || 'Admin',
        email: ADMIN_EMAIL,
        phone: ADMIN_PHONE || '0000000000',
        passwordHash,
        role: 'ADMIN',
        isActive: true,
        emailVerified: true,
      },
    });

    console.log(`✅ Admin account created:`);
    console.log(`   Email: ${admin.email}`);
    console.log(`   Name:  ${admin.name}`);
    console.log(`   ID:    ${admin.id}`);
    console.log(`\n⚠️  Change the default password in production!`);
  } catch (err) {
    console.error('❌ Failed to seed admin:', err.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seedAdmin();
