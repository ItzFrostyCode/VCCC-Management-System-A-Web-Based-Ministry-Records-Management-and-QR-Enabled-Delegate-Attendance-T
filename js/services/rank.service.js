import { db } from '../db.js';
import { authService } from './auth.service.js';

export const rankService = {
  // Add a new rank entry
  async addRank(data) {
    const { pastor_id, rank_code, effective_date, notes, source, precision_flag } = data;

    const { data: newRank, error } = await db
      .from('rank_history')
      .insert({
        pastor_id,
        rank_code: rank_code.trim(),
        effective_date: effective_date || null,
        precision_flag: precision_flag || 'exact',
        notes: notes ? notes.trim() : null,
        source: source ? source.trim() : null
      })
      .select('id, rank_code')
      .single();

    if (error) throw error;

    // Log the audit
    const user = authService.getCurrentUser();
    if (user) {
      await authService.logAudit(
        user.id,
        'ADD_RANK',
        `Promoted / Assigned Pastor ID ${pastor_id} to Rank: ${rank_code}`
      );
    }

    return newRank;
  },

  // Fetch rank history for a specific pastor
  async fetchByPastor(pastorId) {
    const { data, error } = await db
      .from('rank_history')
      .select('*')
      .eq('pastor_id', pastorId)
      .order('effective_date', { ascending: false });

    if (error) throw error;
    return data || [];
  }
};
