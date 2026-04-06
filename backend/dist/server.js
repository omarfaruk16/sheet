"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const adminSeeder_1 = require("./adminSeeder");
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const categoryRoutes_1 = __importDefault(require("./routes/categoryRoutes"));
const subCategoryRoutes_1 = __importDefault(require("./routes/subCategoryRoutes"));
const tagRoutes_1 = __importDefault(require("./routes/tagRoutes"));
const productRoutes_1 = __importDefault(require("./routes/productRoutes"));
const orderRoutes_1 = __importDefault(require("./routes/orderRoutes"));
const userRoutes_1 = __importDefault(require("./routes/userRoutes"));
const adminAuthRoutes_1 = __importDefault(require("./routes/adminAuthRoutes"));
const adminPasswordRoutes_1 = __importDefault(require("./routes/adminPasswordRoutes"));
const settingsRoutes_1 = __importDefault(require("./routes/settingsRoutes"));
const paymentRoutes_1 = __importDefault(require("./routes/paymentRoutes"));
const modelTestRoutes_1 = __importDefault(require("./routes/modelTestRoutes"));
const couponRoutes_1 = __importDefault(require("./routes/couponRoutes"));
const envCandidates = [
    path_1.default.resolve(process.cwd(), '../.env'),
    path_1.default.resolve(process.cwd(), '.env'),
];
for (const envPath of envCandidates) {
    if (fs_1.default.existsSync(envPath)) {
        dotenv_1.default.config({ path: envPath });
        break;
    }
}
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
const defaultOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://192.168.0.106:3000',
];
const configuredOrigins = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
const allowedOrigins = new Set([...defaultOrigins, ...configuredOrigins]);
// Middleware
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        // Allow non-browser and file-origin requests (payment gateway redirects can send `Origin: null`).
        if (!origin || origin === 'null')
            return callback(null, true);
        if (allowedOrigins.has(origin))
            return callback(null, true);
        if (origin.includes('sslcommerz.com')) {
            return callback(null, true);
        }
        // Allow local-network frontend origins in dev without redeploying backend.
        if (process.env.NODE_ENV !== 'production' && /^http:\/\/(localhost|127\.0\.0\.1|192\.168\.[\d.]+|10\.[\d.]+):3000$/.test(origin)) {
            return callback(null, true);
        }
        return callback(new Error('Origin not allowed'));
    },
    credentials: true,
}));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Ensure downloads directory exists
const downloadsDir = path_1.default.join(__dirname, '../public/downloads');
if (!fs_1.default.existsSync(downloadsDir)) {
    fs_1.default.mkdirSync(downloadsDir, { recursive: true });
}
// Ensure uploads directory exists (for admin PDF uploads)
const uploadsDir = path_1.default.join(process.cwd(), 'uploads');
if (!fs_1.default.existsSync(uploadsDir)) {
    fs_1.default.mkdirSync(uploadsDir, { recursive: true });
}
// Serve uploaded PDFs statically
app.use('/uploads', express_1.default.static(uploadsDir));
// Serve generated PDFs statically
app.use('/downloads', express_1.default.static(downloadsDir));
// _id backwards compatibility mapping interceptor
app.use((req, res, next) => {
    const originalJson = res.json;
    res.json = function (body) {
        const mapIds = (obj) => {
            // Prevent infinite recursion on Date or other native objects
            if (obj instanceof Date)
                return obj;
            if (Array.isArray(obj))
                return obj.map(mapIds);
            if (obj !== null && typeof obj === 'object') {
                const newObj = {};
                for (const key in obj) {
                    newObj[key] = mapIds(obj[key]);
                }
                if (newObj.id && !newObj._id) {
                    newObj._id = newObj.id;
                }
                return newObj;
            }
            return obj;
        };
        return originalJson.call(this, mapIds(body));
    };
    next();
});
// API Routes
app.use('/api/auth', authRoutes_1.default);
app.use('/api/categories', categoryRoutes_1.default);
app.use('/api/subcategories', subCategoryRoutes_1.default);
app.use('/api/tags', tagRoutes_1.default);
app.use('/api/products', productRoutes_1.default);
app.use('/api/orders', orderRoutes_1.default);
app.use('/api/payments', paymentRoutes_1.default);
app.use('/api/users', userRoutes_1.default);
app.use('/api/admin', adminAuthRoutes_1.default);
app.use('/api/admin', adminPasswordRoutes_1.default);
app.use('/api/settings', settingsRoutes_1.default);
app.use('/api/model-tests', modelTestRoutes_1.default);
app.use('/api/coupons', couponRoutes_1.default);
// Health check
app.get('/', (req, res) => {
    res.send('Orbit Sheet API is running...');
});
app.listen(PORT, async () => {
    // Seed default admin user if not present
    await (0, adminSeeder_1.seedAdminUser)();
    // Sync admin credentials with env values
    const { syncAdminUser } = await Promise.resolve().then(() => __importStar(require('./adminSeeder')));
    await syncAdminUser();
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
