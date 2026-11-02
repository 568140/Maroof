import { createExpressApp } from '../server';

let cachedApp: any = null;

export default async function handler(req: any, res: any) {
  try {
    if (!cachedApp) {
      cachedApp = await createExpressApp();
    }

    // Support Vercel x-matched-path or custom rewrite paths if req.url is altered
    const matchedPath = req.headers['x-matched-path'];
    if (matchedPath && typeof matchedPath === 'string' && matchedPath.startsWith('/api')) {
      req.url = matchedPath;
    }

    return cachedApp(req, res);
  } catch (err: any) {
    console.error('[Vercel Serverless Function Error]:', err);
    if (!res.headersSent) {
      res.status(500).json({
        error: 'خطأ من خادم Vercel: ' + (err?.message || 'فشل معالجة الطلب'),
        details: process.env.NODE_ENV !== 'production' ? err?.stack : undefined,
        timestamp: new Date().toISOString()
      });
    }
  }
}
