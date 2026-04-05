import { BaseService } from './base.service.js';
import { db } from '../db.js';

class AssignmentService extends BaseService {
  constructor() {
    // Explicit column list ensures new fields (assignment_type, end_reason) are always returned.
    const defaultSelect = `
      id, pastor_id, church_id,
      assignment_type, end_reason, legacy_event_type,
      status_code, start_date, end_date,
      notes, precision_flag, is_primary, handover_id, role_code,
      created_at, updated_at,
      pastors ( id, full_name ),
      churches ( id, church_name, district_id, districts ( id, district_name, theme_color ) )
    `;
    super('assignments', defaultSelect, false);
  }

  async fetchAll() {
    // Direct query replaces the stale get_assignments_v3 RPC so assignment_type
    // and end_reason are always included in page-level data.
    const { data, error } = await db
      .from('assignments')
      .select(`
        id, pastor_id, church_id,
        assignment_type, end_reason, legacy_event_type,
        status_code, start_date, end_date,
        notes, precision_flag, is_primary, handover_id, role_code,
        created_at, updated_at,
        pastors ( id, full_name ),
        churches ( id, church_name, district_id, districts ( id, district_name, theme_color ) )
      `)
      .order('start_date', { ascending: false });
    if (error) throw error;
    return (data || []).map(a => this.mapResponse(a));
  }

  // Direct targeted query — avoids fetching the full table via RPC
  async fetchActiveByPastor(pastorId) {
    const { data, error } = await db
      .from('assignments')
      .select(`id, pastor_id, church_id, assignment_type, end_reason, legacy_event_type, status_code, start_date, end_date, notes, precision_flag, is_primary, handover_id, role_code, created_at, updated_at, pastors ( id, full_name ), churches ( id, church_name, district_id, districts ( id, district_name, theme_color ) )`)
      .eq('pastor_id', pastorId)
      .eq('status_code', 'active')
      .is('end_date', null)
      .maybeSingle();
    if (error) throw error;
    return data ? this.mapResponse(data) : null;
  }

  // Direct targeted query
  async fetchActiveByChurch(churchId) {
    const { data, error } = await db
      .from('assignments')
      .select(`id, pastor_id, church_id, assignment_type, end_reason, legacy_event_type, status_code, start_date, end_date, notes, precision_flag, is_primary, handover_id, role_code, created_at, updated_at, pastors ( id, full_name ), churches ( id, church_name, district_id, districts ( id, district_name, theme_color ) )`)
      .eq('church_id', churchId)
      .eq('status_code', 'active')
      .is('end_date', null)
      .maybeSingle();
    if (error) throw error;
    return data ? this.mapResponse(data) : null;
  }

  async create(assignmentData, auditAction = 'CREATE_ASSIGNMENT') {
    // Pass null to super so the generic audit log is suppressed;
    // we log a richer message below after fetching the full record.
    const data = await super.create(assignmentData, null);
    const full = await this.fetchById(data.id);

    let msg = `Assigned Pastor ${full.pastors?.full_name || ''} to ${full.churches?.church_name || ''}`;
    if (auditAction === 'TRANSFER_PASTOR') {
      msg = `Transferred Pastor ${full.pastors?.full_name || ''} to ${full.churches?.church_name || ''}`;
    } else if (auditAction === 'CREATE_HISTORY_RECORD') {
      msg = `Added history record for ${full.pastors?.full_name || ''} at ${full.churches?.church_name || ''}`;
    }

    await this.logAuditByCurrent(auditAction, msg);
    return this.mapResponse(full);
  }

  async update(id, assignmentData, auditAction = 'UPDATE_ASSIGNMENT') {
    // Pass null to super so the generic audit log is suppressed;
    // we log a richer message below after fetching the full record.
    const data = await super.update(id, assignmentData, null);
    const full = await this.fetchById(data.id);

    let msg = `Updated assignment for ${full.pastors?.full_name || ''}`;
    if (auditAction === 'CORRECT_ASSIGNMENT') {
      msg = `Corrected assignment for ${full.pastors?.full_name || ''} to ${full.churches?.church_name || ''}`;
    }

    await this.logAuditByCurrent(auditAction, msg);
    return this.mapResponse(full);
  }

