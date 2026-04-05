import { BaseService } from './base.service.js';
import { db } from '../db.js';

class AttendanceService extends BaseService {
  constructor() {
    super('attendance', '*', false);
  }

  async checkDuplicate(conferenceId, dayId, slotId, delegateId, delegateType = null) {
    const query = db
      .from('attendance')
      .select('id, scanned_at')
      .eq('conference_id', conferenceId)
      .eq('day_id', dayId)
      .eq('slot_id', slotId)
      .eq('delegate_id', delegateId);

    if (delegateType) {
      query.eq('delegate_type', delegateType);
    }

    const { data, error } = await query.maybeSingle();

    if (error) throw error;
    return data;
  }

  async insert(conferenceId, dayId, slotId, delegateId, delegateType = null) {
    const existing = await this.checkDuplicate(conferenceId, dayId, slotId, delegateId, delegateType);
    if (existing) {
      const err = new Error('ALREADY_SCANNED');
      err.code = 'ALREADY_SCANNED';
      throw err;
    }

    return super.create({
      conference_id: conferenceId,
      day_id: dayId,
      slot_id: slotId,
      delegate_id: delegateId,
      delegate_type: delegateType,
      scanned_at: new Date().toISOString()
    });
  }

  async countBySlot(dayId, slotId) {
    const { data, error } = await db
      .from('attendance')
      .select('id')
      .eq('day_id', dayId)
      .eq('slot_id', slotId);

    if (error) throw error;
    return data ? data.length : 0;
  }

  async countByConference(conferenceId) {
    const { data, error } = await db
      .from('attendance')
      .select('id')
      .eq('conference_id', conferenceId);

    if (error) throw error;
    return data ? data.length : 0;
  }

  async clearAll(conferenceId) {
    const { error } = await db
      .from('attendance')
      .delete()
      .eq('conference_id', conferenceId);
    
    if (error) throw error;
    await this.logAuditByCurrent('CLEAR_ATTENDANCE', `Cleared all attendance for conference ID: ${conferenceId}`);
  }

  async fetchByMeal(mealId) {
    const { data: meal, error: mealErr } = await db
      .from('meals')
      .select('day_id, slot_id, conference_id')
      .eq('id', mealId)
      .maybeSingle();

    if (mealErr) throw mealErr;
    if (!meal) return [];

    const { data, error } = await db
      .from('attendance')
      .select('*')
      .eq('conference_id', meal.conference_id)
      .eq('day_id', meal.day_id)
      .eq('slot_id', meal.slot_id);
    
    if (error) throw error;
    return data || [];
  }

  async fetchByConference(conferenceId) {
    const { data, error } = await db
      .from('attendance')
      .select('*')
      .eq('conference_id', conferenceId);

    if (error) throw error;
    return data || [];
  }
}

export const attendanceService = new AttendanceService();
