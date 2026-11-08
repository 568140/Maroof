import { handleClientApiRequest } from './clientApiFallback';

const apiBase = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '');

export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const rawUrl = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

  let apiPath: string | null = null;
  if (rawUrl.startsWith('/api/')) {
    apiPath = rawUrl;
  } else {
    try {
      const parsed = new URL(rawUrl, window.location.origin);
      if (parsed.pathname.startsWith('/api/')) {
        apiPath = parsed.pathname + parsed.search;
      }
    } catch {
      // Ignore invalid URL
    }
  }

  if (apiPath) {
    const isLocalApkOrigin =
      window.location.protocol === 'file:' ||
      window.location.hostname === 'appassets.androidplatform.net';

    if (isLocalApkOrigin && !apiBase) {
      return handleClientApiRequest(apiPath, init);
    }

    const targetUrl = apiBase && rawUrl.startsWith('/api/') ? `${apiBase}${rawUrl}` : rawUrl;
    try {
      const res = await window.fetch(targetUrl, {
        credentials: 'same-origin',
        ...init,
      });
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        return res;
      }
      return await handleClientApiRequest(apiPath, init);
    } catch {
      return await handleClientApiRequest(apiPath, init);
    }
  }

  return window.fetch(input, init);
}

export async function safeFetchJson(url: string, options?: RequestInit): Promise<any> {
  let response: Response;
  try {
    response = await apiFetch(url, options);
  } catch {
    try {
      response = await handleClientApiRequest(url, options);
    } catch {
      throw new Error('تعذر الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت.');
    }
  }

  const contentType = response.headers.get('content-type') || '';

  if (!contentType.includes('application/json')) {
    try {
      response = await handleClientApiRequest(url, options);
    } catch {
      throw new Error(`خطأ في استجابة الخادم (${response.status}).`);
    }
  }

  const finalContentType = response.headers.get('content-type') || '';
  if (finalContentType.includes('application/json')) {
    let data: any;
    try {
      data = await response.json();
    } catch {
      throw new Error('استجابة الخادم تحتوي على صيغة بيانات غير صالحة.');
    }
    if (!response.ok) {
      throw new Error(data?.error || data?.message || `خطأ من الخادم (${response.status})`);
    }
    return data;
  }

  throw new Error(`خطأ من الخادم (${response.status}).`);
}