  async transferPastor(transferData) {
    const {
      pastor_id, church_id, transfer_date, role_code, event_type,
      notes, is_primary, precision_flag
    } = transferData;

    try {
      const { data, error } = await db.rpc('transfer_pastor', {
        p_pastor_id: pastor_id,
        p_new_church_id: church_id,
        p_transfer_date: transfer_date,
        p_role_code: role_code || 'Lead Pastor',
        p_event_type: event_type || 'Transfer',
        p_notes: (notes || '').trim() || null,
        p_is_primary: is_primary !== undefined ? is_primary : true,
        p_precision_flag: precision_flag || 'exact'
      });
      
      if (error) throw error;
      await this.logAuditByCurrent('TRANSFER_PASTOR', `Transferred Pastor ID ${pastor_id} to Church ID ${church_id}`);
      return data;
    } catch (e) {
      console.warn("RPC transfer_pastor failed", e);
      throw e;
    }
  }

  async pulloutPastor(pulloutData) {
    const { pastor_id, pullout_date, notes } = pulloutData;

    try {
      const { data, error } = await db.rpc('pullout_pastor', {
        p_pastor_id: pastor_id,
        p_pullout_date: pullout_date,
        p_notes: (notes || '').trim() || null
      });

      if (error) throw error;
      await this.logAuditByCurrent('PULLOUT_PASTOR', `Pulled out Pastor ID ${pastor_id} from active primary assignment`);
      return data;
    } catch (e) {
      console.error("RPC pullout_pastor failed", e);
      throw e;
    }
  }

  async close(id, endDate, newStatus = 'ended', auditAction = 'CLOSE_ASSIGNMENT') {
    // Fetch context before closing for a meaningful audit message
    let auditMsg = `Closed Assignment ID ${id}`;
    try {
      const existing = await this.fetchById(id);
      if (existing) {
        const pastorName  = existing.pastors?.full_name || existing.pastor_name || 'Unknown Pastor';
        const churchName  = existing.churches?.church_name || existing.church_name || 'Unknown Church';
        auditMsg = `Closed assignment: ${pastorName} at ${churchName} (Status: ${newStatus})`;
      }
    } catch (_) { /* non-fatal — use default message */ }

    const result = await super.update(id, {
      status_code: newStatus,
      end_date: endDate
    });

    await this.logAuditByCurrent(auditAction, auditMsg);
    return result;
  }

  // Direct targeted query — returns all assignments for a pastor without full-table fetch
  async fetchByPastor(pastorId) {
    const { data, error } = await db
      .from('assignments')
      .select(`id, pastor_id, church_id, assignment_type, end_reason, legacy_event_type, status_code, start_date, end_date, notes, precision_flag, is_primary, handover_id, role_code, created_at, updated_at, pastors ( id, full_name ), churches ( id, church_name, district_id, districts ( id, district_name, theme_color ) )`)
      .eq('pastor_id', pastorId)
      .order('start_date', { ascending: false });
    if (error) throw error;
    return (data || []).map(a => this.mapResponse(a));
  }

  // Direct targeted query — returns all assignments for a church without full-table fetch
  async fetchByChurch(churchId) {
    const { data, error } = await db
      .from('assignments')
      .select(`id, pastor_id, church_id, assignment_type, end_reason, legacy_event_type, status_code, start_date, end_date, notes, precision_flag, is_primary, handover_id, role_code, created_at, updated_at, pastors ( id, full_name ), churches ( id, church_name, district_id, districts ( id, district_name, theme_color ) )`)
      .eq('church_id', churchId)
      .order('start_date', { ascending: false });
    if (error) throw error;
    return (data || []).map(a => this.mapResponse(a));
  }

  mapResponse(data) {
    if (!data) return null;
    return {
      ...data,
      pastor_name:     data.pastors?.full_name || '',
      church_name:     data.churches?.church_name || '',
      district_id:     data.churches?.district_id || '',
      district_name:   data.churches?.districts?.district_name || '',
      // Normalised lifecycle fields — always present, never undefined
      assignment_type: data.assignment_type || 'legacy',
      end_reason:      data.end_reason || null,
      legacy_event_type: data.legacy_event_type || null
    };
  }
}

export const assignmentService = new AssignmentService();
