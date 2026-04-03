"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const prisma_1 = require("../config/prisma");
const crypto_1 = __importDefault(require("crypto"));
const pdfGenerator_1 = require("../utils/pdfGenerator");
const router = express_1.default.Router();
const toTransactionView = (order) => ({
    id: order.id,
    orderId: order.orderId,
    transactionId: order.transactionId,
    paymentStatus: order.paymentStatus,
    status: order.status,
    subtotal: order.subtotal,
    serviceFee: order.serviceFee,
    totalAmount: order.totalAmount,
    amount: order.totalAmount,
    currency: order.currency,
    paymentMethod: order.paymentMethod,
    paymentGateway: order.paymentGateway,
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    items: order.items,
    createdAt: order.createdAt,
    paidAt: order.paidAt,
    gatewayResponse: order.gatewayResponse,
});
// @desc    Create new order
// @route   POST /api/orders
// @access  Private
router.post('/', authMiddleware_1.protect, async (req, res) => {
    try {
        if (!req.body.items || !req.body.items.length) {
            return res.status(400).json({ message: 'Your cart is empty.' });
        }
        // Validate that all items have a valid productId (legacy poisoned carts from before interceptor might lack it)
        for (const item of req.body.items) {
            if (!item.productId) {
                return res.status(400).json({ message: 'Invalid product ID in cart. Please clear your cart and add the product again.' });
            }
        }
        const orderId = `ORD-${crypto_1.default.randomUUID().substring(0, 8).toUpperCase()}`;
        const createdOrder = await prisma_1.prisma.order.create({
            data: {
                orderId,
                userId: req.user?.uid,
                status: 'pending',
                subtotal: req.body.subtotal,
                serviceFee: req.body.serviceFee || 0,
                totalAmount: req.body.totalAmount,
                fulfillmentMethod: req.body.fulfillmentMethod || 'digital',
                paymentMethod: req.body.paymentMethod,
                paymentGateway: req.body.paymentGateway || 'manual',
                paymentStatus: req.body.paymentStatus || 'pending_verification',
                transactionId: req.body.transactionId,
                shippingAddress: req.body.shippingAddress,
                customerName: req.body.customerName,
                customerEmail: req.body.customerEmail,
                customerPhone: req.body.customerPhone,
                items: {
                    create: req.body.items.map((item) => ({
                        productTitle: item.productTitle,
                        price: item.price,
                        isAllChapters: item.isAllChapters,
                        headerLeftText: item.headerLeftText,
                        headerRightText: item.headerRightText,
                        watermarkText: item.watermarkText,
                        coverPageText: item.coverPageText,
                        downloadUrl: item.downloadUrl,
                        product: { connect: { id: item.productId } },
                        chaptersItem: {
                            create: (item.chapters || []).map((ch) => ({
                                name: ch.name,
                                pdfUrl: ch.pdfUrl,
                                price: Number(ch.price)
                            }))
                        }
                    }))
                }
            }
        });
        res.status(201).json(createdOrder);
    }
    catch (error) {
        console.error('Order creation error:', error);
        res.status(500).json({ message: 'Error creating order', error: error.message || String(error) });
    }
});
// @desc    Get logged in user downloadable library (paid/completed orders only)
// @route   GET /api/orders/my/downloads
// @access  Private
router.get('/my/downloads', authMiddleware_1.protect, async (req, res) => {
    try {
        const rawOrders = await prisma_1.prisma.order.findMany({
            where: {
                userId: req.user?.uid,
                OR: [{ paymentStatus: 'paid' }, { status: 'completed' }],
            },
            orderBy: { createdAt: 'desc' },
            include: { items: { include: { product: true, chaptersItem: true } } },
        });
        const orders = rawOrders
            .map((o) => ({
            ...o,
            items: o.items
                .map((i) => ({ ...i, chapters: i.chaptersItem, productId: i.product || i.productId }))
                .filter((i) => Boolean(i.downloadUrl) || (Array.isArray(i.chapters) && i.chapters.some((ch) => Boolean(ch?.pdfUrl)))),
        }))
            .filter((o) => o.items.length > 0);
        res.json(orders);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching downloadable library', error });
    }
});
// @desc    Get logged in user orders
// @route   GET /api/orders/my
// @access  Private
router.get('/my', authMiddleware_1.protect, async (req, res) => {
    try {
        const rawOrders = await prisma_1.prisma.order.findMany({
            where: { userId: req.user?.uid },
            orderBy: { createdAt: 'desc' },
            include: { items: { include: { product: true, chaptersItem: true } } }
        });
        const orders = rawOrders.map((o) => ({
            ...o,
            items: o.items.map((i) => ({ ...i, chapters: i.chaptersItem, productId: i.product || i.productId }))
        }));
        res.json(orders);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching orders', error });
    }
});
// @desc    Get logged in user transactions
// @route   GET /api/orders/my/transactions
// @access  Private
router.get('/my/transactions', authMiddleware_1.protect, async (req, res) => {
    try {
        const orders = await prisma_1.prisma.order.findMany({
            where: { userId: req.user?.uid },
            orderBy: { createdAt: 'desc' },
            include: { items: true },
        });
        res.json(orders
            .filter((order) => Boolean(order.transactionId || order.paymentGateway))
            .map(toTransactionView));
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching transactions', error });
    }
});
// @desc    Get all orders
// @route   GET /api/orders
// @access  Private/Admin
router.get('/', authMiddleware_1.protect, authMiddleware_1.admin, async (req, res) => {
    try {
        const rawOrders = await prisma_1.prisma.order.findMany({
            orderBy: { createdAt: 'desc' },
            include: { items: { include: { product: true, chaptersItem: true } } }
        });
        const orders = rawOrders.map((o) => ({
            ...o,
            items: o.items.map((i) => ({ ...i, chapters: i.chaptersItem, productId: i.product }))
        }));
        res.json(orders);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching all orders', error });
    }
});
// @desc    Get all transactions
// @route   GET /api/orders/transactions
// @access  Private/Admin
router.get('/transactions', authMiddleware_1.protect, authMiddleware_1.admin, async (req, res) => {
    try {
        const orders = await prisma_1.prisma.order.findMany({
            orderBy: { createdAt: 'desc' },
        });
        res.json(orders
            .filter((order) => Boolean(order.transactionId || order.paymentGateway))
            .map(toTransactionView));
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching transactions', error });
    }
});
// @desc    Update order status to completed (Admin)
// @route   PUT /api/orders/:id/complete
// @access  Private/Admin
router.put('/:id/complete', authMiddleware_1.protect, authMiddleware_1.admin, async (req, res) => {
    try {
        const order = await prisma_1.prisma.order.update({
            where: { id: req.params.id },
            data: { status: 'completed' }
        });
        // In background, generate customized PDFs for this order
        (0, pdfGenerator_1.generateCustomPdf)(order.id).catch(console.error);
        res.json(order);
    }
    catch (error) {
        res.status(500).json({ message: 'Error completing order', error });
    }
});
// @desc    Update order status to cancelled (Admin)
// @route   PUT /api/orders/:id/reject
// @access  Private/Admin
router.put('/:id/reject', authMiddleware_1.protect, authMiddleware_1.admin, async (req, res) => {
    try {
        const order = await prisma_1.prisma.order.update({
            where: { id: req.params.id },
            data: { status: 'cancelled' }
        });
        res.json(order);
    }
    catch (error) {
        res.status(500).json({ message: 'Error rejecting order', error });
    }
});
exports.default = router;
