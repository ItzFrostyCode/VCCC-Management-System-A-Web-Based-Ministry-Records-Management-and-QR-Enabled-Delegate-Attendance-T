import { BaseService } from './base.service.js';
import { db } from '../db.js';

class PastorService extends BaseService {
  constructor() {
    super('pastors', '*', true);
  }

  /**
   * Walks UP the parent chain to detect circular references.
   */
  async wouldCreateCycle(pastorId, candidateParentId) {
    if (!candidateParentId || !pastorId) return false;
    if (String(pastorId) === String(candidateParentId)) return true;

    let current = candidateParentId;
    const visited = new Set();

    while (current) {
      if (visited.has(current)) return true;
      if (String(current) === String(pastorId)) return true;
      visited.add(current);

      const { data, error } = await db
        .from('pastors')
        .select('parent_id')
        .eq('id', current)
        .eq('is_deleted', false)
        .single();

      if (error || !data) break;
      current = data.parent_id;
    }
    return false;
  }

  async fetchAll() {
    // Enhanced fetch for global cache including current assignment's church and district info
    const { data, error } = await db
      .from('pastors')
      .select(`
        *,
        parent_name:parent_id(full_name),
        assignments (
          id,
          status_code,
          end_date,
          church_id,
          churches (
            id,
            church_name,
            district_id,
            districts (
              id,
              theme_color
            )
          )
        )
      `)
      .eq('is_deleted', false)
      .order('full_name');
      
    if (error) throw error;

    // Flatten for easy UI access in the list
    return (data || []).map(p => {
      const current = p.assignments?.find(a => a.status_code === 'active' && !a.end_date);
      return {
        ...p,
        church_name: current?.churches?.church_name || null,
        district_id: current?.churches?.district_id || null, // Critical for UI lookup
        district_theme_color: current?.churches?.districts?.theme_color || null
      };
    });
  }

  async fetchById(id) {
    // Single fetch for pastor details including current assignment's church & district
    const { data, error } = await db
      .from('pastors')
      .select(`
        *,
        parent_name:parent_id(full_name),
        assignments (
          id,
          status_code,
          end_date,
          church_id,
          churches (
            id,
            church_name,
            district_id,
            districts (
              id,
              district_name,
              theme_color
            )
          )
        )
      `)
      .eq('id', id)
      .eq('is_deleted', false)
      .single();

    if (error) throw error;

    // Flatten active assignment's church & district info to top-level for easy template access
    const currentAssignment = data.assignments?.find(a => a.status_code === 'active' && !a.end_date);
    data.church_name          = currentAssignment?.churches?.church_name      || null;
    data.current_church       = data.church_name; // alias used by pastor-view.js
    data.church_id            = currentAssignment?.churches?.id               || null;
    data.district_id          = currentAssignment?.churches?.district_id      || null;
    data.district_name        = currentAssignment?.churches?.districts?.district_name || null;
    data.district_theme_color = currentAssignment?.churches?.districts?.theme_color  || null;

    return data;
  }

  async getChildren(pastorId) {
    const { data, error } = await db
      .from('pastors')
      .select('*')
      .eq('parent_id', pastorId)
      .eq('is_deleted', false)
      .order('full_name');
      
    if (error) throw error;
    return data || [];
  }

  async fetchPioneeredChurches(pastorId) {
    const { data, error } = await db
      .from('churches')
      .select(`id, church_name, church_address, district_id, districts ( id, district_name )`)
      .eq('pioneer_pastor_id', pastorId)
      .eq('is_deleted', false)
      .order('church_name', { ascending: true });
    
    if (error) throw error;
    return (data || []).map(c => ({
      ...c,
      district_name: c.districts?.district_name || ''
    }));
  }

  async createDraft(name) {
    if (!name || !name.trim()) throw new Error('Name is required even for draft.');
    return super.create({
      full_name: name.trim().toUpperCase(),
      record_status: 'draft',
      current_status_code: 'undeployed'
    }, 'CREATE_PASTOR', `Added Draft Pastor: ${name.trim().toUpperCase()}`);
  }

  async create(data) {
    if (!data.full_name || typeof data.full_name !== 'string' || !data.full_name.trim()) {
      throw new Error('full_name is required.');
    }

    if (data.parent_id) {
      const cycle = await this.wouldCreateCycle(null, data.parent_id);
      if (cycle) throw new Error('Circular reference detected in parent lineage.');
    }

    const auditAction = 'CREATE_PASTOR';
    const auditDetails = `Added Pastor: ${data.full_name.trim().toUpperCase()}`;
    return super.create(data, auditAction, auditDetails);
  }

  async update(id, data) {
    if (data.full_name !== undefined && (!data.full_name || !data.full_name.trim())) {
      throw new Error('full_name cannot be empty.');
    }

    if (data.parent_id !== undefined && data.parent_id) {
      const cycle = await this.wouldCreateCycle(id, data.parent_id);
      if (cycle) throw new Error('Circular reference detected.');
    }

    const auditAction = 'UPDATE_PASTOR';
    const auditDetails = `Updated Pastor: ${data.full_name?.trim().toUpperCase() || id}`;
    return super.update(id, data, auditAction, auditDetails);
  }

  async remove(id) {
    // We use a specialized RPC for pastor deletion due to lineage logic
    const pastor = await this.fetchById(id);
    const { error: rpcErr } = await db.rpc('delete_pastor', { p_pastor_id: id });

    if (rpcErr) {
      const msg = rpcErr.message || '';
      if (msg.includes('LINEAGE_CHILDREN_EXIST')) {
        throw new Error(msg.replace('ERROR: ', '').replace(/^.*LINEAGE_CHILDREN_EXIST: /, ''));
      }
      throw new Error(`Failed to delete pastor: ${msg || 'Server error'}`);
    }

    await this.logAuditByCurrent('DELETE_PASTOR', `Removed Pastor: ${pastor?.full_name || id}`);
    return true;
  }
}

export const pastorService = new PastorService();