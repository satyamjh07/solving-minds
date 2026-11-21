export const LEAGUE_THRESHOLDS = [
  0,        // Carbon
  300,      // Silicon
  800,      // Aluminium
  1600,     // Titanium
  3000,     // Chromium
  5000,     // Nickel
  8000,     // Cobalt
  12000,    // Tungsten
  18000,    // Platinum
  26000     // Iridium
];

export const ATOMS_ICON_URL = "https://res.cloudinary.com/dsflyu8vg/image/upload/v1782816377/ChatGPT_Image_Jun_30_2026_04_14_16_PM_oar9jn.png";

export const LEAGUE_DATA = [
  { level: 1, title: 'Carbon', threshold: 0, icon: 'https://res.cloudinary.com/dsflyu8vg/image/upload/v1782815269/solvingminds_level_1_nke3tg.png' },
  { level: 2, title: 'Silicon', threshold: 300, icon: 'https://res.cloudinary.com/dsflyu8vg/image/upload/v1782815271/solvingminds_level_2_hqawat.png' },
  { level: 3, title: 'Aluminium', threshold: 800, icon: 'https://res.cloudinary.com/dsflyu8vg/image/upload/v1782815262/solvingminds_level_3_rlawo7.png' },
  { level: 4, title: 'Titanium', threshold: 1600, icon: 'https://res.cloudinary.com/dsflyu8vg/image/upload/v1782815276/solvingminds_level_4_ocdhjf.png' },
  { level: 5, title: 'Chromium', threshold: 3000, icon: 'https://res.cloudinary.com/dsflyu8vg/image/upload/v1782815270/solvingminds_level_5_bl8qtr.png' },
  { level: 6, title: 'Nickel', threshold: 5000, icon: 'https://res.cloudinary.com/dsflyu8vg/image/upload/v1782815285/solvingminds_level_6_xb11bw.png' },
  { level: 7, title: 'Cobalt', threshold: 8000, icon: 'https://res.cloudinary.com/dsflyu8vg/image/upload/v1782815270/solvingminds_level_7_ddgflj.png' },
  { level: 8, title: 'Tungsten', threshold: 12000, icon: 'https://res.cloudinary.com/dsflyu8vg/image/upload/v1782815289/solvingminds_level_8_d3cwvu.png' },
  { level: 9, title: 'Platinum', threshold: 18000, icon: 'https://res.cloudinary.com/dsflyu8vg/image/upload/v1782815284/solvingminds_level_9_ice52s.png' },
  { level: 10, title: 'Iridium', threshold: 26000, icon: 'https://res.cloudinary.com/dsflyu8vg/image/upload/v1782815285/solvingminds_level_10_ehn6fx.png' }
];

export function getLeagueByAtoms(atoms: number) {
  let activeLeague = LEAGUE_DATA[0];
  for (let i = 0; i < LEAGUE_DATA.length; i++) {
    if (atoms >= LEAGUE_DATA[i].threshold) {
      activeLeague = LEAGUE_DATA[i];
    } else {
      break;
    }
  }
  return activeLeague;
}

export function calculateAtomsProgress(atoms: number) {
  const currentLeague = getLeagueByAtoms(atoms);
  const nextLeague = LEAGUE_DATA[currentLeague.level] || null;
  
  if (!nextLeague) {
    return {
      currentLeague,
      nextLeague: null,
      atomsRemaining: 0,
      progressPercent: 100
    };
  }
  
  const range = nextLeague.threshold - currentLeague.threshold;
  const currentProgress = atoms - currentLeague.threshold;
  const progressPercent = Math.max(0, Math.min(100, (currentProgress / range) * 100));
  
  return {
    currentLeague,
    nextLeague,
    atomsRemaining: nextLeague.threshold - atoms,
    progressPercent
  };
}

// Keep backward compatibility aliases
export const LEVEL_THRESHOLDS = LEAGUE_THRESHOLDS;
export const LEVEL_DATA = LEAGUE_DATA.map(l => ({ level: l.level, title: l.title, reward: `Unlock ${l.title}` }));
export function calculateAura(stats: { totalQuestions: number; streak: number; accuracy: number }) {
  // Return mock compat for old calls
  const score = stats.totalQuestions * 10;
  const league = getLeagueByAtoms(score);
  return {
    score,
    level: league.level,
    nextThreshold: LEAGUE_THRESHOLDS[league.level] || LEAGUE_THRESHOLDS[LEAGUE_THRESHOLDS.length - 1],
    progress: calculateAtomsProgress(score).progressPercent
  };
}

