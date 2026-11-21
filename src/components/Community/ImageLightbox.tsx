'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronLeft, ChevronRight, Pencil } from 'lucide-react';

interface ImageLightboxProps {
  images: string[];
  startIndex?: number;
  onClose: () => void;
}

export function ImageLightbox({ images, startIndex = 0, onClose }: ImageLightboxProps) {
  const [current, setCurrent] = useState(startIndex);
  const [loaded, setLoaded] = useState(false);

  // Lock body scroll when lightbox is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Reset loaded state whenever image changes
  useEffect(() => {
    setLoaded(false);
  }, [current]);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') setCurrent(c => Math.min(c + 1, images.length - 1));
      if (e.key === 'ArrowLeft') setCurrent(c => Math.max(c - 1, 0));
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [images.length, onClose]);

  const goNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrent(c => Math.min(c + 1, images.length - 1));
  };

  const goPrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrent(c => Math.max(c - 1, 0));
  };

  // Render via portal so it is always a direct child of <body>,
  // escaping any parent stacking context (transform, filter, etc.)
  const lightbox = (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 99999 }}
      className="bg-black/95 backdrop-blur-md flex items-center justify-center"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        style={{ position: 'absolute', top: 16, right: 16, zIndex: 100000 }}
        className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all"
        onClick={onClose}
      >
        <X size={22} />
      </button>

      {/* Image container — stop propagation so clicking the image doesn't close */}
      <div
        style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', padding: '0 56px' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Pencil loading spinner */}
        {!loaded && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
            <div className="animate-spin text-white/60">
              <Pencil size={40} />
            </div>
          </div>
        )}

        <img
          key={images[current]}
          src={images[current]}
          alt={`Image ${current + 1}`}
          onLoad={() => setLoaded(true)}
          draggable={false}
          style={{
            maxWidth: '100%',
            maxHeight: '85vh',
            objectFit: 'contain',
            borderRadius: 16,
            boxShadow: '0 25px 60px rgba(0,0,0,0.8)',
            userSelect: 'none',
            opacity: loaded ? 1 : 0,
            transition: 'opacity 0.3s ease',
          }}
        />
      </div>

      {/* Prev arrow */}
      {images.length > 1 && current > 0 && (
        <button
          style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', zIndex: 100000 }}
          className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all"
          onClick={goPrev}
        >
          <ChevronLeft size={22} />
        </button>
      )}

      {/* Next arrow */}
      {images.length > 1 && current < images.length - 1 && (
        <button
          style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', zIndex: 100000 }}
          className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all"
          onClick={goNext}
        >
          <ChevronRight size={22} />
        </button>
      )}

      {/* Position counter: X / N */}
      <div
        style={{ position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 100000 }}
        className="px-4 py-1.5 bg-black/60 backdrop-blur-sm rounded-full"
        onClick={e => e.stopPropagation()}
      >
        <span className="text-white text-sm font-mono font-bold tracking-widest">
          {current + 1} / {images.length}
        </span>
      </div>

      {/* Dot indicators */}
      {images.length > 1 && (
        <div
          style={{ position: 'absolute', bottom: 64, left: '50%', transform: 'translateX(-50%)', zIndex: 100000, display: 'flex', gap: 8 }}
          onClick={e => e.stopPropagation()}
        >
          {images.map((_, i) => (
            <button
              key={i}
              onClick={e => { e.stopPropagation(); setCurrent(i); }}
              style={{
                height: 6,
                width: i === current ? 16 : 6,
                borderRadius: 9999,
                background: i === current ? '#fff' : 'rgba(255,255,255,0.35)',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s',
                padding: 0,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );

  // Only portal on client
  if (typeof document === 'undefined') return null;
  return createPortal(lightbox, document.body);
}
