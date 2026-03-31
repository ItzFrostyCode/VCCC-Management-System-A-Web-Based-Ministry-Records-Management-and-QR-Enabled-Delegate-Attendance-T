import { db } from '../db.js';
import { authService } from './auth.service.js';

/**
 * Walks UP the parent chain to detect circular references.
 * Returns true if `candidateParentId` is already a descendant of `pastorId`.
 */
async function wouldCreateCycle(pastorId, candidateParentId) {
  if (!candidateParentId || !pastorId) return false
  if (String(pastorId) === String(candidateParentId)) return true

  let current = candidateParentId
  const visited = new Set()

  while (current) {
    if (visited.has(current)) return true   // loop in existing data
    if (String(current) === String(pastorId)) return true
    visited.add(current)

    const { data, error } = await db
      .from('pastors')
      .select('parent_id')
      .eq('id', current)
      .eq('is_deleted', false)
      .single()

    if (error || !data) break
    current = data.parent_id
  }
  return false
}

export const pastorService = {

  // Returns pastors with their active assignment's church/district info
  async fetchAll() {
    const { data, error } = await db.rpc('get_pastors_v3')
    if (error) throw error
    return data || []
  },

  async fetchById(id) {
    const { data, error } = await db.rpc('get_pastors_v3')
    if (error) throw error
    return (data || []).find(p => String(p.id) === String(id)) || null
  },

  // Fetch all children (fruits/disciples) of a pastor
  async getChildren(pastorId) {
    const { data, error } = await db.rpc('get_pastor_children', { p_pastor_id: pastorId })
    if (error) throw error
    return data || []
  },

  // Fetch all churches pioneered by this pastor
  async fetchPioneeredChurches(pastorId) {
    const { data, error } = await db
      .from('churches')
      .select(`
        id, church_name, church_address, district_id,
        districts ( id, district_name )
      `)
      .eq('pioneer_pastor_id', pastorId)
      .eq('is_deleted', false)
      .order('church_name', { ascending: true })
    
    if (error) throw error
    return (data || []).map(c => ({
      ...c,
      district_name: c.districts?.district_name || ''
    }))
  },

  // Create a minimal draft pastor (placeholder for unknown lineage)
  async createDraft(name) {
    if (!name || !name.trim()) throw new Error('Name is required even for draft.')
    const { data, error } = await db
      .from('pastors')
      .insert({
        full_name: name.trim().toUpperCase(),
        record_status: 'draft',
        current_status_code: 'undeployed'
      })
      .select('id, full_name, record_status')
    if (error) throw error
    const result = data?.[0]
    const user = authService.getCurrentUser()
    if (user && result) await authService.logAudit(user.id, 'CREATE_PASTOR', `Added Draft Pastor: ${result.full_name}`)
    return result
  },

  async create(data) {
    const {
      full_name, wife_name, wife_birthdate, contact_number,
      birthdate, pastoring_start_date, pastor_image_url, wife_image_url,
      notes, current_status_code, record_status, parent_id
    } = data

    if (!full_name || typeof full_name !== 'string' || !full_name.trim()) {
      throw new Error('full_name is required and must be a valid non-empty string.')
    }

    // Circular reference guard
    if (parent_id) {
      const cycle = await wouldCreateCycle(null, parent_id)
      // Can't cycle on new record; safe to skip
    }

    const { data: results, error } = await db
      .from('pastors')
      .insert({
        full_name: full_name.trim().toUpperCase(),
        wife_name: wife_name && typeof wife_name === 'string' && wife_name.trim() ? wife_name.trim().toUpperCase() : null,
        wife_birthdate: wife_birthdate || null,
        contact_number: contact_number && typeof contact_number === 'string' ? contact_number.trim() : null,
        birthdate: birthdate || null,
        pastoring_start_date: pastoring_start_date || null,
        pastor_image_url: pastor_image_url || null,
        wife_image_url: wife_image_url || null,
        notes: notes && typeof notes === 'string' ? notes.trim() : null,
        current_status_code: current_status_code || 'undeployed',
        record_status: record_status || 'active',
        parent_id: parent_id || null
      })
      .select('id, full_name, wife_name, contact_number, current_status_code, record_status, parent_id')

    if (error) throw error
    if (!results || results.length === 0) throw new Error('Failed to create pastor record.')
    const result = results[0]

    if (result) {
      const user = authService.getCurrentUser()
      if (user) {
        await authService.logAudit(user.id, 'CREATE_PASTOR', `Added Pastor: ${result.full_name}`)
      }
    }

    return result
  },

  async update(id, data) {
    const updatePayload = {
      updated_at: new Date().toISOString()
    }

    if (data.full_name !== undefined) {
      if (!data.full_name || typeof data.full_name !== 'string' || !data.full_name.trim()) {
        throw new Error('full_name cannot be empty.')
      }
      updatePayload.full_name = data.full_name.trim().toUpperCase()
    }

    if (data.wife_name !== undefined) {
      updatePayload.wife_name = data.wife_name && typeof data.wife_name === 'string' && data.wife_name.trim() ? data.wife_name.trim().toUpperCase() : null
    }

    if (data.wife_birthdate !== undefined) updatePayload.wife_birthdate = data.wife_birthdate || null
    
    if (data.contact_number !== undefined) {
      updatePayload.contact_number = data.contact_number && typeof data.contact_number === 'string' ? data.contact_number.trim() : null
    }

    if (data.birthdate !== undefined) updatePayload.birthdate = data.birthdate || null
    if (data.pastoring_start_date !== undefined) updatePayload.pastoring_start_date = data.pastoring_start_date || null
    if (data.pastor_image_url !== undefined) updatePayload.pastor_image_url = data.pastor_image_url || null
    if (data.wife_image_url !== undefined) updatePayload.wife_image_url = data.wife_image_url || null
    
    if (data.notes !== undefined) {
      updatePayload.notes = data.notes && typeof data.notes === 'string' ? data.notes.trim() : null
    }

    if (data.current_status_code !== undefined) updatePayload.current_status_code = data.current_status_code || 'undeployed'
    if (data.record_status !== undefined) updatePayload.record_status = data.record_status || 'active'
    
    // Parent linkage with circular reference guard
    if (data.parent_id !== undefined) {
      const newParent = data.parent_id || null
      if (newParent) {
        const cycle = await wouldCreateCycle(id, newParent)
        if (cycle) throw new Error('Circular reference detected: this pastor is already a descendant of the selected parent.')
      }
      updatePayload.parent_id = newParent
    }

    if (Object.keys(updatePayload).length === 1) {
      throw new Error('No valid fields provided for update.')
    }

    const { data: results, error } = await db
      .from('pastors')
      .update(updatePayload)
      .eq('id', id)
      .select('id, full_name, wife_name, contact_number, current_status_code')

    if (error) throw error
    if (!results || results.length === 0) throw new Error('Record not found or update unauthorized.')
    const result = results[0]

    if (result) {
      const user = authService.getCurrentUser()
      if (user) {
        await authService.logAudit(user.id, 'UPDATE_PASTOR', `Updated Pastor: ${result.full_name}`)
      }
    }

    return result
  },

  async remove(id) {
    const { data: pastors, error: fetchErr } = await db.rpc('get_pastors_v3')
    if (fetchErr) throw fetchErr
    const p = (pastors || []).find(x => String(x.id) === String(id))

    const { error: rpcErr } = await db.rpc('delete_pastor', { p_pastor_id: id })

    if (rpcErr) {
      // Surface the lineage block as a clean user-readable message
      const msg = rpcErr.message || ''
      if (msg.includes('LINEAGE_CHILDREN_EXIST')) {
        const clean = msg.replace('ERROR: ', '').replace(/^.*LINEAGE_CHILDREN_EXIST: /, '')
        throw new Error(clean)
      }
      throw new Error(`Failed to delete pastor: ${msg || 'Server error'}`)
    }

    // 3. Log Audit
    const user = authService.getCurrentUser()
    if (user && p) {
      await authService.logAudit(user.id, 'DELETE_PASTOR', `Removed Pastor: ${p.full_name}`)
    }

    return true
  }
}