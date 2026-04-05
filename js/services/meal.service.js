import { BaseService } from './base.service.js';
import { db } from '../db.js';

class MealService extends BaseService {
  constructor() {
    super('meals', '*', false);
  }

  async fetchByConference(conferenceId) {
    const { data, error } = await db
      .from('meals')
      .select('*')
      .eq('conference_id', conferenceId);

    if (error) throw error;
    return data;
  }

  async fetchByConferenceBulk(conferenceIds) {
    if (!conferenceIds || conferenceIds.length === 0) return [];
    const { data, error } = await db
      .from('meals')
      .select('*')
      .in('conference_id', conferenceIds);

    if (error) throw error;
    return data;
  }

  async create(conferenceId, dayId, slotId, name, notes) {
    const auditAction = 'CREATE_MEAL';
    const auditDetails = `Created Meal: ${name || 'Unnamed'} for Day ${dayId}`;
    return super.create({
      conference_id: conferenceId,
      day_id: dayId,
      slot_id: slotId,
      name: name || null,
      notes: notes || null
    }, auditAction, auditDetails);
  }

  async createBulk(meals) {
    const { data, error } = await db
      .from('meals')
      .insert(meals)
      .select();

    if (error) throw error;
    await this.logAuditByCurrent('CREATE_MEAL_BULK', `Created ${data.length} meal slots`);
    return data;
  }

  async remove(id, dayId, slotId) {
    // Delete Protection
    const { data: attData, error: countErr } = await db
      .from('attendance')
      .select('id')
      .eq('day_id', dayId)
      .eq('slot_id', slotId);

    if (countErr) throw countErr;
    if (attData && attData.length > 0) {
      throw new Error(`Cannot delete: This meal slot has ${attData.length} scan records.`);
    }

    const { error } = await db
      .from('meals')
      .delete()
      .eq('id', id);

    if (error) throw error;
    await this.logAuditByCurrent('DELETE_MEAL', `Removed Meal Slot ID: ${id}`);
  }
}

export const mealService = new MealService();