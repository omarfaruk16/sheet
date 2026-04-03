import express from 'express';
import crypto from 'crypto';
import { protect } from '../middleware/authMiddleware';
import { prisma } from '../config/prisma';
import {
  getBackendBaseUrl,
  getFrontendBaseUrl,
  initSslCommerzPayment,
  isSslCommerzConfigured,
  validateSslCommerzPayment,
} from '../config/sslcommerz';
import { generateCustomPdf } from '../utils/pdfGenerator';

const router = express.Router();

const resolveCustomerName = (req: any) => {
  const firebaseName = req.firebaseUser?.name;
  const firebaseEmail = req.firebaseUser?.email;

  return (
    req.body.customerName ||
    req.user?.name ||
    firebaseName ||
    firebaseEmail?.split('@')[0] ||
    'Customer'
  );
};

const parseAmount = (amount: unknown) => {
  const parsed = Number(amount);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

// @desc    Start SSLCommerz payment session
// @route   POST /api/payments/sslcommerz/init
// @access  Private
router.post('/sslcommerz/init', protect, async (req, res) => {
  try {
    if (!isSslCommerzConfigured()) {
      return res.status(500).json({ message: 'SSLCommerz is not configured on server.' });
    }

    if (!req.body.items || !Array.isArray(req.body.items) || !req.body.items.length) {
      return res.status(400).json({ message: 'Your cart is empty.' });
    }

    const totalAmount = parseAmount(req.body.totalAmount);
    if (!totalAmount) {
      return res.status(400).json({ message: 'Invalid amount.' });
    }

    for (const item of req.body.items) {
      if (!item?.productId) {
        return res.status(400).json({ message: 'Invalid product ID in cart.' });
      }
    }

    const orderId = `ORD-${crypto.randomUUID().substring(0, 8).toUpperCase()}`;
    const tranId = `LS-${Date.now()}-${crypto.randomUUID().substring(0, 6).toUpperCase()}`;

    const createdOrder = await prisma.order.create({
      data: {
        orderId,
        userId: req.user?.uid as string,
        status: 'pending',
        paymentStatus: 'initiated',
        paymentGateway: 'sslcommerz',
        subtotal: Number(req.body.subtotal) || totalAmount,
        serviceFee: Number(req.body.serviceFee) || 0,
        totalAmount,
        fulfillmentMethod: req.body.fulfillmentMethod || 'digital',
        paymentMethod: 'sslcommerz',
        transactionId: tranId,
        shippingAddress: req.body.shippingAddress,
        customerName: resolveCustomerName(req),
        customerEmail:
          req.body.customerEmail || req.user?.email || req.firebaseUser?.email || `${req.user?.uid}@noemail.com`,
        customerPhone: req.body.customerPhone || req.user?.phone,
        currency: (req.body.currency || 'BDT').toUpperCase(),
        items: {
          create: req.body.items.map((item: any) => ({
            productTitle: item.productTitle,
            price: Number(item.price),
            isAllChapters: item.isAllChapters,
            headerLeftText: item.headerLeftText,
            headerRightText: item.headerRightText,
            watermarkText: item.watermarkText,
            coverPageText: item.coverPageText,
            downloadUrl: item.downloadUrl,
            product: { connect: { id: item.productId } },
            chaptersItem: {
              create: (item.chapters || []).map((ch: any) => ({
                name: ch.name,
                pdfUrl: ch.pdfUrl,
                price: Number(ch.price),
              })),
            },
          })),
        },
      },
    });

    const backendBaseUrl = getBackendBaseUrl();

    const initResponse = await initSslCommerzPayment({
      total_amount: totalAmount.toFixed(2),
      currency: createdOrder.currency,
      tran_id: tranId,
      success_url: `${backendBaseUrl}/api/payments/sslcommerz/success`,
      fail_url: `${backendBaseUrl}/api/payments/sslcommerz/fail`,
      cancel_url: `${backendBaseUrl}/api/payments/sslcommerz/cancel`,
      ipn_url: `${backendBaseUrl}/api/payments/sslcommerz/ipn`,
      product_name: 'LeafSheets Order',
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
    });

    if (initResponse.status !== 'SUCCESS' || !initResponse.GatewayPageURL) {
      await prisma.order.update({
        where: { id: createdOrder.id },
        data: {
          paymentStatus: 'failed',
          status: 'failed',
          gatewayResponse: initResponse as any,
        },
      });

      return res.status(502).json({
        message: initResponse.failedreason || 'Failed to initialize SSLCommerz payment.',
      });
    }

    await prisma.order.update({
      where: { id: createdOrder.id },
      data: {
        sslSessionKey: initResponse.sessionkey,
        gatewayResponse: initResponse as any,
      },
    });

    return res.json({
      message: 'Payment session created',
      orderId: createdOrder.orderId,
      gatewayUrl: initResponse.GatewayPageURL,
    });
  } catch (error: any) {
    console.error('SSLCommerz init error:', error?.response?.data || error);
    return res.status(500).json({ message: 'Failed to start payment session.' });
  }
});

const getCallbackValue = (req: any, key: string): string | undefined => {
  const fromBody = req.body?.[key];
  if (typeof fromBody === 'string' && fromBody.trim()) return fromBody;

  const fromQuery = req.query?.[key];
  if (typeof fromQuery === 'string' && fromQuery.trim()) return fromQuery;
  if (Array.isArray(fromQuery) && typeof fromQuery[0] === 'string' && fromQuery[0].trim()) return fromQuery[0];

  return undefined;
};

const finishPayment = async (tranId: string, valId?: string, rawPayload?: any) => {
  const order = await prisma.order.findFirst({ where: { transactionId: tranId } });
  if (!order) return null;

  if (order.paymentStatus === 'paid') {
    return { ok: true, orderId: order.orderId };
  }

  let validatedPayload: any = null;
  if (valId) {
    validatedPayload = await validateSslCommerzPayment(valId);
  }

  const expectedAmount = Number(order.totalAmount).toFixed(2);
  const validatedAmount = Number(validatedPayload?.amount).toFixed(2);
  const expectedCurrency = (order.currency || 'BDT').toUpperCase();
  const validatedCurrency = String(validatedPayload?.currency_type || '').toUpperCase();

  const isValidated =
    !valId ||
    (validatedPayload &&
      (validatedPayload.status === 'VALID' || validatedPayload.status === 'VALIDATED') &&
      validatedPayload.tran_id === tranId &&
      validatedAmount === expectedAmount &&
      validatedCurrency === expectedCurrency);

  if (!isValidated) {
    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: 'failed',
        paymentStatus: 'failed',
        gatewayResponse: {
          callback: rawPayload,
          validation: validatedPayload,
        } as any,
      },
    });

    return { ok: false, orderId: order.orderId };
  }

  const updated = await prisma.order.update({
    where: { id: order.id },
    data: {
      status: 'completed',
      paymentStatus: 'paid',
      paidAt: new Date(),
      sslValId: valId,
      gatewayResponse: {
        callback: rawPayload,
        validation: validatedPayload,
      } as any,
    },
  });

  generateCustomPdf(updated.id).catch((err) => {
    console.error('PDF generation failed after payment:', err);
  });

  return { ok: true, orderId: updated.orderId };
};

