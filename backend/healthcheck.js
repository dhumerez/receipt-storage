const http = require('node:http');
const options = {
  hostname: 'localhost',
  port: parseInt(process.env.PORT ?? '4000', 10),
  path: '/health',
  method: 'GET',
  timeout: 5000,
};
const req = http.request(options, (res) => {
  process.exit(res.statusCode === 200 ? 0 : 1);
});
req.on('error', () => process.exit(1));
req.on('timeout', () => { req.destroy(); process.exit(1); });
req.end();
