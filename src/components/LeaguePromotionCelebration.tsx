'use client';

import React, { useState, useEffect } from 'react';
import { ATOMS_ICON_URL } from '@/lib/aura';

interface PromotionDetail {
  oldLeague: { level: number; title: string; icon: string };
  newLeague: { level: number; title: string; icon: string };
}

export function LeaguePromotionCelebration() {
  const [promo, setPromo] = useState<PromotionDetail | null>(null);
  const [animStep, setAnimStep] = useState<number>(0); // 0 = idle, 1 = shrink old, 2 = emerge new + pulse, 3 = complete

  useEffect(() => {
    const handlePromoted = (e: Event) => {
      const customEvent = e as CustomEvent;
      const detail = customEvent.detail as PromotionDetail;
      if (detail && detail.newLeague) {
        setPromo(detail);
        setAnimStep(1);
        
        // Play reward sound hook placeholder
        try {
          console.log('[Atoms Sound] Play promotion reward sound effect: ding-fanfare-pulse!');
        } catch (_) {}

        // Shrink old emblem transition
        setTimeout(() => {
          setAnimStep(2);
        }, 800);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('league-promoted', handlePromoted);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('league-promoted', handlePromoted);
      }
    };
  }, []);

  if (!promo) return null;

  const handleClose = () => {
    setPromo(null);
    setAnimStep(0);
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/85 backdrop-blur-md animate-in fade-in duration-300">
      
      {/* Background Energy Pulse Grid */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#00f0ff]/10 rounded-full blur-[120px] animate-pulse-slow" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-[#b06aff]/10 rounded-full blur-[80px]" />
        
        {/* Blue expanding energy pulse */}
        {animStep === 2 && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 border-2 border-cyan-400 rounded-full animate-energy-ripple" />
        )}

        {/* Soft particle effects (Atoms Confetti) */}
        {animStep === 2 && Array.from({ length: 40 }).map((_, i) => {
          const delay = Math.random() * 2;
          const left = Math.random() * 100;
          const size = Math.random() * 8 + 4;
          const rotation = Math.random() * 360;
          return (
            <img
              key={i}
              src={ATOMS_ICON_URL}
              alt="confetti"
              className="absolute animate-confetti-particle opacity-80"
              style={{
                left: `${left}%`,
                top: `-5%`,
                width: `${size}px`,
                height: `${size}px`,
                animationDelay: `${delay}s`,
                transform: `rotate(${rotation}deg)`,
              }}
            />
          );
        })}
      </div>

      <div className="relative z-10 text-center px-6 max-w-sm w-full flex flex-col items-center">
        
        <div className="text-cyan-400 font-mono text-[10px] font-black uppercase tracking-[0.3em] mb-2 animate-bounce-slow">
          LEAGUE PROMOTED
        </div>
        
        <h2 className="text-4xl font-black font-[family-name:var(--font-bebas)] tracking-wider text-white mb-6 uppercase text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-200 to-cyan-400">
          {promo.oldLeague.title} &rarr; {promo.newLeague.title}
        </h2>

        {/* Emblem Stage */}
        <div className="relative w-48 h-48 mb-8 flex items-center justify-center">
          
          {/* Outer glow ring */}
          {animStep === 2 && (
            <div className="absolute inset-0 rounded-full bg-cyan-400/20 blur-xl animate-pulse" />
          )}

          {/* Old Emblem Shrinking */}
          {animStep === 1 && (
            <div className="animate-out zoom-out-0 fade-out duration-700 ease-in flex flex-col items-center">
              <img
                src={promo.oldLeague.icon}
                alt={promo.oldLeague.title}
                className="w-36 h-36 object-contain"
              />
              <span className="text-[10px] text-gray-500 font-mono mt-1 font-bold">{promo.oldLeague.title}</span>
            </div>
          )}

          {/* New Emblem Emerging with Glow */}
          {animStep >= 2 && (
            <div className="animate-in zoom-in-50 fade-in duration-500 ease-out flex flex-col items-center">
              <img
                src={promo.newLeague.icon}
                alt={promo.newLeague.title}
                className="w-40 h-40 object-contain drop-shadow-[0_0_25px_rgba(0,240,255,0.6)] animate-bounce-slow"
              />
              <span className="text-xs text-cyan-300 font-bold uppercase tracking-[0.2em] mt-3 font-mono">
                {promo.newLeague.title} League
              </span>
            </div>
          )}
        </div>

        {/* Info */}
        <p className="text-xs text-gray-400 mb-8 leading-relaxed max-w-xs">
          Outstanding mastery! You have successfully crossed the league threshold to unlock <strong>{promo.newLeague.title}</strong> league. Keep solving to reach the next horizon.
        </p>

        {/* CTA */}
        <button
          onClick={handleClose}
          className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold py-4 rounded-2xl transition-all shadow-[0_0_20px_rgba(6,182,212,0.45)] hover:shadow-[0_0_25px_rgba(6,182,212,0.6)] text-xs uppercase tracking-[0.2em] font-mono transform hover:scale-[1.02] active:scale-95 duration-150"
        >
          Continue Solving
        </button>
      </div>

    </div>
  );
}
