import { db } from '../supabase.js';
import { authService } from './auth.service.js';

export const trainingService = {
  // Add a training entry
  async addTraining(data) {
    const { pastor_id, course_name, completion_date, status, notes } = data;

    const { data: newEntry, error } = await db
      .from('training_history')
      .insert({
        pastor_id,
        course_name: course_name.trim(),
        completion_date: completion_date || null,
        status: status || 'completed',
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
        `Pastor ID ${pastor_id} completed training: ${course_name}`
      );
    }

    return newEntry;
  }
};
