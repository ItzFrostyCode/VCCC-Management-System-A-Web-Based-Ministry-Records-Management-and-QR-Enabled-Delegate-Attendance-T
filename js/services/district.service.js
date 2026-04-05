import { BaseService } from './base.service.js';
import { db } from '../db.js';

class DistrictService extends BaseService {
  constructor() {
    super('districts', '*', true);
  }

  async fetchAll() {
    const { data, error } = await db.rpc('get_districts_v3');
    if (error) throw error;
    return data || [];
  }

  async fetchById(id) {
    const data = await this.fetchAll();
    const match = (data || []).find(d => d.id === id);
    return match || null;
  }

  async create(districtData) {
    const auditAction = 'CREATE_DISTRICT';
    const auditDetails = `Added District: ${districtData.district_name.trim().toUpperCase()}`;
    return super.create(districtData, auditAction, auditDetails);
  }

  async update(id, districtData) {
    const auditAction = 'UPDATE_DISTRICT';
    const auditDetails = `Updated District: ${districtData.district_name?.trim().toUpperCase() || id}`;
    return super.update(id, districtData, auditAction, auditDetails);
  }

  async remove(id) {
    const auditAction = 'DELETE_DISTRICT';
    const auditDetails = `Removed District ID: ${id}`;
    return super.remove(id, auditAction, auditDetails);
  }
}

export const districtService = new DistrictService();