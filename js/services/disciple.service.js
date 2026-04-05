import { BaseService } from './base.service.js';
import { db } from '../db.js';

class DiscipleService extends BaseService {
  constructor() {
    const defaultSelect = `
      *,
      churches ( id, church_name, district_id, districts ( id, district_name, theme_color ) )
    `;
    super('disciples', defaultSelect);
  }

  async fetchAll() {
    const { data, error } = await db.rpc('get_disciples_v3');
    if (error) throw error;
    return data || [];
  }

  async fetchByChurch(churchId) {
    const data = await this.fetchAll();
    return (data || []).filter(d => d.church_id === churchId);
  }

  async fetchById(id) {
    const data = await this.fetchAll();
    return (data || []).find(d => d.id === id) || null;
  }

  async create(data) {
    const auditAction = 'CREATE_DISCIPLE';
    const auditDetails = `Added Disciple: ${data.full_name?.trim().toUpperCase()}`;
    const result = await super.create(data, auditAction, auditDetails);
    return this.mapResponse(result);
  }

  async update(id, data) {
    const auditAction = 'UPDATE_DISCIPLE';
    const auditDetails = `Updated Disciple: ${data.full_name?.trim().toUpperCase() || id}`;
    const result = await super.update(id, data, auditAction, auditDetails);
    return this.mapResponse(result);
  }

  async remove(id) {
    const disciple = await this.fetchById(id);
    const auditAction = 'DELETE_DISCIPLE';
    const auditDetails = `Removed Disciple: ${disciple?.full_name || id}`;
    return super.remove(id, auditAction, auditDetails);
  }

  async fetchByPastor(pastorId) {
    const { data: activeOrg, error: orgErr } = await db
      .from('assignments')
      .select('church_id')
      .eq('pastor_id', pastorId)
      .eq('status_code', 'active')
      .is('end_date', null)
      .maybeSingle(); // Changed from .single() — returns null instead of throwing when no active assignment

    if (orgErr || !activeOrg) return [];

    const { data, error } = await db
      .from('disciples')
      .select(`id, full_name, created_at, church_id`)
      .eq('church_id', activeOrg.church_id)
      .eq('is_deleted', false)
      .order('full_name');

    if (error) throw error;
    return data;
  }

  mapResponse(result) {
    if (!result) return null;
    return {
      ...result,
      church_name: result.churches?.church_name || '—',
      district_id: result.churches?.district_id || '',
      district_name: result.churches?.districts?.district_name || '—',
      district_theme_color: result.churches?.districts?.theme_color || null
    };
  }
}

export const discipleService = new DiscipleService();