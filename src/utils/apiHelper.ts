export async function safeFetchJson(url: string, options?: RequestInit): Promise<any> {
  let response: Response;
  try {
    response = await fetch(url, options);
  } catch (netErr: any) {
    throw new Error('تعذر الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت.');
  }

  const contentType = response.headers.get('content-type') || '';
  
  if (contentType.includes('application/json')) {
    try {
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || `خطأ من الخادم (${response.status})`);
      }
      return data;
    } catch (err: any) {
      if (!response.ok) {
        throw new Error(err.message || `خطأ في استجابة الخادم (${response.status})`);
      }
      throw new Error('استجابة الخادم تحتوي على صيغة بيانات غير صالحة.');
    }
  } else {
    // If response is HTML or non-JSON (e.g. 404 from static host like Vercel without API route configured)
    const text = await response.text().catch(() => '');
    console.error('Non-JSON response received from server:', response.status, text);
    
    let extra = '';
    if (text.includes('FUNCTION_INVOCATION_FAILED')) {
      extra = ' - تعذر استدعاء دالة Vercel Serverless';
    } else if (text.includes('FUNCTION_INVOCATION_TIMEOUT')) {
      extra = ' - استغرق الطلب وقتاً أطول من المسموح';
    }

    if (response.status === 404) {
      throw new Error('لم يتم العثور على مسار الخدمة البرمجية (API 404).' + extra);
    }
    
    throw new Error(`خطأ من خادم الاستضافة (${response.status})${extra}: لم يتم إرجاع استجابة JSON من الخادم.`);
  }
}
