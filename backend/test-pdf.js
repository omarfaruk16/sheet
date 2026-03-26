require('ts-node').register();
const mongoose = require('mongoose');
const { Order } = require('./src/models/Order');
const { generateCustomPdf } = require('./src/utils/pdfGenerator');
require('dotenv').config({ path: '.env' });

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to DB');
  
  const order = await Order.findOne({ status: 'pending' }).sort({ createdAt: -1 });
  if (!order) {
    console.log('No pending orders found.');
    process.exit(0);
  }
  
  console.log('Found pending order:', order._id);
  await generateCustomPdf(order._id.toString());
  
  const updated = await Order.findById(order._id);
  console.log('Download URL after PDF generation:', updated.items[0]?.downloadUrl);
  
  process.exit(0);
}
run();
