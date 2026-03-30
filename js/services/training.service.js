import { db } from '../db.js';
import { authService } from './auth.service.js';

export const trainingService = {
  // Add a training entry
  async addTrainingLog(data) {
    const { pastor_id, course_name, completion_date, status_code, precision_flag, blocker_flag, notes } = data;

    const { data: newEntry, error } = await db
      .from('training_log')
      .insert({
        pastor_id,
        course_name: course_name.trim(),
        completion_date: completion_date || null,
        status_code: status_code || 'Completed',
        precision_flag: precision_flag || 'exact',
        blocker_flag: blocker_flag || false,
        notes: notes ? notes.trim() : null
      })
      .select('id, course_name')
      .single();

    if (error) throw error;

    // Log the audit
    const user = authService.getCurrentUser();
    if (user) {
      await authService.logAudit(
        user.id,
        'ADD_TRAINING',
        `Pastor ID ${pastor_id} training log: ${course_name}`
      );
    }

    return newEntry;
  },

  // Fetch training history for a specific pastor
  async fetchByPastor(pastorId) {
    const { data, error } = await db
      .from('training_log')
      .select('*')
      .eq('pastor_id', pastorId)
      .order('completion_date', { ascending: false });

    if (error) throw error;
    return data || [];
  }
};
