import bcrypt from 'bcryptjs';
import { prisma } from './config/prisma';

export const seedAdminUser = async () => {
  try {
    const existingAdmin = await prisma.adminUser.findFirst({ where: { username: 'admin' } });
    if (existingAdmin) {
      console.log('ℹ️  Admin user already exists, skipping seed.');
      return;
    }

    const passwordHash = await bcrypt.hash('Admin@123456', 12);
    await prisma.adminUser.create({
      data: {
        username: 'admin',
        email: 'admin@leafsheets.com',
        passwordHash,
        role: 'admin',
      }
    });

    console.log('✅ Default admin user seeded!');
    console.log('   Username: admin');
    console.log('   Password: Admin@123456');
    console.log('   ⚠️  CHANGE THESE CREDENTIALS IN PRODUCTION!');
  } catch (error) {
    console.error('❌ Error seeding admin user:', error);
  }
};
