import { BaseService } from './base.service.js';
import { db } from '../db.js';

class TrainingService extends BaseService {
  constructor() {
    super('training_log', '*', false);
  }

  // Add a training entry
  async addTrainingLog(data) {
    const auditAction = 'ADD_TRAINING';
    const auditDetails = `Pastor ID ${data.pastor_id} training log: ${data.course_name?.trim()}`;
    return super.create(data, auditAction, auditDetails);
  }

  // Fetch training history for a specific pastor
  async fetchByPastor(pastorId) {
    const { data, error } = await db
      .from(this.tableName)
      .select('*')
      .eq('pastor_id', pastorId)
      .order('completion_date', { ascending: false });

    if (error) throw error;
    return data || [];
  }
}

export const trainingService = new TrainingService();
