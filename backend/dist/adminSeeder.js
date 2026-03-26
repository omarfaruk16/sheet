"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedAdminUser = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma_1 = require("./config/prisma");
const seedAdminUser = async () => {
    try {
        const existingAdmin = await prisma_1.prisma.adminUser.findFirst({ where: { username: 'admin' } });
        if (existingAdmin) {
            console.log('ℹ️  Admin user already exists, skipping seed.');
            return;
        }
        const passwordHash = await bcryptjs_1.default.hash('Admin@123456', 12);
        await prisma_1.prisma.adminUser.create({
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
    }
    catch (error) {
        console.error('❌ Error seeding admin user:', error);
    }
};
exports.seedAdminUser = seedAdminUser;