const frontendResultUrl = (status: string, orderId?: string, tranId?: string) => {
  const base = getFrontendBaseUrl();
  const normalizedStatus = status.toLowerCase();
  const paymentStatus = normalizedStatus === 'success' ? 'paid' : normalizedStatus;
  const targetPath = '/profile/transactions';
  const params = new URLSearchParams({ paymentStatus });
  if (orderId) params.set('orderId', orderId);
  if (tranId) params.set('tranId', tranId);
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
  } catch (error) {
    console.error('SSLCommerz success callback error:', error);
    return res.redirect(frontendResultUrl('failed'));
  }
});

router.all('/sslcommerz/fail', async (req, res) => {
  const tranId = getCallbackValue(req, 'tran_id');
  let orderId: string | undefined;
  if (tranId) {
    const order = await prisma.order.findFirst({ where: { transactionId: tranId } });
    orderId = order?.orderId;
    await prisma.order.updateMany({
      where: { transactionId: tranId },
      data: {
        status: 'failed',
        paymentStatus: 'failed',
        gatewayResponse: {
          body: req.body,
          query: req.query,
        } as any,
      },
    });
  }

  return res.redirect(frontendResultUrl('failed', orderId, tranId));
});

router.all('/sslcommerz/cancel', async (req, res) => {
  const tranId = getCallbackValue(req, 'tran_id');
  let orderId: string | undefined;
  if (tranId) {
    const order = await prisma.order.findFirst({ where: { transactionId: tranId } });
    orderId = order?.orderId;
    await prisma.order.updateMany({
      where: { transactionId: tranId },
      data: {
        status: 'cancelled',
        paymentStatus: 'cancelled',
        gatewayResponse: {
          body: req.body,
          query: req.query,
        } as any,
      },
    });
  }

  return res.redirect(frontendResultUrl('cancelled', orderId, tranId));
});

router.post('/sslcommerz/ipn', async (req, res) => {
  try {
    const tranId = req.body?.tran_id as string | undefined;
    const valId = req.body?.val_id as string | undefined;

    if (!tranId) return res.status(400).json({ message: 'tran_id is required' });

    const result = await finishPayment(tranId, valId, req.body);
    if (!result || !result.ok) {
      return res.status(400).json({ message: 'IPN validation failed' });
    }

    return res.json({ message: 'IPN processed', orderId: result.orderId });
  } catch (error) {
    console.error('SSLCommerz IPN error:', error);
    return res.status(500).json({ message: 'Failed to process IPN' });
  }
});

export default router;
