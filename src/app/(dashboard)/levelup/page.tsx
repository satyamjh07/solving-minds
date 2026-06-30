'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LevelUpRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to dashboard
    router.replace('/dashboard');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-cyan-500 font-mono animate-pulse uppercase tracking-widest text-xs">
        Redirecting to Command Center...
      </div>
    </div>
  );
}
