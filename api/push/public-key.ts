import { handlePublicKey, type ApiRequestLike, type ApiResponseLike } from '../_pushEngine.ts';

export default async function handler(req: ApiRequestLike, res: ApiResponseLike) {
  if (req.method && req.method !== 'GET') {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  return handlePublicKey(req, res);
}
