#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// GitHub Webhook Listener — auto-deploy on push to main
// Zero dependencies — uses only Node.js builtins
// ─────────────────────────────────────────────────────────────────────────────
const http = require('http');
const crypto = require('crypto');
const { execFile } = require('child_process');
const path = require('path');

const PORT = parseInt(process.env.WEBHOOK_PORT || '9000', 10);
const SECRET = process.env.WEBHOOK_SECRET;
const BRANCH = process.env.WEBHOOK_BRANCH || 'main';
const PROJECT_DIR = process.env.PROJECT_DIR || path.resolve(__dirname, '..');
const DEPLOY_SCRIPT = path.join(PROJECT_DIR, 'deploy.sh');

if (!SECRET) {
  console.error('[webhook] WEBHOOK_SECRET is required. Set it in .env');
  process.exit(1);
}

const log = (msg) => console.log(`[webhook] ${new Date().toISOString()} ${msg}`);

function verifySignature(payload, signature) {
  if (!signature) return false;
  const expected = 'sha256=' + crypto
    .createHmac('sha256', SECRET)
    .update(payload)
    .digest('hex');
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

let deploying = false;

function deploy() {
  if (deploying) {
    log('Deploy already in progress — skipping');
    return;
  }
  deploying = true;
  log('Starting deploy...');

  execFile('bash', [DEPLOY_SCRIPT, 'update'], { cwd: PROJECT_DIR }, (err, stdout, stderr) => {
    deploying = false;
    if (err) {
      log(`Deploy FAILED: ${err.message}`);
      if (stderr) log(`stderr: ${stderr}`);
    } else {
      log('Deploy SUCCESS');
    }
    if (stdout) log(`stdout: ${stdout}`);
  });
}

const server = http.createServer((req, res) => {
  // Health check
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', deploying }));
    return;
  }

  if (req.method !== 'POST' || req.url !== '/webhook') {
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  const chunks = [];
  req.on('data', (chunk) => chunks.push(chunk));
  req.on('end', () => {
    const body = Buffer.concat(chunks);
    const signature = req.headers['x-hub-signature-256'];

    if (!verifySignature(body, signature)) {
      log('REJECTED — invalid signature');
      res.writeHead(401);
      res.end('Invalid signature');
      return;
    }

    let payload;
    try {
      payload = JSON.parse(body.toString());
    } catch {
      res.writeHead(400);
      res.end('Invalid JSON');
      return;
    }

    // Only deploy on pushes to the target branch
    const ref = payload.ref || '';
    if (ref !== `refs/heads/${BRANCH}`) {
      log(`Ignoring push to ${ref} (watching ${BRANCH})`);
      res.writeHead(200);
      res.end('Ignored — wrong branch');
      return;
    }

    log(`Push to ${BRANCH} by ${payload.pusher?.name || 'unknown'}`);
    res.writeHead(200);
    res.end('Deploying');
    deploy();
  });
});

server.listen(PORT, () => {
  log(`Listening on port ${PORT}`);
  log(`Branch: ${BRANCH}`);
  log(`Project: ${PROJECT_DIR}`);
});
