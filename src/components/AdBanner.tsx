import React, { useEffect } from 'react';
import { Sparkles, Eye, ArrowUpRight } from 'lucide-react';
import { Ad } from '../types';

interface AdBannerProps {
  ad: Ad | null;
  onAdClick?: (adId: string) => void;
  googleAdSenseEnabled?: boolean;
  googleAdSenseClientId?: string;
  googleAdSenseSlotId?: string;
}

export default function AdBanner({ 
  ad, 
  onAdClick,
  googleAdSenseEnabled,
  googleAdSenseClientId,
  googleAdSenseSlotId
}: AdBannerProps) {

  useEffect(() => {
    if (googleAdSenseEnabled && googleAdSenseClientId) {
      // 1. Inject script dynamically
      const scriptId = 'google-adsense-script-loader';
      let existingScript = document.getElementById(scriptId);
      if (!existingScript) {
        const script = document.createElement('script');
        script.id = scriptId;
        script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${googleAdSenseClientId}`;
        script.async = true;
        script.crossOrigin = 'anonymous';
        document.head.appendChild(script);
      }

      // 2. Push to adsbygoogle list
      try {
        const adsbygoogle = (window as any).adsbygoogle || [];
        adsbygoogle.push({});
      } catch (err) {
        console.warn('[AdSense] Push unit failed:', err);
      }
    }
  }, [googleAdSenseEnabled, googleAdSenseClientId, googleAdSenseSlotId]);

  if (googleAdSenseEnabled && googleAdSenseClientId) {
    return (
      <div className="w-full rounded-xl bg-[#090e24]/80 border border-[#c5a059]/20 p-2.5 flex flex-col items-center justify-center text-center overflow-hidden min-h-[90px] shadow-md">
        <span className="text-[8px] font-bold text-gray-500 mb-1">إعلانات ممولة من Google</span>
        <div className="w-full overflow-hidden flex justify-center">
          <ins 
            className="adsbygoogle"
            style={{ display: 'block', minWidth: '250px', height: '60px' }}
            data-ad-client={googleAdSenseClientId}
            data-ad-slot={googleAdSenseSlotId || ''}
            data-ad-format="horizontal"
            data-full-width-responsive="true"
          />
        </div>
      </div>
    );
  }

  if (!ad) {
    // Show a default elegant premium sponsor placeholder banner
    return (
      <div className="w-full rounded-xl bg-gradient-to-r from-[#0d1430] to-[#121c3e] border border-[#c5a059]/20 p-3.5 flex items-center justify-between text-right shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-bold text-[#e5c158] bg-[#c5a059]/10 px-1.5 py-0.5 rounded border border-[#c5a059]/30">إعلان راعي</span>
          <span className="text-gray-400 text-xs">هل ترغب في رعاية منصة معروف وعرض شركتك هنا؟</span>
        </div>
        <a 
          href="mailto:sponsor@maarouf.com?subject=Sponsorship%20Inquiry"
          className="text-xs text-[#e5c158] hover:underline flex items-center gap-1 font-bold"
        >
          <span>تواصل معنا</span>
          <ArrowUpRight className="w-3 h-3" />
        </a>
      </div>
    );
  }

  return (
    <div 
      onClick={() => {
        if (onAdClick) onAdClick(ad.id);
        if (ad.linkUrl) window.open(ad.linkUrl, '_blank', 'noopener,noreferrer');
      }}
      className="w-full rounded-xl bg-[#090e24] hover:bg-[#0d1430] border border-[#c5a059]/20 p-3.5 flex items-center justify-between text-right cursor-pointer shadow-md hover:border-[#e5c158] transition-all"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded bg-[#c5a059]/10 border border-[#c5a059]/30 flex items-center justify-center text-[#e5c158] overflow-hidden shrink-0">
          {ad.mediaUrl ? (
            <img src={ad.mediaUrl} alt={ad.title} className="w-full h-full object-cover" />
          ) : (
            <Sparkles className="w-5 h-5 animate-pulse" />
          )}
        </div>
        <div>
          <span className="text-[9px] font-bold text-[#e5c158] bg-[#c5a059]/10 px-1.5 py-0.5 rounded border border-[#c5a059]/20 inline-block mb-1">
            {ad.source === 'admob' ? 'AdMob Banner' : 'رعاية مميزة'}
          </span>
          <p className="text-white text-xs font-bold line-clamp-1 max-w-[200px] sm:max-w-[400px]">{ad.title}</p>
        </div>
      </div>

      <div className="flex items-center gap-1 text-[10px] text-gray-500 font-bold">
        <span>تصفح</span>
        <ArrowUpRight className="w-3.5 h-3.5 text-[#e5c158]" />
      </div>
    </div>
  );
}
