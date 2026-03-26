import express from 'express';
import { protect, admin } from '../middleware/authMiddleware';
import { prisma } from '../config/prisma';
import crypto from 'crypto';
import { generateCustomPdf } from '../utils/pdfGenerator';

const router = express.Router();

// @desc    Create new order
// @route   POST /api/orders
// @access  Private
router.post('/', protect, async (req, res) => {
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

    const orderId = `ORD-${crypto.randomUUID().substring(0, 8).toUpperCase()}`;
    const createdOrder = await prisma.order.create({
      data: {
        orderId,
        userId: req.user?.uid as string,
        status: 'pending',
        subtotal: req.body.subtotal,
        serviceFee: req.body.serviceFee || 0,
        totalAmount: req.body.totalAmount,
        fulfillmentMethod: req.body.fulfillmentMethod || 'digital',
        paymentMethod: req.body.paymentMethod,
        transactionId: req.body.transactionId,
        shippingAddress: req.body.shippingAddress,
        customerName: req.body.customerName,
        customerEmail: req.body.customerEmail,
        customerPhone: req.body.customerPhone,
        items: {
          create: req.body.items.map((item: any) => ({
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
               create: (item.chapters || []).map((ch: any) => ({
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
  } catch (error: any) {
    console.error('Order creation error:', error);
    res.status(500).json({ message: 'Error creating order', error: error.message || String(error) });
  }
});

// @desc    Get logged in user orders
// @route   GET /api/orders/my
// @access  Private
router.get('/my', protect, async (req, res) => {
  try {
    const rawOrders = await prisma.order.findMany({
      where: { userId: req.user?.uid },
      orderBy: { createdAt: 'desc' },
      include: { items: { include: { product: true, chaptersItem: true } } }
    });
    const orders = rawOrders.map((o: any) => ({
      ...o,
      items: o.items.map((i: any) => ({ ...i, chapters: i.chaptersItem, productId: i.product || i.productId }))
    }));
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching orders', error });
  }
});

// @desc    Get all orders
// @route   GET /api/orders
// @access  Private/Admin
router.get('/', protect, admin, async (req, res) => {
  try {
    const rawOrders = await prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      include: { items: { include: { product: true, chaptersItem: true } } }
    });
    const orders = rawOrders.map((o: any) => ({
      ...o,
      items: o.items.map((i: any) => ({ ...i, chapters: i.chaptersItem, productId: i.product }))
    }));
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching all orders', error });
  }
});

// @desc    Update order status to completed (Admin)
// @route   PUT /api/orders/:id/complete
// @access  Private/Admin
router.put('/:id/complete', protect, admin, async (req, res) => {
  try {
    const order = await prisma.order.update({
      where: { id: req.params.id as string },
      data: { status: 'completed' }
    });
    
    // In background, generate customized PDFs for this order
    generateCustomPdf(order.id).catch(console.error);

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: 'Error completing order', error });
  }
});

// @desc    Update order status to cancelled (Admin)
// @route   PUT /api/orders/:id/reject
// @access  Private/Admin
router.put('/:id/reject', protect, admin, async (req, res) => {
  try {
    const order = await prisma.order.update({
      where: { id: req.params.id as string },
      data: { status: 'cancelled' }
    });

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: 'Error rejecting order', error });
  }
});

export default router;
