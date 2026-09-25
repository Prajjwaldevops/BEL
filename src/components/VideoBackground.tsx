'use client';

import { useEffect, useRef } from 'react';

export default function VideoBackground() {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    // We cannot use the direct MP4 because the Vimeo signature expired (403 Forbidden).
    // Using iframe as fallback.
  }, []);

  return (
    <div className="fixed inset-0 z-0 overflow-hidden">
      {/* Video Background Fallback/Iframe */}
      <div className="absolute inset-0 bg-[#020617] transition-opacity duration-1000">
        <iframe
          ref={iframeRef}
          src="https://player.vimeo.com/video/1193028519?h=060f9f2d4e&autoplay=1&muted=1&background=1&controls=0&title=0&byline=0&portrait=0&dnt=1"
          className="absolute inset-0 w-full h-full scale-[1.3] pointer-events-none opacity-80"
          style={{ width: '100vw', height: '100vh', border: 'none', filter: 'blur(8px) brightness(0.4)' }}
          allow="autoplay; fullscreen"
          loading="eager"
        />
      </div>
      
      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-[#0a0e1a]/60 backdrop-blur-sm" />
      
      {/* Hexagonal Pattern Overlay */}
      <div 
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0l25.98 15v30L30 60 4.02 45V15z' fill='none' stroke='%2338bdf8' stroke-width='1'/%3E%3C/svg%3E")`,
          backgroundSize: '60px 60px'
        }}
      />
      
      {/* Gradient Accent */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-[#38bdf8]/5 blur-[120px] rounded-full" />
      
      {/* Scanline Effect */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.02] bg-[repeating-linear-gradient(0deg,#000_0px,transparent_2px,transparent_4px)]" />
    </div>
  );
}
