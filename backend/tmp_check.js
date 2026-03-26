const axios = require('axios');

async function fix() {
  const loginRes = await axios.post('http://localhost:5000/api/admin/login', {
    email: 'admin@leafsheets.com',
    password: 'Admin@123456'
  });
  const token = loginRes.data.token;
  
  await axios.put('http://localhost:5000/api/orders/69bcf2a86d1a62cd31f06cf6/complete', {}, {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log('Fired PUT Request!');

  const ordersRes = await axios.get('http://localhost:5000/api/orders', {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  const targetOrder = ordersRes.data.find(o => o._id === '69bcf2a86d1a62cd31f06cf6');
  console.log(JSON.stringify(targetOrder.items.map(i => i.downloadUrl), null, 2));
}
fix();
