import { handleRobots, type SeoRequestLike, type SeoResponseLike } from './_seoEngine.ts';

export default async function handler(req: SeoRequestLike, res: SeoResponseLike) {
  return handleRobots(req, res);
}
