// Hardware-based Deterministic Device Fingerprinting Utility
// Generates a stable, unique device fingerprint based on physical hardware & OS traits
// (Android Secure ID when inside Android app, or WebGL GPU + Canvas + Screen + CPU/Memory traits on Web)

export interface DeviceSpecsInfo {
  deviceId: string;
  deviceType: string;
  browser: string;
  isHardwareId: boolean;
}

// Fast deterministic 64-bit FNV-1a / Cyb53 dual hash to produce a 16-char hex hardware signature
function computeDeterministicHexHash(input: string): string {
  let h1 = 0xdeadbeef ^ input.length;
  let h2 = 0x41c6ce57 ^ input.length;

  for (let i = 0, ch; i < input.length; i++) {
    ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }

  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);

  const part1 = (h1 >>> 0).toString(16).padStart(8, '0');
  const part2 = (h2 >>> 0).toString(16).padStart(8, '0');
  return `${part1}${part2}`;
}

function getWebGLHardwareSignature(): string {
  try {
    const canvas = document.createElement('canvas');
    const gl =
      (canvas.getContext('webgl') as WebGLRenderingContext | null) ||
      (canvas.getContext('experimental-webgl') as WebGLRenderingContext | null);
    if (!gl) return 'no_webgl';

    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    const vendor = debugInfo
      ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL)
      : gl.getParameter(gl.VENDOR);
    const renderer = debugInfo
      ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
      : gl.getParameter(gl.RENDERER);
    const version = gl.getParameter(gl.VERSION);
    const shading = gl.getParameter(gl.SHADING_LANGUAGE_VERSION);
    const maxTex = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    const maxCube = gl.getParameter(gl.MAX_CUBE_MAP_TEXTURE_SIZE);
    const maxRender = gl.getParameter(gl.MAX_RENDERBUFFER_SIZE);
    const maxVertexAttribs = gl.getParameter(gl.MAX_VERTEX_ATTRIBS);

    return [
      vendor,
      renderer,
      version,
      shading,
      maxTex,
      maxCube,
      maxRender,
      maxVertexAttribs,
    ].join('|');
  } catch {
    return 'webgl_err';
  }
}

function getCanvasHardwareSignature(): string {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 220;
    canvas.height = 50;
    const ctx = canvas.getContext('2d');
    if (!ctx) return 'no_canvas';

    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#f60';
    ctx.fillRect(100, 1, 62, 20);
    ctx.fillStyle = '#069';
    ctx.font = '14px Arial';
    ctx.fillText('Maarouf-HW-FP-2026', 2, 15);
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
    ctx.font = '16px Georgia';
    ctx.fillText('Maarouf-HW-FP-2026', 4, 35);

    ctx.beginPath();
    ctx.arc(50, 25, 18, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.fill();

    const dataUrl = canvas.toDataURL();
    return computeDeterministicHexHash(dataUrl);
  } catch {
    return 'canvas_err';
  }
}

function getAudioHardwareSignature(): string {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return 'no_audio';
    const ctx = new AudioCtx();
    const sig = `${ctx.destination.maxChannelCount || 2}_${ctx.sampleRate || 44100}`;
    if (ctx.close) {
      ctx.close().catch(() => {});
    }
    return sig;
  } catch {
    return 'audio_err';
  }
}

