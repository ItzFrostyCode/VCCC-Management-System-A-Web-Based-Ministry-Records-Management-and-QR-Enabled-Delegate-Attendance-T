import { db } from '../db.js';
import { authService } from './auth.service.js';

export const churchService = {
  async fetchAll() {
    const { data, error } = await db.rpc('get_churches_v3')
    if (error) throw error
    return data || []
  },

  async fetchByDistrict(districtId) {
    const { data, error } = await db.rpc('get_churches_v3')
    if (error) throw error
    return (data || []).filter(c => c.district_id === districtId)
  },

  async fetchById(id) {
    const { data, error } = await db.rpc('get_churches_v3')
    if (error) throw error
    const match = (data || []).find(c => c.id === id)
    return match || null
  },

  async create(churchData) {
    const { 
      church_name, church_address, church_scope, 
      district_id, pioneer_pastor_id, mother_church_id, notes 
    } = churchData
    const { data, error } = await db
      .from('churches')
      .insert({
        church_name: church_name.trim().toUpperCase(),
        church_address: (church_address || '').trim(),
        church_scope: church_scope || 'local',
        district_id: district_id || null,
        pioneer_pastor_id: pioneer_pastor_id || null,
        mother_church_id: mother_church_id || null,
        notes: (notes || '').trim() || null
      })
      .select(`
        id, church_name, church_address, church_scope, district_id, pioneer_pastor_id, mother_church_id, notes,
        districts ( id, district_name ),
        pioneer:pastors!pioneer_pastor_id ( id, full_name ),
        mother:churches!mother_church_id ( id, church_name )
      `)
      .single()
    if (error) throw error

    const user = authService.getCurrentUser()
    if (user) {
      await authService.logAudit(user.id, 'CREATE_CHURCH', `Added Church: ${data.church_name}`)
    }

    return {
      id: data.id,
      church_name: data.church_name,
      church_address: data.church_address || '',
      church_scope: data.church_scope || 'local',
      district_id: data.district_id,
      district_name: data.districts?.district_name || '',
      pioneer_pastor_id: data.pioneer_pastor_id,
      pioneer_name: data.pioneer?.full_name || '',
      mother_church_id: data.mother_church_id,
      mother_name: data.mother?.church_name || '',
      notes: data.notes || ''
    }
  },

  async update(id, churchData) {
    const { 
      church_name, church_address, church_scope, 
      district_id, pioneer_pastor_id, mother_church_id, notes 
    } = churchData
    const { data, error } = await db
      .from('churches')
      .update({
        church_name: church_name.trim().toUpperCase(),
        church_address: (church_address || '').trim(),
        church_scope: church_scope || 'local',
        district_id: district_id || null,
        pioneer_pastor_id: pioneer_pastor_id || null,
        mother_church_id: mother_church_id || null,
        notes: (notes || '').trim() || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select(`
        id, church_name, church_address, church_scope, district_id, pioneer_pastor_id, mother_church_id, notes,
        districts ( id, district_name ),
        pioneer:pastors!pioneer_pastor_id ( id, full_name ),
        mother:churches!mother_church_id ( id, church_name )
      `)
      .single()
    if (error) throw error

    const user = authService.getCurrentUser()
    if (user) {
      await authService.logAudit(user.id, 'UPDATE_CHURCH', `Updated Church: ${data.church_name}`)
    }

    return {
      id: data.id,
      church_name: data.church_name,
      church_address: data.church_address || '',
      church_scope: data.church_scope || 'local',
      district_id: data.district_id,
      district_name: data.districts?.district_name || '',
      pioneer_pastor_id: data.pioneer_pastor_id,
      pioneer_name: data.pioneer?.full_name || '',
      mother_church_id: data.mother_church_id,
      mother_name: data.mother?.church_name || '',
      notes: data.notes || ''
    }
  },

  async fetchOffspring(churchId) {
    const { data, error } = await db
      .from('churches')
      .select('id, church_name, church_address, district_id, districts(district_name)')
      .eq('mother_church_id', churchId)
      .eq('is_deleted', false)
      .order('church_name', { ascending: true })
    
    if (error) throw error
    return (data || []).map(d => ({
      ...d,
      district_name: d.districts?.district_name || ''
    }))
  },

  async remove(id) {
    const { error } = await db
      .from('churches')
      .update({ is_deleted: true, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error

    const user = authService.getCurrentUser()
    if (user) {
      await authService.logAudit(user.id, 'DELETE_CHURCH', `Removed Church ID: ${id}`)
    }
  }
}