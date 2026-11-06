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
    // Show a default elegant premium sponsor placeholder banner with direct WhatsApp connection
    return (
      <div 
        onClick={() => {
          window.open('https://wa.me/967774919194?text=' + encodeURIComponent('السلام عليكم، بخصوص منصة معروف'), '_blank', 'noopener,noreferrer');
        }}
        className="w-full rounded-2xl bg-gradient-to-r from-[#06184a] via-[#092266] to-[#041030] border-2 border-[#0d52ff]/40 hover:border-[#ffcc00] p-3.5 flex items-center justify-between text-right shadow-md cursor-pointer transition-all group"
      >
        <div className="flex items-center gap-2.5">
          <span className="text-[10px] font-bold text-[#ffcc00] bg-[#ffcc00]/15 px-2 py-0.5 rounded-lg border border-[#ffcc00]/30">رعاية وتواصل</span>
          <span className="text-slate-300 text-xs font-medium">تواصل مباشر عبر واتساب مع إدارة منصة معروف</span>
        </div>
        <a 
          href="https://wa.me/967774919194?text=%D8%A7%D9%84%D8%B3%D9%84%D8%A7%D9%85%20%D8%B9%D9%84%D9%8A%D9%83%D9%85%D8%8C%20%D8%A8%D8%AE%D8%B5%D9%88%D8%B5%20%D9%85%D9%86%D8%B5%D8%A9%20%D9%85%D8%B9%D8%B1%D9%88%D9%81"
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="text-xs text-[#ffcc00] group-hover:underline flex items-center gap-1 font-bold shrink-0 bg-black/30 px-3 py-1.5 rounded-xl border border-[#ffcc00]/30 shadow-sm"
        >
          <span>واتساب</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </a>
      </div>
    );
  }

  return (
    <div 
      onClick={() => {
        if (onAdClick) onAdClick(ad.id);
        const targetUrl = ad.linkUrl || 'https://wa.me/967774919194?text=' + encodeURIComponent('السلام عليكم، بخصوص منصة معروف');
        window.open(targetUrl, '_blank', 'noopener,noreferrer');
      }}
      className="w-full rounded-2xl bg-gradient-to-r from-[#06184a] via-[#092266] to-[#041030] hover:border-[#ffcc00] border-2 border-[#0d52ff]/40 p-3.5 flex items-center justify-between text-right cursor-pointer shadow-md transition-all group"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#ffcc00]/10 border border-[#ffcc00]/30 flex items-center justify-center text-[#ffcc00] overflow-hidden shrink-0">
          {ad.mediaUrl ? (
            <img src={ad.mediaUrl} alt={ad.title} className="w-full h-full object-cover" />
          ) : (
            <Sparkles className="w-5 h-5 animate-pulse" />
          )}
        </div>
        <div>
          <span className="text-[9px] font-bold text-[#ffcc00] bg-[#ffcc00]/10 px-2 py-0.5 rounded-lg border border-[#ffcc00]/20 inline-block mb-1">
            {ad.source === 'admob' ? 'AdMob Banner' : 'رعاية مميزة'}
          </span>
          <p className="text-white text-xs font-bold line-clamp-1 max-w-[200px] sm:max-w-[400px]">{ad.title}</p>
        </div>
      </div>

      <div className="flex items-center gap-1 text-[11px] text-[#ffcc00] font-bold shrink-0 bg-black/30 px-3 py-1.5 rounded-xl border border-[#ffcc00]/30">
        <span>واتساب</span>
        <ArrowUpRight className="w-3.5 h-3.5" />
      </div>
    </div>
  );
}
