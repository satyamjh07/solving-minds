'use client';

import React, { useState, useEffect } from 'react';
import { ATOMS_ICON_URL } from '@/lib/aura';

interface FloatingItem {
  id: number;
  amount: number;
  x: number;
  y: number;
}

export function AtomAnimation() {
  const [items, setItems] = useState<FloatingItem[]>([]);

  useEffect(() => {
    const handleEarned = (e: Event) => {
      const customEvent = e as CustomEvent;
      const amount = customEvent.detail?.amount || 0;
      if (amount === 0) return;

      // Create floating text near cursor position or center of screen
      let startX = typeof window !== 'undefined' ? window.innerWidth / 2 : 200;
      let startY = typeof window !== 'undefined' ? window.innerHeight / 2 : 200;

      // Try to find the solver question submit button or active element to position near it
      if (typeof document !== 'undefined') {
        const activeBtn = document.activeElement as HTMLElement;
        if (activeBtn && activeBtn.getBoundingClientRect) {
          const rect = activeBtn.getBoundingClientRect();
          startX = rect.left + rect.width / 2;
          startY = rect.top;
        }
      }

      const id = Date.now() + Math.random();
      const newItem: FloatingItem = {
        id,
        amount,
        x: startX,
        y: startY,
      };

      setItems(prev => [...prev, newItem]);

      // Trigger a pulse on the header chip
      const headerChip = document.getElementById('header-atoms-chip');
      if (headerChip) {
        headerChip.classList.remove('pulse-active');
        // trigger reflow
        void headerChip.offsetWidth;
        headerChip.classList.add('pulse-active');
      }

      // Remove after animation completes (~1000ms to be safe)
      setTimeout(() => {
        setItems(prev => prev.filter(item => item.id !== id));
      }, 1000);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('atoms-earned', handleEarned);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('atoms-earned', handleEarned);
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
      {items.map(item => {
        const isNegative = item.amount < 0;
        return (
          <div
            key={item.id}
            className={`absolute flex items-center gap-1.5 font-bold text-sm tracking-wide animate-float-atom`}
            style={{
              left: item.x,
              top: item.y,
              color: isNegative ? '#ff4d6a' : '#00e5a0',
              textShadow: isNegative ? '0 0 8px rgba(255, 77, 106, 0.4)' : '0 0 8px rgba(0, 229, 160, 0.4)',
              transform: 'translate(-50%, -100%)',
            }}
          >
            <span>{isNegative ? '' : '+'}{item.amount}</span>
            <img
              src={ATOMS_ICON_URL}
              alt="Atom"
              className="w-4 h-4 object-contain animate-spin-slow"
            />
          </div>
        );
      })}
    </div>
  );
}
