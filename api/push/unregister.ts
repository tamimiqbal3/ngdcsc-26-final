import { handleUnregister, type ApiRequestLike, type ApiResponseLike } from '../_pushEngine.ts';

export default async function handler(req: ApiRequestLike, res: ApiResponseLike) {
  if (req.method && req.method !== 'POST') {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  return handleUnregister(req, res);
}
