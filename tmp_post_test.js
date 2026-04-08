const https = require('https');
const url = 'https://script.google.com/macros/s/AKfycbxAGAEh6snWjMFtnPSP_tjz0eD6yqp7LkjheEvasDxg_p7JwCH2Ly81X9-AqkFi-_B0/exec';
const payload = JSON.stringify({action:'register',payload:{emailSV:'test@student.com',emailGV:'gv@example.com',Tendetai:'Test',loaiDeTai:'BCTT',mangDeTai:'AI',congty:'TestCo',DotHK:'2026'}});
const req = https.request(url, {method:'POST', headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(payload)}}, res => {
  let data='';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('STATUS', res.statusCode);
    console.log(data.slice(0,500));
  });
});
req.on('error', e => console.error('ERR', e));
req.write(payload);
req.end();
