import http from 'http';

const options = {
  hostname: '127.0.0.1',
  port: 8082,
  path: '/api/inventory/barang?search=ACCU&limit=1&fields=id,nama',
  method: 'GET',
  headers: {
    'Authorization': 'Bearer ltech_ai_magic_token_2026_secure',
    'X-Schema-Context': 'u1566482_sparepart'
  }
};

const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
  res.setEncoding('utf8');
  res.on('data', (chunk) => {
    console.log(`BODY: ${chunk}`);
  });
});

req.on('error', (e) => {
  console.error(`problem with request: ${e.message}`);
});

req.end();
