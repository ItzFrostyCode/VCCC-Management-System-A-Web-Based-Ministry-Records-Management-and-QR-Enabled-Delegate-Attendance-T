import { db } from '../db.js';
import { authService } from './auth.service.js';

export const districtService = {
  async fetchAll() {
    const { data, error } = await db.rpc('get_districts_v3')
    if (error) throw error
    return data || []
  },

  async fetchById(id) {
    const { data, error } = await db.rpc('get_districts_v3')
    if (error) throw error
    const match = (data || []).find(d => d.id === id)
    return match || null
  },

  async create(districtData) {
    const { district_name, theme_color, leader_pastor_id, notes } = districtData
    const { data, error } = await db
      .from('districts')
      .insert({
        district_name: district_name.trim().toUpperCase(),
        theme_color: theme_color || null,
        leader_pastor_id: leader_pastor_id || null,
        notes: notes || null
      })
      .select('id, district_name, theme_color, leader_pastor_id, notes, created_at')
      .single()
    if (error) throw error

    const user = authService.getCurrentUser()
    if (user) {
      await authService.logAudit(user.id, 'CREATE_DISTRICT', `Added District: ${data.district_name}`)
    }

    return data
  },

  async update(id, districtData) {
    const { district_name, theme_color, leader_pastor_id, notes } = districtData
    const { data, error } = await db
      .from('districts')
      .update({
        district_name: district_name.trim().toUpperCase(),
        theme_color: theme_color || null,
        leader_pastor_id: leader_pastor_id || null,
        notes: notes || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select('id, district_name, theme_color, leader_pastor_id, notes, created_at')
      .single()
    if (error) throw error

    const user = authService.getCurrentUser()
    if (user) {
      await authService.logAudit(user.id, 'UPDATE_DISTRICT', `Updated District: ${data.district_name}`)
    }

    return data
  },

  async remove(id) {
    const { error } = await db
      .from('districts')
      .update({ is_deleted: true, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error

    const user = authService.getCurrentUser()
    if (user) {
      await authService.logAudit(user.id, 'DELETE_DISTRICT', `Removed District ID: ${id}`)
    }
  }
}