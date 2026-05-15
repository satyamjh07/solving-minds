export const LEVEL_THRESHOLDS = [
  0,        // Level 1
  1000,     // Level 2
  3000,     // Level 3
  7000,     // Level 4
  15000,    // Level 5
  31000,    // Level 6
  63000,    // Level 7
  127000,   // Level 8
  255000,   // Level 9
  511000,   // Level 10
];

export function calculateAura(stats: {
  totalQuestions: number;
  streak: number;
  accuracy: number;
}) {
  const baseScore = stats.totalQuestions * 10;
  const streakBonus = stats.streak * 50;
  const accuracyBonus = stats.accuracy * 5;
  
  const totalScore = baseScore + streakBonus + accuracyBonus;
  
  let level = 1;
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (totalScore >= LEVEL_THRESHOLDS[i]) {
      level = i + 1;
    } else {
      break;
    }
  }
  
  return {
    score: totalScore,
    level: level,
    nextThreshold: LEVEL_THRESHOLDS[level] || LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1],
    progress: level === 10 ? 100 : ((totalScore - LEVEL_THRESHOLDS[level - 1]) / (LEVEL_THRESHOLDS[level] - LEVEL_THRESHOLDS[level - 1])) * 100
  };
}

export const LEVEL_DATA = [
  { level: 1, title: 'Starter Solver', reward: '50 Credits' },
  { level: 2, title: 'Consistency Mind', reward: 'Bronze Theme' },
  { level: 3, title: 'AIR Hunter', reward: 'Hunter Badge' },
  { level: 4, title: 'Study Monk', reward: 'Focus Mode Unlocked' },
  { level: 5, title: 'PYQ Master', reward: 'Silver Theme' },
  { level: 6, title: 'Problem Slayer', reward: 'Slayer Title' },
  { level: 7, title: 'Subject Expert', reward: 'Gold Theme' },
  { level: 8, title: 'JEE Legend', reward: 'Legendary Badge' },
  { level: 9, title: 'Aura Protocol', reward: 'Elite Status' },
  { level: 10, title: 'The Architect', reward: 'Custom Theme' },
];
