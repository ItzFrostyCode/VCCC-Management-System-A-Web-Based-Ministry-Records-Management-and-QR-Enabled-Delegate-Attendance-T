import { BaseService } from './base.service.js';
import { db } from '../db.js';

class RankService extends BaseService {
  constructor() {
    super('rank_history', '*', false);
  }

  /**
   * Add a new rank entry
   */
  async addRank(data) {
    const auditAction = 'ADD_RANK';
    const auditDetails = `Promoted / Assigned Pastor ID ${data.pastor_id} to Rank: ${data.rank_code}`;
    return super.create(data, auditAction, auditDetails);
  }

  /**
   * Fetch rank history for a specific pastor
   */
  async fetchByPastor(pastorId) {
    const { data, error } = await db
      .from('rank_history')
      .select('*')
      .eq('pastor_id', pastorId)
      .order('effective_date', { ascending: false });

    if (error) throw error;
    return data || [];
  }
}

export const rankService = new RankService();
