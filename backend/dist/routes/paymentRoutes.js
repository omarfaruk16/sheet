"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const crypto_1 = __importDefault(require("crypto"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const prisma_1 = require("../config/prisma");
const sslcommerz_1 = require("../config/sslcommerz");
const pdfGenerator_1 = require("../utils/pdfGenerator");
const router = express_1.default.Router();
const resolveCustomerName = (req) => {
    const firebaseName = req.firebaseUser?.name;
    const firebaseEmail = req.firebaseUser?.email;
    return (req.body.customerName ||
        req.user?.name ||
        firebaseName ||
        firebaseEmail?.split('@')[0] ||
        'Customer');
};
const parseAmount = (amount) => {
    const parsed = Number(amount);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};
const incrementCouponUsageIfPresent = async (couponCode) => {
    if (!couponCode)
        return;
    try {
        await prisma_1.prisma.coupon.update({
            where: { code: couponCode.trim().toUpperCase() },
            data: { usedCount: { increment: 1 } },
        });
    }
    catch (e) {
        console.warn('Could not increment coupon usedCount:', e);
    }
};
// @desc    Start SSLCommerz payment session
// @route   POST /api/payments/sslcommerz/init
// @access  Private
router.post('/sslcommerz/init', authMiddleware_1.protect, async (req, res) => {
    try {
        if (!(0, sslcommerz_1.isSslCommerzConfigured)()) {
            return res.status(500).json({ message: 'SSLCommerz is not configured on server.' });
        }
        if (!req.body.items || !Array.isArray(req.body.items) || !req.body.items.length) {
            return res.status(400).json({ message: 'Your cart is empty.' });
        }
        let totalAmount = parseAmount(req.body.totalAmount);
        if (totalAmount === null && req.body.totalAmount === 0) {
            totalAmount = 0;
        }
        if (totalAmount === null) {
            return res.status(400).json({ message: 'Invalid amount.' });
        }
        const isFree = req.body.totalAmount === 0;
        for (const item of req.body.items) {
            const isModelTest = Boolean(item?.modelTestId);
            const isProduct = Boolean(item?.productId);
            if (!isModelTest && !isProduct) {
                return res.status(400).json({ message: 'Invalid item in cart — missing productId or modelTestId.' });
            }
        }
        const orderId = `ORD-${crypto_1.default.randomUUID().substring(0, 8).toUpperCase()}`;
        const tranId = `LS-${Date.now()}-${crypto_1.default.randomUUID().substring(0, 6).toUpperCase()}`;
        // Handle 0 amount (e.g. 100% coupon)
        const createdOrder = await prisma_1.prisma.order.create({
            data: {
                orderId,
                userId: req.user?.uid,
                status: isFree ? 'completed' : 'pending',
                paymentStatus: isFree ? 'paid' : 'initiated',
                paymentGateway: isFree ? 'free' : 'sslcommerz',
                subtotal: Number(req.body.subtotal) || totalAmount || 0,
                serviceFee: Number(req.body.serviceFee) || 0,
                totalAmount: req.body.totalAmount || 0,
                couponCode: req.body.couponCode || null,
                couponDiscount: req.body.couponDiscount || 0,
                fulfillmentMethod: req.body.fulfillmentMethod || 'digital',
                paymentMethod: isFree ? 'free' : 'sslcommerz',
                transactionId: tranId,
                shippingAddress: req.body.shippingAddress,
                customerName: resolveCustomerName(req),
                customerEmail: req.body.customerEmail || req.user?.email || req.firebaseUser?.email || `${req.user?.uid}@noemail.com`,
                customerPhone: req.body.customerPhone || req.user?.phone,
                currency: (req.body.currency || 'BDT').toUpperCase(),
                paidAt: isFree ? new Date() : null,
                items: {
                    create: req.body.items.map((item) => {
                        const isModelTest = Boolean(item.modelTestId);
                        return {
                            productTitle: item.productTitle,
                            price: Number(item.price),
                            isAllChapters: item.isAllChapters,
                            headerLeftText: item.headerLeftText,
                            headerRightText: item.headerRightText,
                            watermarkText: item.watermarkText,
                            coverPageText: item.coverPageText,
                            downloadUrl: item.downloadUrl,
                            ...(isModelTest
                                ? { modelTest: { connect: { id: item.modelTestId } } }
                                : { product: { connect: { id: item.productId } } }),
                            chaptersItem: !isModelTest && item.chapters?.length ? {
                                create: item.chapters.map((ch) => ({
                                    name: ch.name,
                                    pdfUrl: ch.pdfUrl,
                                    price: Number(ch.price),
                                })),
                            } : undefined,
                            modelTestOrderItems: isModelTest && item.modelTestItems?.length ? {
                                create: item.modelTestItems.map((mi) => ({
                                    name: mi.name,
                                    questionsDocxUrl: mi.questionsDocxUrl,
                                    solutionPdfUrl: mi.solutionPdfUrl,
                                    price: Number(mi.price),
                                    ...(mi.modelTestItemId ? { modelTestItem: { connect: { id: mi.modelTestItemId } } } : {}),
                                })),
                            } : undefined,
                        };
                    }),
                },
            },
        });
        if (isFree) {
            await incrementCouponUsageIfPresent(createdOrder.couponCode);
            // Background generate PDFs
            (0, pdfGenerator_1.generateCustomPdf)(createdOrder.id).catch(console.error);
            (0, pdfGenerator_1.generateModelTestPdf)(createdOrder.id).catch(console.error);
            const frontendSuccess = `${(0, sslcommerz_1.getFrontendBaseUrl)()}/profile/downloads?paymentStatus=paid&orderId=${createdOrder.orderId}`;
            return res.json({
                message: 'Order completed for free',
                orderId: createdOrder.orderId,
                gatewayUrl: frontendSuccess,
            });
        }
        const backendBaseUrl = (0, sslcommerz_1.getBackendBaseUrl)();
        const initData = {
            total_amount: totalAmount.toFixed(2),
            currency: createdOrder.currency,
            tran_id: tranId,
            success_url: `${backendBaseUrl}/api/payments/sslcommerz/success`,
            fail_url: `${backendBaseUrl}/api/payments/sslcommerz/fail`,
            cancel_url: `${backendBaseUrl}/api/payments/sslcommerz/cancel`,
            ipn_url: `${backendBaseUrl}/api/payments/sslcommerz/ipn`,
            product_name: 'Orbit Sheet Order',
            product_category: 'Digital',
            product_profile: 'general',
            cus_name: createdOrder.customerName,
            cus_email: createdOrder.customerEmail,
            cus_add1: createdOrder.shippingAddress || 'N/A',
            cus_city: 'Dhaka',
            cus_postcode: '1207',
            cus_country: 'Bangladesh',
            cus_phone: createdOrder.customerPhone || '01700000000',
            shipping_method: 'NO',
        };
        console.log(`[SSLCommerz] Initializing payment for Order: ${orderId}, Amount: ${initData.total_amount} ${initData.currency}`);
        const initResponse = await (0, sslcommerz_1.initSslCommerzPayment)(initData);
        if (initResponse.status !== 'SUCCESS' || !initResponse.GatewayPageURL) {
            await prisma_1.prisma.order.update({
                where: { id: createdOrder.id },
                data: {
                    paymentStatus: 'failed',
                    status: 'failed',
                    gatewayResponse: initResponse,
                },
            });
            console.error(`[SSLCommerz] Failed to initialize payment: ${initResponse.failedreason || 'SSLCommerz session error'}`);
            return res.status(502).json({
                message: initResponse.failedreason || 'Failed to initialize SSLCommerz payment.',
                status: initResponse.status,
            });
        }
        await prisma_1.prisma.order.update({
            where: { id: createdOrder.id },
            data: {
                sslSessionKey: initResponse.sessionkey,
                gatewayResponse: initResponse,
            },
        });
        return res.json({
            message: 'Payment session created',
            orderId: createdOrder.orderId,
            gatewayUrl: initResponse.GatewayPageURL,
        });
    }
    catch (error) {
        console.error('SSLCommerz init error:', error?.response?.data || error);
        return res.status(500).json({ message: 'Failed to start payment session.' });
    }
});
// @desc    Retry an existing failed or cancelled order
// @route   POST /api/payments/sslcommerz/retry/:orderId
// @access  Private
router.post('/sslcommerz/retry/:orderId', authMiddleware_1.protect, async (req, res) => {
    try {
        const order = await prisma_1.prisma.order.findUnique({
            where: { orderId: req.params.orderId },
        });
        if (!order)
            return res.status(404).json({ message: 'Order not found.' });
        if (order.userId !== req.user?.uid) {
            return res.status(403).json({ message: 'Not authorized.' });
        }
        if (order.paymentStatus === 'paid') {
            return res.status(400).json({ message: 'Order is already paid.' });
        }
        const totalAmount = Number(order.totalAmount);
        if (!totalAmount || totalAmount <= 0) {
            return res.status(400).json({ message: 'Invalid amount for retry.' });
        }
        const tranId = `LS-${Date.now()}-${crypto_1.default.randomUUID().substring(0, 6).toUpperCase()}`;
        // Update the transaction ID in the database to bind the new session
        await prisma_1.prisma.order.update({
            where: { id: order.id },
            data: {
                transactionId: tranId,
                paymentStatus: 'initiated',
                status: 'pending',
            },
        });
        const backendBaseUrl = (0, sslcommerz_1.getBackendBaseUrl)();
        const initResponse = await (0, sslcommerz_1.initSslCommerzPayment)({
            total_amount: totalAmount.toFixed(2),
            currency: order.currency || 'BDT',
            tran_id: tranId,
            success_url: `${backendBaseUrl}/api/payments/sslcommerz/success`,
            fail_url: `${backendBaseUrl}/api/payments/sslcommerz/fail`,
            cancel_url: `${backendBaseUrl}/api/payments/sslcommerz/cancel`,
            ipn_url: `${backendBaseUrl}/api/payments/sslcommerz/ipn`,
            product_name: 'Orbit Sheet Order (Retry)',
            product_category: 'Digital',
            product_profile: 'general',
            cus_name: order.customerName,
            cus_email: order.customerEmail,
            cus_add1: order.shippingAddress || 'N/A',
            cus_city: 'Dhaka',
            cus_postcode: '1207',
            cus_country: 'Bangladesh',
            cus_phone: order.customerPhone || '01700000000',
            shipping_method: 'NO',
        });
        if (initResponse.status !== 'SUCCESS' || !initResponse.GatewayPageURL) {
            await prisma_1.prisma.order.update({
                where: { id: order.id },
                data: {
                    paymentStatus: 'failed',
                    status: 'failed',
                },
            });
            return res.status(502).json({ message: 'Failed to initialize SSLCommerz payment.' });
        }
        await prisma_1.prisma.order.update({
            where: { id: order.id },
            data: {
                sslSessionKey: initResponse.sessionkey,
            },
        });
        return res.json({
            message: 'Payment session created',
            orderId: order.orderId,
            gatewayUrl: initResponse.GatewayPageURL,
        });
    }
    catch (error) {
        console.error('Retry error:', error);
        return res.status(500).json({ message: 'Failed to retry payment.' });
    }
});
const getCallbackValue = (req, key) => {
    const fromBody = req.body?.[key];
    if (typeof fromBody === 'string' && fromBody.trim())
        return fromBody;
    const fromQuery = req.query?.[key];
    if (typeof fromQuery === 'string' && fromQuery.trim())
        return fromQuery;
    if (Array.isArray(fromQuery) && typeof fromQuery[0] === 'string' && fromQuery[0].trim())
        return fromQuery[0];
    return undefined;
};
const finishPayment = async (tranId, valId, rawPayload) => {
    const order = await prisma_1.prisma.order.findFirst({ where: { transactionId: tranId } });
    if (!order)
        return null;
    if (order.paymentStatus === 'paid') {
        return { ok: true, orderId: order.orderId };
    }
    let validatedPayload = null;
    if (valId) {
        validatedPayload = await (0, sslcommerz_1.validateSslCommerzPayment)(valId);
    }
    const expectedAmount = Number(order.totalAmount).toFixed(2);
    const validatedAmount = Number(validatedPayload?.amount).toFixed(2);
    const expectedCurrency = (order.currency || 'BDT').toUpperCase();
    const validatedCurrency = String(validatedPayload?.currency_type || '').toUpperCase();
    const isValidated = !valId ||
        (validatedPayload &&
            (validatedPayload.status === 'VALID' || validatedPayload.status === 'VALIDATED') &&
            validatedPayload.tran_id === tranId &&
            validatedAmount === expectedAmount &&
            validatedCurrency === expectedCurrency);
    if (!isValidated) {
        await prisma_1.prisma.order.update({
            where: { id: order.id },
            data: {
                status: 'failed',
                paymentStatus: 'failed',
                gatewayResponse: {
                    callback: rawPayload,
                    validation: validatedPayload,
                },
            },
        });
        return { ok: false, orderId: order.orderId };
    }
    const updated = await prisma_1.prisma.order.update({
        where: { id: order.id },
        data: {
            status: 'completed',
            paymentStatus: 'paid',
            paidAt: new Date(),
            sslValId: valId,
            gatewayResponse: {
                callback: rawPayload,
                validation: validatedPayload,
            },
        },
    });
    (0, pdfGenerator_1.generateCustomPdf)(updated.id).catch((err) => {
        console.error('PDF generation failed after payment:', err);
    });
    await incrementCouponUsageIfPresent(order.couponCode);
    // Also generate model test PDFs if any items have model test data
    (0, pdfGenerator_1.generateModelTestPdf)(updated.id).catch((err) => {
        console.error('Model test PDF generation failed after payment:', err);
    });
    return { ok: true, orderId: updated.orderId };
};
const frontendResultUrl = (status, orderId, tranId) => {
    const base = (0, sslcommerz_1.getFrontendBaseUrl)();
    const normalizedStatus = status.toLowerCase();
    const paymentStatus = normalizedStatus === 'success' ? 'paid' : normalizedStatus;
    const targetPath = paymentStatus === 'paid' ? '/profile/downloads' : '/profile/transactions';
    const params = new URLSearchParams({ paymentStatus });
    if (orderId)
        params.set('orderId', orderId);
    if (tranId)
        params.set('tranId', tranId);
    return `${base}${targetPath}?${params.toString()}`;
};
router.all('/sslcommerz/success', async (req, res) => {
    try {
        const tranId = getCallbackValue(req, 'tran_id');
        const valId = getCallbackValue(req, 'val_id');
        if (!tranId) {
            return res.redirect(frontendResultUrl('failed'));
        }
        const result = await finishPayment(tranId, valId, {
            body: req.body,
            query: req.query,
        });
        if (!result || !result.ok) {
            return res.redirect(frontendResultUrl('failed', result?.orderId, tranId));
        }
        return res.redirect(frontendResultUrl('success', result.orderId, tranId));
    }
    catch (error) {
        console.error('SSLCommerz success callback error:', error);
        return res.redirect(frontendResultUrl('failed'));
    }
});
router.all('/sslcommerz/fail', async (req, res) => {
    const tranId = getCallbackValue(req, 'tran_id');
    let orderId;
    if (tranId) {
        const order = await prisma_1.prisma.order.findFirst({ where: { transactionId: tranId } });
        orderId = order?.orderId;
        await prisma_1.prisma.order.updateMany({
            where: { transactionId: tranId },
            data: {
                status: 'failed',
                paymentStatus: 'failed',
                gatewayResponse: {
                    body: req.body,
                    query: req.query,
                },
            },
        });
    }
    return res.redirect(frontendResultUrl('failed', orderId, tranId));
});
router.all('/sslcommerz/cancel', async (req, res) => {
    const tranId = getCallbackValue(req, 'tran_id');
    let orderId;
    if (tranId) {
        const order = await prisma_1.prisma.order.findFirst({ where: { transactionId: tranId } });
        orderId = order?.orderId;
        await prisma_1.prisma.order.updateMany({
            where: { transactionId: tranId },
            data: {
                status: 'cancelled',
                paymentStatus: 'cancelled',
                gatewayResponse: {
                    body: req.body,
                    query: req.query,
                },
            },
        });
    }
    return res.redirect(frontendResultUrl('cancelled', orderId, tranId));
});
router.post('/sslcommerz/ipn', async (req, res) => {
    try {
        const tranId = req.body?.tran_id;
        const valId = req.body?.val_id;
        if (!tranId)
            return res.status(400).json({ message: 'tran_id is required' });
        const result = await finishPayment(tranId, valId, req.body);
        if (!result || !result.ok) {
            return res.status(400).json({ message: 'IPN validation failed' });
        }
        return res.json({ message: 'IPN processed', orderId: result.orderId });
    }
    catch (error) {
        console.error('SSLCommerz IPN error:', error);
        return res.status(500).json({ message: 'Failed to process IPN' });
    }
});
exports.default = router;
