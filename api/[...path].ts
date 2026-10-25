import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store');
  return res.status(501).json({
    success: false,
    error: `API operation is not deployed: ${req.method} /api/${String(req.query.path || '')}`
  });
}
