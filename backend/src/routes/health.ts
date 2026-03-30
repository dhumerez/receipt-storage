import { Router } from 'express';

const router = Router();

// GET /health — no auth required; used by Docker healthcheck and Nginx upstreams
router.get('/', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

export default router;