export function detectRealDeviceModel(): { deviceType: string; browser: string } {
  try {
    // 1. Check Native Android Bridge first
    if (window.MaaroufAndroid?.getDeviceModel) {
      const nativeModel = window.MaaroufAndroid.getDeviceModel();
      if (nativeModel && nativeModel.trim()) {
        return {
          deviceType: nativeModel.trim(),
          browser: 'تطبيق معروف أندرويد',
        };
      }
    }

    const ua = navigator.userAgent || '';

    // Browser detection
    let browserName = 'Chrome';
    if (/Edg\//i.test(ua)) browserName = 'Microsoft Edge';
    else if (/OPR\/|Opera/i.test(ua)) browserName = 'Opera';
    else if (/SamsungBrowser/i.test(ua)) browserName = 'Samsung Internet';
    else if (/Firefox|FxiOS/i.test(ua)) browserName = 'Firefox';
    else if (/Safari/i.test(ua) && !/Chrome|CriOS/i.test(ua)) browserName = 'Safari';
    else if (/wv\)/i.test(ua)) browserName = 'Android WebView';

    // Extract specific Android phone model from User-Agent if available (e.g. "Android 13; SM-S918B Build/...")
    const androidMatch = ua.match(/Android\s+([\d.]+);\s*([^;)]+?)(?:\s+Build\/|\))/i);
    if (androidMatch) {
      const osVer = androidMatch[1];
      const modelCode = androidMatch[2].trim();
      if (modelCode && modelCode.toLowerCase() !== 'k') {
        return {
          deviceType: `أندرويد ${osVer} (${modelCode})`,
          browser: browserName,
        };
      }
      return {
        deviceType: `جوال أندرويد (${osVer})`,
        browser: browserName,
      };
    }

    if (/iPhone/i.test(ua)) {
      const iosMatch = ua.match(/OS\s+([\d_]+)\s+like\s+Mac/i);
      const iosVer = iosMatch ? iosMatch[1].replace(/_/g, '.') : '';
      return {
        deviceType: iosVer ? `Apple iPhone (iOS ${iosVer})` : 'Apple iPhone',
        browser: browserName,
      };
    }

    if (/iPad/i.test(ua)) {
      return {
        deviceType: 'Apple iPad',
        browser: browserName,
      };
    }

    if (/Windows/i.test(ua)) {
      return {
        deviceType: 'كمبيوتر Windows',
        browser: browserName,
      };
    }

    if (/Macintosh|Mac OS X/i.test(ua)) {
      return {
        deviceType: 'جهاز Apple Mac',
        browser: browserName,
      };
    }

    return {
      deviceType: 'جهاز ذكي',
      browser: browserName,
    };
  } catch {
    return {
      deviceType: 'جهاز ذكي',
      browser: 'Chrome',
    };
  }
}

export function getRealDeviceFingerprint(): string {
  try {
    // 1. Priority 1: Native Android Hardware ANDROID_ID via JavascriptInterface if running inside Android APK
    if (window.MaaroufAndroid?.getDeviceId) {
      const nativeId = window.MaaroufAndroid.getDeviceId();
      if (nativeId && typeof nativeId === 'string' && nativeId.trim().length >= 6) {
        const hwAndroidId = `hw_and_${nativeId.trim().toLowerCase()}`;
        try {
          localStorage.setItem('maarouf_device_fingerprint', hwAndroidId);
        } catch {}
        return hwAndroidId;
      }
    }

    // 2. Priority 2: Deterministic Hardware Fingerprint across WebGL GPU, Canvas, Audio, Screen & CPU specs
    // Note: We use orientation-independent screen dimensions (min x max) so rotating the phone never changes the ID.
    const sw = window.screen?.width || 0;
    const sh = window.screen?.height || 0;
    const screenDim = `${Math.min(sw, sh)}x${Math.max(sw, sh)}`;
    const colorDepth = window.screen?.colorDepth || 24;
    const pixelRatio = Math.round((window.devicePixelRatio || 1) * 100);
    const cores = navigator.hardwareConcurrency || 4;
    const memory = (navigator as unknown as { deviceMemory?: number }).deviceMemory || 0;
    const touchPoints = navigator.maxTouchPoints || 0;
    const platform = navigator.platform || '';
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';

    const webglSig = getWebGLHardwareSignature();
    const canvasSig = getCanvasHardwareSignature();
    const audioSig = getAudioHardwareSignature();

    const rawHardwareProfile = [
      platform,
      cores,
      memory,
      touchPoints,
      screenDim,
      colorDepth,
      pixelRatio,
      tz,
      webglSig,
      canvasSig,
      audioSig,
    ].join('||');

    const hexHash = computeDeterministicHexHash(rawHardwareProfile);
    const hardwareId = `hw_${hexHash}`;

    try {
      localStorage.setItem('maarouf_device_fingerprint', hardwareId);
    } catch {}

    return hardwareId;
  } catch {
    // Fallback if DOM APIs are restricted
    const existing = localStorage.getItem('maarouf_device_fingerprint');
    if (existing) return existing;
    const fallback = `hw_fb_${Date.now().toString(36)}`;
    try {
      localStorage.setItem('maarouf_device_fingerprint', fallback);
    } catch {}
    return fallback;
  }
}

export function getFullDeviceSpecs(): DeviceSpecsInfo {
  const deviceId = getRealDeviceFingerprint();
  const { deviceType, browser } = detectRealDeviceModel();
  return {
    deviceId,
    deviceType,
    browser,
    isHardwareId: deviceId.startsWith('hw_'),
  };
}
