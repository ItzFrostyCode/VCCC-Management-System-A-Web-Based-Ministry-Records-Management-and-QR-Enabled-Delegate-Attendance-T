import { BaseService } from './base.service.js';
import { db } from '../db.js';

class ScanLogService extends BaseService {
  constructor() {
    super('scan_logs', '*', false);
  }

  async insert(conferenceId, dayId, slotId, delegateId, delegateName, delegateRole, delegateDistrict, delegateChurch, status) {
    return super.create({
      conference_id: conferenceId,
      day_id: dayId,
      slot_id: slotId,
      delegate_id: delegateId,
      delegate_name: delegateName || null,
      delegate_role: delegateRole || null,
      delegate_district: delegateDistrict || null,
      delegate_church: delegateChurch || null,
      delegate_type: delegateRole || null,
      status: status,
      timestamp: new Date().toISOString()
    });
  }

  async fetchRecent(conferenceId, limit = 50) {
    const { data, error } = await db
      .from('scan_logs')
      .select('*')
      .eq('conference_id', conferenceId)
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  }

  async clearAll(conferenceId) {
    const { error } = await db
      .from('scan_logs')
      .delete()
      .eq('conference_id', conferenceId);
    if (error) throw error;
  }
}

export const scanLogService = new ScanLogService();
