// Scan Logs Service → scan_logs table

import { db } from '../db.js';

export const scanLogService = {
  async insert(conferenceId, dayId, slotId, delegateId, delegateName, delegateRole, delegateDistrict, delegateChurch, status) {
    const { data, error } = await db
      .from('scan_logs')
      .insert({
        conference_id: conferenceId,
        day_id: dayId,
        slot_id: slotId,
        delegate_id: delegateId,
        delegate_name: delegateName || null,
        delegate_role: delegateRole || null,
        delegate_district: delegateDistrict || null,
        delegate_church: delegateChurch || null,
        delegate_type: delegateRole || null, // Keeping for backward compatibility constraints
        status: status, // 'SUCCESS' | 'ALREADY_SCANNED' | 'INVALID_TIME'
        timestamp: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error
    return data
  },


  async fetchRecent(conferenceId, limit = 50) {
    const { data, error } = await db
      .from('scan_logs')
      .select('*')
      .eq('conference_id', conferenceId)
      .order('timestamp', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data
  },

  async clearAll(conferenceId) {
    const { error } = await db
      .from('scan_logs')
      .delete()
      .eq('conference_id', conferenceId)
    if (error) throw error
  }
}
