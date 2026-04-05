import { BaseService } from './base.service.js';
import { db } from '../db.js';

class ChurchService extends BaseService {
  constructor() {
    // Default select includes relations for UI display
    const defaultSelect = `
      id, church_name, church_address, church_scope, district_id, pioneer_pastor_id, mother_church_id, notes,
      districts ( id, district_name ),
      pioneer:pastors!pioneer_pastor_id ( id, full_name ),
      mother:churches!mother_church_id ( id, church_name )
    `;
    super('churches', defaultSelect);
  }

  async fetchAll() {
    const { data, error } = await db.rpc('get_churches_v3');
    if (error) throw error;
    return data || [];
  }

  async fetchByDistrict(districtId) {
    const data = await this.fetchAll();
    return (data || []).filter(c => c.district_id === districtId);
  }

  async fetchById(id) {
    const data = await this.fetchAll();
    return (data || []).find(c => c.id === id) || null;
  }

  async create(churchData) {
    const auditAction = 'CREATE_CHURCH';
    const auditDetails = `Added Church: ${churchData.church_name.trim().toUpperCase()}`;
    
    const data = await super.create(churchData, auditAction, auditDetails);
    return this.mapResponse(data);
  }

  async update(id, churchData) {
    const auditAction = 'UPDATE_CHURCH';
    const auditDetails = `Updated Church: ${churchData.church_name?.trim().toUpperCase() || id}`;
    
    const data = await super.update(id, churchData, auditAction, auditDetails);
    return this.mapResponse(data);
  }

  async remove(id) {
    const auditAction = 'DELETE_CHURCH';
    const auditDetails = `Removed Church ID: ${id}`;
    return super.remove(id, auditAction, auditDetails);
  }

  async fetchOffspring(churchId) {
    const { data, error } = await db
      .from('churches')
      .select('id, church_name, church_address, district_id, districts(district_name)')
      .eq('mother_church_id', churchId)
      .eq('is_deleted', false)
      .order('church_name', { ascending: true });
    
    if (error) throw error;
    return (data || []).map(d => ({
      ...d,
      district_name: d.districts?.district_name || ''
    }));
  }

  /**
   * Maintains backwards compatibility with UI expectations 
   * while allowing new fields to pass through via '...data'
   */
  mapResponse(data) {
    if (!data) return null;
    return {
      ...data,
      district_name: data.districts?.district_name || '',
      pioneer_name: data.pioneer?.full_name || '',
      mother_name: data.mother?.church_name || '',
      // Ensure defaults for optional UI fields
      church_address: data.church_address || '',
      church_scope: data.church_scope || 'local',
      notes: data.notes || ''
    };
  }
}

export const churchService = new ChurchService();