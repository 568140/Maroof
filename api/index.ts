import { createExpressApp } from '../server';

let appPromise: Promise<any> | null = null;

export default async function handler(req: any, res: any) {
  if (!appPromise) {
    appPromise = createExpressApp();
  }
  const app = await appPromise;
  return app(req, res);
}
