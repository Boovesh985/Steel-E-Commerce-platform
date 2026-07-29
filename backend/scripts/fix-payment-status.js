const { PrismaClient } = require('../generated/auth-client');
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.order.updateMany({
    where: {
      status: { in: ['DELIVERED', 'SHIPPED', 'OUT_FOR_DELIVERY'] },
      paymentStatus: 'PENDING',
    },
    data: { paymentStatus: 'PAID' },
  });
  console.log(`Fixed ${result.count} orders with mismatched payment status.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
