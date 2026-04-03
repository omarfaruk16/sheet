"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncAdminUser = exports.seedAdminUser = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma_1 = require("./config/prisma");
const seedAdminUser = async () => {
    try {
        const adminEmail = (process.env.BACKEND_ADMIN_EMAIL || 'admin@admin.com').trim().toLowerCase();
        const adminUsername = (process.env.BACKEND_ADMIN_USERNAME || 'admin').trim().toLowerCase();
        const adminPassword = process.env.BACKEND_ADMIN_PASSWORD || 'adminPass123';
        const existingAdmin = await prisma_1.prisma.adminUser.findFirst({
            where: {
                OR: [
                    { username: adminUsername },
                    { email: adminEmail },
                ],
            },
        });
        if (existingAdmin) {
            console.log(`ℹ️  Admin user already exists (${existingAdmin.username}/${existingAdmin.email}), skipping seed.`);
            return;
        }
        const passwordHash = await bcryptjs_1.default.hash(adminPassword, 12);
        await prisma_1.prisma.adminUser.create({
            data: {
                username: adminUsername,
                email: adminEmail,
                passwordHash,
                role: 'admin',
            }
        });
        console.log('✅ Env-defined admin user seeded!');
        console.log(`   Username: ${adminUsername}`);
        console.log(`   Email: ${adminEmail}`);
        console.log('   ⚠️  CHANGE THESE CREDENTIALS IN PRODUCTION!');
    }
    catch (error) {
        console.error('❌ Error seeding admin user:', error);
    }
};
exports.seedAdminUser = seedAdminUser;
const syncAdminUser = async () => {
    try {
        const adminEmail = (process.env.BACKEND_ADMIN_EMAIL || 'admin@admin.com').trim().toLowerCase();
        const adminUsername = (process.env.BACKEND_ADMIN_USERNAME || 'admin').trim().toLowerCase();
        const adminPassword = process.env.BACKEND_ADMIN_PASSWORD || 'adminPass123';
        const existingAdmin = await prisma_1.prisma.adminUser.findFirst({
            where: { username: adminUsername },
        });
        if (!existingAdmin) {
            return;
        }
        const needsUpdate = existingAdmin.email !== adminEmail;
        const passwordHash = await bcryptjs_1.default.hash(adminPassword, 12);
        const passwordNeedsUpdate = !(await bcryptjs_1.default.compare(adminPassword, existingAdmin.passwordHash));
        if (needsUpdate || passwordNeedsUpdate) {
            await prisma_1.prisma.adminUser.update({
                where: { id: existingAdmin.id },
                data: {
                    email: adminEmail,
                    passwordHash,
                },
            });
            console.log('✅ Admin user credentials synced with env values.');
            console.log(`   Username: ${adminUsername}`);
            console.log(`   Email: ${adminEmail}`);
        }
    }
    catch (error) {
        console.error('❌ Error syncing admin user credentials:', error);
    }
};
exports.syncAdminUser = syncAdminUser;
