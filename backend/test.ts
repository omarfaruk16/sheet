import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const items = await prisma.orderItem.findMany({
    take: 5,
    orderBy: { id: 'desc' },
  });
  console.log('OrderItems:', JSON.stringify(items, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
