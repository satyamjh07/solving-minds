import { supabase } from './supabase/client';
import { getLeagueByAtoms, LEAGUE_DATA } from './aura';

export interface AtomTransaction {
  type: string;
  atoms: number;
  season: string;
}

/**
 * Main utility to award atoms, insert a transaction, update user profile,
 * and dispatch client-side events for animations and celebrations.
 */
export async function awardAtoms(
  userId: string,
  type: string,
  amount: number,
  currentProfile: any = null
) {
  if (!userId || amount === 0) return { success: true };

  const season = new Date().toISOString().slice(0, 7); // Format: YYYY-MM

  console.log(`[Atoms] Awarding ${amount} atoms of type "${type}" to user ${userId}`);

  // 1. Dispatch custom event for floating animation (+4 or -1) immediately
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('atoms-earned', { detail: { amount } }));
  }

  try {
    // 2. Insert transaction
    const { error: txErr } = await supabase
      .from('atom_transactions')
      .insert({
        user_id: userId,
        type,
        atoms: amount,
        season
      });

    if (txErr) {
      console.warn('[Atoms] Failed to insert atom transaction (table might not exist yet):', txErr.message);
    }

    // 3. Fetch user profile if not provided
    let profile = currentProfile;
    if (!profile) {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      profile = data;
    }

    if (!profile) {
      console.error('[Atoms] User profile not found');
      return { success: false };
    }

    // 4. Calculate new totals (using DB sum, fall back to profile values + amount)
    const currentSeason = Number(profile.aura_score) || 0;
    let currentLifetime = Number(profile.lifetime_atoms) || 0;
    // Safety fallback for users with pre-existing season atoms
    if (currentLifetime < currentSeason) {
      currentLifetime = currentSeason;
    }
    let newSeasonAtoms = currentSeason + amount;
    let newLifetimeAtoms = currentLifetime + amount;

    // Try to get exact sum from database
    const { data: sums, error: sumsErr } = await supabase
      .from('atom_transactions')
      .select('atoms')
      .eq('user_id', userId);

    if (!sumsErr && sums) {
      newLifetimeAtoms = sums.reduce((acc, t) => acc + (t.atoms || 0), 0);
      
      const { data: seasonSums } = await supabase
        .from('atom_transactions')
        .select('atoms')
        .eq('user_id', userId)
        .eq('season', season);
        
      if (seasonSums) {
        newSeasonAtoms = seasonSums.reduce((acc, t) => acc + (t.atoms || 0), 0);
      }
    }

    // Ensure values don't go below 0
    newSeasonAtoms = Math.max(0, newSeasonAtoms);
    newLifetimeAtoms = Math.max(0, newLifetimeAtoms);

    const oldLeague = getLeagueByAtoms(Number(profile.aura_score) || 0);
    const newLeague = getLeagueByAtoms(newSeasonAtoms);

    // 5. Update user's profile
    const { error: updateErr } = await supabase
      .from('profiles')
      .update({
        aura_score: newSeasonAtoms, // Season Atoms
        lifetime_atoms: newLifetimeAtoms, // Lifetime Atoms
        aura_level: newLeague.title, // League title
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (updateErr) {
      console.error('[Atoms] Failed to update profile atoms:', updateErr.message);
    }

    // 6. Update local session storage cache
    if (typeof window !== 'undefined') {
      const cached = sessionStorage.getItem('user_profile');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed && parsed.id === userId) {
            parsed.aura_score = newSeasonAtoms;
            parsed.lifetime_atoms = newLifetimeAtoms;
            parsed.aura_level = newLeague.title;
            sessionStorage.setItem('user_profile', JSON.stringify(parsed));
          }
        } catch (_) {}
      }
    }

    // 7. Check for league promotion
    if (newLeague.level > oldLeague.level) {
      console.log(`[Atoms] Promotion! ${oldLeague.title} -> ${newLeague.title}`);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('league-promoted', {
            detail: { oldLeague, newLeague }
          })
        );
      }
    }

    return {
      success: true,
      seasonAtoms: newSeasonAtoms,
      lifetimeAtoms: newLifetimeAtoms,
      promoted: newLeague.level > oldLeague.level
    };

  } catch (err) {
    console.error('[Atoms] Error in awardAtoms:', err);
    return { success: false };
  }
}
