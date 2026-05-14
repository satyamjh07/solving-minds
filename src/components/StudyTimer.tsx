'use client';

import { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';

export default function StudyTimer() {
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [mode, setMode] = useState<'pomodoro' | 'shortBreak'>('pomodoro');

  useEffect(() => {
    let interval: any;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsRunning(false);
      // Optional: Add notification or sound
      if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'granted') {
          new Notification(mode === 'pomodoro' ? 'Time for a break!' : 'Back to work!');
        }
      }
    }
    return () => clearInterval(interval);
  }, [isRunning, timeLeft, mode]);

  const toggleTimer = () => setIsRunning(!isRunning);

  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(mode === 'pomodoro' ? 25 * 60 : 5 * 60);
  };

  const switchMode = (newMode: 'pomodoro' | 'shortBreak') => {
    setMode(newMode);
    setIsRunning(false);
    setTimeLeft(newMode === 'pomodoro' ? 25 * 60 : 5 * 60);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Progress percentage
  const total = mode === 'pomodoro' ? 25 * 60 : 5 * 60;
  const progress = ((total - timeLeft) / total) * 100;

  return (
    <div className="bg-[#111118] border border-white/[0.05] rounded-3xl p-8 relative overflow-hidden group">
      {/* Background Progress Glow */}
      <div 
        className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-[#00f0ff] to-[#b06aff] transition-all duration-1000"
        style={{ width: `${progress}%` }}
      />
      
      <div className="flex justify-center gap-2 mb-8">
        <button
          onClick={() => switchMode('pomodoro')}
          className={`px-6 py-2 rounded-xl text-[10px] font-bold font-mono tracking-widest uppercase transition-all ${
            mode === 'pomodoro' 
            ? 'bg-[#00f0ff] text-black shadow-[0_0_20px_rgba(0,240,255,0.3)]' 
            : 'bg-white/[0.03] text-white/40 hover:text-white'
          }`}
        >
          Study Session
        </button>
        <button
          onClick={() => switchMode('shortBreak')}
          className={`px-6 py-2 rounded-xl text-[10px] font-bold font-mono tracking-widest uppercase transition-all ${
            mode === 'shortBreak' 
            ? 'bg-[#b06aff] text-white shadow-[0_0_20px_rgba(176,106,255,0.3)]' 
            : 'bg-white/[0.03] text-white/40 hover:text-white'
          }`}
        >
          Short Break
        </button>
      </div>

      <div className="relative mb-8">
        <div className="text-[84px] font-[family-name:var(--font-bebas)] leading-none tracking-wider text-white">
          {formatTime(timeLeft)}
        </div>
        <div className="font-mono text-[10px] text-white/20 uppercase tracking-[0.2em] mt-2">
          {isRunning ? 'Focusing...' : 'Ready to start?'}
        </div>
      </div>

      <div className="flex justify-center gap-4">
        <button
          onClick={toggleTimer}
          className={`
            w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300
            ${isRunning 
              ? 'bg-[#ff4d6a]/10 border border-[#ff4d6a]/20 text-[#ff4d6a] hover:bg-[#ff4d6a]/20' 
              : 'bg-[#00f0ff]/10 border border-[#00f0ff]/20 text-[#00f0ff] hover:bg-[#00f0ff]/20'}
          `}
        >
          {isRunning ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 fill-current" />}
        </button>
        <button
          onClick={resetTimer}
          className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-center text-white/40 hover:text-white hover:bg-white/[0.08] transition-all"
        >
          <RotateCcw className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}
