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

    // Return a Promise that keeps the serverless function alive until Express finishes the response
    return new Promise((resolve, reject) => {
      res.on('finish', () => resolve(undefined));
      res.on('close', () => resolve(undefined));
      res.on('error', (err: any) => reject(err));

      cachedApp(req, res, (err: any) => {
        if (err) return reject(err);
        resolve(undefined);
      });
    });
  } catch (err: any) {
    console.error('[Vercel Serverless Function Error]:', err);
    if (!res.headersSent) {
      res.status(500).json({
        error: 'خطأ من خادم Vercel: ' + (err?.message || 'فشل معالجة الطلب'),
        timestamp: new Date().toISOString()
      });
    }
  }
}
