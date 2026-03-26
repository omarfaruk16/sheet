import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function test() {
  try {
    const data = {
      title: 'Test Product',
      uniqueId: 'PRD-TEST01',
      coverImage: 'http://example.com/img.png',
      description: 'Test Description',
      regularPrice: 100,
      allChaptersPrice: 100,
      categoryId: '69bba9399dc4cf9810a4d65e', // Use existing category from previous tests
      chapters: {
        create: [
          { name: 'Ch1', pdfUrl: 'http://', price: 10 }
        ]
      }
    };
    
    const product = await prisma.product.create({ data });
    console.log('Product created:', product.id);
    
    // Test user creation
    const user = await prisma.user.create({
      data: {
        uid: 'testuid123',
        name: 'Test',
        email: 'test@example.com',
        role: 'user'
      }
    });
    console.log('User created:', user.id);

    // Test order creation
    const order = await prisma.order.create({
      data: {
        orderId: 'ORD-TEST01',
        userId: user.uid,
        subtotal: 100,
        totalAmount: 100,
        customerName: 'Test',
        customerEmail: 'test@example.com',
        items: {
          create: [{
            productTitle: 'Test Product',
            price: 100,
            product: { connect: { id: product.id } },
            chaptersItem: {
               create: [{ name: 'Ch1', pdfUrl: 'http://', price: 10 }]
            }
          }]
        }
      }
    });
    console.log('Order created:', order.id);
    
  } catch (e: any) {
    console.error('ERROR:', e.message || e);
  } finally {
    await prisma.$disconnect();
  }
}

test();
