import { db } from '../db.js';

export const discipleService = {
  async fetchAll() {
    const { data, error } = await db.rpc('get_disciples_v3')
    if (error) throw error
    return data || []
  },

  async fetchByChurch(churchId) {
    const { data, error } = await db.rpc('get_disciples_v3')
    if (error) throw error
    return (data || []).filter(d => d.church_id === churchId)
  },

  async fetchById(id) {
    const { data, error } = await db.rpc('get_disciples_v3')
    if (error) throw error
    return (data || []).find(d => d.id === id) || null
  },

  async create(data) {
    const { full_name, church_id } = data
    const { data: results, error } = await db
      .from('disciples')
      .insert({
        full_name: full_name.trim().toUpperCase(),
        church_id: church_id,
        disciple_image_url: data.disciple_image_url || null
      })
      .select(`
        id, full_name, church_id, disciple_image_url,
        churches ( id, church_name, district_id, districts ( id, district_name ) )
      `)

    if (error) throw error
    if (!results || results.length === 0) throw new Error('Failed to create disciple record.')
    const result = results[0]

    if (result) {
      const user = typeof authService !== 'undefined' ? authService.getCurrentUser() : null
      if (user) await authService.logAudit(user.id, 'CREATE_DISCIPLE', `Added Disciple: ${result.full_name}`)
    }

    return {
      id: result.id,
      full_name: result.full_name,
      church_id: result.church_id,
      disciple_image_url: result.disciple_image_url || null,
      church_name: result.churches?.church_name || '—',
      district_id: result.churches?.district_id || '',
      district_name: result.churches?.districts?.district_name || '—'
    }
  },

  async update(id, data) {
    const { full_name, church_id } = data
    const { data: results, error } = await db
      .from('disciples')
      .update({
        full_name: full_name.trim().toUpperCase(),
        church_id: church_id,
        disciple_image_url: data.disciple_image_url || null
      })
      .eq('id', id)
      .select(`
        id, full_name, church_id, disciple_image_url,
        churches ( id, church_name, district_id, districts ( id, district_name ) )
      `)

    if (error) throw error
    if (!results || results.length === 0) throw new Error('Record not found or update unauthorized.')
    const result = results[0]

    if (result) {
      const user = typeof authService !== 'undefined' ? authService.getCurrentUser() : null
      if (user) await authService.logAudit(user.id, 'UPDATE_DISCIPLE', `Updated Disciple: ${result.full_name}`)
    }

    return {
      id: result.id,
      full_name: result.full_name,
      church_id: result.church_id,
      disciple_image_url: result.disciple_image_url || null,
      church_name: result.churches?.church_name || '—',
      district_id: result.churches?.district_id || '',
      district_name: result.churches?.districts?.district_name || '—'
    }
  },

  async remove(id) {
    const { data: d, error: fetchErr } = await db
      .from('disciples')
      .select('full_name')
      .eq('id', id)
      .single()
    if (fetchErr) throw fetchErr

    const { error } = await db
      .from('disciples')
      .update({ is_deleted: true })
      .eq('id', id)
    if (error) throw error

    const user = typeof authService !== 'undefined' ? authService.getCurrentUser() : null
    if (user && d) await authService.logAudit(user.id, 'DELETE_DISCIPLE', `Removed Disciple: ${d.full_name}`)

    return true
  },

  /**
   * Fetch disciples for a pastor based on their *currently assigned church*.
   * In the new schema, disciples belong to a church, not a pastor.
   */
  async fetchByPastor(pastorId) {
    // 1. Get the pastor's active church assignment
    const { data: activeOrg, error: orgErr } = await db
      .from('assignments')
      .select('church_id')
      .eq('pastor_id', pastorId)
      .eq('status_code', 'active')
      .is('end_date', null)
      .single()

    if (orgErr || !activeOrg) return []

    // 2. Fetch disciples for that church
    const { data, error } = await db
      .from('disciples')
      .select(`
        id,
        full_name,
        created_at,
        church_id
      `)
      .eq('church_id', activeOrg.church_id)
      .eq('is_deleted', false)
      .order('full_name')

    if (error) throw error
    return data
  }
}