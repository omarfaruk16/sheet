require('dotenv').config({ path: '.env' });
const mongoose = require('mongoose');
const { Order } = require('./src/models/Order');

async function test() {
  await mongoose.connect(process.env.MONGO_URI);
  const order = await Order.findOne();
  if (!order) {
    console.log('No orders found to test.');
    process.exit(0);
  }
  
  if (order.items && order.items.length > 0) {
    order.items[0].downloadUrl = '/downloads/test/test.pdf';
    order.markModified('items');
    await order.save();
    
    const verify = await Order.findById(order._id);
    console.log('Saved downloadUrl:', verify.items[0].downloadUrl);
  } else {
    console.log('Order has no items.');
  }
  process.exit(0);
}
test();
