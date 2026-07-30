require('dotenv').config();
const { PrismaClient } = require('../generated/auth-client');

const db = new PrismaClient({
  datasources: { db: { url: process.env.AUTH_DATABASE_URL } },
});

async function main() {
  const users = await db.user.findMany({
    select: { id: true, name: true, email: true, role: true, phone: true, createdAt: true },
  });
  console.log('=== All Users in Database ===');
  users.forEach((u, i) => {
    console.log(`${i + 1}. [${u.role}] ${u.name} — ${u.email} (phone: ${u.phone || 'none'}) — created: ${u.createdAt.toISOString()}`);
  });
  console.log(`\nTotal: ${users.length} users`);
}

main().catch(console.error).finally(() => db.$disconnect());
