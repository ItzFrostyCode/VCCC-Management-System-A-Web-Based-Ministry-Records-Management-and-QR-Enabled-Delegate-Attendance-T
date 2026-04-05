import { db } from '../db.js';
import { authService } from './auth.service.js';

export class BaseService {
  /**
   * @param {string} tableName - The name of the database table.
   * @param {string} defaultSelect - Default SELECT query.
   * @param {boolean} hasSoftDelete - Whether the table uses an 'is_deleted' column.
   */
  constructor(tableName, defaultSelect = '*', hasSoftDelete = true) {
    this.tableName = tableName;
    this.defaultSelect = defaultSelect;
    this.hasSoftDelete = hasSoftDelete;
    this._cache = null; // In-memory cache for fetchAll
  }

  /**
   * Generic fetch all from table
   */
  async fetchAll(select = this.defaultSelect, forceRefresh = false) {
    if (!forceRefresh && this._cache && select === this.defaultSelect) {
      return this._cache;
    }

    let query = db.from(this.tableName).select(select);
    
    if (this.hasSoftDelete) {
      query = query.eq('is_deleted', false);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    
    const result = data || [];
    if (select === this.defaultSelect) {
      this._cache = result;
    }
    return result;
  }

  /**
   * Generic fetch by ID
   */
  async fetchById(id, select = this.defaultSelect) {
    let query = db.from(this.tableName).select(select).eq('id', id);
    
    if (this.hasSoftDelete) {
      query = query.eq('is_deleted', false);
    }
    
    const { data, error } = await query.single();
    if (error) throw error;
    return data || null;
  }

  /**
   * Standardized Create with Audit Logging
   */
  async create(payload, auditAction, auditDetails = null) {
    const { data, error } = await db
      .from(this.tableName)
      .insert({
        ...this.sanitizePayload(payload),
        created_at: new Date().toISOString()
      })
      .select(this.defaultSelect)
      .single();

    if (error) throw error;

    this.invalidateCache();

    if (auditAction) {
      const details = auditDetails || `Added ${this.tableName}: ${data.id}`;
      await authService.logAuditByCurrent(auditAction, details);
    }

    return data;
  }

  /**
   * Standardized Update with Audit Logging
   */
  async update(id, payload, auditAction, auditDetails = null) {
    const { data, error } = await db
      .from(this.tableName)
      .update({
        ...this.sanitizePayload(payload),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select(this.defaultSelect)
      .single();

    if (error) throw error;

    this.invalidateCache();

    if (auditAction) {
      const details = auditDetails || `Updated ${this.tableName}: ${id}`;
      await authService.logAuditByCurrent(auditAction, details);
    }

    return data;
  }

  /**
   * Delete with Audit Logging. Supports both Soft Delete and Hard Delete.
   */
  async remove(id, auditAction, auditDetails = null) {
    let query;
    if (this.hasSoftDelete) {
      // Soft Delete
      query = db.from(this.tableName)
        .update({ is_deleted: true, updated_at: new Date().toISOString() })
        .eq('id', id);
    } else {
      // Hard Delete
      query = db.from(this.tableName)
        .delete()
        .eq('id', id);
    }

    const { error } = await query;
    if (error) throw error;

    this.invalidateCache();

    if (auditAction) {
      const details = auditDetails || `Removed ${this.tableName}: ${id}`;
      await authService.logAuditByCurrent(auditAction, details);
    }

    return true;
  }

  /**
   * Manual cache invalidation
   */
  invalidateCache() {
    this._cache = null;
  }

  /**
   * Delegate to authService so child services can call this.logAuditByCurrent()
   * without importing authService themselves.
   */
  async logAuditByCurrent(action, details = null) {
    return authService.logAuditByCurrent(action, details);
  }

  /**
   * Utility to clean up payload before sending to DB.
   * Can be overridden by child services.
   */
  sanitizePayload(payload) {
    const clean = { ...payload };
    delete clean.id;
    delete clean.created_at;
    delete clean.updated_at;
    if (this.hasSoftDelete) {
      delete clean.is_deleted;
    }
    
    Object.keys(clean).forEach(key => {
      if (typeof clean[key] === 'string') {
        clean[key] = clean[key].trim() || null;
      }
    });

    return clean;
  }
}
